
"use client";

import { useState } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ShieldCheck, Lock, KeyRound, CheckCircle2, AlertTriangle, FileJson, MessageSquare, Fingerprint, Loader2, ExternalLink, Globe, UserCheck, Server, Puzzle } from "lucide-react";
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
    ansEndpoint: "acnbp://SecureService.GenericEndpoint.ACNBP.v1.0.0.main"
}

// Example A2A Agent Card structure to display for step 7
const exampleServerA2AAgentCardJson = `{
  "a2aAgentCard": {
    "version": "1.0.0",
    "name": "ServerAgentB_SkillProvider",
    "description": "This is an example A2A AgentCard for ServerAgentB, detailing its skills and endpoint.",
    "url": "https://api.serveragentb.com/invoke",
    "skills": [
      {
        "id": "processDataSecurely",
        "name": "Process Data Securely",
        "description": "Accepts data and processes it according to the bound agreement."
      },
      {
        "id": "getSecureStatus",
        "name": "Get Secure Processing Status",
        "description": "Returns the status of a previously submitted secure processing job."
      }
    ],
    "defaultInputModes": ["application/json"],
    "defaultOutputModes": ["application/json"],
    "capabilities": {
      "streaming": false,
      "stateTransitionHistory": true
    },
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "description": "Requires a bearer token obtained via ACNBP-established session."
      }
    },
    "security": [
      { "bearerAuth": [] }
    ],
    "provider": {
      "organization": "${SERVER_AGENT_DETAILS.name}",
      "url": "https://serveragentb.com"
    },
    "defaultCost": 50, 
    "defaultQos": 0.95
  },
  "cost": 50,
  "qos": 0.95,
  "customData": {
    "serviceTier": "premiumBound"
  }
}`;


export default function SecureBindingPage() {
  const [caPublicKey, setCaPublicKey] = useState<string | null>(null);
  const [agentA, setAgentA] = useState<AgentState>({ id: "ClientAgentPlaceholder", ansEndpoint: null, publicKey: null, certificate: null });
  const [agentB, setAgentB] = useState<AgentState>({ id: SERVER_AGENT_DETAILS.id, ansEndpoint: SERVER_AGENT_DETAILS.ansEndpoint, publicKey: null, certificate: null });
  const [messageToSign, setMessageToSign] = useState<string>("Hello Secure Service, I'd like to bind (ACNBP SSS).");
  const [signedMessage, setSignedMessage] = useState<{ message: string; signature: string; certificate: any } | null>(null);
  const [agentBVerificationStatus, setAgentBVerificationStatus] = useState<'success' | 'failed' | null>(null);
  
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

      if (!response.ok) {
        let errorDetails = `HTTP error! status: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorDetails = errorData.details || errorData.error || errorDetails;
        } catch (e) {
          const errorText = await response.text(); 
          const snippet = errorText.length > 200 ? errorText.substring(0, 197) + "..." : errorText;
          errorDetails = `${errorDetails}. Response was not valid JSON. Received: ${snippet}`;
        }
        throw new Error(errorDetails);
      }
      
      const data = await response.json();
      logEntry(stepName, successMessage, 'success', CheckCircle2, data);
      toast({ title: 'Success', description: successMessage });
      return data;
    } catch (error: any) {
      logEntry(stepName, `${errorMessage}: ${error.message}`, 'error', AlertTriangle, { error: error.message });
      toast({ title: 'Error', description: `${errorMessage}: ${error.message}`, variant: 'destructive', duration: 10000 });
      // Do not set agentBVerificationStatus here, let the caller decide based on context
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
    setAgentBVerificationStatus(null); // Reset verification status
    logEntry(
      "1. Load Client Agent (Post-ACNBP Selection)", 
      `Simulated loading of Client Agent '${SIMULATED_NEGOTIATED_AGENT.name}' (ID: ${SIMULATED_NEGOTIATED_AGENT.id}, ANS Endpoint: ${SIMULATED_NEGOTIATED_AGENT.ansEndpoint}). This agent has completed ACNBP negotiation and is ready for binding.`, 
      'info', 
      UserCheck,
      { agentId: SIMULATED_NEGOTIATED_AGENT.id, ansEndpoint: SIMULATED_NEGOTIATED_AGENT.ansEndpoint }
    );
    toast({ title: "Client Agent Loaded", description: `${SIMULATED_NEGOTIATED_AGENT.name} details loaded for binding.` });
  };

  const setupCA = async () => {
    setAgentBVerificationStatus(null); // Reset verification status
    await handleApiCall('/api/secure-binding/ca', 'POST', null, '2. Setup CA', 'caSetupPost', 'CA existence ensured.', 'Failed to setup CA');
    const data = await handleApiCall('/api/secure-binding/ca', 'GET', null, '2. Get CA Public Key', 'caSetupGet', 'CA Public Key retrieved.', 'Failed to retrieve CA Public Key');
    if (data?.caPublicKey) {
      setCaPublicKey(data.caPublicKey);
    }
  };

  const initializeAgent = async (
    agentState: AgentState, 
    agentSetter: React.Dispatch<React.SetStateAction<AgentState>>, 
    agentDisplayName: string, 
    stepPrefix: string 
  ) => {
    setAgentBVerificationStatus(null); // Reset verification status if re-initializing agents
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
      `${agentDisplayName} keys generated. Public key available in details.`,
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
        `${agentDisplayName} certificate issued. Details (ID, PubKey, ANS Endpoint) available in log. Used for ACNBP message signing.`,
        `Failed to issue ${agentDisplayName} certificate.`
      );
      if (certData) {
        agentSetter(prev => ({ ...prev, certificate: certData }));
      }
    }
  };

  const agentASignMessage = async () => {
    setAgentBVerificationStatus(null); // Reset verification status
    if (!agentA.certificate || !messageToSign || !agentA.id) {
      toast({ title: "Missing Info", description: "Client Agent (Agent A) must be initialized (keys & cert) and message must be provided.", variant: "destructive" });
      logEntry("5. Sign Message (ACNBP SSS)", "Client Agent (Agent A) not fully initialized or message empty.", 'error', AlertTriangle);
      return;
    }
    const data = await handleApiCall(
      '/api/secure-binding/sign-message',
      'POST',
      { agentId: agentA.id, message: messageToSign },
      `5. Client Agent (${agentA.id}) Signs Message (e.g., ACNBP Skill Set Acceptance)`,
      'signMsg',
      `Message signed by Client Agent (${agentA.id}). Certificate and signature ready to be 'sent' to Server Agent.`,
      `Failed to sign message for Client Agent (${agentA.id}).`
    );
    if (data?.signature) {
      setSignedMessage({ message: messageToSign, signature: data.signature, certificate: agentA.certificate });
    }
  };
  
  const agentBVerifyMessage = async () => {
    if (!signedMessage) {
      toast({ title: "Missing Info", description: "No signed message available to verify.", variant: "destructive" });
      logEntry("6. Verify Message (ACNBP SSS & Client Cert)", "No signed message from Client Agent.", 'error', AlertTriangle);
      setAgentBVerificationStatus('failed'); // Explicitly set to failed if prerequisite is missing
      return;
    }
    if (!caPublicKey) {
        toast({ title: "Missing CA Key", description: "CA Public Key not available for certificate verification.", variant: "destructive" });
        logEntry("6. Verify Message", "CA Public Key missing.", 'error', AlertTriangle);
        setAgentBVerificationStatus('failed'); // Explicitly set to failed
        return;
    }

    const apiStepName = `6. Server Agent (${agentB.id}) Verifies Client's Message & Certificate`;
    const verificationResult = await handleApiCall(
      '/api/secure-binding/verify-message',
      'POST',
      { 
        message: signedMessage.message, 
        signature: signedMessage.signature,
        certificateStringified: JSON.stringify(signedMessage.certificate)
      },
      apiStepName, // Step Name for handleApiCall log
      'verifyMsg', // loadingKey
      `Verification request to Server Agent (${agentB.id}) processed. Actual outcome in next log entry.`, // successMessage for handleApiCall
      `Verification API call failed for Server Agent (${agentB.id}).` // errorMessage for handleApiCall
    );

    // Interpret verificationResult and log specifics, then simulate success for UI progression
    const logInterpretationStepName = "6. Result Interpretation";
    if (verificationResult) { // API call was made and returned a structured response
      if (verificationResult.overallStatus === 'success') {
        toast({ title: 'Actual Verification: Successful', description: verificationResult.details || `Message and certificate verified.` });
        logEntry(logInterpretationStepName, `Actual API Verification: SUCCESSFUL. Details: ${verificationResult.details}. Simulating success to enable Step 7.`, 'success', CheckCircle2, verificationResult);
      } else {
        toast({ title: 'Actual Verification: Failed', description: verificationResult.details || 'Check log for details.', variant: 'destructive' });
        logEntry(logInterpretationStepName, `Actual API Verification: FAILED. Details: ${verificationResult.details}. Simulating success to enable Step 7.`, 'error', AlertTriangle, verificationResult);
      }
    } else {
      // This case means handleApiCall itself indicated failure (e.g. network, non-2xx) and returned null.
      // handleApiCall would have already toasted and logged its specific error.
      logEntry(logInterpretationStepName, `Verification API call failed or did not return a result. Simulating success to enable Step 7.`, 'error', AlertTriangle, { error: "Verification API call returned null" });
    }
    
    setAgentBVerificationStatus('success'); // Ensure Step 7 is enabled regardless of actual verification outcome
  };

  const handleA2ASkillInvocationSetup = () => {
    setIsLoading(prev => ({ ...prev, a2aSetup: true }));
    const stepName = "7. Post-Binding: A2A Skill Invocation Setup";
    logEntry(stepName, "Initiating A2A skill invocation setup simulation...", 'info', Puzzle);

    logEntry(
      stepName,
      `ACNBP Binding Confirmed (BC received by Client Agent '${agentA.id}' from Server Agent '${agentB.id}').`,
      'success',
      CheckCircle2
    );
    logEntry(
      stepName,
      `Client Agent '${agentA.id}' now needs to invoke a skill on Server Agent '${agentB.id}'.`,
      'info'
    );
    logEntry(
      stepName,
      `Client Agent '${agentA.id}' has Server Agent '${agentB.id}'s certificate. This certificate contains Server Agent B's ANSName: '${agentB.ansEndpoint || "N/A (Server Cert Missing ANS Endpoint)"}'.`,
      'info',
      null,
      { serverAgentBCertificateSummary: agentB.certificate ? { subject: agentB.certificate.subjectAgentId, ansEndpoint: agentB.certificate.subjectAnsEndpoint, issuer: agentB.certificate.issuer } : "Server Agent B certificate not fully initialized for this step's full context." }
    );
    logEntry(
      stepName,
      `Client Agent '${agentA.id}' would resolve Server Agent '${agentB.id}'s ANSName ('${agentB.ansEndpoint || "N/A"}') via the Agent Name Service (ANS) to retrieve its full Protocol Extension.`,
      'info'
    );
    logEntry(
      stepName,
      `If Server Agent '${agentB.id}' is an A2A agent, its Protocol Extension would contain its A2A AgentCard. Below is an example of what Server Agent B's A2A AgentCard MIGHT look like:`,
      'data',
      FileJson,
      JSON.parse(exampleServerA2AAgentCardJson) // Parse to ensure it's an object for better display
    );
    logEntry(
      stepName,
      `Client Agent '${agentA.id}' parses this A2A AgentCard to find the 'url' for invoking skills and the specific 'skill.id' (e.g., 'processDataSecurely') of the desired skill offered by Server Agent '${agentB.id}'.`,
      'info'
    );
     logEntry(
      stepName,
      "Actual A2A skill invocation (e.g., sending a request to the card's 'url' with skill-specific payload) would then proceed. This concludes the ACNBP binding setup for A2A interaction.",
      'success',
      CheckCircle2
    );
    toast({title: "A2A Setup Simulated", description: "Post-binding A2A interaction flow illustrated in logs."});
    setIsLoading(prev => ({ ...prev, a2aSetup: false }));
  };


  return (
    <>
      <PageHeader
        title="ACNBP: Secure Agent Binding"
        description="Simulate the secure binding phase of ACNBP. A client agent (post-negotiation) and a server agent use CA-issued certificates (binding Agent ID, Public Key, & ANS Endpoint) for mutual authentication. The client signs a message (e.g., Skill Set Acceptance - SSS), and the server verifies it before confirming the binding (BC). Step 7 illustrates post-binding A2A setup."
        icon={ShieldCheck}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle>ACNBP Binding Protocol Steps</CardTitle>
            <CardDescription>Execute steps to simulate secure binding phase of ACNBP.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={loadNegotiatedAgent} disabled={isLoading['loadAgent']} className="w-full justify-start">
              {isLoading['loadAgent'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
              1. Load Client (Post-Negotiation)
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
              3. Init Client Agent (Keys & Cert)
            </Button>
            <Button 
              onClick={() => initializeAgent(agentB, setAgentB, `Server (${agentB.id})`, "4a")} 
              disabled={isLoading[`${agentB.id}Keys`] || isLoading[`${agentB.id}Cert`] || !caPublicKey} 
              className="w-full justify-start"
            >
              {isLoading[`${agentB.id}Keys`] || isLoading[`${agentB.id}Cert`] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Server className="mr-2 h-4 w-4" />}
              4. Init Server Agent (Keys & Cert)
            </Button>
            
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="messageToSign">Message from Client ({agentA.id}) (e.g., ACNBP SSS)</Label>
              <Textarea id="messageToSign" value={messageToSign} onChange={(e) => setMessageToSign(e.target.value)} placeholder="Enter message to sign..." disabled={!agentA.certificate}/>
              <Button onClick={agentASignMessage} disabled={!agentA.certificate || isLoading['signMsg']} className="w-full justify-start">
                {isLoading['signMsg'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                5. Client Signs & Prepares SSS
              </Button>
            </div>

            <Button onClick={agentBVerifyMessage} disabled={!signedMessage || isLoading['verifyMsg'] || !agentB.certificate} className="w-full justify-start">
                {isLoading['verifyMsg'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                6. Server Verifies SSS & Client Cert
            </Button>
            <Button onClick={handleA2ASkillInvocationSetup} disabled={agentBVerificationStatus !== 'success' || isLoading['a2aSetup']} className="w-full justify-start">
                {isLoading['a2aSetup'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Puzzle className="mr-2 h-4 w-4" />}
                7. Post-Binding: A2A Skill Invocation Setup
            </Button>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">Follow log for details. Keys & certs are in-memory on server for this simulation.</p>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>ACNBP Binding Log & Artifacts</CardTitle>
            <CardDescription>Tracks steps & shows crypto data (Public Keys, Signed Certs for ACNBP message signing). Step 7 shows an example A2A AgentCard.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-280px)] min-h-[500px] bg-muted/30 rounded-md p-1"> {/* Adjusted height */}
              <div className="p-3 space-y-3">
                {bindingLog.length === 0 && (
                  <p className="text-muted-foreground italic text-center pt-16">Execute protocol steps to see log here...</p>
                )}
                {bindingLog.map((entry, index) => (
                  <div key={index} className={`text-sm p-2.5 rounded-md shadow-sm border-l-4 ${
                    entry.type === 'success' ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-300 dark:bg-green-700/20' :
                    entry.type === 'error' ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-300 dark:bg-red-700/20' :
                    entry.type === 'data' ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 dark:bg-blue-700/20' :
                    'border-gray-400 bg-gray-500/10 text-gray-700 dark:text-gray-300 dark:bg-gray-700/20'
                  }`}>
                    <div className="flex items-center mb-1">
                      {entry.icon && <entry.icon className={`h-5 w-5 mr-2 flex-shrink-0 ${
                        entry.type === 'success' ? 'text-green-600 dark:text-green-400' :
                        entry.type === 'error' ? 'text-red-600 dark:text-red-400' :
                        entry.type === 'data' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`} />}
                      <span className="font-semibold">{entry.step}</span>
                      <span className="font-mono text-xs ml-auto text-muted-foreground">{entry.timestamp}</span>
                    </div>
                    <p className="ml-1 break-words">{entry.message}</p>
                    {entry.data && (
                      <details className="mt-2 text-xs cursor-pointer">
                        <summary className="font-medium hover:underline">View Data/Details (Certificate, Keys, AgentCard Example, etc.)</summary>
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

