
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { evaluateOffers } from "@/ai/flows/evaluate-offers-flow";
import type { EvaluateOffersInput, EvaluateOffersOutput, } from "@/ai/flows/evaluate-offers-flow";
import type { AgentService, NegotiationResult, NegotiationRequestInput, NegotiationApiResponse } from "@/lib/types";

// Define available services here (simulating a database or service registry)
const availableServices: AgentService[] = [
  { id: "svc1", name: "ImageAnalysisPro", capability: "Image Recognition", description: "High-accuracy image recognition and tagging, supports various formats.", qos: 0.95, cost: 100, protocol: "ACNBP-Vision/1.0", ansEndpoint: "agent://image.pro.ans/service" },
  { id: "svc2", name: "TextSummarizerAI", capability: "Text Summarization", description: "Advanced NLP for summarizing long documents, multiple languages.", qos: 0.90, cost: 75, protocol: "ACNBP-NLP/1.2", ansEndpoint: "agent://nlp.summarizer.ans/v2" },
  { id: "svc3", name: "DataCruncher Bot", capability: "Data Processing", description: "Scalable data processing and analytics, batch and stream modes.", qos: 0.88, cost: 120, protocol: "ACNBP-Data/1.0", ansEndpoint: "tcp://10.0.1.5:8001" },
  { id: "svc4", name: "SecureStorageAgent", capability: "Secure Storage", description: "Encrypted and resilient data storage solution with audit trails.", qos: 0.99, cost: 50, protocol: "ACNBP-SecureStore/1.1", ansEndpoint: "https://secure.storage.svc/api" },
  { id: "svc5", name: "ImageAnalysisBasic", capability: "Image Recognition Basic", description: "Basic image recognition service for general purposes, limited formats.", qos: 0.80, cost: 40, protocol: "ACNBP-Vision/1.0", ansEndpoint: "agent://image.basic.ans/service" },
  { id: "svc6", name: "TranslationService", capability: "Language Translation", description: "Real-time translation for multiple language pairs.", qos: 0.92, cost: 60, protocol: "ACNBP-NLP/1.2", ansEndpoint: "grpc://translator.services.local:50051" },
  { id: "svc7", name: "TimeSeriesDB", capability: "Data Storage Time Series", description: "Optimized storage for time-series data with querying capabilities.", qos: 0.97, cost: 90, protocol: "ACNBP-Data/1.0", ansEndpoint: "tsdb://timeseries.internal:9090" },
  { id: "svc8", name: "Image Resolution Enhancer", capability: "Image Resolution Upscaling", description: "Upscales image resolution using AI.", qos: 0.85, cost: 150, protocol: "ACNBP-Vision/1.1", ansEndpoint: "agent://image.upscaler.ans/pro" },
];

function normalizeCapability(capability: string): string {
  return capability.toLowerCase().replace(/\s+/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as NegotiationRequestInput;
    const { desiredCapability, requiredQos, maxCost, securityRequirements } = body;

    const negotiationResults: NegotiationResult[] = [];
    const offersForAI: EvaluateOffersInput['capabilityOffers'] = [];

    const normalizedDesiredCapability = desiredCapability ? normalizeCapability(desiredCapability) : "";
    const isQoSIgnored = requiredQos <= 0.01; // Epsilon for float comparison
    const isCostIgnored = maxCost >= 999999; // A large number indicates cost is not a concern

    availableServices.forEach(service => {
      let serviceMatchStatus: NegotiationResult['matchStatus'] = 'failed'; // Default to failed
      const messages: string[] = [];
      let qualifiesForAI = false;
      let capabilityMatched = false;

      // 1. Capability Check (Fuzzy & Optional)
      if (!normalizedDesiredCapability) {
        capabilityMatched = true; // No specific capability desired, so all services pass this check
        messages.push("Capability requirement not specified.");
      } else {
        const normalizedServiceCapability = normalizeCapability(service.capability);
        if (normalizedServiceCapability.includes(normalizedDesiredCapability) || normalizedDesiredCapability.includes(normalizedServiceCapability)) {
          capabilityMatched = true;
          messages.push("Capability matched.");
        }
      }

      if (!capabilityMatched) {
        serviceMatchStatus = 'capability_mismatch';
        messages.push(`Capability mismatch. Agent offers '${service.capability}', desired: '${desiredCapability}'.`);
      } else {
        // 2. QoS Check
        let qosCheckResult = 'met'; // met, partially_met, not_met
        if (!isQoSIgnored) {
          if (service.qos >= requiredQos) {
            messages.push(`Meets QoS requirement (${service.qos.toFixed(2)} >= ${requiredQos.toFixed(2)}).`);
          } else if (service.qos >= requiredQos * 0.8) {
            messages.push(`Partially meets QoS (${service.qos.toFixed(2)} vs ${requiredQos.toFixed(2)}).`);
            qosCheckResult = 'partially_met';
          } else {
            messages.push(`Does not meet QoS requirement (${service.qos.toFixed(2)} < ${requiredQos.toFixed(2)}).`);
            qosCheckResult = 'not_met';
          }
        } else {
          messages.push("QoS requirement ignored by user setting.");
        }

        // 3. Cost Check
        let costCheckResult = 'met'; // met, partially_met, not_met
        if (!isCostIgnored) {
          if (service.cost <= maxCost) {
            messages.push(`Within cost limit ($${service.cost} <= $${maxCost}).`);
          } else if (service.cost <= maxCost * 1.2) {
            messages.push(`Slightly exceeds cost limit ($${service.cost} vs $${maxCost}).`);
            costCheckResult = 'partially_met';
          } else {
            messages.push(`Exceeds cost limit ($${service.cost} > $${maxCost}).`);
            costCheckResult = 'not_met';
          }
        } else {
           messages.push("Maximum cost requirement ignored by user setting.");
        }
        
        // 4. Determine overall match status
        if (qosCheckResult === 'not_met' || costCheckResult === 'not_met') {
          serviceMatchStatus = 'failed';
        } else if (qosCheckResult === 'partially_met' || costCheckResult === 'partially_met') {
          serviceMatchStatus = 'partial';
          qualifiesForAI = true; // Partial matches can still be evaluated by AI
        } else { // All met or ignored
          serviceMatchStatus = 'success';
          qualifiesForAI = true;
        }
      }
      
      negotiationResults.push({
        service,
        matchStatus: serviceMatchStatus,
        matchMessage: messages.join(' '),
      });
      
      if (capabilityMatched && serviceMatchStatus !== 'failed' && serviceMatchStatus !== 'capability_mismatch') {
         offersForAI.push({
          id: service.id,
          description: service.description,
          cost: service.cost,
          qos: service.qos,
          protocolCompatibility: service.protocol,
        });
      }
    });
    
    // Filter out results that are a capability mismatch IF a capability was specified.
    const finalFilteredResults = negotiationResults.filter(result => 
        normalizedDesiredCapability ? result.matchStatus !== 'capability_mismatch' : true
    );

    let aiEvaluationStatus: NegotiationApiResponse['aiEvaluationStatus'] = 'not_attempted';
    let aiEvaluationMessage: NegotiationApiResponse['aiEvaluationMessage'] = undefined;

    if (securityRequirements && securityRequirements.trim() !== "") {
      const candidatesForAIProcessing = offersForAI.filter(offer => {
        const correspondingResult = finalFilteredResults.find(r => r.service.id === offer.id);
        return correspondingResult && correspondingResult.matchStatus !== 'failed' && correspondingResult.matchStatus !== 'capability_mismatch';
      });


      if (candidatesForAIProcessing.length > 0) {
        try {
          const aiInput: EvaluateOffersInput = {
            capabilityOffers: candidatesForAIProcessing,
            securityRequirements: securityRequirements,
          };
          const aiEvaluations: EvaluateOffersOutput = await evaluateOffers(aiInput);

          aiEvaluations.forEach(aiEval => {
            const resultToUpdate = finalFilteredResults.find(r => r.service.id === aiEval.id);
            if (resultToUpdate) {
              resultToUpdate.aiScore = aiEval.score;
              resultToUpdate.aiReasoning = aiEval.reasoning;
            }
          });
          aiEvaluationStatus = 'success';
          aiEvaluationMessage = 'AI evaluation completed successfully for relevant offers.';
        } catch (error) {
          console.error("API - AI Offer evaluation error:", error);
          aiEvaluationStatus = 'failed';
          aiEvaluationMessage = "An error occurred during AI evaluation. Results shown without AI scores for some/all offers.";
        }
      } else if (offersForAI.length > 0 && candidatesForAIProcessing.length === 0) {
        aiEvaluationStatus = 'skipped_no_candidates';
        aiEvaluationMessage = "AI evaluation skipped: No suitable candidates after initial filtering met AI evaluation criteria.";
      } 
       else { 
        aiEvaluationStatus = 'skipped_no_candidates';
        aiEvaluationMessage = "AI evaluation skipped: No offers met the basic criteria to be considered for AI evaluation.";
      }
    } else {
      aiEvaluationStatus = 'skipped_no_requirements';
      aiEvaluationMessage = "AI evaluation skipped: No security requirements provided.";
    }

    if (finalFilteredResults.length === 0 && normalizedDesiredCapability) {
         finalFilteredResults.push({ 
            service: {id: "system", name: "System Message", capability: "N/A", description: "N/A", qos:0, cost:0, protocol: "N/A", ansEndpoint: "N/A"},
            matchStatus: 'failed', 
            matchMessage: "No agents found matching the desired capability and other criteria after filtering."
        });
    } else if (finalFilteredResults.length === 0 && !normalizedDesiredCapability) {
         finalFilteredResults.push({
            service: {id: "system", name: "System Message", capability: "N/A", description: "N/A", qos:0, cost:0, protocol: "N/A", ansEndpoint: "N/A"},
            matchStatus: 'failed',
            matchMessage: "No agents available in the system or none matched unspecified criteria."
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

