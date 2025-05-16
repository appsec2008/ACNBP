
import { NextResponse, type NextRequest } from 'next/server';
import type { AgentRegistration, ANSNameParts, ANSProtocol } from '@/lib/types';
import { z } from 'zod';

// In-memory store for agent registrations
let agentRegistry: AgentRegistration[] = [];

// Schema for validating the registration request body
const registrationRequestSchema = z.object({
  protocol: z.enum(["a2a", "mcp", "acp", "other"]),
  agentID: z.string().min(1, "AgentID is required"),
  agentCapability: z.string().min(1, "AgentCapability is required"),
  provider: z.string().min(1, "Provider is required"),
  version: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/, "Version must be a valid Semantic Version"),
  extension: z.string().optional(),
  certificatePem: z.string().min(1, "Certificate (PEM format) is required"),
  protocolExtensions: z.record(z.any()).refine(data => {
    // Basic check for endpoint if protocol is mcp or a2a for example
    if (data.protocol === 'mcp' && !data.mcpEndpoint) return false;
    if (data.protocol === 'a2a' && !data.a2aAgentCard?.endpoint) return false;
    // A generic endpoint is also useful
    if (!data.endpoint) return false;
    return true;
  }, {message: "Protocol extensions must contain a relevant endpoint (e.g., 'endpoint', 'mcpEndpoint', or 'a2aAgentCard.endpoint')."}),
});

function constructANSName(parts: ANSNameParts): string {
  let name = `${parts.protocol}://${parts.agentID}.${parts.agentCapability}.${parts.provider}.v${parts.version}`;
  if (parts.extension && parts.extension.trim() !== "") {
    name += `.${parts.extension.trim()}`;
  }
  return name;
}

export async function GET() {
  return NextResponse.json(agentRegistry);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedBody = registrationRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid registration data", details: parsedBody.error.format() }, { status: 400 });
    }

    const { protocol, agentID, agentCapability, provider, version, extension, certificatePem, protocolExtensions } = parsedBody.data;

    const ansNameParts: ANSNameParts = { protocol: protocol as ANSProtocol, agentID, agentCapability, provider, version, extension };
    const ansName = constructANSName(ansNameParts);

    // Check for duplicate ANSName
    if (agentRegistry.some(agent => agent.ansName === ansName)) {
      return NextResponse.json({ error: `Agent with ANSName '${ansName}' already registered.` }, { status: 409 });
    }
    
    const newAgent: AgentRegistration = {
      id: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // Unique ID for the registration entry
      ...ansNameParts,
      ansName,
      certificatePem,
      protocolExtensions,
      timestamp: new Date().toISOString(),
    };

    agentRegistry.push(newAgent);
    console.log(`Agent registered: ${ansName}`, newAgent);
    return NextResponse.json(newAgent, { status: 201 });

  } catch (error) {
    console.error("Agent registration error:", error);
    let message = "Failed to register agent.";
    if (error instanceof Error) {
        message = error.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

    