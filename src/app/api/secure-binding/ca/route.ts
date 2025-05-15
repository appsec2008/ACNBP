
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

export async function POST() {
  if (!caKeys) {
    caKeys = generateCAKeys();
    console.log('CA keys generated and stored in memory.');
  }
  return NextResponse.json({ message: 'CA setup complete.', caPublicKey: caKeys.publicKey });
}

export async function GET() {
  if (!caKeys) {
    // Auto-initialize if not present, for simplicity in demo flow
    caKeys = generateCAKeys();
    console.log('CA keys generated on GET request as they were not present.');
  }
  return NextResponse.json({ caPublicKey: caKeys.publicKey });
}

// Internal function to get CA keys, not exported as a route
export function getCACryptoKeys(): CAKeys | null {
  return caKeys;
}
