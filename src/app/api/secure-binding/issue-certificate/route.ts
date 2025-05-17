
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getOrInitializeCACryptoKeys } from '../ca/route'; // Corrected import

interface CertificatePayload {
  subjectAgentId: string;
  subjectPublicKey: string;
  subjectAnsEndpoint: string; // Added ANS endpoint
  issuer: string;
  validFrom: string;
  validTo: string;
}

interface SignedCertificate extends CertificatePayload {
  signature: string; // Base64 signature of the CertificatePayload
}

// In-memory store for certificates
const certificateStore: { [agentId: string]: SignedCertificate } = {};

export async function POST(request: Request) {
  try {
    const { agentId, agentPublicKey, agentAnsEndpoint } = await request.json();
    if (!agentId || !agentPublicKey || !agentAnsEndpoint) {
      return NextResponse.json({ error: 'Agent ID, Public Key, and ANS Endpoint are required' }, { status: 400 });
    }

    const caCryptoKeys = getOrInitializeCACryptoKeys();
    // No need to check if caCryptoKeys is null, as getOrInitializeCACryptoKeys always returns keys or throws internally if it can't.
    // The privateKey will always be present if getOrInitializeCACryptoKeys succeeds.

    const validFrom = new Date();
    const validTo = new Date();
    validTo.setFullYear(validTo.getFullYear() + 1);

    const certificatePayload: CertificatePayload = {
      subjectAgentId: agentId,
      subjectPublicKey: agentPublicKey,
      subjectAnsEndpoint: agentAnsEndpoint, // Include endpoint in payload
      issuer: "DemoCA", 
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
    };

    const sign = crypto.createSign('SHA256');
    sign.update(JSON.stringify(certificatePayload));
    sign.end();

    if (!caCryptoKeys.privateKey) {
        // This check is more for TypeScript's benefit or if there's an unexpected scenario.
        // getOrInitializeCACryptoKeys should ensure privateKey is set.
        throw new Error("CA private key is not available for signing.");
    }
    const caPrivateKeyObject = crypto.createPrivateKey(caCryptoKeys.privateKey);
    const signature = sign.sign(caPrivateKeyObject, 'base64');

    const signedCertificate: SignedCertificate = {
      ...certificatePayload,
      signature,
    };

    certificateStore[agentId] = signedCertificate;
    console.log(`Certificate issued for agent: ${agentId}, including ANS endpoint: ${agentAnsEndpoint}`);

    return NextResponse.json(signedCertificate);
  } catch (error: any) {
    console.error('Error issuing certificate:', error);
    return NextResponse.json({ error: 'Failed to issue certificate', details: error.message }, { status: 500 });
  }
}

// Internal function (example, not directly used by verify-message if cert is passed)
export function getAgentCertificate(agentId: string): SignedCertificate | null {
    return certificateStore[agentId] || null;
}

