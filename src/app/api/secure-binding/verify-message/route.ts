
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

export async function POST(request: Request) {
  let certificateStringified: string | undefined; // Define outside try block for wider scope in catch
  try {
    const body = await request.json();
    certificateStringified = body.certificateStringified; // Assign here
    const { message, signature } = body;

    if (typeof message !== 'string' || !signature || !certificateStringified) {
      return NextResponse.json({ error: 'Message, signature, and stringified certificate are required' }, { status: 400 });
    }

    const caCryptoKeys = getOrInitializeCACryptoKeys(); 
    if (!caCryptoKeys || !caCryptoKeys.publicKey) { 
      return NextResponse.json({ error: 'CA not initialized or public key missing. Cannot verify certificate.' }, { status: 500 });
    }

    let certificate: SignedCertificate;
    let parsedCertificateInfo: Partial<CertificatePayload> | null = null;

    try {
      certificate = JSON.parse(certificateStringified);
      parsedCertificateInfo = {
        subjectAgentId: certificate.subjectAgentId,
        subjectPublicKey: certificate.subjectPublicKey,
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
    
    const { signature: certSignature, ...certPayload } = certificate;
    if (!certSignature) {
        return NextResponse.json({ 
            error: 'Certificate is missing its own signature.',
            verifiedCertificateInfo: parsedCertificateInfo,
            certificateValid: false,
            messageSignatureValid: false,
            overallStatus: 'failed',
            details: 'Certificate is malformed (missing its own signature).',
        }, { status: 400 });
    }

    const verifyCert = crypto.createVerify('SHA256');
    verifyCert.update(JSON.stringify(certPayload)); 
    verifyCert.end();
    const certificateValid = verifyCert.verify(caCryptoKeys.publicKey, certSignature, 'base64');

    if (!certificateValid) {
      console.log('Certificate verification FAILED against CA public key.');
      return NextResponse.json({
        verifiedCertificateInfo: parsedCertificateInfo,
        certificateValid: false,
        messageSignatureValid: false, 
        overallStatus: 'failed',
        details: 'Certificate signature is invalid (not signed by trusted CA).',
      });
    }
    console.log('Certificate successfully verified against CA public key.');

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
    let certInfoForErrorDisplay = null;
    if (certificateStringified) { // Use the variable from outer scope
        try {
            const parsedForError = JSON.parse(certificateStringified);
            certInfoForErrorDisplay = {
                subjectAgentId: parsedForError.subjectAgentId,
                subjectAnsEndpoint: parsedForError.subjectAnsEndpoint,
                issuer: parsedForError.issuer,
            };
        } catch { 
        }
    }

    return NextResponse.json({
        error: 'Failed to verify message', 
        details: error.message,
        verifiedCertificateInfo: certInfoForErrorDisplay,
        certificateValid: false,
        messageSignatureValid: false,
        overallStatus: 'failed',
    }, { status: 500 });
  }
}
