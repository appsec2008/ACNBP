
import { NextResponse, type NextRequest } from 'next/server';
import type { AgentRegistration, ANSCapabilityRequest, ANSCapabilityResponse, SignedCertificate, ANSNameParts } from '@/lib/types';
import crypto from 'crypto';
import { getDb } from '@/lib/db'; // Import the database utility
import { z } from 'zod';

// This is a MOCK private key for the Agent Registry to sign its responses.
// In a real system, this would be securely managed.
const AGENT_REGISTRY_MOCK_PRIVATE_KEY = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIPDRg0g9a01953h6n/P9A58PG0xMhAyM9qPTmH0tL2B0oAoGCCqGSM49
AwEHoUQDQgAE8QyL8I1bW64M7Y/C8S0Z13/4Y2GJ0x4Cq23T0B+w5y1n32c5w0xJ
aF8o/y0mZ6XfG8jZk2xVn8gX6n1M3A==
-----END EC PRIVATE KEY-----`;

// Schema for validating the resolution request body (aligns with paper's AgentCapabilityRequest)
const resolutionRequestSchema = z.object({
  requestType: z.literal("resolve"),
  protocol: z.enum(["a2a", "mcp", "acp", "other"]),
  agentID: z.string().min(1),
  agentCapability: z.string().min(1),
  provider: z.string().min(1),
  version: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/, "Version must be a valid Semantic Version"),
  extension: z.string().optional(),
});

function constructANSName(parts: ANSNameParts): string {
  let name = `${parts.protocol}://${parts.agentID}.${parts.agentCapability}.${parts.provider}.v${parts.version}`;
  if (parts.extension && parts.extension.trim() !== "") {
    name += `.${parts.extension.trim()}`;
  }
  return name;
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    
    const parsedBody = resolutionRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid request data for ANS resolution.", details: parsedBody.error.format() }, { status: 400 });
    }

    const { protocol, agentID, agentCapability, provider, version, extension } = parsedBody.data;

    // Construct the ANSName from the provided components
    const ansName = constructANSName({ protocol, agentID, agentCapability, provider, version, extension });

    const row = await db.get<AgentRegistration>('SELECT * FROM agents WHERE ansName = ?', ansName);

    if (!row) {
      return NextResponse.json({ error: `ANSName '${ansName}' not found.` }, { status: 404 });
    }

    // Deserialize agentCertificate and protocolExtensions
    const targetAgent: AgentRegistration = {
        ...row,
        // Ensure agentCertificate and protocolExtensions are parsed from JSON strings
        agentCertificate: typeof row.agentCertificate === 'string' ? JSON.parse(row.agentCertificate) : row.agentCertificate,
        protocolExtensions: typeof row.protocolExtensions === 'string' ? JSON.parse(row.protocolExtensions) : row.protocolExtensions,
    };
    
    let endpoint = targetAgent.protocolExtensions?.endpoint;
    // Protocol-specific endpoint extraction (can be expanded)
    if (targetAgent.protocol === 'mcp' && targetAgent.protocolExtensions?.mcpEndpoint) {
        endpoint = targetAgent.protocolExtensions.mcpEndpoint;
    } else if (targetAgent.protocol === 'a2a' && targetAgent.protocolExtensions?.a2aAgentCard?.endpoint) {
        endpoint = targetAgent.protocolExtensions.a2aAgentCard.endpoint;
    }

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ error: `Endpoint not found or invalid in protocolExtensions for ANSName '${ansName}'.` }, { status: 404 });
    }

    const dataToSign = JSON.stringify({ 
      ansName: targetAgent.ansName,
      endpoint: endpoint, 
      agentCertificate: targetAgent.agentCertificate 
    });
    
    const sign = crypto.createSign('SHA256');
    sign.update(dataToSign);
    sign.end();
    
    // Explicitly create a KeyObject for signing
    const privateKeyObject = crypto.createPrivateKey(AGENT_REGISTRY_MOCK_PRIVATE_KEY);
    const signatureByRegistry = sign.sign(privateKeyObject, 'base64');

    const responsePayload: ANSCapabilityResponse = {
      ansName: targetAgent.ansName, // This is the fully constructed and resolved ANSName
      endpoint: endpoint,
      agentCertificate: targetAgent.agentCertificate,
      signature: signatureByRegistry,
    };

    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error("ANS Resolution error:", error);
    let message = "Failed to resolve ANSName.";
    if (error instanceof Error) {
        message = error.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

