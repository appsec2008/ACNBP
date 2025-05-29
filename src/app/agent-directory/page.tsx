
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ListTree, PlusCircle, Search, Server, Info, Fingerprint, FileJson, Globe, Tag, Package, Layers, Workflow, FileBadge, RefreshCcw, ShieldOff, CalendarClock, CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AgentRegistration, ANSProtocol } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';

export default function ANSAgentRegistryPage() {
  const [agents, setAgents] = useState<AgentRegistration[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({ form: false, list: true });

  // Form state
  const [protocol, setProtocol] = useState<ANSProtocol | "">("");
  const [agentID, setAgentID] = useState("");
  const [agentCapability, setAgentCapability] = useState("");
  const [provider, setProvider] = useState("");
  const [version, setVersion] = useState("");
  const [extension, setExtension] = useState("");
  const [protocolExtensions, setProtocolExtensions] = useState("");

  const fetchAgents = async () => {
    setIsLoading(prev => ({...prev, list: true}));
    try {
      const response = await fetch('/api/agent-registry');
      if (!response.ok) throw new Error('Failed to fetch agents');
      const data = await response.json();
      setAgents(data);
    } catch (error: any) {
      toast({ title: "Error Loading Agents", description: error.message || "Could not load agents.", variant: "destructive" });
    } finally {
      setIsLoading(prev => ({...prev, list: false}));
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const resetForm = (isInitialLoad = false) => {
    setProtocol("a2a");
    setAgentID(isInitialLoad ? "textProcessor" : "TextProcessor" + Math.floor(Math.random()*100));
    setAgentCapability("DocumentTranslation");
    setProvider("AcmeCorp");
    setVersion("1.0.0");
    setExtension("secure");
    setProtocolExtensions(JSON.stringify({ "endpoint": "https://acme.example.com/api/translate", "customData": {} }, null, 2));
  };

  useEffect(() => {
    resetForm(true); 
  }, []);


  const handleRegisterAgent = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(prev => ({...prev, form: true}));

    let parsedProtocolExtensions;
    try {
      parsedProtocolExtensions = JSON.parse(protocolExtensions);
      if (!parsedProtocolExtensions.endpoint || typeof parsedProtocolExtensions.endpoint !== 'string') {
        throw new Error("Protocol Extensions JSON must contain a valid 'endpoint' string.");
      }
    } catch (err:any) {
      toast({ title: "Registration Failed", description: err.message || "Protocol Extensions must be valid JSON and include an 'endpoint'.", variant: "destructive" });
      setIsLoading(prev => ({...prev, form: false}));
      return;
    }

    const registrationData = {
      protocol,
      agentID,
      agentCapability,
      provider,
      version,
      extension,
      protocolExtensions: parsedProtocolExtensions,
    };

    try {
      const response = await fetch('/api/agent-registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Attempt to parse error details if they are JSON, otherwise use the error string
        let errorMessage = responseData.error || "Failed to register agent.";
        if (responseData.details) {
            try {
                // Assuming details might be a Zod-formatted error object
                if (typeof responseData.details === 'object' && responseData.details !== null) {
                    const formattedDetails = Object.entries(responseData.details as Record<string, any>)
                        .map(([field, fieldError]) => {
                            if (fieldError && Array.isArray((fieldError as any)._errors) && (fieldError as any)._errors.length > 0) {
                                return `${field}: ${(fieldError as any)._errors.join(', ')}`;
                            }
                            return null;
                        })
                        .filter(Boolean)
                        .join('; ');
                    if (formattedDetails) {
                        errorMessage = `${errorMessage} Details: ${formattedDetails}`;
                    } else {
                         errorMessage = `${errorMessage} Details: ${JSON.stringify(responseData.details)}`;
                    }
                } else {
                    errorMessage = `${errorMessage} Details: ${JSON.stringify(responseData.details)}`;
                }
            } catch (e) {
                 // If details parsing fails, just append raw string
                errorMessage = `${errorMessage} Details: ${String(responseData.details)}`;
            }
        }
        throw new Error(errorMessage);
      }
      
      toast({ title: "Agent Registered", description: `${responseData.ansName} has been successfully added. Its certificate has been issued by the CA.` });
      fetchAgents(); 
      resetForm(); 
    } catch (error: any) {
       toast({
         title: "Registration Failed",
         description: error.message || "An unexpected error occurred.",
         variant: "destructive",
         duration: 10000, // Increased duration for potentially longer error messages
         className: "max-w-md whitespace-pre-wrap" // Allow pre-wrap for better formatting of long messages
       });
    } finally {
      setIsLoading(prev => ({...prev, form: false}));
    }
  };

  const handleRenewAgent = async (ansName: string) => {
    setIsLoading(prev => ({...prev, [ansName]: true}));
    try {
      const response = await fetch('/api/agent-registry/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ansName }),
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || "Failed to renew agent.");
      toast({ title: "Agent Renewed", description: `${ansName} has been successfully renewed.` });
      fetchAgents(); // Refresh list
    } catch (error: any) {
      toast({ title: "Renewal Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(prev => ({...prev, [ansName]: false}));
    }
  };

  const handleRevokeAgent = async (ansName: string) => {
    setIsLoading(prev => ({...prev, [ansName]: true}));
    try {
      const response = await fetch('/api/agent-registry/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ansName }),
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || "Failed to revoke agent.");
      toast({ title: "Agent Revoked", description: `${ansName} has been successfully revoked.` });
      fetchAgents(); // Refresh list
    } catch (error: any) {
      toast({ title: "Revocation Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(prev => ({...prev, [ansName]: false}));
    }
  };


  const filteredAgents = agents.filter(agent => 
    agent.ansName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.agentCapability.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.provider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="ANS Agent Registry"
        description="Register, discover, renew, and revoke agents. During registration, a certificate is issued by the CA, binding the agent's identity (ID, Public Key, ANSName/Endpoint). This certificate is stored with the registration."
        icon={ListTree}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg">
          <form onSubmit={handleRegisterAgent}>
            <CardHeader>
              <CardTitle className="flex items-center"><PlusCircle className="mr-2 h-5 w-5" /> Register New Agent</CardTitle>
              <CardDescription>Provide details to register an agent. A key pair and certificate will be generated and issued by the CA.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <FormItem Icon={Globe} label="Protocol" htmlFor="protocol">
                  <Select value={protocol} onValueChange={(value) => setProtocol(value as ANSProtocol)}>
                    <SelectTrigger id="protocol"><SelectValue placeholder="Select Protocol" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a2a">a2a (Agent2Agent)</SelectItem>
                      <SelectItem value="mcp">mcp (Model Context Protocol)</SelectItem>
                      <SelectItem value="acp">acp (Agent Communication Protocol)</SelectItem>
                      <SelectItem value="other">other</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
                 <FormItem Icon={Fingerprint} label="Agent ID" htmlFor="agentID">
                  <Input id="agentID" placeholder="e.g., textProcessor" value={agentID} onChange={e => setAgentID(e.target.value)} required />
                </FormItem>
              </div>
              <FormItem Icon={Layers} label="Agent Capability" htmlFor="agentCapability">
                <Input id="agentCapability" placeholder="e.g., DocumentTranslation" value={agentCapability} onChange={e => setAgentCapability(e.target.value)} required />
              </FormItem>
               <FormItem Icon={Package} label="Provider" htmlFor="provider">
                <Input id="provider" placeholder="e.g., AcmeCorp" value={provider} onChange={e => setProvider(e.target.value)} required />
              </FormItem>
              <div className="grid grid-cols-2 gap-4">
                <FormItem Icon={Tag} label="Version" htmlFor="version">
                  <Input id="version" placeholder="e.g., 1.2.3 or 2.0.0-beta1" value={version} onChange={e => setVersion(e.target.value)} required />
                </FormItem>
                <FormItem Icon={Info} label="Extension (Optional)" htmlFor="extension">
                  <Input id="extension" placeholder="e.g., hipaa, confidential" value={extension} onChange={e => setExtension(e.target.value)} />
                </FormItem>
              </div>
              <FormItem Icon={FileJson} label="Protocol Extensions (JSON)" htmlFor="protocolExtensions">
                <Textarea id="protocolExtensions" placeholder='{ "endpoint": "https://...", "customData": {} }' value={protocolExtensions} onChange={e => setProtocolExtensions(e.target.value)} required rows={5}/>
                <p className="text-xs text-muted-foreground mt-1">Must be valid JSON. Include an 'endpoint' key for resolution.</p>
              </FormItem>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading.form}>
                {isLoading.form ? <Workflow className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} 
                Register Agent &amp; Issue Certificate
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><Server className="mr-2 h-5 w-5"/> Registered Agents</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search by ANSName, capability, provider..." 
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-220px)]">
            <ScrollArea className="h-full">
              {isLoading.list ? (
                <p className="text-muted-foreground text-center py-8">Loading agents...</p>
              ) : filteredAgents.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {filteredAgents.map((agent) => (
                    <AccordionItem value={agent.id} key={agent.id}>
                      <AccordionTrigger className={`hover:no-underline ${agent.isRevoked ? 'opacity-50' : ''}`}>
                        <div className="flex flex-col items-start text-left w-full">
                            <span className={`font-medium ${agent.isRevoked ? 'text-muted-foreground line-through' : 'text-primary hover:underline'}`} title={agent.ansName}>
                                {agent.ansName.length > 60 ? agent.ansName.substring(0,57) + "..." : agent.ansName}
                                {agent.isRevoked && <Badge variant="destructive" className="ml-2">REVOKED</Badge>}
                            </span>
                            <div className="text-xs text-muted-foreground">
                                Capability: {agent.agentCapability} | Provider: {agent.provider}
                            </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-4 bg-muted/30 rounded-md">
                        <div className="space-y-2 text-xs">
                          <p><strong>Full ANSName:</strong> {agent.ansName}</p>
                          <p><strong>Agent ID:</strong> {agent.agentID}</p>
                          <p><strong>Version:</strong> {agent.version}</p>
                          {agent.extension && <p><strong>Extension:</strong> {agent.extension}</p>}
                          <p className="flex items-center">
                            <CalendarClock className="mr-1 h-3 w-3"/> 
                            <strong>Registered/Renewed:</strong> {new Date(agent.timestamp).toLocaleString()}
                          </p>
                           <p className="flex items-center">
                             <CalendarClock className="mr-1 h-3 w-3 text-green-600"/>
                             <strong>Cert Valid From:</strong> {new Date(agent.agentCertificate.validFrom).toLocaleString()}
                           </p>
                           <p className="flex items-center">
                             <CalendarClock className="mr-1 h-3 w-3 text-orange-600"/>
                            <strong>Cert Valid To:</strong> {new Date(agent.agentCertificate.validTo).toLocaleString()}
                          </p>
                          {agent.isRevoked && agent.revocationTimestamp && (
                            <p className="flex items-center text-destructive">
                              <CalendarX className="mr-1 h-3 w-3"/>
                              <strong>Revoked On:</strong> {new Date(agent.revocationTimestamp).toLocaleString()}
                            </p>
                          )}
                          <div>
                            <strong>Protocol Extensions:</strong>
                            <ScrollArea className="h-24 mt-1">
                              <pre className="text-xs bg-background p-2 rounded-md whitespace-pre-wrap break-all font-mono">
                                {JSON.stringify(agent.protocolExtensions, null, 2)}
                              </pre>
                            </ScrollArea>
                          </div>
                          <div>
                            <strong className="flex items-center"><FileBadge className="mr-1 h-4 w-4"/>Issued Certificate Details:</strong>
                             <ScrollArea className="h-32 mt-1">
                                <pre className="text-xs bg-background p-2 rounded-md whitespace-pre-wrap break-all font-mono">
                                  {JSON.stringify(agent.agentCertificate, null, 2)}
                                </pre>
                            </ScrollArea>
                          </div>
                           <div className="flex space-x-2 mt-3">
                            {!agent.isRevoked && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleRenewAgent(agent.ansName)} 
                                disabled={isLoading[agent.ansName]}
                                className="bg-green-500/10 hover:bg-green-500/20 border-green-500/50 text-green-700"
                              >
                                {isLoading[agent.ansName] ? <Workflow className="mr-1 h-4 w-4 animate-spin"/> : <RefreshCcw className="mr-1 h-4 w-4"/>}
                                Renew
                              </Button>
                            )}
                            {!agent.isRevoked ? (
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => handleRevokeAgent(agent.ansName)}
                                disabled={isLoading[agent.ansName]}
                              >
                                {isLoading[agent.ansName] ? <Workflow className="mr-1 h-4 w-4 animate-spin"/> : <ShieldOff className="mr-1 h-4 w-4"/>}
                                Revoke
                              </Button>
                            ) : (
                               <Badge variant="outline" className="border-destructive text-destructive">Agent Revoked</Badge>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-muted-foreground text-center py-8">No agents found. Try registering one!</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Helper component for form items
const FormItem = ({Icon, label, htmlFor, children}: {Icon?: React.ElementType, label: string, htmlFor: string, children: React.ReactNode}) => (
  <div>
    <Label htmlFor={htmlFor} className="flex items-center mb-1">
      {Icon && <Icon className="mr-2 h-4 w-4 text-muted-foreground" />}
      {label}
    </Label>
    {children}
  </div>
)



