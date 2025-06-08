
"use client";

import { useState } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BotMessageSquare, Send, CheckCircle, XCircle, Search, ShieldQuestion, Star, FileText, Loader2, AlertTriangle, Share2, PackageCheck, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { NegotiationResult, NegotiationRequestInput, NegotiationApiResponse, AgentService, Skill } from "@/lib/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
        // Ensure a.service and b.service exist before accessing matchStatus
        const aStatus = a.service ? statusOrder[a.matchStatus] : statusOrder['failed'];
        const bStatus = b.service ? statusOrder[b.matchStatus] : statusOrder['failed'];

        if (aStatus !== bStatus) {
          return aStatus - bStatus;
        }
        if (a.aiScore !== undefined && b.aiScore !== undefined) {
          return b.aiScore - a.aiScore;
        }
        if (a.aiScore !== undefined) return -1;
        if (b.aiScore !== undefined) return 1;
        
        if (a.service && b.service && a.service.name && b.service.name) {
          return a.service.name.localeCompare(b.service.name);
        }
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
            service: {
                id: "system-error", 
                name: "System Error", 
                capability: "N/A", 
                description: "N/A", 
                qos:undefined, 
                cost:undefined, 
                protocol: "N/A", 
                ansEndpoint: "N/A"
            },
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
        title="ACNBP: Capability Negotiation"
        description="Initiate ACNBP's negotiation phase. Define requirements, and the system will simulate finding matching provider agents (discovered via ANS) and evaluating their offers. Optionally, use security requirements for AI evaluation."
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
          <CardContent className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
            {negotiationResults.length === 0 && !isLoading && (
              <p className="text-muted-foreground text-center py-8">Enter criteria and initiate negotiation to see outcomes.</p>
            )}
            {isLoading && negotiationResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">Negotiating and evaluating offers...</p>
              </div>
            )}
            {negotiationResults.map((result, index) => {
              const service = result.service;
              const isSystemMessage = service && (service.id === "system-error" || service.id === "system-no-match" || service.id === "system-no-agents" || service.name === "System Message");

              if (!service) { // Defensive check
                return (
                    <Card key={`error-${index}`} className="p-4 bg-destructive/10">
                        <p className="text-destructive">Error: Service data missing for a negotiation result.</p>
                    </Card>
                );
              }

              return (
                <Card key={service.id || index} className="p-4 bg-card/50 shadow-md">
                  <div className="flex items-start space-x-3">
                    {result.matchStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />}
                    {result.matchStatus === 'partial' && <Search className="h-5 w-5 text-yellow-500 mt-1 flex-shrink-0" />}
                    {(result.matchStatus === 'failed' || result.matchStatus === 'capability_mismatch') && !isSystemMessage && <XCircle className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />}
                    {isSystemMessage && <AlertTriangle className="h-5 w-5 text-destructive mt-1 flex-shrink-0" />}
                    
                    <div className="flex-grow">
                      <CardTitle className="text-lg mb-1">{service.name || 'System Message'}</CardTitle>
                      {!isSystemMessage && (
                          <>
                              <p className="text-sm text-muted-foreground">Offered Capability: <Badge variant="secondary">{service.capability}</Badge></p>
                               <p className="text-xs text-muted-foreground mt-0.5">{service.description || 'N/A'}</p>
                              <div className="flex flex-wrap gap-2 mt-2 text-sm">
                                  <Badge variant="outline">QoS: {typeof service.qos === 'number' ? service.qos.toFixed(2) : 'N/A'}</Badge>
                                  <Badge variant="outline">Cost: {typeof service.cost === 'number' ? `$${service.cost.toFixed(2)}` : 'N/A'}</Badge>
                                  <Badge variant="outline">Protocol: {service.protocol || 'N/A'}</Badge>
                                  {service.ansEndpoint && result.matchStatus !== 'capability_mismatch' && (
                                    <Badge variant="outline" className="bg-primary/10 border-primary/50">
                                      <Share2 className="mr-1 h-3 w-3 text-primary" />
                                      ANS: {service.ansEndpoint}
                                    </Badge>
                                  )}
                              </div>
                          </>
                      )}
                      <p className={`text-sm mt-2 font-medium ${
                          result.matchStatus === 'success' ? 'text-green-700 dark:text-green-400' :
                          result.matchStatus === 'partial' ? 'text-yellow-700 dark:text-yellow-400' :
                          (isSystemMessage || result.matchStatus === 'failed' || result.matchStatus === 'capability_mismatch') ? 'text-destructive' :
                          'text-red-700 dark:text-red-400' // Should not be reached if previous conditions are exhaustive
                      }`}>{result.matchMessage}</p>

                      {service.protocol === 'a2a' && service.skills && service.skills.length > 0 && (
                        <Accordion type="single" collapsible className="w-full mt-3">
                          <AccordionItem value="a2a-skills" className="border-t border-b-0 pt-2">
                            <AccordionTrigger className="text-sm font-medium hover:no-underline py-2 text-primary hover:text-primary/80">
                                <PackageCheck className="mr-2 h-4 w-4" /> A2A Agent Skills ({service.skills.length})
                            </AccordionTrigger>
                            <AccordionContent className="pt-1 pb-2 pl-2 pr-1 bg-muted/30 rounded-md">
                                {service.skills.map(skill => (
                                    <div key={skill.id} className="py-1.5 border-b border-muted last:border-b-0">
                                        <p className="text-xs font-semibold">{skill.name}</p>
                                        {skill.description && <p className="text-xs text-muted-foreground mt-0.5">{skill.description}</p>}
                                        {skill.tags && skill.tags.length > 0 && (
                                          <div className="mt-1 flex flex-wrap gap-1">
                                            {skill.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0.5">{tag}</Badge>)}
                                          </div>
                                        )}
                                    </div>
                                ))}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}

                      {result.aiScore !== undefined && result.aiReasoning && (
                        <Card className="mt-3 p-3 bg-background shadow-sm border-dashed">
                          <div className="flex items-center mb-1">
                            <ShieldQuestion className="h-5 w-5 text-primary mr-2" />
                            <p className="text-sm font-semibold text-primary">AI Evaluation (Security & Other Factors):</p>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                              <Badge className={result.aiScore > 70 ? "bg-accent text-accent-foreground" : result.aiScore > 40 ? "bg-yellow-400 text-yellow-900" : "bg-destructive text-destructive-foreground"}>
                                <Star className="mr-1 h-3 w-3" /> Score: {result.aiScore.toFixed(0)}/100
                              </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-start">
                            <ScrollText className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                            <span><span className="font-medium">Reasoning:</span> {result.aiReasoning}</span>
                          </p>
                        </Card>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

