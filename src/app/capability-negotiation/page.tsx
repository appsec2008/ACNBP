
"use client";

import { useState } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BotMessageSquare, Send, CheckCircle, XCircle, Search, ShieldQuestion, Star, FileText, Loader2, AlertTriangle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { NegotiationResult, NegotiationRequestInput, NegotiationApiResponse } from "@/lib/types";

export default function CapabilityNegotiationPage() {
  const [desiredCapability, setDesiredCapability] = useState("");
  const [requiredQos, setRequiredQos] = useState(0.7);
  const [maxCost, setMaxCost] = useState(100);
  const [securityRequirements, setSecurityRequirements] = useState("");
  
  const [negotiationResults, setNegotiationResults] = useState<NegotiationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleNegotiation = async () => {
    setIsLoading(true);
    setNegotiationResults([]);

    const requestPayload: NegotiationRequestInput = {
      desiredCapability,
      requiredQos,
      maxCost,
      securityRequirements,
    };

    try {
      const response = await fetch('/api/negotiate-capabilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.aiEvaluationMessage || errorData.message || `API Error: ${response.statusText}`);
      }

      const data: NegotiationApiResponse = await response.json();
      
      const sortedResults = data.results.sort((a, b) => {
        const statusOrder = { 'success': 1, 'partial': 2, 'failed': 3, 'capability_mismatch': 4 };
        if (statusOrder[a.matchStatus] !== statusOrder[b.matchStatus]) {
          return statusOrder[a.matchStatus] - statusOrder[b.matchStatus];
        }
        if (a.aiScore !== undefined && b.aiScore !== undefined) {
          return b.aiScore - a.aiScore;
        }
        if (a.aiScore !== undefined) return -1;
        if (b.aiScore !== undefined) return 1;
        return 0;
      });
      
      setNegotiationResults(sortedResults);

      if (data.aiEvaluationMessage) {
        toast({
          title: "Negotiation Complete",
          description: data.aiEvaluationMessage,
          variant: data.aiEvaluationStatus === 'failed' ? 'destructive' : 'default',
        });
      } else {
         toast({
          title: "Negotiation Complete",
          description: "Offers processed.",
        });
      }

    } catch (error: any) {
      console.error("Negotiation error:", error);
      toast({
        title: "Negotiation Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
       setNegotiationResults([{
            service: {id: "system-error", name: "System Error", capability: "N/A", description: "N/A", qos:0, cost:0, protocol: "N/A", ansEndpoint: "N/A"},
            matchStatus: 'failed',
            matchMessage: `Negotiation process failed: ${error.message || "Unknown error"}`
        }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Capability Negotiation"
        description="Initiate and observe the capability negotiation process. Define requirements, and the system will find matching service provider agents (potentially discovered via ANS). Optionally, provide security requirements to leverage AI for offer evaluation."
        icon={BotMessageSquare}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle>Negotiation Request</CardTitle>
            <CardDescription>Define your capability requirements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="desiredCapability">Desired Capability</Label>
              <Textarea 
                id="desiredCapability" 
                placeholder="e.g., Image Recognition, Text Summarization. Leave blank to see all." 
                value={desiredCapability}
                onChange={(e) => setDesiredCapability(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="requiredQos">Minimum QoS ({requiredQos.toFixed(2)}) (Set to 0 to ignore)</Label>
              <Slider
                id="requiredQos"
                min={0}
                max={1}
                step={0.01}
                value={[requiredQos]}
                onValueChange={(value) => setRequiredQos(value[0])}
              />
            </div>
            <div>
              <Label htmlFor="maxCost">Maximum Cost (Set high to ignore, e.g., 999999)</Label>
              <Input 
                id="maxCost" 
                type="number" 
                placeholder="e.g., 100" 
                value={maxCost}
                onChange={(e) => setMaxCost(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="securityRequirements">Security Requirements (for AI Evaluation)</Label>
              <Textarea 
                id="securityRequirements" 
                placeholder="e.g., End-to-end encryption, GDPR compliance. Leave blank to skip AI evaluation." 
                value={securityRequirements}
                onChange={(e) => setSecurityRequirements(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleNegotiation} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Initiate Negotiation
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Negotiation Outcomes</CardTitle>
            <CardDescription>Results of the negotiation process with available agents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[700px] overflow-y-auto">
            {negotiationResults.length === 0 && !isLoading && (
              <p className="text-muted-foreground text-center py-8">Enter criteria and initiate negotiation to see outcomes.</p>
            )}
            {isLoading && negotiationResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">Negotiating and evaluating offers...</p>
              </div>
            )}
            {negotiationResults.map((result, index) => (
              <Card key={result.service.id || index} className="p-4 bg-card/50">
                <div className="flex items-start space-x-3">
                  {result.matchStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />}
                  {result.matchStatus === 'partial' && <Search className="h-5 w-5 text-yellow-500 mt-1 flex-shrink-0" />}
                  {(result.matchStatus === 'failed' || result.matchStatus === 'capability_mismatch') && result.service.id !== "system-error" && result.service.name !== "System Message" && <XCircle className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />}
                  {(result.service.id === "system-error" || result.service.name === "System Message") && <AlertTriangle className="h-5 w-5 text-destructive mt-1 flex-shrink-0" />}
                  
                  <div className="flex-grow">
                    <CardTitle className="text-lg mb-1">{result.service.name || 'System Message'}</CardTitle>
                    {result.service.name !== "System Message" && result.service.id !== "system-error" && (
                        <>
                            <p className="text-sm text-muted-foreground">Offered Capability: <Badge variant="secondary">{result.service.capability}</Badge></p>
                             <p className="text-xs text-muted-foreground mt-0.5">{result.service.description}</p>
                            <div className="flex flex-wrap gap-2 mt-2 text-sm">
                                <Badge variant="outline">QoS: {result.service.qos.toFixed(2)}</Badge>
                                <Badge variant="outline">Cost: ${result.service.cost}</Badge>
                                <Badge variant="outline">Protocol: {result.service.protocol}</Badge>
                                {result.service.ansEndpoint && result.matchStatus !== 'capability_mismatch' && (
                                  <Badge variant="outline" className="bg-primary/10 border-primary/50">
                                    <Share2 className="mr-1 h-3 w-3 text-primary" />
                                    ANS: {result.service.ansEndpoint}
                                  </Badge>
                                )}
                            </div>
                        </>
                    )}
                    <p className={`text-sm mt-2 font-medium ${
                        result.matchStatus === 'success' ? 'text-green-700' :
                        result.matchStatus === 'partial' ? 'text-yellow-700' :
                        (result.service.id === "system-error" || result.service.name === "System Message" || result.matchStatus === 'failed' || result.matchStatus === 'capability_mismatch') ? 'text-destructive' :
                        'text-red-700'
                    }`}>{result.matchMessage}</p>

                    {result.aiScore !== undefined && result.aiReasoning && (
                      <Card className="mt-3 p-3 bg-background shadow-sm border-dashed">
                        <div className="flex items-center mb-1">
                          <ShieldQuestion className="h-5 w-5 text-primary mr-2" />
                          <p className="text-sm font-semibold text-primary">AI Evaluation:</p>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className={result.aiScore > 70 ? "bg-accent text-accent-foreground" : result.aiScore > 40 ? "bg-yellow-400 text-yellow-900" : "bg-destructive text-destructive-foreground"}>
                              <Star className="mr-1 h-3 w-3" /> Score: {result.aiScore.toFixed(0)}/100
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-start">
                          <FileText className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                          <span><span className="font-medium">Reasoning:</span> {result.aiReasoning}</span>
                        </p>
                      </Card>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
