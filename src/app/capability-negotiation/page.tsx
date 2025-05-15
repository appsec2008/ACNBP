"use client";

import { useState } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BotMessageSquare, Send, CheckCircle, XCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from '@/components/ui/badge';

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
  { id: "svc1", name: "ImageAnalysisPro", capability: "Image Recognition", description: "High-accuracy image recognition and tagging.", qos: 0.95, cost: 100, protocol: "ACNBP-Vision/1.0" },
  { id: "svc2", name: "TextSummarizerAI", capability: "Text Summarization", description: "Advanced NLP for summarizing long documents.", qos: 0.90, cost: 75, protocol: "ACNBP-NLP/1.2" },
  { id: "svc3", name: "DataCruncher Bot", capability: "Data Processing", description: "Scalable data processing and analytics.", qos: 0.88, cost: 120, protocol: "ACNBP-Data/1.0" },
  { id: "svc4", name: "SecureStorageAgent", capability: "Secure Storage", description: "Encrypted and resilient data storage solution.", qos: 0.99, cost: 50, protocol: "ACNBP-SecureStore/1.1" },
  { id: "svc5", name: "ImageAnalysisBasic", capability: "Image Recognition", description: "Basic image recognition service for general purposes.", qos: 0.80, cost: 40, protocol: "ACNBP-Vision/1.0" },
];

interface NegotiationResult {
  agent: AvailableAgentService;
  message: string;
  status: 'success' | 'partial' | 'failed';
}

export default function CapabilityNegotiationPage() {
  const [desiredCapability, setDesiredCapability] = useState("");
  const [requiredQos, setRequiredQos] = useState(0.7);
  const [maxCost, setMaxCost] = useState(100);
  const [negotiationResults, setNegotiationResults] = useState<NegotiationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleNegotiation = () => {
    setIsLoading(true);
    setNegotiationResults([]);

    // Simulate a short delay for effect
    setTimeout(() => {
      const results: NegotiationResult[] = [];
      const capabilityLower = desiredCapability.toLowerCase();

      availableServices.forEach(agent => {
        const agentCapabilityLower = agent.capability.toLowerCase();
        let status: 'success' | 'partial' | 'failed' = 'failed';
        let message = "";

        if (agentCapabilityLower.includes(capabilityLower) || capabilityLower.includes(agentCapabilityLower)) {
          if (agent.qos >= requiredQos && agent.cost <= maxCost) {
            status = 'success';
            message = `Successfully meets all criteria. Offering ${agent.capability}.`;
          } else if (agent.qos >= requiredQos * 0.8 && agent.cost <= maxCost * 1.2) {
            status = 'partial';
            message = `Partially meets criteria. QoS or cost slightly off. Offering ${agent.capability}. Consider adjusting requirements.`;
          } else {
            message = `Does not meet QoS/Cost criteria for ${agent.capability}.`;
          }
        } else {
          message = `Capability mismatch. Agent offers ${agent.capability}.`;
        }
        
        if (status !== 'failed' || desiredCapability) { // Show if match or partial, or if user searched
             results.push({ agent, message, status });
        }
      });

      if (results.length === 0 && desiredCapability) {
        results.push({
            // @ts-ignore
            agent: { name: "System", capability: "N/A", qos: 0, cost: 0, protocol: "N/A" },
            message: "No agents found matching the desired capability and criteria.",
            status: 'failed'
        });
      }
      
      // Sort successful matches first
      results.sort((a, b) => {
        if (a.status === 'success' && b.status !== 'success') return -1;
        if (a.status !== 'success' && b.status === 'success') return 1;
        if (a.status === 'partial' && b.status === 'failed') return -1;
        if (a.status === 'failed' && b.status === 'partial') return 1;
        return 0;
      });

      setNegotiationResults(results);
      setIsLoading(false);
    }, 500);
  };

  return (
    <>
      <PageHeader
        title="Capability Negotiation"
        description="Initiate and observe the capability negotiation process between a requesting agent and available service provider agents based on specified requirements."
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
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleNegotiation} disabled={isLoading}>
              {isLoading ? <Search className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Initiate Negotiation
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Negotiation Outcomes</CardTitle>
            <CardDescription>Results of the negotiation process with available agents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
            {negotiationResults.length === 0 && !isLoading && (
              <p className="text-muted-foreground text-center py-8">Enter criteria and initiate negotiation to see outcomes.</p>
            )}
            {isLoading && (
              <p className="text-muted-foreground text-center py-8">Negotiating...</p>
            )}
            {negotiationResults.map((result, index) => (
              <Card key={result.agent?.id || index} className="p-4">
                <div className="flex items-start space-x-3">
                  {result.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />}
                  {result.status === 'partial' && <Search className="h-5 w-5 text-yellow-500 mt-1 flex-shrink-0" />}
                  {result.status === 'failed' && result.agent?.name !== "System" && <XCircle className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />}
                   {result.status === 'failed' && result.agent?.name === "System" && <XCircle className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />}
                  <div>
                    <CardTitle className="text-lg mb-1">{result.agent?.name || 'System Message'}</CardTitle>
                    {result.agent?.name !== "System" && (
                        <>
                            <p className="text-sm text-muted-foreground">Offered Capability: <Badge variant="secondary">{result.agent.capability}</Badge></p>
                            <p className="text-sm text-muted-foreground">QoS: <Badge variant="outline">{result.agent.qos.toFixed(2)}</Badge> | Cost: <Badge variant="outline">${result.agent.cost}</Badge> | Protocol: <Badge variant="outline">{result.agent.protocol}</Badge></p>
                        </>
                    )}
                    <p className={`text-sm mt-1 ${
                        result.status === 'success' ? 'text-green-600' :
                        result.status === 'partial' ? 'text-yellow-600' :
                        'text-red-600'
                    }`}>{result.message}</p>
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
