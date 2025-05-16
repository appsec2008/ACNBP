
import { NextResponse, type NextRequest } from 'next/server';
import type { AgentRegistration, SignedCertificate } from '@/lib/types';
import { z } from 'zod';
import crypto from 'crypto';
import { getOrInitializeCACryptoKeys } from '@/app/api/secure-binding/ca/route';
import { getDb } from '@/lib/db';

const renewRequestSchema = z.object({
  ansName: z.string().min(1, "ANSName is required for renewal."),
});

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const parsedBody = renewRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid renewal request data", details: parsedBody.error.format() }, { status: 400 });
    }

    const { ansName } = parsedBody.data;

    const existingAgentRow = await db.get<AgentRegistration & { agentCertificate: string }>(
      'SELECT * FROM agents WHERE ansName = ?', 
      ansName
    );

    if (!existingAgentRow) {
      return NextResponse.json({ error: `Agent with ANSName '${ansName}' not found.` }, { status: 404 });
    }

    if (existingAgentRow.isRevoked) {
      return NextResponse.json({ error: `Agent with ANSName '${ansName}' has been revoked and cannot be renewed.` }, { status: 403 });
    }
    
    let currentCertificate: SignedCertificate;
    try {
      currentCertificate = JSON.parse(existingAgentRow.agentCertificate);
    } catch (e) {
      console.error("Failed to parse existing certificate for renewal:", ansName, e);
      return NextResponse.json({ error: "Corrupted existing certificate data." }, { status: 500 });
    }


    // Re-use existing subjectAgentId, subjectPublicKey, subjectAnsEndpoint
    const caCryptoKeys = getOrInitializeCACryptoKeys();
    if (!caCryptoKeys.privateKey) {
        throw new Error("CA private key is not available for signing certificates.");
    }

    const newCertPayloadForSign: Omit<SignedCertificate, 'signature'> = {
      subjectAgentId: currentCertificate.subjectAgentId,
      subjectPublicKey: currentCertificate.subjectPublicKey, // Re-use public key
      subjectAnsEndpoint: currentCertificate.subjectAnsEndpoint, // Should be same as ansName
      issuer: "DemoCA",
      validFrom: new Date().toISOString(), // New validity period starts now
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Renew for 1 year
    };

    const signInstance = crypto.createSign('SHA256');
    signInstance.update(JSON.stringify(newCertPayloadForSign));
    signInstance.end();
    
    const caPrivateKeyObject = crypto.createPrivateKey(caCryptoKeys.privateKey);
    const newSignature = signInstance.sign(caPrivateKeyObject, 'base64');
    
    const newAgentCertificate: SignedCertificate = { ...newCertPayloadForSign, signature: newSignature };
    const newAgentCertificateString = JSON.stringify(newAgentCertificate);
    const newTimestamp = new Date().toISOString();

    await db.run(
      'UPDATE agents SET agentCertificate = ?, timestamp = ? WHERE ansName = ?',
      newAgentCertificateString,
      newTimestamp,
      ansName
    );

    // Construct the response object by merging updated fields with existing ones
    const updatedAgentRegistration: AgentRegistration = {
      ...existingAgentRow,
      protocolExtensions: JSON.parse(existingAgentRow.protocolExtensions as unknown as string), // deserialize
      agentCertificate: newAgentCertificate,
      timestamp: newTimestamp,
      isRevoked: !!existingAgentRow.isRevoked, // ensure boolean
    };
    
    console.log(`Agent ${ansName} renewed successfully.`);
    return NextResponse.json(updatedAgentRegistration, { status: 200 });

  } catch (error: any) {
    console.error("Agent renewal error:", error);
    let message = "Failed to renew agent.";
    if (error instanceof Error) {
        message = error.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
