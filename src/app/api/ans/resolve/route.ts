
import { NextResponse, type NextRequest } from 'next/server';
import type { AgentRegistration, ANSCapabilityRequest, ANSCapabilityResponse, SignedCertificate } from '@/lib/types';
import crypto from 'crypto';
import { getDb } from '@/lib/db'; // Import the database utility

// This is a MOCK private key for the Agent Registry to sign its responses.
// In a real system, this would be securely managed.
const AGENT_REGISTRY_MOCK_PRIVATE_KEY = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIPDRg0g9a01953h6n/P9A58PG0xMhAyM9qPTmH0tL2B0oAoGCCqGSM49
AwEHoUQDQgAE8QyL8I1bW64M7Y/C8S0Z13/4Y2GJ0x4Cq23T0B+w5y1n32c5w0xJ
aF8o/y0mZ6XfG8jZk2xVn8gX6n1M3A==
-----END EC PRIVATE KEY-----`;


export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json() as ANSCapabilityRequest;

    if (body.requestType !== 'resolve' || !body.ansName) {
      return NextResponse.json({ error: "Invalid request. Must be 'resolve' type with an ansName." }, { status: 400 });
    }

    const { ansName } = body;

    const row = await db.get<AgentRegistration>('SELECT * FROM agents WHERE ansName = ?', ansName);

    if (!row) {
      return NextResponse.json({ error: `ANSName '${ansName}' not found.` }, { status: 404 });
    }

    // Deserialize agentCertificate and protocolExtensions
    const targetAgent: AgentRegistration = {
        ...row,
        agentCertificate: JSON.parse(row.agentCertificate as unknown as string),
        protocolExtensions: JSON.parse(row.protocolExtensions as unknown as string),
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
    const signatureByRegistry = sign.sign(AGENT_REGISTRY_MOCK_PRIVATE_KEY, 'base64');

    const responsePayload: ANSCapabilityResponse = {
      ansName: targetAgent.ansName,
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
