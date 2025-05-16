
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ListTree, PlusCircle, Search, Server, Info, Fingerprint, FileJson, Globe, Tag, Package, Layers, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AgentRegistration, ANSProtocol } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ANSAgentRegistryPage() {
  const [agents, setAgents] = useState<AgentRegistration[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Form state
  const [protocol, setProtocol] = useState<ANSProtocol | "">("");
  const [agentID, setAgentID] = useState("");
  const [agentCapability, setAgentCapability] = useState("");
  const [provider, setProvider] = useState("");
  const [version, setVersion] = useState("");
  const [extension, setExtension] = useState("");
  const [certificatePem, setCertificatePem] = useState("");
  const [protocolExtensions, setProtocolExtensions] = useState("");

  const fetchAgents = async () => {
    setIsFetching(true);
    try {
      const response = await fetch('/api/agent-registry');
      if (!response.ok) throw new Error('Failed to fetch agents');
      const data = await response.json();
      setAgents(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not load agents.", variant: "destructive" });
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const resetForm = () => {
    setProtocol("");
    setAgentID("");
    setAgentCapability("");
    setProvider("");
    setVersion("");
    setExtension("");
    setCertificatePem("-----BEGIN CERTIFICATE-----\nMIIC...EXAMPLE...END CERTIFICATE-----");
    setProtocolExtensions(JSON.stringify({ "endpoint": "https://example.com/api/agent", "customData": "value" }, null, 2));
  };

  useEffect(() => {
    resetForm(); // Initialize form with default/placeholder values
  }, []);


  const handleRegisterAgent = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let parsedProtocolExtensions;
    try {
      parsedProtocolExtensions = JSON.parse(protocolExtensions);
    } catch (err) {
      toast({ title: "Registration Failed", description: "Protocol Extensions must be valid JSON.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const registrationData = {
      protocol,
      agentID,
      agentCapability,
      provider,
      version,
      extension,
      certificatePem,
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
        const errorMsg = responseData.details ? JSON.stringify(responseData.details, null, 2) : responseData.error || "Failed to register agent.";
        throw new Error(errorMsg);
      }
      
      toast({ title: "Agent Registered", description: `${responseData.ansName} has been successfully added to the registry.` });
      fetchAgents(); // Refresh the list
      resetForm(); // Clear form fields
    } catch (error: any) {
       toast({
         title: "Registration Failed",
         description: error.message || "An unexpected error occurred.",
         variant: "destructive",
         duration: 10000, // Longer duration for detailed errors
         className: "max-w-md" // Allow more width for error
       });
    } finally {
      setIsLoading(false);
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
        description="Register and discover agents using the Agent Name Service (ANS) protocol. Agents are identified by a structured ANSName and provide metadata including capabilities, provider, version, and protocol-specific extensions."
        icon={ListTree}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg">
          <form onSubmit={handleRegisterAgent}>
            <CardHeader>
              <CardTitle className="flex items-center"><PlusCircle className="mr-2 h-5 w-5" /> Register New Agent</CardTitle>
              <CardDescription>Provide details to register an agent with the ANS.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
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
              <FormItem Icon={Fingerprint} label="Certificate (PEM - Mock)" htmlFor="certificatePem">
                 <Textarea id="certificatePem" placeholder="-----BEGIN CERTIFICATE-----..." value={certificatePem} onChange={e => setCertificatePem(e.target.value)} required rows={5}/>
              </FormItem>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Workflow className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} 
                Register Agent
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
              {isFetching ? (
                <p className="text-muted-foreground text-center py-8">Loading agents...</p>
              ) : filteredAgents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ANSName</TableHead>
                      <TableHead>Capability</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Registered At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium text-primary hover:underline cursor-pointer" title={agent.ansName}>
                           {agent.ansName.length > 50 ? agent.ansName.substring(0,47) + "..." : agent.ansName}
                           <div className="text-xs text-muted-foreground">ID: {agent.agentID} / v{agent.version}</div>
                        </TableCell>
                        <TableCell>{agent.agentCapability}</TableCell>
                        <TableCell>{agent.provider}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                           {new Date(agent.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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

    