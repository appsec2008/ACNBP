
import { NextResponse, type NextRequest } from 'next/server';
import type { AgentRegistration, ANSNameParts, ANSProtocol, SignedCertificate } from '@/lib/types';
import { z } from 'zod';
import crypto from 'crypto';
import { getOrInitializeCACryptoKeys } from '@/app/api/secure-binding/ca/route';
import { getDb } from '@/lib/db';

// Schema for validating the registration request body
const registrationRequestSchema = z.object({
  protocol: z.enum(["a2a", "mcp", "acp", "other"]),
  agentID: z.string().min(1, "AgentID is required"),
  agentCapability: z.string().min(1, "AgentCapability is required"),
  provider: z.string().min(1, "Provider is required"),
  version: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/, "Version must be a valid Semantic Version"),
  extension: z.string().optional(),
  protocolExtensions: z.record(z.any()) // Basic type, detailed validation moved to superRefine
}).superRefine((data, ctx) => {
  if (data.protocol === "a2a") {
    if (!data.protocolExtensions.a2aAgentCard || 
        typeof data.protocolExtensions.a2aAgentCard !== 'object' ||
        data.protocolExtensions.a2aAgentCard === null || // Ensure a2aAgentCard is not null
        !data.protocolExtensions.a2aAgentCard.url ||
        typeof data.protocolExtensions.a2aAgentCard.url !== 'string') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["protocolExtensions"],
        message: "For A2A protocol, protocolExtensions must contain an 'a2aAgentCard' object with a valid 'url' string property.",
      });
    }
  } else { // For 'mcp', 'acp', 'other'
    if (!data.protocolExtensions.endpoint || typeof data.protocolExtensions.endpoint !== 'string') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["protocolExtensions"],
        message: "Protocol extensions must contain an 'endpoint' string property.",
      });
    }
  }
});

function constructANSName(parts: ANSNameParts): string {
  let name = `${parts.protocol}://${parts.agentID}.${parts.agentCapability}.${parts.provider}.v${parts.version}`;
  if (parts.extension && parts.extension.trim() !== "") {
    name += `.${parts.extension.trim()}`;
  }
  return name;
}

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.all<Array<AgentRegistration & { agentCertificate: string, protocolExtensions: string }>>('SELECT * FROM agents ORDER BY timestamp DESC');
    const agents = rows.map(row => ({
      ...row,
      agentCertificate: JSON.parse(row.agentCertificate),
      protocolExtensions: JSON.parse(row.protocolExtensions),
      isRevoked: !!row.isRevoked, // Ensure boolean
    }));
    return NextResponse.json(agents);
  } catch (error) {
    console.error("Failed to fetch agents from database:", error);
    return NextResponse.json({ error: "Failed to retrieve agents." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let ansNameParts: ANSNameParts | undefined;
  try {
    const db = await getDb();
    const body = await request.json();
    const parsedBody = registrationRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid registration data", details: parsedBody.error.format() }, { status: 400 });
    }

    const { protocol, agentID, agentCapability, provider, version, extension, protocolExtensions } = parsedBody.data;

    ansNameParts = { protocol: protocol as ANSProtocol, agentID, agentCapability, provider, version, extension };
    const ansName = constructANSName(ansNameParts);

    const existingAgent = await db.get('SELECT id FROM agents WHERE ansName = ?', ansName);
    if (existingAgent) {
      return NextResponse.json({ error: `Agent with ANSName '${ansName}' already registered.` }, { status: 409 });
    }

    const { publicKey: agentPublicKeyPem } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const caCryptoKeys = getOrInitializeCACryptoKeys();
    if (!caCryptoKeys.privateKey) {
        throw new Error("CA private key is not available for signing certificates.");
    }
    
    const certPayloadForSign: Omit<SignedCertificate, 'signature'> = {
      subjectAgentId: agentID,
      subjectPublicKey: agentPublicKeyPem,
      subjectAnsEndpoint: ansName,
      issuer: "DemoCA",
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };
    
    const signInstance = crypto.createSign('SHA256');
    signInstance.update(JSON.stringify(certPayloadForSign));
    signInstance.end();
    
    const caPrivateKeyObject = crypto.createPrivateKey(caCryptoKeys.privateKey);
    const signature = signInstance.sign(caPrivateKeyObject, 'base64');
    
    const agentCertificate: SignedCertificate = { ...certPayloadForSign, signature };

    const currentTimestamp = new Date().toISOString();
    const newAgentRegistration: AgentRegistration = {
      id: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...ansNameParts,
      ansName,
      agentCertificate,
      protocolExtensions,
      timestamp: currentTimestamp,
      isRevoked: false, // Explicitly set for new registration
      revocationTimestamp: undefined,
    };

    const agentCertificateString = JSON.stringify(newAgentRegistration.agentCertificate);
    const protocolExtensionsString = JSON.stringify(newAgentRegistration.protocolExtensions);

    await db.run(
      'INSERT INTO agents (id, protocol, agentID, agentCapability, provider, version, extension, ansName, agentCertificate, protocolExtensions, timestamp, isRevoked, revocationTimestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      newAgentRegistration.id,
      newAgentRegistration.protocol,
      newAgentRegistration.agentID,
      newAgentRegistration.agentCapability,
      newAgentRegistration.provider,
      newAgentRegistration.version,
      newAgentRegistration.extension ?? null,
      newAgentRegistration.ansName,
      agentCertificateString,
      protocolExtensionsString,
      newAgentRegistration.timestamp,
      0, // isRevoked = false
      null // revocationTimestamp
    );
    
    console.log(`Agent registered in DB: ${ansName} with issued certificate.`);
    // Return the full registration object, so client can see the issued cert details
    const registeredAgentForResponse = {
        ...newAgentRegistration,
        isRevoked: false, // ensure boolean for response
        revocationTimestamp: undefined,
    };
    return NextResponse.json(registeredAgentForResponse, { status: 201 });

  } catch (error: any) {
    console.error("Agent registration error:", error);
    let message = "Failed to register agent.";
    const ansNameForError = ansNameParts ? constructANSName(ansNameParts) : 'unknown';

    if (error.message && error.message.includes('UNIQUE constraint failed: agents.ansName')) {
        message = `Agent with ANSName '${ansNameForError}' already registered.`;
    } else if (error instanceof Error) {
        message = error.message;
    }
    return NextResponse.json({ error: message, ansNameParts }, { status: 500 });
  }
}
