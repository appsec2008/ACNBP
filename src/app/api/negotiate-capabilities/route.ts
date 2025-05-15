
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { evaluateOffers } from "@/ai/flows/evaluate-offers-flow";
import type { EvaluateOffersInput, EvaluateOffersOutput, } from "@/ai/flows/evaluate-offers-flow";
import type { AgentService, NegotiationResult, NegotiationRequestInput, NegotiationApiResponse } from "@/lib/types";

// Define available services here (simulating a database or service registry)
const availableServices: AgentService[] = [
  { id: "svc1", name: "ImageAnalysisPro", capability: "Image Recognition", description: "High-accuracy image recognition and tagging, supports various formats.", qos: 0.95, cost: 100, protocol: "ACNBP-Vision/1.0" },
  { id: "svc2", name: "TextSummarizerAI", capability: "Text Summarization", description: "Advanced NLP for summarizing long documents, multiple languages.", qos: 0.90, cost: 75, protocol: "ACNBP-NLP/1.2" },
  { id: "svc3", name: "DataCruncher Bot", capability: "Data Processing", description: "Scalable data processing and analytics, batch and stream modes.", qos: 0.88, cost: 120, protocol: "ACNBP-Data/1.0" },
  { id: "svc4", name: "SecureStorageAgent", capability: "Secure Storage", description: "Encrypted and resilient data storage solution with audit trails.", qos: 0.99, cost: 50, protocol: "ACNBP-SecureStore/1.1" },
  { id: "svc5", name: "ImageAnalysisBasic", capability: "Image Recognition", description: "Basic image recognition service for general purposes, limited formats.", qos: 0.80, cost: 40, protocol: "ACNBP-Vision/1.0" },
  { id: "svc6", name: "TranslationService", capability: "Language Translation", description: "Real-time translation for multiple language pairs.", qos: 0.92, cost: 60, protocol: "ACNBP-NLP/1.2" },
  { id: "svc7", name: "TimeSeriesDB", capability: "Data Storage", description: "Optimized storage for time-series data with querying capabilities.", qos: 0.97, cost: 90, protocol: "ACNBP-Data/1.0" },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as NegotiationRequestInput;
    const { desiredCapability, requiredQos, maxCost, securityRequirements } = body;

    const negotiationResults: NegotiationResult[] = [];
    const offersForAI: EvaluateOffersInput['capabilityOffers'] = [];

    const desiredCapLower = desiredCapability.toLowerCase();

    availableServices.forEach(service => {
      let matchStatus: NegotiationResult['matchStatus'] = 'failed';
      let matchMessage = "";
      let qualifiesForAI = false;

      const serviceCapLower = service.capability.toLowerCase();

      if (!desiredCapability || serviceCapLower.includes(desiredCapLower) || desiredCapLower.includes(serviceCapLower)) {
        if (service.qos >= requiredQos && service.cost <= maxCost) {
          matchStatus = 'success';
          matchMessage = `Successfully meets QoS/Cost criteria. Offering ${service.capability}.`;
          qualifiesForAI = true;
        } else if (service.qos >= requiredQos * 0.8 && service.cost <= maxCost * 1.2) {
          matchStatus = 'partial';
          matchMessage = `Partially meets QoS/Cost criteria. Offering ${service.capability}. Consider adjusting requirements.`;
          qualifiesForAI = true; // Still consider for AI evaluation if security is a factor
        } else {
          matchStatus = 'failed';
          matchMessage = `Does not meet QoS/Cost criteria for ${service.capability}.`;
        }
      } else {
        matchStatus = 'capability_mismatch';
        matchMessage = `Capability mismatch. Agent offers ${service.capability}, desired: ${desiredCapability || 'any'}.`;
      }
      
      negotiationResults.push({
        service,
        matchStatus,
        matchMessage,
      });
      
      if (qualifiesForAI) {
        offersForAI.push({
          id: service.id, // Use existing service ID
          description: service.description,
          cost: service.cost,
          qos: service.qos,
          protocolCompatibility: service.protocol,
        });
      }
    });
    
    // Filter out results that are a capability mismatch IF a capability was specified
    // and only keep those that at least partially or fully matched criteria or if no capability was specified initially.
    // The offersForAI list already contains only the relevant candidates for AI.
    const finalFilteredResults = negotiationResults.filter(result => 
        desiredCapability ? result.matchStatus !== 'capability_mismatch' : true
    );


    let aiEvaluationStatus: NegotiationApiResponse['aiEvaluationStatus'] = 'not_attempted';
    let aiEvaluationMessage: NegotiationApiResponse['aiEvaluationMessage'] = undefined;

    if (securityRequirements && securityRequirements.trim() !== "") {
      if (offersForAI.length > 0) {
        try {
          const aiInput: EvaluateOffersInput = {
            capabilityOffers: offersForAI,
            securityRequirements: securityRequirements,
          };
          const aiEvaluations: EvaluateOffersOutput = await evaluateOffers(aiInput);

          // Merge AI results
          aiEvaluations.forEach(aiEval => {
            const resultToUpdate = finalFilteredResults.find(r => r.service.id === aiEval.id);
            if (resultToUpdate) {
              resultToUpdate.aiScore = aiEval.score;
              resultToUpdate.aiReasoning = aiEval.reasoning;
            }
          });
          aiEvaluationStatus = 'success';
          aiEvaluationMessage = 'AI evaluation completed successfully.';
        } catch (error) {
          console.error("API - AI Offer evaluation error:", error);
          aiEvaluationStatus = 'failed';
          aiEvaluationMessage = "An error occurred during AI evaluation. Results shown without AI scores.";
        }
      } else {
        aiEvaluationStatus = 'skipped_no_candidates';
        aiEvaluationMessage = "AI evaluation skipped: No suitable candidate offers after initial filtering.";
      }
    } else {
      aiEvaluationStatus = 'skipped_no_requirements';
      aiEvaluationMessage = "AI evaluation skipped: No security requirements provided.";
    }

    if (finalFilteredResults.length === 0 && desiredCapability) {
         // Add a system message if no agents found after filtering.
        finalFilteredResults.push({
            service: {id: "system", name: "System", capability: "N/A", description: "N/A", qos:0, cost:0, protocol: "N/A"},
            matchStatus: 'failed',
            matchMessage: "No agents found matching the desired capability and criteria after filtering."
        });
    }


    const response: NegotiationApiResponse = {
      results: finalFilteredResults,
      aiEvaluationStatus,
      aiEvaluationMessage,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("API - Negotiation error:", error);
    let message = "An unknown error occurred during negotiation.";
    if (error instanceof Error) {
        message = error.message;
    }
    const errorResponse: NegotiationApiResponse = {
        results: [],
        aiEvaluationStatus: 'failed',
        aiEvaluationMessage: `Server error: ${message}`
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
