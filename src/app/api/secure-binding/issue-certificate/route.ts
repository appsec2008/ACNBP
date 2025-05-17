
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

// In-memory store for certificates issued by this specific API endpoint (not part of agent-registry)
// This is distinct from the certificates stored in the agent-registry's database.
// This route is typically used by the /secure-binding page for its simulation.
const certificateStore: { [agentId: string]: SignedCertificate } = {};

export async function POST(request: Request) {
  try {
    const { agentId, agentPublicKey, agentAnsEndpoint } = await request.json();
    if (!agentId || !agentPublicKey || !agentAnsEndpoint) {
      return NextResponse.json({ error: 'Agent ID, Public Key, and ANS Endpoint are required' }, { status: 400 });
    }

    const caCryptoKeys = getOrInitializeCACryptoKeys(); // Corrected function call

    const validFrom = new Date();
    const validTo = new Date();
    validTo.setFullYear(validTo.getFullYear() + 1);

    const certificatePayload: CertificatePayload = {
      subjectAgentId: agentId,
      subjectPublicKey: agentPublicKey,
      subjectAnsEndpoint: agentAnsEndpoint,
      issuer: "DemoCA", // This is the issuer name from the Secure Binding demo CA
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
    };

    const signInstance = crypto.createSign('SHA256');
    signInstance.update(JSON.stringify(certificatePayload));
    signInstance.end();
    
    // getOrInitializeCACryptoKeys ensures privateKey is available
    if (!caCryptoKeys.privateKey) {
        // This case should ideally not be hit if getOrInitializeCACryptoKeys works as intended
        console.error("CA private key is unexpectedly missing after initialization call.");
        return NextResponse.json({ error: 'CA private key not available for signing.' }, { status: 500 });
    }
    const caPrivateKeyObject = crypto.createPrivateKey(caCryptoKeys.privateKey);
    const signature = signInstance.sign(caPrivateKeyObject, 'base64');

    const signedCertificate: SignedCertificate = {
      ...certificatePayload,
      signature,
    };

    // Store this demo certificate in this endpoint's local memory
    certificateStore[agentId] = signedCertificate;
    console.log(`Certificate issued by /api/secure-binding/issue-certificate for agent: ${agentId}, endpoint: ${agentAnsEndpoint}`);

    return NextResponse.json(signedCertificate);
  } catch (error: any) {
    console.error('Error issuing certificate via /api/secure-binding/issue-certificate:', error);
    return NextResponse.json({ error: 'Failed to issue certificate', details: error.message }, { status: 500 });
  }
}

// Function to get a certificate issued by this specific API endpoint.
// Not typically used if the certificate is passed directly during verification.
export function getAgentCertificate(agentId: string): SignedCertificate | null {
    return certificateStore[agentId] || null;
}
