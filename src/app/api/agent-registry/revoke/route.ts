
import { NextResponse, type NextRequest } from 'next/server';
import type { AgentRegistration } from '@/lib/types';
import { z } from 'zod';
import { getDb } from '@/lib/db';

const revokeRequestSchema = z.object({
  ansName: z.string().min(1, "ANSName is required for revocation."),
});

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const parsedBody = revokeRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid revocation request data", details: parsedBody.error.format() }, { status: 400 });
    }

    const { ansName } = parsedBody.data;

    const existingAgentRow = await db.get<AgentRegistration & { agentCertificate: string, protocolExtensions: string }>(
      'SELECT * FROM agents WHERE ansName = ?', 
      ansName
    );

    if (!existingAgentRow) {
      return NextResponse.json({ error: `Agent with ANSName '${ansName}' not found.` }, { status: 404 });
    }

    if (existingAgentRow.isRevoked) {
      return NextResponse.json({ error: `Agent with ANSName '${ansName}' is already revoked.` }, { status: 400 });
    }

    const revocationTimestamp = new Date().toISOString();

    await db.run(
      'UPDATE agents SET isRevoked = ?, revocationTimestamp = ? WHERE ansName = ?',
      1, // isRevoked = true
      revocationTimestamp,
      ansName
    );
    
    console.log(`Agent ${ansName} revoked successfully.`);
    
    // Return the updated agent details
    const revokedAgent: AgentRegistration = {
        ...existingAgentRow,
        agentCertificate: JSON.parse(existingAgentRow.agentCertificate),
        protocolExtensions: JSON.parse(existingAgentRow.protocolExtensions),
        isRevoked: true,
        revocationTimestamp: revocationTimestamp,
    };

    return NextResponse.json(revokedAgent, { status: 200 });

  } catch (error: any) {
    console.error("Agent revocation error:", error);
    let message = "Failed to revoke agent.";
    if (error instanceof Error) {
        message = error.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
