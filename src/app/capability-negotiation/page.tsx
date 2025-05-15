
"use client";

import { useState } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BotMessageSquare, Send, CheckCircle, XCircle, Search, ShieldQuestion, Star, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { evaluateOffers } from "@/ai/flows/evaluate-offers-flow";
import type { EvaluateOffersInput, EvaluateOffersOutput } from "@/ai/flows/evaluate-offers-flow";

interface AvailableAgentService {
  id: string;
  name: string;
  capability: string;
  description: string;
  qos: number; // 0-1
  cost: number;
  protocol: string;
}

const availableServices: AvailableAgentService[] = [
  { id: "svc1", name: "ImageAnalysisPro", capability: "Image Recognition", description: "High-accuracy image recognition and tagging, supports various formats.", qos: 0.95, cost: 100, protocol: "ACNBP-Vision/1.0" },
  { id: "svc2", name: "TextSummarizerAI", capability: "Text Summarization", description: "Advanced NLP for summarizing long documents, multiple languages.", qos: 0.90, cost: 75, protocol: "ACNBP-NLP/1.2" },
  { id: "svc3", name: "DataCruncher Bot", capability: "Data Processing", description: "Scalable data processing and analytics, batch and stream modes.", qos: 0.88, cost: 120, protocol: "ACNBP-Data/1.0" },
  { id: "svc4", name: "SecureStorageAgent", capability: "Secure Storage", description: "Encrypted and resilient data storage solution with audit trails.", qos: 0.99, cost: 50, protocol: "ACNBP-SecureStore/1.1" },
  { id: "svc5", name: "ImageAnalysisBasic", capability: "Image Recognition", description: "Basic image recognition service for general purposes, limited formats.", qos: 0.80, cost: 40, protocol: "ACNBP-Vision/1.0" },
];

interface NegotiationResult {
  agent: AvailableAgentService;
  message: string;
  status: 'success' | 'partial' | 'failed';
  aiScore?: number;
  aiReasoning?: string;
}

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

    const localResults: NegotiationResult[] = [];
    const capabilityLower = desiredCapability.toLowerCase();
    const offersForAI: EvaluateOffersInput['capabilityOffers'] = [];
    const serviceForAIMap = new Map<string, AvailableAgentService>();

    availableServices.forEach(agent => {
      const agentCapabilityLower = agent.capability.toLowerCase();
      let status: 'success' | 'partial' | 'failed' = 'failed';
      let message = "";
      let meetsBasicCriteria = false;

      if (!desiredCapability || agentCapabilityLower.includes(capabilityLower) || capabilityLower.includes(agentCapabilityLower)) {
        if (agent.qos >= requiredQos && agent.cost <= maxCost) {
          status = 'success';
          message = `Successfully meets QoS/Cost criteria. Offering ${agent.capability}.`;
          meetsBasicCriteria = true;
        } else if (agent.qos >= requiredQos * 0.8 && agent.cost <= maxCost * 1.2) {
          status = 'partial';
          message = `Partially meets QoS/Cost criteria. Offering ${agent.capability}. Consider adjusting requirements.`;
          meetsBasicCriteria = true;
        } else {
          message = `Does not meet QoS/Cost criteria for ${agent.capability}.`;
          status = 'failed';
        }
      } else {
        message = `Capability mismatch. Agent offers ${agent.capability}.`;
        status = 'failed';
      }
      
      // Only add to localResults if it's a potential match or user searched for something
      if (status !== 'failed' || desiredCapability) {
        localResults.push({ agent, message, status });
        if (meetsBasicCriteria) {
           offersForAI.push({
            description: agent.description, // Use detailed description for AI
            cost: agent.cost,
            qos: agent.qos,
            protocolCompatibility: agent.protocol,
          });
          serviceForAIMap.set(agent.description, agent);
        }
      }
    });
    
    let finalResults = [...localResults];

    if (offersForAI.length > 0 && securityRequirements.trim() !== "") {
      try {
        toast({
          title: "AI Evaluation Started",
          description: "Sending offers to AI for evaluation based on security requirements.",
        });
        const aiInput: EvaluateOffersInput = {
          capabilityOffers: offersForAI,
          securityRequirements: securityRequirements,
        };
        const aiEvaluations: EvaluateOffersOutput = await evaluateOffers(aiInput);

        // Merge AI results
        finalResults = localResults.map(localResult => {
          const matchedService = serviceForAIMap.get(localResult.agent.description);
          if (matchedService) {
            const aiEval = aiEvaluations.find(
              evalItem => evalItem.description === localResult.agent.description &&
                          evalItem.cost === localResult.agent.cost && // ensure more precise match
                          evalItem.qos === localResult.agent.qos
            );
            if (aiEval) {
              return {
                ...localResult,
                aiScore: aiEval.score,
                aiReasoning: aiEval.reasoning,
              };
            }
          }
          return localResult;
        });
        
        toast({
          title: "AI Evaluation Complete",
          description: "Offers have been evaluated by the AI.",
        });

      } catch (error) {
        console.error("AI Offer evaluation error:", error);
        toast({
          title: "AI Evaluation Failed",
          description: "An error occurred during AI evaluation. Displaying local results.",
          variant: "destructive",
        });
      }
    } else if (offersForAI.length > 0 && securityRequirements.trim() === "") {
        toast({
            title: "AI Evaluation Skipped",
            description: "Provide security requirements to enable AI-powered offer evaluation.",
            variant: "default"
        });
    }

    if (finalResults.length === 0 && desiredCapability) {
      finalResults.push({
        // @ts-ignore
        agent: { name: "System", capability: "N/A", qos: 0, cost: 0, protocol: "N/A", description: "N/A" },
        message: "No agents found matching the desired capability and criteria.",
        status: 'failed'
      });
    }
    
    finalResults.sort((a, b) => {
      if (a.status === 'success' && b.status !== 'success') return -1;
      if (a.status !== 'success' && b.status === 'success') return 1;
      if (a.status === 'partial' && b.status === 'failed') return -1;
      if (a.status === 'failed' && b.status === 'partial') return 1;
      // If status is the same, sort by AI score if available
      if (a.aiScore !== undefined && b.aiScore !== undefined) {
        return b.aiScore - a.aiScore;
      }
      if (a.aiScore !== undefined) return -1; // Ones with AI score first
      if (b.aiScore !== undefined) return 1;
      return 0;
    });

    setNegotiationResults(finalResults);
    setIsLoading(false);
  };

  return (
    <>
      <PageHeader
        title="Capability Negotiation"
        description="Initiate and observe the capability negotiation process. Define requirements, and the system will find matching service provider agents. Optionally, provide security requirements to leverage AI for offer evaluation."
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
                placeholder="e.g., Image Recognition, Text Summarization" 
                value={desiredCapability}
                onChange={(e) => setDesiredCapability(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="requiredQos">Minimum QoS ({requiredQos.toFixed(2)})</Label>
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
              <Label htmlFor="maxCost">Maximum Cost</Label>
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
              <Card key={result.agent?.id || index} className="p-4 bg-card/50">
                <div className="flex items-start space-x-3">
                  {result.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />}
                  {result.status === 'partial' && <Search className="h-5 w-5 text-yellow-500 mt-1 flex-shrink-0" />}
                  {result.status === 'failed' && result.agent?.name !== "System" && <XCircle className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />}
                  {result.status === 'failed' && result.agent?.name === "System" && <XCircle className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />}
                  
                  <div className="flex-grow">
                    <CardTitle className="text-lg mb-1">{result.agent?.name || 'System Message'}</CardTitle>
                    {result.agent?.name !== "System" && (
                        <>
                            <p className="text-sm text-muted-foreground">Offered Capability: <Badge variant="secondary">{result.agent.capability}</Badge></p>
                             <p className="text-xs text-muted-foreground mt-0.5">{result.agent.description}</p>
                            <div className="flex flex-wrap gap-2 mt-2 text-sm">
                                <Badge variant="outline">QoS: {result.agent.qos.toFixed(2)}</Badge>
                                <Badge variant="outline">Cost: ${result.agent.cost}</Badge>
                                <Badge variant="outline">Protocol: {result.agent.protocol}</Badge>
                            </div>
                        </>
                    )}
                    <p className={`text-sm mt-2 font-medium ${
                        result.status === 'success' ? 'text-green-700' :
                        result.status === 'partial' ? 'text-yellow-700' :
                        result.status === 'failed' && result.agent?.name === "System" ? 'text-muted-foreground' :
                        'text-red-700'
                    }`}>{result.message}</p>

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


    