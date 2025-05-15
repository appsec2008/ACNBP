"use client";

import { useState } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ShieldCheck, Lock, UserCheck, KeyRound, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';

interface BindingLogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
  icon?: React.ElementType;
}

const dummyAgents = [
  { id: "agentA", name: "Agent Alpha (Trustworthy)" },
  { id: "agentB", name: "Agent Beta (Requires MFA)" },
  { id: "agentC", name: "Agent Charlie (Basic Security)" },
];

export default function SecureBindingPage() {
  const [selectedAgent, setSelectedAgent] = useState<string>(dummyAgents[0].id);
  const [verifyCert, setVerifyCert] = useState(true);
  const [checkReputation, setCheckReputation] = useState(false);
  const [multiFactor, setMultiFactor] = useState(false);
  const [bindingLog, setBindingLog] = useState<BindingLogEntry[]>([]);
  const [isBinding, setIsBinding] = useState(false);
  const { toast } = useToast();

  const handleInitiateBinding = () => {
    setIsBinding(true);
    setBindingLog([]);
    const agentToBind = dummyAgents.find(a => a.id === selectedAgent);

    const logEntry = (message: string, type: 'info' | 'success' | 'error', icon?: React.ElementType) => {
      setBindingLog(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString(), icon }]);
    };
    
    logEntry(`Initiating secure binding with ${agentToBind?.name}...`, 'info', KeyRound);

    setTimeout(() => {
      let successfulBinding = true;
      if (verifyCert) {
        logEntry("Verifying digital certificate...", 'info');
        // Simulate certificate check
        if (agentToBind?.name === "Agent Alpha (Trustworthy)" || agentToBind?.name === "Agent Beta (Requires MFA)") {
          logEntry("Digital certificate VERIFIED.", 'success', CheckCircle2);
        } else {
          logEntry("Digital certificate INVALID or missing.", 'error', AlertTriangle);
          successfulBinding = false;
        }
      } else {
        logEntry("Skipping digital certificate verification (Not Recommended).", 'info', AlertTriangle);
      }

      if (checkReputation && successfulBinding) {
        logEntry("Checking agent reputation score...", 'info');
        // Simulate reputation check
        if (agentToBind?.name === "Agent Alpha (Trustworthy)") {
            logEntry("Agent reputation HIGH.", 'success', CheckCircle2);
        } else {
            logEntry("Agent reputation UNKNOWN or LOW.", 'error', AlertTriangle);
            // successfulBinding = false; // Could make this a failure point
        }
      }

      if (multiFactor && successfulBinding) {
        logEntry("Attempting Multi-Factor Authentication...", 'info');
         if (agentToBind?.name === "Agent Beta (Requires MFA)" || agentToBind?.name === "Agent Alpha (Trustworthy)") {
            logEntry("Multi-Factor Authentication SUCCESSFUL.", 'success', CheckCircle2);
        } else {
            logEntry("Multi-Factor Authentication FAILED.", 'error', AlertTriangle);
            successfulBinding = false;
        }
      } else if (!multiFactor && agentToBind?.name === "Agent Beta (Requires MFA)") {
         logEntry("MFA required for Agent Beta but not attempted. Binding may be insecure.", 'error', AlertTriangle);
         successfulBinding = false; // MFA is critical for this agent
      }


      if (successfulBinding) {
        logEntry(`Secure binding established with ${agentToBind?.name}.`, 'success', Lock);
        toast({ title: "Binding Successful", description: `Secure channel established with ${agentToBind?.name}.` });
      } else {
        logEntry(`Failed to establish secure binding with ${agentToBind?.name}. Review logs.`, 'error', AlertTriangle);
        toast({ title: "Binding Failed", description: `Could not establish secure channel with ${agentToBind?.name}.`, variant: "destructive" });
      }
      setIsBinding(false);
    }, 1500);
  };


  return (
    <>
      <PageHeader
        title="Secure Binding Protocol"
        description="Establish a secure and trusted communication channel with another agent by configuring and initiating the binding protocol. Observe the steps and outcome of the binding process."
        icon={ShieldCheck}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle>Binding Configuration</CardTitle>
            <CardDescription>Select an agent and security mechanisms for binding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="agentSelect">Agent to Bind With</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger id="agentSelect">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {dummyAgents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <Label>Security Mechanisms</Label>
              <div className="flex items-center space-x-2">
                <Checkbox id="verifyCert" checked={verifyCert} onCheckedChange={(checked) => setVerifyCert(Boolean(checked))} />
                <Label htmlFor="verifyCert" className="font-normal">Verify Digital Certificate</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="checkReputation" checked={checkReputation} onCheckedChange={(checked) => setCheckReputation(Boolean(checked))} />
                <Label htmlFor="checkReputation" className="font-normal">Check Reputation Score</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="multiFactor" checked={multiFactor} onCheckedChange={(checked) => setMultiFactor(Boolean(checked))} />
                <Label htmlFor="multiFactor" className="font-normal">Multi-Factor Authentication</Label>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleInitiateBinding} disabled={isBinding}>
              {isBinding ? <Lock className="mr-2 h-4 w-4 animate-pulse" /> : <KeyRound className="mr-2 h-4 w-4" />}
              Initiate Secure Binding
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Binding Log & Outcome</CardTitle>
            <CardDescription>Tracks the steps of the binding process and its final outcome.</CardDescription>
          </CardHeader>
          <CardContent className="h-96 bg-muted/30 rounded-md p-4 overflow-auto space-y-2">
            {bindingLog.length === 0 && !isBinding && (
              <p className="text-muted-foreground italic text-center pt-16">Configure and initiate binding to see log here...</p>
            )}
            {isBinding && bindingLog.length === 0 && (
                <p className="text-muted-foreground italic text-center pt-16">Binding in progress...</p>
            )}
            {bindingLog.map((entry, index) => (
              <div key={index} className={`flex items-start text-sm p-2 rounded-sm ${
                entry.type === 'success' ? 'bg-green-500/10 text-green-700' :
                entry.type === 'error' ? 'bg-red-500/10 text-red-700' :
                'bg-blue-500/10 text-blue-700'
              }`}>
                {entry.icon && <entry.icon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />}
                <span className="font-mono text-xs mr-2">{entry.timestamp}</span>
                <span>{entry.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
