
import { NextResponse, type NextRequest } from 'next/server';
import type { AgentRegistration, ANSCapabilityRequest, ANSCapabilityResponse, SignedCertificate, ANSNameParts, ANSProtocol } from '@/lib/types';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { z } from 'zod';

const AGENT_REGISTRY_MOCK_PRIVATE_KEY_PEM = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIPDRg0g9a01953h6n/P9A58PG0xMhAyM9qPTmH0tL2B0oAoGCCqGSM49
AwEHoUQDQgAE8QyL8I1bW64M7Y/C8S0Z13/4Y2GJ0x4Cq23T0B+w5y1n32c5w0xJ
aF8o/y0mZ6XfG8jZk2xVn8gX6n1M3A==
-----END EC PRIVATE KEY-----`;

let agentRegistryPrivateKey: crypto.KeyObject | null = null;
try {
    agentRegistryPrivateKey = crypto.createPrivateKey(AGENT_REGISTRY_MOCK_PRIVATE_KEY_PEM);
} catch (e) {
    console.error("Failed to create private key object for Agent Registry:", e);
}


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
    const ansName = constructANSName({ protocol: protocol as ANSProtocol, agentID, agentCapability, provider, version, extension });

    const row = await db.get<AgentRegistration & { agentCertificate: string; protocolExtensions: string; }>(
        'SELECT * FROM agents WHERE ansName = ?', 
        ansName
    );

    if (!row) {
      return NextResponse.json({ error: `ANSName '${ansName}' not found.` }, { status: 404 });
    }

    // Check if agent is revoked
    if (row.isRevoked) {
      return NextResponse.json({ 
        error: `Agent with ANSName '${ansName}' has been revoked.`,
        details: `Revoked on: ${row.revocationTimestamp}`
      }, { status: 410 }); // 410 Gone is appropriate for revoked resources
    }

    let parsedAgentCertificate: SignedCertificate;
    let parsedProtocolExtensions: { [key: string]: any };

    try {
      parsedAgentCertificate = JSON.parse(row.agentCertificate);
    } catch (e) {
      console.error(`Failed to parse agentCertificate for ANSName '${ansName}':`, e);
      return NextResponse.json({ error: `Corrupted certificate data for ANSName '${ansName}'.` }, { status: 500 });
    }

    try {
      parsedProtocolExtensions = JSON.parse(row.protocolExtensions);
    } catch (e) {
      console.error(`Failed to parse protocolExtensions for ANSName '${ansName}':`, e);
      return NextResponse.json({ error: `Corrupted protocolExtensions data for ANSName '${ansName}'.` }, { status: 500 });
    }
    
    let endpoint: string | undefined;
    if (parsedProtocolExtensions && typeof parsedProtocolExtensions === 'object') {
      if (protocol === 'mcp' && typeof parsedProtocolExtensions.mcpEndpoint === 'string') {
          endpoint = parsedProtocolExtensions.mcpEndpoint;
      } else if (protocol === 'a2a' && parsedProtocolExtensions.a2aAgentCard && typeof parsedProtocolExtensions.a2aAgentCard.url === 'string') {
          endpoint = parsedProtocolExtensions.a2aAgentCard.url; // Corrected to use .url for A2A
      } else if (typeof parsedProtocolExtensions.endpoint === 'string') {
          // Fallback for other protocols or generic endpoint definition
          endpoint = parsedProtocolExtensions.endpoint;
      }
    }

    if (!endpoint) {
      return NextResponse.json({ error: `Endpoint not found or invalid in protocolExtensions for ANSName '${ansName}'. Ensure 'endpoint' (or protocol-specific e.g., 'a2aAgentCard.url' for A2A) is defined.` }, { status: 404 });
    }

    const responsePayload: ANSCapabilityResponse = {
      ansName: row.ansName,
      endpoint: endpoint,
      agentCertificate: parsedAgentCertificate,
      // signature: Temporarily removed for easier testing
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
