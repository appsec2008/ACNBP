
import { NextResponse } from 'next/server';
import crypto from 'crypto';

interface AgentKeyStorage {
  [agentId: string]: {
    publicKey: string;
    privateKey: string;
  };
}

// In-memory store for agent keys
const agentKeyStore: AgentKeyStorage = {};

export async function POST(request: Request) {
  try {
    const { agentId } = await request.json();
    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json({ error: 'Agent ID is required and must be a string' }, { status: 400 });
    }

    if (agentKeyStore[agentId]) {
      // Return existing public key if already generated for idempotency in demo
      return NextResponse.json({ agentId, publicKey: agentKeyStore[agentId].publicKey, message: 'Agent keys already exist for this ID.' });
    }

    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    agentKeyStore[agentId] = { publicKey, privateKey };
    console.log(`Keys generated for agent: ${agentId}`);

    return NextResponse.json({ agentId, publicKey });
  } catch (error) {
    console.error('Error generating agent keys:', error);
    return NextResponse.json({ error: 'Failed to generate agent keys' }, { status: 500 });
  }
}

// Internal function to get agent private key
export function getAgentPrivateKey(agentId: string): string | null {
  return agentKeyStore[agentId]?.privateKey || null;
}
