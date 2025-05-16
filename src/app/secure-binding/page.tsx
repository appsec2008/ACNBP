
"use client";

import { useState } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ShieldCheck, Lock, KeyRound, CheckCircle2, AlertTriangle, FileJson, MessageSquare, Fingerprint, Loader2, ExternalLink, Globe, UserCheck, Server } from "lucide-react";
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
  ansEndpoint: string | null;
  publicKey: string | null;
  certificate: any | null; 
}

// Simulating an agent that could be chosen from negotiation
const SIMULATED_NEGOTIATED_AGENT = {
  id: "svc1", // Matches ID of ImageAnalysisPro from negotiation API
  name: "ImageAnalysisPro (Client)",
  ansEndpoint: "a2a://ImagePro.ImageRecognition.VisionCorp.v1.2.0.gpu-optimized"
};

const SERVER_AGENT_DETAILS = {
    id: "ServerAgentB",
    name: "SecureServiceEndpoint (Server)",
    ansEndpoint: "a2a://SecureService.GenericEndpoint.ACNBP.v1.0.0.main"
}

export default function SecureBindingPage() {
  const [caPublicKey, setCaPublicKey] = useState<string | null>(null);
  const [agentA, setAgentA] = useState<AgentState>({ id: "ClientAgentPlaceholder", ansEndpoint: null, publicKey: null, certificate: null });
  const [agentB, setAgentB] = useState<AgentState>({ id: SERVER_AGENT_DETAILS.id, ansEndpoint: SERVER_AGENT_DETAILS.ansEndpoint, publicKey: null, certificate: null });
  const [messageToSign, setMessageToSign] = useState<string>("Hello Secure Service, I'd like to bind.");
  const [signedMessage, setSignedMessage] = useState<{ message: string; signature: string; certificate: any } | null>(null);
  
  const [bindingLog, setBindingLog] = useState<BindingLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();
  const [negotiatedAgentLoaded, setNegotiatedAgentLoaded] = useState(false);

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

  const loadNegotiatedAgent = () => {
    setAgentA({
      id: SIMULATED_NEGOTIATED_AGENT.id,
      ansEndpoint: SIMULATED_NEGOTIATED_AGENT.ansEndpoint,
      publicKey: null,
      certificate: null,
    });
    setNegotiatedAgentLoaded(true);
    logEntry(
      "1. Load Negotiated Agent", 
      `Simulated loading of '${SIMULATED_NEGOTIATED_AGENT.name}'. ID: ${SIMULATED_NEGOTIATED_AGENT.id}, ANS Endpoint: ${SIMULATED_NEGOTIATED_AGENT.ansEndpoint}. This agent will act as the client.`, 
      'info', 
      UserCheck,
      { agentId: SIMULATED_NEGOTIATED_AGENT.id, ansEndpoint: SIMULATED_NEGOTIATED_AGENT.ansEndpoint }
    );
    toast({ title: "Agent Loaded", description: `${SIMULATED_NEGOTIATED_AGENT.name} details loaded for binding.` });
  };

  const setupCA = async () => {
    await handleApiCall('/api/secure-binding/ca', 'POST', null, '2. Setup CA', 'caSetupPost', 'CA existence ensured.', 'Failed to setup CA');
    const data = await handleApiCall('/api/secure-binding/ca', 'GET', null, '2. Get CA Public Key', 'caSetupGet', 'CA Public Key retrieved.', 'Failed to retrieve CA Public Key');
    if (data?.caPublicKey) {
      setCaPublicKey(data.caPublicKey);
    }
  };

  const initializeAgent = async (
    agentState: AgentState, 
    agentSetter: React.Dispatch<React.SetStateAction<AgentState>>, 
    agentDisplayName: string, // e.g., "Client Agent (Agent A)"
    stepPrefix: string // e.g., "3a"
  ) => {
    if (!agentState.id || !agentState.ansEndpoint) {
        logEntry(`Initialize ${agentDisplayName}`, `${agentDisplayName} ID or ANS Endpoint not set. Load agent first.`, 'error', AlertTriangle);
        toast({ title: "Initialization Error", description: `Details for ${agentDisplayName} are missing.`, variant: 'destructive'});
        return;
    }

    logEntry(`Initialize ${agentDisplayName}`, `${agentDisplayName} using ID: ${agentState.id}, ANS Endpoint: ${agentState.ansEndpoint}`, 'info', Globe);

    const keyData = await handleApiCall(
      '/api/secure-binding/agent-keys', 
      'POST', 
      { agentId: agentState.id }, 
      `${stepPrefix}. Generate ${agentDisplayName} Keys`, 
      `${agentState.id}Keys`,
      `${agentDisplayName} keys generated.`,
      `Failed to generate ${agentDisplayName} keys.`
    );

    if (keyData?.publicKey) {
      agentSetter(prev => ({ ...prev, publicKey: keyData.publicKey }));
      const certData = await handleApiCall(
        '/api/secure-binding/issue-certificate',
        'POST',
        { agentId: agentState.id, agentPublicKey: keyData.publicKey, agentAnsEndpoint: agentState.ansEndpoint },
        `${stepPrefix === "3a" ? "3b" : "4b"}. Issue ${agentDisplayName} Certificate (ID, PubKey, ANS Endpoint)`,
        `${agentState.id}Cert`,
        `${agentDisplayName} certificate issued with its ID, Public Key, and ANS endpoint.`,
        `Failed to issue ${agentDisplayName} certificate.`
      );
      if (certData) {
        agentSetter(prev => ({ ...prev, certificate: certData }));
      }
    }
  };

  const agentASignMessage = async () => {
    if (!agentA.certificate || !messageToSign || !agentA.id) {
      toast({ title: "Missing Info", description: "Client Agent (Agent A) must be initialized (keys & cert) and message must be provided.", variant: "destructive" });
      logEntry("5. Sign Message", "Client Agent (Agent A) not fully initialized or message empty.", 'error', AlertTriangle);
      return;
    }
    const data = await handleApiCall(
      '/api/secure-binding/sign-message',
      'POST',
      { agentId: agentA.id, message: messageToSign },
      `5. Client Agent (${agentA.id}) Signs Message`,
      'signMsg',
      `Message signed by Client Agent (${agentA.id}). Certificate and signature ready to be "sent".`,
      `Failed to sign message.`
    );
    if (data?.signature) {
      setSignedMessage({ message: messageToSign, signature: data.signature, certificate: agentA.certificate });
    }
  };
  
  const agentBVerifyMessage = async () => {
    if (!signedMessage) {
      toast({ title: "Missing Info", description: "No signed message available to verify.", variant: "destructive" });
      logEntry("6. Verify Message", "No signed message from Client Agent.", 'error', AlertTriangle);
      return;
    }
    if (!caPublicKey) {
        toast({ title: "Missing CA Key", description: "CA Public Key not available for certificate verification.", variant: "destructive" });
        logEntry("6. Verify Message", "CA Public Key missing.", 'error', AlertTriangle);
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
      `6. Server Agent (${agentB.id}) Verifies Message & Client's Certificate`,
      'verifyMsg',
      `Verification attempt complete by Server Agent (${agentB.id}). Check details below.`,
      `Verification process failed for Server Agent (${agentB.id}).`
    );
    // Log details are already handled by handleApiCall based on verificationResult content
    // The certificate from signedMessage.certificate (which includes agent A's ID and ANS endpoint) is shown in the log for step 5.
    // The verification result in step 6 will confirm if this certificate was valid and if the message signature matched.
  };

  return (
    <>
      <PageHeader
        title="Secure Binding Protocol Demonstration"
        description="Simulate binding between a client (loaded from negotiation) and a server. CA signs certificates binding Agent ID, Public Key, & ANS Endpoint. Client signs a message. Server verifies the client's certificate against CA and then the message signature against the client's certificate."
        icon={ShieldCheck}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle>Protocol Steps</CardTitle>
            <CardDescription>Execute steps to simulate secure binding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={loadNegotiatedAgent} disabled={isLoading['loadAgent']} className="w-full justify-start">
              {isLoading['loadAgent'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
              1. Load Negotiated Client Agent
            </Button>
            <Button onClick={setupCA} disabled={isLoading['caSetupPost'] || isLoading['caSetupGet'] || !negotiatedAgentLoaded} className="w-full justify-start">
              {isLoading['caSetupPost'] || isLoading['caSetupGet'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              2. Setup CA & Get Public Key
            </Button>
            <Button 
              onClick={() => initializeAgent(agentA, setAgentA, `Client (${agentA.id})`, "3a")} 
              disabled={!negotiatedAgentLoaded || isLoading[`${agentA.id}Keys`] || isLoading[`${agentA.id}Cert`] || !caPublicKey} 
              className="w-full justify-start"
            >
              {isLoading[`${agentA.id}Keys`] || isLoading[`${agentA.id}Cert`] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
              3. Initialize Client Agent (Keys & Cert)
            </Button>
            <Button 
              onClick={() => initializeAgent(agentB, setAgentB, `Server (${agentB.id})`, "4a")} 
              disabled={isLoading[`${agentB.id}Keys`] || isLoading[`${agentB.id}Cert`] || !caPublicKey} 
              className="w-full justify-start"
            >
              {isLoading[`${agentB.id}Keys`] || isLoading[`${agentB.id}Cert`] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Server className="mr-2 h-4 w-4" />}
              4. Initialize Server Agent (Keys & Cert)
            </Button>
            
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="messageToSign">Message from Client Agent ({agentA.id})</Label>
              <Textarea id="messageToSign" value={messageToSign} onChange={(e) => setMessageToSign(e.target.value)} placeholder="Enter message to sign..." disabled={!agentA.certificate}/>
              <Button onClick={agentASignMessage} disabled={!agentA.certificate || isLoading['signMsg']} className="w-full justify-start">
                {isLoading['signMsg'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                5. Client Signs & Prepares Message
              </Button>
            </div>

            <Button onClick={agentBVerifyMessage} disabled={!signedMessage || isLoading['verifyMsg'] || !agentB.certificate} className="w-full justify-start">
                {isLoading['verifyMsg'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                6. Server Verifies Message & Certificate
            </Button>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">Follow log for details. Keys & certs are in-memory on server.</p>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Binding Log & Cryptographic Artifacts</CardTitle>
            <CardDescription>Tracks the steps and shows cryptographic data (e.g., Public Keys, Signed Certificates including Agent IDs & ANS Endpoints).</CardDescription>
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
                        <summary className="font-medium hover:underline">View Data/Details (Certificate, Keys, etc.)</summary>
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

    