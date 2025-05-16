
import { NextResponse } from 'next/server';
import crypto from 'crypto';

interface CAKeys {
  publicKey: string;
  privateKey: string;
}

// In-memory store for CA keys (for demonstration purposes)
let caKeys: CAKeys | null = null;

function generateCAKeys(): CAKeys {
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
  return { publicKey, privateKey };
}

// Ensures CA keys are initialized and returns them.
// This function is intended for use by other modules.
export function getOrInitializeCACryptoKeys(): CAKeys {
  if (!caKeys) {
    caKeys = generateCAKeys();
    console.log('CA keys generated and stored in memory (on-demand initialization).');
  }
  return caKeys;
}

export async function POST() {
  // Ensure keys are generated if not already, and get them.
  const currentCaKeys = getOrInitializeCACryptoKeys();
  return NextResponse.json({ message: 'CA setup complete.', caPublicKey: currentCaKeys.publicKey });
}

export async function GET() {
  // Ensure keys are generated if not already, and get them.
  const currentCaKeys = getOrInitializeCACryptoKeys();
  return NextResponse.json({ caPublicKey: currentCaKeys.publicKey });
}
