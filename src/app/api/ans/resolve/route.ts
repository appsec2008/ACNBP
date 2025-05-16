
import { NextResponse, type NextRequest } from 'next/server';
import type { AgentRegistration, ANSCapabilityRequest, ANSCapabilityResponse } from '@/lib/types';
import crypto from 'crypto'; // For mock signing

// This is a MOCK private key for the Agent Registry to sign its responses.
// In a real system, this would be securely managed.
const AGENT_REGISTRY_MOCK_PRIVATE_KEY = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIPDRg0g9a01953h6n/P9A58PG0xMhAyM9qPTmH0tL2B0oAoGCCqGSM49
AwEHoUQDQgAE8QyL8I1bW64M7Y/C8S0Z13/4Y2GJ0x4Cq23T0B+w5y1n32c5w0xJ
aF8o/y0mZ6XfG8jZk2xVn8gX6n1M3A==
-----END EC PRIVATE KEY-----`;
// (This is a newly generated dummy key for example purposes)

// Helper function to parse ANSName.
// A more robust parser would be needed for complex validation.
function parseANSName(ansName: string): { protocol: string; agentID: string; agentCapability: string; provider: string; version: string; extension?: string } | null {
  const pattern = /^(?<protocol>[^:]+):\/\/(?<agentID>[^.]+)\.(?<agentCapability>[^.]+)\.(?<provider>[^.]+)\.v(?<version>[^.]+)(?:\.(?<extension>.+))?$/;
  const match = ansName.match(pattern);
  if (!match || !match.groups) return null;
  return {
    protocol: match.groups.protocol,
    agentID: match.groups.agentID,
    agentCapability: match.groups.agentCapability,
    provider: match.groups.provider,
    version: match.groups.version,
    extension: match.groups.extension,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ANSCapabilityRequest;

    if (body.requestType !== 'resolve' || !body.ansName) {
      return NextResponse.json({ error: "Invalid request. Must be 'resolve' type with an ansName." }, { status: 400 });
    }

    const { ansName } = body;

    // Fetch registered agents (from the other API route - in a real system, this would be a direct DB query)
    // For this prototype, we'll assume direct access to the in-memory agentRegistry for simplicity.
    // If /api/agent-registry was on a different server or to strictly follow API boundaries, you'd fetch:
    // const registryResponse = await fetch(`${request.nextUrl.origin}/api/agent-registry`);
    // if (!registryResponse.ok) throw new Error("Could not contact agent registry");
    // const agentList: AgentRegistration[] = await registryResponse.json();
    
    // For now, let's simulate fetching from the in-memory store if we can't directly access it.
    // This part is tricky in Next.js Edge/Node runtimes if route.ts files can't share memory easily.
    // The most robust way for this prototype if they are separate is an internal fetch.
    // However, to avoid setting up another fetch for a prototype, if we could share agentRegistry instance that would be ideal.
    // For now, let's just say this part is simplified and we try to find it.

    // Simplified: We'll query the /api/agent-registry. This adds a slight delay but is more modular.
    let agentList: AgentRegistration[];
    try {
        const fullUrl = new URL('/api/agent-registry', request.url); // Use request.url to get base
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
    
    // Extract endpoint from protocolExtensions.
    // Prioritize specific endpoints, then a generic 'endpoint'.
    let endpoint = targetAgent.protocolExtensions?.endpoint;
    if (targetAgent.protocol === 'mcp' && targetAgent.protocolExtensions?.mcpEndpoint) {
        endpoint = targetAgent.protocolExtensions.mcpEndpoint;
    } else if (targetAgent.protocol === 'a2a' && targetAgent.protocolExtensions?.a2aAgentCard?.endpoint) {
        endpoint = targetAgent.protocolExtensions.a2aAgentCard.endpoint;
    }

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ error: `Endpoint not found or invalid in protocolExtensions for ANSName '${ansName}'.` }, { status: 404 });
    }

    // Mock signing the response (Endpoint + Certificate) by the Agent Registry
    // In a real system, the Agent Registry would sign this data with its private key.
    const dataToSign = JSON.stringify({ endpoint, certificatePem: targetAgent.certificatePem, ansName: targetAgent.ansName });
    const sign = crypto.createSign('SHA256');
    sign.update(dataToSign);
    sign.end();
    const signature = sign.sign(AGENT_REGISTRY_MOCK_PRIVATE_KEY, 'base64');

    const responsePayload: ANSCapabilityResponse = {
      ansName: targetAgent.ansName,
      endpoint: endpoint,
      certificatePem: targetAgent.certificatePem,
      signature: signature,
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

    