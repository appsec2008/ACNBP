
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCACryptoKeys } from '../ca/route'; // Adjust path as necessary

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

    const caCryptoKeys = getCACryptoKeys();
    if (!caCryptoKeys) {
      return NextResponse.json({ error: 'CA not initialized. Please setup CA first.' }, { status: 500 });
    }

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
    const signature = sign.sign(caCryptoKeys.privateKey, 'base64');

    const signedCertificate: SignedCertificate = {
      ...certificatePayload,
      signature,
    };

    certificateStore[agentId] = signedCertificate;
    console.log(`Certificate issued for agent: ${agentId}, including ANS endpoint: ${agentAnsEndpoint}`);

    return NextResponse.json(signedCertificate);
  } catch (error) {
    console.error('Error issuing certificate:', error);
    return NextResponse.json({ error: 'Failed to issue certificate' }, { status: 500 });
  }
}

// Internal function (example, not directly used by verify-message if cert is passed)
export function getAgentCertificate(agentId: string): SignedCertificate | null {
    return certificateStore[agentId] || null;
}
