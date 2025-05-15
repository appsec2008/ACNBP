
"use client";

import { useState } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ShieldCheck, Lock, KeyRound, CheckCircle2, AlertTriangle, FileJson, MessageSquare, Fingerprint, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BindingLogEntry {
  timestamp: string;
  step: string;
  message: string;
  data?: any;
  type: 'info' | 'success' | 'error' | 'data';
  icon?: React.ElementType;
}

interface AgentState {
  id: string;
  publicKey: string | null;
  certificate: any | null; // Store the full certificate object
}

export default function SecureBindingPage() {
  const [caPublicKey, setCaPublicKey] = useState<string | null>(null);
  const [agentA, setAgentA] = useState<AgentState>({ id: "AgentA", publicKey: null, certificate: null });
  const [agentB, setAgentB] = useState<AgentState>({ id: "AgentB", publicKey: null, certificate: null });
  const [messageToSign, setMessageToSign] = useState<string>("Hello Agent B, let's bind securely!");
  const [signedMessage, setSignedMessage] = useState<{ message: string; signature: string; certificate: any } | null>(null);
  
  const [bindingLog, setBindingLog] = useState<BindingLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();

  const logEntry = (step: string, message: string, type: 'info' | 'success' | 'error' | 'data', icon?: React.ElementType, data?: any) => {
    setBindingLog(prev => [...prev, { step, message, type, icon, data, timestamp: new Date().toLocaleTimeString() }]);
  };

  const handleApiCall = async (
    endpoint: string, 
    method: 'GET' | 'POST', 
    body: any | null, 
    stepName: string, 
    loadingKey: string,
    successMessage: string,
    errorMessage: string
  ): Promise<any> => {
    setIsLoading(prev => ({ ...prev, [loadingKey]: true }));
    logEntry(stepName, `Initiating: ${stepName}...`, 'info', Loader2);
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      logEntry(stepName, `${successMessage}`, 'success', CheckCircle2, data);
      toast({ title: 'Success', description: successMessage });
      return data;
    } catch (error: any) {
      logEntry(stepName, `${errorMessage}: ${error.message}`, 'error', AlertTriangle, error);
      toast({ title: 'Error', description: `${errorMessage}: ${error.message}`, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const setupCA = async () => {
    await handleApiCall('/api/secure-binding/ca', 'POST', null, '1. Setup CA', 'caSetupPost', 'CA existence ensured.', 'Failed to setup CA');
    const data = await handleApiCall('/api/secure-binding/ca', 'GET', null, '1. Get CA Public Key', 'caSetupGet', 'CA Public Key retrieved.', 'Failed to retrieve CA Public Key');
    if (data?.caPublicKey) {
      setCaPublicKey(data.caPublicKey);
    }
  };

  const initializeAgent = async (agentId: 'AgentA' | 'AgentB', loadingKeyPrefix: string) => {
    const agentSetter = agentId === 'AgentA' ? setAgentA : setAgentB;
    
    const keyData = await handleApiCall(
      '/api/secure-binding/agent-keys', 
      'POST', 
      { agentId }, 
      `2a. Generate ${agentId} Keys`, 
      `${loadingKeyPrefix}Keys`,
      `${agentId} keys generated.`,
      `Failed to generate ${agentId} keys.`
    );

    if (keyData?.publicKey) {
      agentSetter(prev => ({ ...prev, publicKey: keyData.publicKey }));
      const certData = await handleApiCall(
        '/api/secure-binding/issue-certificate',
        'POST',
        { agentId, agentPublicKey: keyData.publicKey },
        `2b. Issue ${agentId} Certificate`,
        `${loadingKeyPrefix}Cert`,
        `${agentId} certificate issued.`,
        `Failed to issue ${agentId} certificate.`
      );
      if (certData) {
        agentSetter(prev => ({ ...prev, certificate: certData }));
      }
    }
  };

  const agentASignMessage = async () => {
    if (!agentA.certificate || !messageToSign) {
      toast({ title: "Missing Info", description: "Agent A must be initialized and message must be provided.", variant: "destructive" });
      logEntry("4. Sign Message", "Agent A not initialized or message empty.", 'error', AlertTriangle);
      return;
    }
    const data = await handleApiCall(
      '/api/secure-binding/sign-message',
      'POST',
      { agentId: agentA.id, message: messageToSign },
      `4. ${agentA.id} Signs Message`,
      'signMsg',
      `Message signed by ${agentA.id}.`,
      `Failed to sign message.`
    );
    if (data?.signature) {
      setSignedMessage({ message: messageToSign, signature: data.signature, certificate: agentA.certificate });
    }
  };
  
  const agentBVerifyMessage = async () => {
    if (!signedMessage) {
      toast({ title: "Missing Info", description: "No signed message available to verify.", variant: "destructive" });
      logEntry("5. Verify Message", "No signed message from Agent A.", 'error', AlertTriangle);
      return;
    }
    if (!caPublicKey) {
        toast({ title: "Missing CA Key", description: "CA Public Key not available for certificate verification.", variant: "destructive" });
        logEntry("5. Verify Message", "CA Public Key missing.", 'error', AlertTriangle);
        return;
    }

    const verificationResult = await handleApiCall(
      '/api/secure-binding/verify-message',
      'POST',
      { 
        message: signedMessage.message, 
        signature: signedMessage.signature,
        certificateStringified: JSON.stringify(signedMessage.certificate)
      },
      `5. ${agentB.id} Verifies Message`,
      'verifyMsg',
      `Verification attempt complete by ${agentB.id}.`,
      `Verification failed.`
    );
    // Log details are already handled by handleApiCall
  };

  return (
    <>
      <PageHeader
        title="Secure Binding Protocol Demonstration"
        description="Establish a secure channel using cryptographic operations. This demo uses backend APIs for key generation, certificate issuance (signed JSON), and digital signature verification."
        icon={ShieldCheck}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle>Protocol Steps</CardTitle>
            <CardDescription>Execute steps to simulate secure binding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={setupCA} disabled={isLoading['caSetupPost'] || isLoading['caSetupGet']} className="w-full justify-start">
              {isLoading['caSetupPost'] || isLoading['caSetupGet'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              1. Setup CA & Get Public Key
            </Button>
            <Button onClick={() => initializeAgent('AgentA', 'agentA')} disabled={isLoading['agentAKeys'] || isLoading['agentACert']} className="w-full justify-start">
              {isLoading['agentAKeys'] || isLoading['agentACert'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
              2. Initialize Agent A (Client)
            </Button>
            <Button onClick={() => initializeAgent('AgentB', 'agentB')} disabled={isLoading['agentBKeys'] || isLoading['agentBCert']} className="w-full justify-start">
              {isLoading['agentBKeys'] || isLoading['agentBCert'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
              3. Initialize Agent B (Server)
            </Button>
            
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="messageToSign">Message from Agent A</Label>
              <Textarea id="messageToSign" value={messageToSign} onChange={(e) => setMessageToSign(e.target.value)} placeholder="Enter message to sign..."/>
              <Button onClick={agentASignMessage} disabled={!agentA.certificate || isLoading['signMsg']} className="w-full justify-start">
                {isLoading['signMsg'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                4. Agent A Signs & "Sends"
              </Button>
            </div>

            <Button onClick={agentBVerifyMessage} disabled={!signedMessage || isLoading['verifyMsg']} className="w-full justify-start">
                {isLoading['verifyMsg'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                5. Agent B Verifies Message
            </Button>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">Follow log for details. Keys & certs are in-memory on server.</p>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Binding Log & Cryptographic Artifacts</CardTitle>
            <CardDescription>Tracks the steps and shows (mock) cryptographic data.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] bg-muted/30 rounded-md p-1">
              <div className="p-3 space-y-3">
                {bindingLog.length === 0 && (
                  <p className="text-muted-foreground italic text-center pt-16">Execute protocol steps to see log here...</p>
                )}
                {bindingLog.map((entry, index) => (
                  <div key={index} className={`text-sm p-2.5 rounded-md shadow-sm border-l-4 ${
                    entry.type === 'success' ? 'border-green-500 bg-green-500/10 text-green-700' :
                    entry.type === 'error' ? 'border-red-500 bg-red-500/10 text-red-700' :
                    entry.type === 'data' ? 'border-blue-500 bg-blue-500/10 text-blue-700' :
                    'border-gray-400 bg-gray-500/10 text-gray-700'
                  }`}>
                    <div className="flex items-center mb-1">
                      {entry.icon && <entry.icon className={`h-5 w-5 mr-2 flex-shrink-0 ${
                        entry.type === 'success' ? 'text-green-600' :
                        entry.type === 'error' ? 'text-red-600' :
                        entry.type === 'data' ? 'text-blue-600' : 'text-gray-600'}`} />}
                      <span className="font-semibold">{entry.step}</span>
                      <span className="font-mono text-xs ml-auto text-muted-foreground">{entry.timestamp}</span>
                    </div>
                    <p className="ml-1 break-words">{entry.message}</p>
                    {entry.data && (
                      <details className="mt-2 text-xs cursor-pointer">
                        <summary className="font-medium hover:underline">View Data/Details</summary>
                        <pre className="mt-1 p-2 bg-background/50 rounded whitespace-pre-wrap break-all overflow-x-auto max-h-60">
                          {JSON.stringify(entry.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
