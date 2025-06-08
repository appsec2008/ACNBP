
"use client";

import { useState, FormEvent } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { ANSCapabilityRequest, ANSCapabilityResponse, ANSProtocol } from "@/lib/types";
import { SearchCode, Link, ShieldAlert, Loader2, FileSignature, Server, FileBadge, Globe, Fingerprint, Layers, Package, Tag, Info, FileJson, Puzzle } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper component for form items
const FormItem = ({Icon, label, htmlFor, children}: {Icon?: React.ElementType, label: string, htmlFor: string, children: React.ReactNode}) => (
  <div>
    <Label htmlFor={htmlFor} className="flex items-center mb-1">
      {Icon && <Icon className="mr-2 h-4 w-4 text-muted-foreground" />}
      {label}
    </Label>
    {children}
  </div>
);

export default function ANSResolutionPage() {
  const [protocol, setProtocol] = useState<ANSProtocol | "">("a2a");
  const [agentID, setAgentID] = useState("textProcessor");
  const [agentCapability, setAgentCapability] = useState("DocumentTranslation");
  const [provider, setProvider] = useState("AcmeCorp");
  const [version, setVersion] = useState("1.0.0");
  const [extension, setExtension] = useState("secure");

  const [resolutionResult, setResolutionResult] = useState<ANSCapabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleResolveANSName = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResolutionResult(null);
    setError(null);

    if (!protocol || !agentID || !agentCapability || !provider || !version) {
      toast({ title: "Input Required", description: "Please fill in all required ANSName components.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const requestPayload: ANSCapabilityRequest = {
      requestType: "resolve",
      protocol: protocol as ANSProtocol,
      agentID,
      agentCapability,
      provider,
      version,
      ...(extension && { extension }), // Conditionally add extension
    };

    try {
      const response = await fetch('/api/ans/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.statusText}`);
      }
      
      setResolutionResult(data);
      toast({ title: "Resolution Successful", description: `Resolved ${data.ansName}.` });

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during resolution.");
      toast({ title: "Resolution Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="ANS Name Resolution (Supporting ACNBP)"
        description="Resolve an Agent Name Service (ANSName) by its components to retrieve its endpoint, CA-issued agent certificate, and protocol-specific extensions (e.g., A2A AgentCard). This supports ACNBP by allowing lookup of specific agent details selected during Candidate Pre-Screening."
        icon={SearchCode}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-lg">
          <form onSubmit={handleResolveANSName}>
            <CardHeader>
              <CardTitle>Resolve ANSName Components</CardTitle>
              <CardDescription>Enter the components of the ANSName to look up an agent.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormItem Icon={Globe} label="Protocol" htmlFor="protocol">
                <Select value={protocol} onValueChange={(value) => setProtocol(value as ANSProtocol)} required>
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
              <FormItem Icon={Layers} label="Agent Capability" htmlFor="agentCapability">
                <Input id="agentCapability" placeholder="e.g., DocumentTranslation" value={agentCapability} onChange={e => setAgentCapability(e.target.value)} required />
              </FormItem>
              <FormItem Icon={Package} label="Provider" htmlFor="provider">
                <Input id="provider" placeholder="e.g., AcmeCorp" value={provider} onChange={e => setProvider(e.target.value)} required />
              </FormItem>
              <FormItem Icon={Tag} label="Version" htmlFor="version">
                <Input id="version" placeholder="e.g., 1.0.0 or 2.1.3-beta" value={version} onChange={e => setVersion(e.target.value)} required />
              </FormItem>
              <FormItem Icon={Info} label="Extension (Optional)" htmlFor="extension">
                <Input id="extension" placeholder="e.g., hipaa, secure" value={extension} onChange={e => setExtension(e.target.value)} />
              </FormItem>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading || !protocol || !agentID || !agentCapability || !provider || !version}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchCode className="mr-2 h-4 w-4" />}
                Resolve
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="md:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Resolution Result</CardTitle>
            <CardDescription>Details of the resolved agent, if found. Includes endpoint, agent's certificate, protocol extensions, and registry's signature (if provided).</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[200px]">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Resolving...</p>
              </div>
            )}
            {!isLoading && error && (
              <div className="text-destructive flex flex-col items-center justify-center h-full">
                <ShieldAlert className="h-10 w-10 mb-2" />
                <p className="font-semibold">Resolution Error</p>
                <p className="text-sm text-center">{error}</p>
              </div>
            )}
            {!isLoading && !error && resolutionResult && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center"><Server className="mr-2 h-4 w-4 text-primary"/> Resolved ANSName</Label>
                  <p className="text-md font-semibold text-primary break-all">{resolutionResult.ansName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center"><Link className="mr-2 h-4 w-4"/> Endpoint</Label>
                  <p className="text-md break-all">{resolutionResult.endpoint}</p>
                </div>
                
                {resolutionResult.protocolExtensions && Object.keys(resolutionResult.protocolExtensions).length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground flex items-center">
                      {resolutionResult.ansName.startsWith('a2a://') ? 
                        <Puzzle className="mr-2 h-4 w-4 text-indigo-600"/> : 
                        <FileJson className="mr-2 h-4 w-4 text-purple-600"/>
                      }
                      {resolutionResult.ansName.startsWith('a2a://') ? 'A2A AgentCard (from Protocol Extensions)' : 'Protocol Extensions'}
                    </Label>
                    <ScrollArea className="h-40 mt-1">
                      <pre className="text-xs bg-muted p-2 rounded-md whitespace-pre-wrap break-all font-mono">
                        {JSON.stringify(resolutionResult.protocolExtensions, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}

                {resolutionResult.signature && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground flex items-center"><FileSignature className="mr-2 h-4 w-4"/> Agent Registry Signature (over ANSName, Endpoint, Agent Cert)</Label>
                    <ScrollArea className="h-20 mt-1">
                      <p className="text-xs bg-muted p-2 rounded-md break-all font-mono">{resolutionResult.signature}</p>
                    </ScrollArea>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center"><FileBadge className="mr-2 h-4 w-4 text-green-600"/> Agent's Issued Certificate (Signed by CA)</Label>
                   <ScrollArea className="h-40 mt-1">
                     <pre className="text-xs bg-muted p-2 rounded-md whitespace-pre-wrap break-all font-mono">
                        {JSON.stringify(resolutionResult.agentCertificate, null, 2)}
                     </pre>
                   </ScrollArea>
                </div>
              </div>
            )}
            {!isLoading && !error && !resolutionResult && (
              <p className="text-muted-foreground text-center pt-10">Enter ANSName components and click "Resolve" to see details here.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
