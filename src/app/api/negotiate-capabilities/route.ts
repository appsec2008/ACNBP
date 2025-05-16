
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { evaluateOffers } from "@/ai/flows/evaluate-offers-flow";
import type { EvaluateOffersInput, EvaluateOffersOutput, } from "@/ai/flows/evaluate-offers-flow";
// Import schema definitions for request and response
import type { AgentService, NegotiationResult, NegotiationRequestInput, NegotiationApiResponse } from "@/lib/types";

// This API endpoint adheres to the following JSON schemas defined in @/lib/types.ts:
// Request Body: NegotiationRequestInput
// Response Body: NegotiationApiResponse

// Define available services here (simulating a database or service registry)
const availableServices: AgentService[] = [
  { 
    id: "svc1", 
    name: "ImageAnalysisPro", 
    capability: "Image Recognition", 
    description: "High-accuracy image recognition and tagging, supports various formats.", 
    qos: 0.95, 
    cost: 100, 
    protocol: "ACNBP-Vision/1.0", 
    ansEndpoint: "a2a://ImagePro.ImageRecognition.VisionCorp.v1.2.0.gpu-optimized" 
  },
  { 
    id: "svc2", 
    name: "TextSummarizerAI", 
    capability: "Text Summarization", 
    description: "Advanced NLP for summarizing long documents, multiple languages.", 
    qos: 0.90, 
    cost: 75, 
    protocol: "ACNBP-NLP/1.2", 
    ansEndpoint: "mcp://TextSumAI.TextSummarization.NLPHub.v2.0.1.multilang" 
  },
  { 
    id: "svc3", 
    name: "DataCruncher Bot", 
    capability: "Data Processing", 
    description: "Scalable data processing and analytics, batch and stream modes.", 
    qos: 0.88, 
    cost: 120, 
    protocol: "ACNBP-Data/1.0", 
    ansEndpoint: "acp://DataBot.DataProcessing.ComputeCorp.v1.0.0.batch" 
  },
  { 
    id: "svc4", 
    name: "SecureStorageAgent", 
    capability: "Secure Storage", 
    description: "Encrypted and resilient data storage solution with audit trails.", 
    qos: 0.99, 
    cost: 50, 
    protocol: "ACNBP-SecureStore/1.1", 
    ansEndpoint: "a2a://SecureStore.SecureStorage.VaultInc.v1.1.0.e2ee" 
  },
  { 
    id: "svc5", 
    name: "ImageAnalysisBasic", 
    capability: "Image Recognition Basic", 
    description: "Basic image recognition service for general purposes, limited formats.", 
    qos: 0.80, 
    cost: 40, 
    protocol: "ACNBP-Vision/1.0", 
    ansEndpoint: "a2a://ImageBasic.ImageRecognition.VisionCorp.v1.0.0.standard" 
  },
  { 
    id: "svc6", 
    name: "TranslationService", 
    capability: "Language Translation", 
    description: "Real-time translation for multiple language pairs.", 
    qos: 0.92, 
    cost: 60, 
    protocol: "ACNBP-NLP/1.2", 
    ansEndpoint: "mcp://Translator.LanguageTranslation.LinguaTech.v1.5.0.realtime" 
  },
  { 
    id: "svc7", 
    name: "TimeSeriesDB", 
    capability: "Data Storage Time Series", 
    description: "Optimized storage for time-series data with querying capabilities.", 
    qos: 0.97, 
    cost: 90, 
    protocol: "ACNBP-Data/1.0", 
    ansEndpoint: "acp://TSDB.DataStorageTimeSeries.DataStack.v2.3.1.fastquery" 
  },
  { 
    id: "svc8", 
    name: "Image Resolution Enhancer", 
    capability: "Image Resolution Upscaling", 
    description: "Upscales image resolution using AI.", 
    qos: 0.85, 
    cost: 150, 
    protocol: "ACNBP-Vision/1.1", 
    ansEndpoint: "a2a://ImageUpscaler.ImageResolutionUpscaling.PixelPerfect.v1.0.0.ai-enhanced" 
  },
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
    // Determine if QoS/Cost criteria are effectively ignored by the user's input
    const isQoSIgnored = requiredQos <= 0.01; // Using a small epsilon for float comparison
    const isCostIgnored = maxCost >= 999999;  // A large number indicates cost is not a concern

    availableServices.forEach(service => {
      let serviceMatchStatus: NegotiationResult['matchStatus'] = 'failed'; // Default to failed
      const messages: string[] = [];
      let capabilityMatched = false;

      // 1. Capability Check (Fuzzy & Optional)
      if (!normalizedDesiredCapability) { // If no desired capability, all services "match" this criterion
        capabilityMatched = true;
        messages.push("Capability requirement not specified by user.");
      } else {
        const normalizedServiceCapability = normalizeCapability(service.capability);
        if (normalizedServiceCapability.includes(normalizedDesiredCapability) || normalizedDesiredCapability.includes(normalizedServiceCapability)) {
          capabilityMatched = true;
          messages.push(`Capability matched (Offered: '${service.capability}', Desired: '${desiredCapability}').`);
        }
      }

      if (!capabilityMatched) {
        serviceMatchStatus = 'capability_mismatch';
        messages.push(`Capability mismatch: Agent offers '${service.capability}', but user desired '${desiredCapability}'.`);
      } else {
        // Only proceed to QoS/Cost if capability is matched (or not specified)
        let qosCheckResult: 'met' | 'partially_met' | 'not_met' | 'ignored' = 'ignored';
        if (!isQoSIgnored) {
          if (service.qos >= requiredQos) {
            messages.push(`Meets QoS requirement (${service.qos.toFixed(2)} >= ${requiredQos.toFixed(2)}).`);
            qosCheckResult = 'met';
          } else if (service.qos >= requiredQos * 0.8) { // Example: partial match if within 80%
            messages.push(`Partially meets QoS (${service.qos.toFixed(2)} vs desired ${requiredQos.toFixed(2)}).`);
            qosCheckResult = 'partially_met';
          } else {
            messages.push(`Does not meet QoS requirement (${service.qos.toFixed(2)} < desired ${requiredQos.toFixed(2)}).`);
            qosCheckResult = 'not_met';
          }
        } else {
          messages.push("QoS requirement was not strictly specified by the user.");
        }

        let costCheckResult: 'met' | 'partially_met' | 'not_met' | 'ignored' = 'ignored';
        if (!isCostIgnored) {
          if (service.cost <= maxCost) {
            messages.push(`Within cost limit ($${service.cost} <= $${maxCost}).`);
            costCheckResult = 'met';
          } else if (service.cost <= maxCost * 1.2) { // Example: partial match if up to 20% over budget
            messages.push(`Slightly exceeds cost limit ($${service.cost} vs max $${maxCost}).`);
            costCheckResult = 'partially_met';
          } else {
            messages.push(`Exceeds cost limit ($${service.cost} > max $${maxCost}).`);
            costCheckResult = 'not_met';
          }
        } else {
          messages.push("Maximum cost requirement was not strictly specified by the user.");
        }
        
        // Determine overall match status based on checks
        if (qosCheckResult === 'not_met' || costCheckResult === 'not_met') {
          serviceMatchStatus = 'failed'; // Hard fail if any non-ignored criterion is not met
        } else if (qosCheckResult === 'partially_met' || costCheckResult === 'partially_met') {
          serviceMatchStatus = 'partial'; // Partial if at least one criterion is partially met and none failed
        } else { // All met or ignored
          serviceMatchStatus = 'success';
        }
      }
      
      negotiationResults.push({
        service,
        matchStatus: serviceMatchStatus,
        matchMessage: messages.join(' '),
      });
      
      // Add to AI evaluation list if it's a capability match and not a hard fail on other criteria
      if (capabilityMatched && serviceMatchStatus !== 'failed' && serviceMatchStatus !== 'capability_mismatch') {
         offersForAI.push({
          id: service.id, // Ensure ID is passed to AI
          description: service.description,
          cost: service.cost,
          qos: service.qos,
          protocolCompatibility: service.protocol,
        });
      }
    });
    
    // Filter out results that are a capability mismatch IF a capability was specified.
    // If no capability was specified, all results are kept initially.
    const finalFilteredResults = negotiationResults.filter(result => 
        normalizedDesiredCapability ? result.matchStatus !== 'capability_mismatch' : true
    );

    let aiEvaluationStatus: NegotiationApiResponse['aiEvaluationStatus'] = 'not_attempted';
    let aiEvaluationMessage: NegotiationApiResponse['aiEvaluationMessage'] = undefined;

    // AI Evaluation Stage
    if (securityRequirements && securityRequirements.trim() !== "") {
      // Only consider offers that weren't hard failures or capability mismatches for AI evaluation
      const candidatesForAIProcessing = offersForAI.filter(offer => {
        const correspondingResult = finalFilteredResults.find(r => r.service.id === offer.id);
        return correspondingResult && correspondingResult.matchStatus !== 'failed' && correspondingResult.matchStatus !== 'capability_mismatch';
      });

      if (candidatesForAIProcessing.length > 0) {
        try {
          const aiInput: EvaluateOffersInput = {
            capabilityOffers: candidatesForAIProcessing, // Pass only relevant candidates
            securityRequirements: securityRequirements,
          };
          const aiEvaluations: EvaluateOffersOutput = await evaluateOffers(aiInput);

          // Merge AI results back
          aiEvaluations.forEach(aiEval => {
            const resultToUpdate = finalFilteredResults.find(r => r.service.id === aiEval.id);
            if (resultToUpdate) {
              resultToUpdate.aiScore = aiEval.score;
              resultToUpdate.aiReasoning = aiEval.reasoning;
            }
          });
          aiEvaluationStatus = 'success';
          aiEvaluationMessage = `AI evaluation completed successfully for ${aiEvaluations.length} offer(s).`;
        } catch (error) {
          console.error("API - AI Offer evaluation error:", error);
          aiEvaluationStatus = 'failed';
          aiEvaluationMessage = "An error occurred during AI evaluation. Results shown without AI scores for some/all offers.";
        }
      } else if (offersForAI.length > 0 && candidatesForAIProcessing.length === 0) {
         // This case means offers existed but none were suitable for AI after local filtering
        aiEvaluationStatus = 'skipped_no_candidates';
        aiEvaluationMessage = "AI evaluation skipped: No offers met the combined criteria (capability, QoS, cost) to proceed to security evaluation.";
      } else { 
        // This case means no offers even made it to the 'offersForAI' list initially
        aiEvaluationStatus = 'skipped_no_candidates';
        aiEvaluationMessage = "AI evaluation skipped: No offers initially matched basic capability to be considered for further evaluation.";
      }
    } else {
      aiEvaluationStatus = 'skipped_no_requirements';
      aiEvaluationMessage = "AI evaluation skipped: No security requirements were provided by the user.";
    }

    // Handle cases where no services are found at all after filtering
    if (finalFilteredResults.length === 0 && normalizedDesiredCapability) {
         finalFilteredResults.push({ 
            service: {id: "system-no-match", name: "System Message", capability: "N/A", description: "No matching services found.", qos:0, cost:0, protocol: "N/A", ansEndpoint: "N/A"},
            matchStatus: 'failed', 
            matchMessage: "No agents found matching the desired capability and other specified criteria after filtering."
        });
    } else if (finalFilteredResults.length === 0 && !normalizedDesiredCapability) { // No capability specified, but still no services
         finalFilteredResults.push({
            service: {id: "system-no-agents", name: "System Message", capability: "N/A", description: "No agents available.", qos:0, cost:0, protocol: "N/A", ansEndpoint: "N/A"},
            matchStatus: 'failed',
            matchMessage: "No agents available in the system or none matched the (optional) criteria specified."
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
    // Ensure the error response also adheres to the NegotiationApiResponse schema
    const errorResponse: NegotiationApiResponse = {
        results: [{
            service: {id: "system-error", name: "System Error", capability: "N/A", description: `Server error: ${message}`, qos:0, cost:0, protocol: "N/A", ansEndpoint: "N/A"},
            matchStatus: 'failed',
            matchMessage: `Server error: ${message}`
        }],
        aiEvaluationStatus: 'failed',
        aiEvaluationMessage: `Server error during negotiation: ${message}`
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
