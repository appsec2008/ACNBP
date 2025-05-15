
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAgentPrivateKey } from '../agent-keys/route'; // Adjust path

export async function POST(request: Request) {
  try {
    const { agentId, message } = await request.json();
    if (!agentId || typeof message !== 'string') {
      return NextResponse.json({ error: 'Agent ID and message are required' }, { status: 400 });
    }

    const agentPrivateKey = getAgentPrivateKey(agentId);
    if (!agentPrivateKey) {
      return NextResponse.json({ error: `Private key not found for agent ${agentId}. Initialize agent first.` }, { status: 404 });
    }

    const sign = crypto.createSign('SHA256');
    sign.update(message);
    sign.end();
    const signature = sign.sign(agentPrivateKey, 'base64');

    console.log(`Message signed for agent: ${agentId}`);
    return NextResponse.json({ signature });

  } catch (error) {
    console.error('Error signing message:', error);
    return NextResponse.json({ error: 'Failed to sign message' }, { status: 500 });
  }
}
