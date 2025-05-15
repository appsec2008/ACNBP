
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCACryptoKeys } from '../ca/route'; // Adjust path

interface CertificatePayload {
  subjectAgentId: string;
  subjectPublicKey: string;
  issuer: string;
  validFrom: string;
  validTo: string;
}

interface SignedCertificate extends CertificatePayload {
  signature: string;
}

export async function POST(request: Request) {
  try {
    const { message, signature, certificateStringified } = await request.json();
    if (typeof message !== 'string' || !signature || !certificateStringified) {
      return NextResponse.json({ error: 'Message, signature, and stringified certificate are required' }, { status: 400 });
    }

    const caCryptoKeys = getCACryptoKeys();
    if (!caCryptoKeys) {
      return NextResponse.json({ error: 'CA not initialized. Cannot verify certificate.' }, { status: 500 });
    }

    let certificate: SignedCertificate;
    try {
      certificate = JSON.parse(certificateStringified);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid certificate format (not JSON parsable)' }, { status: 400 });
    }
    
    // Step 1: Verify the certificate itself
    const { signature: certSignature, ...certPayload } = certificate;
    if (!certSignature) {
        return NextResponse.json({ error: 'Certificate is missing its own signature.' }, { status: 400 });
    }

    const verifyCert = crypto.createVerify('SHA256');
    verifyCert.update(JSON.stringify(certPayload));
    verifyCert.end();
    const certificateValid = verifyCert.verify(caCryptoKeys.publicKey, certSignature, 'base64');

    if (!certificateValid) {
      console.log('Certificate verification FAILED against CA public key.');
      return NextResponse.json({
        certificateValid: false,
        messageSignatureValid: false,
        overallStatus: 'failed',
        details: 'Certificate signature is invalid (not signed by trusted CA).',
      });
    }
    console.log('Certificate successfully verified against CA public key.');

    // Step 2: Verify the message signature using the public key from the (now trusted) certificate
    const verifyMsg = crypto.createVerify('SHA256');
    verifyMsg.update(message);
    verifyMsg.end();
    const messageSignatureValid = verifyMsg.verify(certificate.subjectPublicKey, signature, 'base64');

    if (!messageSignatureValid) {
        console.log('Message signature verification FAILED against public key from certificate.');
    } else {
        console.log('Message signature successfully verified.');
    }

    return NextResponse.json({
      certificateValid: true,
      messageSignatureValid,
      overallStatus: messageSignatureValid ? 'success' : 'failed',
      details: messageSignatureValid ? 'Message and certificate are valid.' : 'Message signature is invalid.',
    });

  } catch (error: any) {
    console.error('Error verifying message:', error);
    return NextResponse.json({ error: 'Failed to verify message', details: error.message }, { status: 500 });
  }
}
