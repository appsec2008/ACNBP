
import { NextResponse, type NextRequest } from 'next/server';
import type { AgentRegistration, ANSNameParts, ANSProtocol, SignedCertificate } from '@/lib/types';
import { z } from 'zod';
import crypto from 'crypto';
import { getCACryptoKeys } from '@/app/api/secure-binding/ca/route';
import { getDb } from '@/lib/db'; // Import the database utility

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
  try {
    const db = await getDb();
    const body = await request.json();
    const parsedBody = registrationRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid registration data", details: parsedBody.error.format() }, { status: 400 });
    }

    const { protocol, agentID, agentCapability, provider, version, extension, protocolExtensions } = parsedBody.data;

    const ansNameParts: ANSNameParts = { protocol: protocol as ANSProtocol, agentID, agentCapability, provider, version, extension };
    const ansName = constructANSName(ansNameParts);

    // Check for duplicate ANSName in DB
    const existingAgent = await db.get('SELECT id FROM agents WHERE ansName = ?', ansName);
    if (existingAgent) {
      return NextResponse.json({ error: `Agent with ANSName '${ansName}' already registered.` }, { status: 409 });
    }

    const { publicKey: agentPublicKeyPem } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    let caCryptoKeys = getCACryptoKeys();
    if (!caCryptoKeys) {
      // Attempt to initialize CA if not already done.
      // Use a relative URL for server-side fetch if running in the same origin,
      // or an absolute URL if this API could be deployed separately.
      // For Next.js, request.url gives the full URL of the incoming request.
      await fetch(new URL('/api/secure-binding/ca', request.url).toString(), { method: 'POST' });
      caCryptoKeys = getCACryptoKeys(); // Try fetching again
      if (!caCryptoKeys) {
        return NextResponse.json({ error: 'CA not initialized and auto-initialization failed. Please setup CA first.' }, { status: 500 });
      }
    }
    
    const certPayloadForSign: Omit<SignedCertificate, 'signature'> = {
      subjectAgentId: agentID,
      subjectPublicKey: agentPublicKeyPem,
      subjectAnsEndpoint: ansName,
      issuer: "DemoCA",
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year validity
    };
    const sign = crypto.createSign('SHA256');
    sign.update(JSON.stringify(certPayloadForSign));
    sign.end();
    const signature = sign.sign(caCryptoKeys.privateKey, 'base64');
    const agentCertificate: SignedCertificate = { ...certPayloadForSign, signature };

    const newAgentRegistration: AgentRegistration = {
      id: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...ansNameParts,
      ansName,
      agentCertificate,
      protocolExtensions,
      timestamp: new Date().toISOString(),
    };

    // Serialize agentCertificate and protocolExtensions for DB storage
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
    if (error.message && error.message.includes('UNIQUE constraint failed: agents.ansName')) {
        message = `Agent with ANSName already registered.`; // More specific error
    } else if (error instanceof Error) {
        message = error.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
