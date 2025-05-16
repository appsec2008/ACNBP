
"use client";

import { useState, FormEvent } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { ANSCapabilityRequest, ANSCapabilityResponse, SignedCertificate } from "@/lib/types";
import { SearchCode, Link, ShieldAlert, CheckCheck, Loader2, FileSignature, Server, FileBadge } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ANSResolutionPage() {
  const [ansNameToResolve, setAnsNameToResolve] = useState("");
  const [resolutionResult, setResolutionResult] = useState<ANSCapabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleResolveANSName = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResolutionResult(null);
    setError(null);

    if (!ansNameToResolve.trim()) {
      toast({ title: "Input Required", description: "Please enter an ANSName to resolve.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const requestPayload: ANSCapabilityRequest = {
      requestType: "resolve",
      ansName: ansNameToResolve.trim(),
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
        title="ANS Name Resolution"
        description="Resolve an Agent Name Service (ANSName) to retrieve its endpoint and CA-issued agent certificate. The Agent Registry signs this response."
        icon={SearchCode}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <form onSubmit={handleResolveANSName}>
            <CardHeader>
              <CardTitle>Resolve ANSName</CardTitle>
              <CardDescription>Enter the full ANSName to look up an agent.</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="ansNameToResolve">ANSName</Label>
                <Input 
                  id="ansNameToResolve" 
                  placeholder="e.g., a2a://textProcessor.DocumentTranslation.AcmeCorp.v1.0.0" 
                  value={ansNameToResolve}
                  onChange={(e) => setAnsNameToResolve(e.target.value)}
                  required 
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchCode className="mr-2 h-4 w-4" />}
                Resolve
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Resolution Result</CardTitle>
            <CardDescription>Details of the resolved agent, if found. Includes endpoint, agent's certificate, and registry's signature.</CardDescription>
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
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center"><FileSignature className="mr-2 h-4 w-4"/> Agent Registry Signature (over ANSName, Endpoint, Agent Cert)</Label>
                  <ScrollArea className="h-20 mt-1">
                    <p className="text-xs bg-muted p-2 rounded-md break-all font-mono">{resolutionResult.signature}</p>
                  </ScrollArea>
                </div>
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
              <p className="text-muted-foreground text-center pt-10">Enter an ANSName and click "Resolve" to see details here.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
