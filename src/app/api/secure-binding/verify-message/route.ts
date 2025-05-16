
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCACryptoKeys } from '../ca/route'; // Adjust path

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
    let parsedCertificateInfo: Partial<CertificatePayload> | null = null;

    try {
      certificate = JSON.parse(certificateStringified);
      // Extract details from the parsed certificate to return in the response
      parsedCertificateInfo = {
        subjectAgentId: certificate.subjectAgentId,
        subjectPublicKey: certificate.subjectPublicKey, // Though typically not shown directly in summary
        subjectAnsEndpoint: certificate.subjectAnsEndpoint,
        issuer: certificate.issuer,
        validFrom: certificate.validFrom,
        validTo: certificate.validTo,
      };
    } catch (e) {
      return NextResponse.json({ 
        error: 'Invalid certificate format (not JSON parsable)',
        verifiedCertificateInfo: null,
        certificateValid: false,
        messageSignatureValid: false,
        overallStatus: 'failed',
        details: 'Certificate string could not be parsed.',
       }, { status: 400 });
    }
    
    // Step 1: Verify the certificate itself
    const { signature: certSignature, ...certPayload } = certificate;
    if (!certSignature) {
        return NextResponse.json({ 
            error: 'Certificate is missing its own signature.',
            verifiedCertificateInfo: parsedCertificateInfo, // Still return parsed info if available
            certificateValid: false,
            messageSignatureValid: false,
            overallStatus: 'failed',
            details: 'Certificate is malformed (missing its own signature).',
        }, { status: 400 });
    }

    const verifyCert = crypto.createVerify('SHA256');
    verifyCert.update(JSON.stringify(certPayload)); // Verify the payload part
    verifyCert.end();
    const certificateValid = verifyCert.verify(caCryptoKeys.publicKey, certSignature, 'base64');

    if (!certificateValid) {
      console.log('Certificate verification FAILED against CA public key.');
      return NextResponse.json({
        verifiedCertificateInfo: parsedCertificateInfo,
        certificateValid: false,
        messageSignatureValid: false, // If cert is invalid, no need to check message sig
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
      verifiedCertificateInfo: parsedCertificateInfo,
      certificateValid: true,
      messageSignatureValid,
      overallStatus: messageSignatureValid ? 'success' : 'failed',
      details: messageSignatureValid ? `Message from ${certPayload.subjectAgentId} (Endpoint: ${certPayload.subjectAnsEndpoint}) and its certificate are valid.` : `Message signature is invalid for ${certPayload.subjectAgentId}. Certificate was valid.`,
    });

  } catch (error: any) {
    console.error('Error verifying message:', error);
    // Try to return parsedCertificateInfo even in case of other errors if it was parsed
    const certInfoForError = certificateStringified ? (()=>{try{return JSON.parse(certificateStringified);}catch{return null}})() : null;
    return NextResponse.json({
        error: 'Failed to verify message', 
        details: error.message,
        verifiedCertificateInfo: certInfoForError ? {
            subjectAgentId: certInfoForError.subjectAgentId,
            subjectAnsEndpoint: certInfoForError.subjectAnsEndpoint,
            issuer: certInfoForError.issuer,
        } : null,
        certificateValid: false,
        messageSignatureValid: false,
        overallStatus: 'failed',
    }, { status: 500 });
  }
}
