
import { NextResponse, type NextRequest } from 'next/server';
import type { AgentRegistration, ANSCapabilityRequest, ANSCapabilityResponse, SignedCertificate } from '@/lib/types';
import crypto from 'crypto'; // For mock signing

// This is a MOCK private key for the Agent Registry to sign its responses.
// In a real system, this would be securely managed.
const AGENT_REGISTRY_MOCK_PRIVATE_KEY = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIPDRg0g9a01953h6n/P9A58PG0xMhAyM9qPTmH0tL2B0oAoGCCqGSM49
AwEHoUQDQgAE8QyL8I1bW64M7Y/C8S0Z13/4Y2GJ0x4Cq23T0B+w5y1n32c5w0xJ
aF8o/y0mZ6XfG8jZk2xVn8gX6n1M3A==
-----END EC PRIVATE KEY-----`;


export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ANSCapabilityRequest;

    if (body.requestType !== 'resolve' || !body.ansName) {
      return NextResponse.json({ error: "Invalid request. Must be 'resolve' type with an ansName." }, { status: 400 });
    }

    const { ansName } = body;

    let agentList: AgentRegistration[];
    try {
        const fullUrl = new URL('/api/agent-registry', request.url);
        const registryResponse = await fetch(fullUrl.toString());
        if (!registryResponse.ok) {
            console.error("Failed to fetch from /api/agent-registry:", registryResponse.status, await registryResponse.text());
            throw new Error(`Failed to fetch agent list from registry (status: ${registryResponse.status})`);
        }
        agentList = await registryResponse.json();
    } catch (e: any) {
        console.error("Error fetching agent list:", e);
        return NextResponse.json({ error: `Could not contact agent registry: ${e.message}` }, { status: 503 });
    }

    const targetAgent = agentList.find(agent => agent.ansName === ansName);

    if (!targetAgent) {
      return NextResponse.json({ error: `ANSName '${ansName}' not found.` }, { status: 404 });
    }
    
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

    // Data to be signed by the Agent Registry's private key
    // This signature attests that the registry provides this endpoint and certificate for this ANSName.
    const dataToSign = JSON.stringify({ 
      ansName: targetAgent.ansName,
      endpoint: endpoint, 
      agentCertificate: targetAgent.agentCertificate // Include the full agent certificate object
    });
    
    const sign = crypto.createSign('SHA256');
    sign.update(dataToSign);
    sign.end();
    const signatureByRegistry = sign.sign(AGENT_REGISTRY_MOCK_PRIVATE_KEY, 'base64');

    const responsePayload: ANSCapabilityResponse = {
      ansName: targetAgent.ansName,
      endpoint: endpoint,
      agentCertificate: targetAgent.agentCertificate, // Return the agent's issued certificate
      signature: signatureByRegistry, // Signature from the Agent Registry over this response
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
