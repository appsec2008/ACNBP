
import { NextResponse, type NextRequest } from 'next/server';
import type { AgentRegistration, ANSNameParts, ANSProtocol, SignedCertificate } from '@/lib/types';
import { z } from 'zod';
import crypto from 'crypto';
import { getOrInitializeCACryptoKeys } from '@/app/api/secure-binding/ca/route'; // UPDATED IMPORT
import { getDb } from '@/lib/db';

// Schema for validating the registration request body
const registrationRequestSchema = z.object({
  protocol: z.enum(["a2a", "mcp", "acp", "other"]),
  agentID: z.string().min(1, "AgentID is required"),
  agentCapability: z.string().min(1, "AgentCapability is required"),
  provider: z.string().min(1, "Provider is required"),
  version: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/, "Version must be a valid Semantic Version"),
  extension: z.string().optional(),
  protocolExtensions: z.record(z.any()).refine(data => {
    if (!data.endpoint || typeof data.endpoint !== 'string') {
      return false;
    }
    return true;
  }, { message: "Protocol extensions must contain an 'endpoint' string." }),
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
    const rows = await db.all<AgentRegistration[]>('SELECT * FROM agents');
    // Deserialize agentCertificate and protocolExtensions
    const agents = rows.map(row => ({
      ...row,
      agentCertificate: JSON.parse(row.agentCertificate as unknown as string),
      protocolExtensions: JSON.parse(row.protocolExtensions as unknown as string),
    }));
    return NextResponse.json(agents);
  } catch (error) {
    console.error("Failed to fetch agents from database:", error);
    return NextResponse.json({ error: "Failed to retrieve agents." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let ansNameParts: ANSNameParts | undefined; // Define here for use in catch block
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

    // Check for duplicate ANSName in DB
    const existingAgent = await db.get('SELECT id FROM agents WHERE ansName = ?', ansName);
    if (existingAgent) {
      return NextResponse.json({ error: `Agent with ANSName '${ansName}' already registered.` }, { status: 409 });
    }

    // Generate agent key pair (public key will be part of the certificate)
    // The private key is not stored by the registry.
    const { publicKey: agentPublicKeyPem } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, // Private key generated but not stored by registry
    });

    // Get CA keys, initializing them if necessary
    const caCryptoKeys = getOrInitializeCACryptoKeys();
    
    const certPayloadForSign: Omit<SignedCertificate, 'signature'> = {
      subjectAgentId: agentID,
      subjectPublicKey: agentPublicKeyPem,
      subjectAnsEndpoint: ansName, // The agent's full ANSName is part of the certificate
      issuer: "DemoCA",
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year validity
    };
    const signInstance = crypto.createSign('SHA256');
    signInstance.update(JSON.stringify(certPayloadForSign));
    signInstance.end();
    
    const caPrivateKeyObject = crypto.createPrivateKey(caCryptoKeys.privateKey);
    const signature = signInstance.sign(caPrivateKeyObject, 'base64');
    
    const agentCertificate: SignedCertificate = { ...certPayloadForSign, signature };

    const newAgentRegistration: AgentRegistration = {
      id: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...ansNameParts,
      ansName,
      agentCertificate, // This is now the SignedCertificate object
      protocolExtensions,
      timestamp: new Date().toISOString(),
    };

    // Store agentCertificate and protocolExtensions as JSON strings in DB
    const agentCertificateString = JSON.stringify(newAgentRegistration.agentCertificate);
    const protocolExtensionsString = JSON.stringify(newAgentRegistration.protocolExtensions);

    await db.run(
      'INSERT INTO agents (id, protocol, agentID, agentCapability, provider, version, extension, ansName, agentCertificate, protocolExtensions, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
      newAgentRegistration.timestamp
    );
    
    console.log(`Agent registered in DB: ${ansName} with issued certificate.`);
    return NextResponse.json(newAgentRegistration, { status: 201 });

  } catch (error: any) {
    console.error("Agent registration error:", error);
    let message = "Failed to register agent.";
    // Construct ansNameForError only if ansNameParts is defined
    const ansNameForError = ansNameParts 
        ? constructANSName(ansNameParts)
        : 'unknown';

    if (error.message && error.message.includes('UNIQUE constraint failed: agents.ansName')) {
        message = `Agent with ANSName '${ansNameForError}' already registered.`;
    } else if (error instanceof Error) {
        message = error.message;
    }
    return NextResponse.json({ error: message, ansNameParts }, { status: 500 });
  }
}
