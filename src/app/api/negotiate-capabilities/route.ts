
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { evaluateOffers } from "@/ai/flows/evaluate-offers-flow";
import type { EvaluateOffersInput, EvaluateOffersOutput, } from "@/ai/flows/evaluate-offers-flow";
import type { AgentService, NegotiationResult, NegotiationRequestInput, NegotiationApiResponse, AgentRegistration } from "@/lib/types";
import { getDb } from '@/lib/db';

function normalizeCapability(capability: string): string {
  if (!capability) return "";
  return capability.toLowerCase().replace(/\s+/g, '').trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as NegotiationRequestInput;
    const { desiredCapability, requiredQos, maxCost, securityRequirements } = body;

    const negotiationResults: NegotiationResult[] = [];
    const offersForAI: EvaluateOffersInput['capabilityOffers'] = [];

    const db = await getDb();
    const registeredAgentRows = await db.all<Array<AgentRegistration & { agentCertificate: string, protocolExtensions: string }>>(
        'SELECT * FROM agents WHERE isRevoked = 0 OR isRevoked IS NULL'
    );

    const potentialServices: AgentService[] = [];

    for (const agent of registeredAgentRows) {
        let parsedProtocolExtensions: { [key: string]: any } = {};
        try {
            parsedProtocolExtensions = JSON.parse(agent.protocolExtensions as string);
        } catch (e) {
            console.warn(`Could not parse protocolExtensions for agent ${agent.id}: ${e}`);
        }

        let agentDescription = `Agent offering ${agent.agentCapability}`;
        if (agent.protocol === 'a2a' && parsedProtocolExtensions.a2aAgentCard?.description) {
            agentDescription = parsedProtocolExtensions.a2aAgentCard.description;
        } else if (parsedProtocolExtensions.description) {
            agentDescription = parsedProtocolExtensions.description;
        }
        
        let agentCost: number | undefined = undefined;
        if (typeof parsedProtocolExtensions.cost === 'number') {
            agentCost = parsedProtocolExtensions.cost;
        } else if (agent.protocol === 'a2a' && parsedProtocolExtensions.a2aAgentCard && typeof parsedProtocolExtensions.a2aAgentCard.defaultCost === 'number') {
            agentCost = parsedProtocolExtensions.a2aAgentCard.defaultCost;
        } else if (parsedProtocolExtensions.defaultCosts?.fixedCost) { 
            agentCost = parsedProtocolExtensions.defaultCosts.fixedCost;
        }


        let agentQos: number | undefined = undefined; 
        if (typeof parsedProtocolExtensions.qos === 'number' && parsedProtocolExtensions.qos >= 0 && parsedProtocolExtensions.qos <= 1) {
            agentQos = parsedProtocolExtensions.qos;
        } else if (agent.protocol === 'a2a' && parsedProtocolExtensions.a2aAgentCard && typeof parsedProtocolExtensions.a2aAgentCard.defaultQos === 'number' ) {
            agentQos = parsedProtocolExtensions.a2aAgentCard.defaultQos;
        } else if (parsedProtocolExtensions.defaultQoS?.customParameters?.overallSatisfaction) { 
            const customQos = parsedProtocolExtensions.defaultQoS.customParameters.overallSatisfaction;
            if (typeof customQos === 'number' && customQos >=0 && customQos <=1) {
                agentQos = customQos;
            }
        }


        const currentService: AgentService = {
            id: agent.id,
            name: agent.agentID,
            capability: agent.agentCapability, 
            description: agentDescription,
            qos: agentQos, 
            cost: agentCost,
            protocol: agent.protocol,
            ansEndpoint: agent.ansName,
        };
        
        potentialServices.push(currentService);
    }


    const normalizedDesiredCapability = desiredCapability ? normalizeCapability(desiredCapability) : "";
    const isQoSIgnored = requiredQos <= 0.001;
    const isCostIgnored = maxCost >= 999999;

    potentialServices.forEach(service => {
      let serviceMatchStatus: NegotiationResult['matchStatus'] = 'failed'; 
      const messages: string[] = [];
      let capabilityMatched = false;
      let primaryCapabilityMatched = false;
      let a2aSkillMatched = false;

      if (!normalizedDesiredCapability) { 
        capabilityMatched = true;
        messages.push("Capability requirement not specified by user; considering all agents.");
      } else {
        const agentRecord = registeredAgentRows.find(ar => ar.id === service.id);
        if (agentRecord) {
            const primaryRegisteredCapabilityNorm = normalizeCapability(agentRecord.agentCapability);
            if (primaryRegisteredCapabilityNorm.includes(normalizedDesiredCapability) || normalizedDesiredCapability.includes(primaryRegisteredCapabilityNorm)) {
                primaryCapabilityMatched = true;
                capabilityMatched = true;
                messages.push(`Primary capability '${agentRecord.agentCapability}' matches desired '${desiredCapability}'.`);
            }

            if (agentRecord.protocol === 'a2a') {
                try {
                    const pExt = JSON.parse(agentRecord.protocolExtensions as string);
                    if (pExt.a2aAgentCard && Array.isArray(pExt.a2aAgentCard.skills) && pExt.a2aAgentCard.skills.length > 0) {
                        messages.push(`A2A Agent: Evaluating ${pExt.a2aAgentCard.skills.length} skill(s) from AgentCard.`);
                        for (const skill of pExt.a2aAgentCard.skills) {
                            const skillIdNorm = skill.id ? normalizeCapability(skill.id) : "";
                            const skillNameNorm = skill.name ? normalizeCapability(skill.name) : "";

                            if (skillIdNorm && (skillIdNorm.includes(normalizedDesiredCapability) || normalizedDesiredCapability.includes(skillIdNorm))) {
                                a2aSkillMatched = true;
                                messages.push(`A2A skill ID '${skill.id}' in AgentCard matches desired '${desiredCapability}'.`);
                                break; 
                            }
                            if (skillNameNorm && (skillNameNorm.includes(normalizedDesiredCapability) || normalizedDesiredCapability.includes(skillNameNorm))) {
                                a2aSkillMatched = true;
                                messages.push(`A2A skill name '${skill.name}' in AgentCard matches desired '${desiredCapability}'.`);
                                break;
                            }
                        }
                        if (a2aSkillMatched) {
                            capabilityMatched = true; 
                        } else if (!primaryCapabilityMatched) { 
                            messages.push(`A2A agent: None of the listed skills in 'a2aAgentCard.skills' matched '${desiredCapability}'.`);
                        } else {
                            messages.push(`A2A agent: Primary capability matched, but no specific A2A skills from AgentCard matched '${desiredCapability}'.`);
                        }
                    } else if (!primaryCapabilityMatched) { 
                         messages.push(`A2A agent: 'a2aAgentCard.skills' not found, not an array, or empty. Cannot match specific A2A skills for '${desiredCapability}'.`);
                    } else {
                         messages.push(`A2A agent: 'a2aAgentCard.skills' not found or empty (primary capability already matched).`);
                    }
                } catch (e) {
                    if (!primaryCapabilityMatched) { 
                        messages.push(`A2A agent: Error parsing protocolExtensions; specific A2A skills could not be verified for '${desiredCapability}'.`);
                    } else { 
                        messages.push(`A2A agent: Error parsing protocolExtensions for A2A skills (primary capability already matched).`);
                    }
                }
            }
        
            if (!capabilityMatched) {
                messages.push(`No matching primary capability or A2A skills found for desired '${desiredCapability}'. Agent's primary capability: '${agentRecord.agentCapability}'.`);
            }
        } else {
             messages.push(`Error: Could not find original registration details for service ID ${service.id} to perform capability/skill matching.`);
             capabilityMatched = false; 
        }
      }


      if (!capabilityMatched) {
        serviceMatchStatus = 'capability_mismatch';
      } else {
        let qosCheckResult: 'met' | 'partially_met' | 'not_met' | 'ignored' = 'ignored';
        if (!isQoSIgnored) {
            if (service.qos === undefined) {
                messages.push("QoS not specified by agent; cannot strictly meet user's QoS requirement.");
                qosCheckResult = 'not_met'; 
            } else if (service.qos >= requiredQos) {
                messages.push(`Meets QoS requirement (${service.qos.toFixed(2)} >= ${requiredQos.toFixed(2)}).`);
                qosCheckResult = 'met';
            } else if (service.qos >= requiredQos * 0.8) { 
                messages.push(`Partially meets QoS (${service.qos.toFixed(2)} vs desired ${requiredQos.toFixed(2)}).`);
                qosCheckResult = 'partially_met';
            } else {
                messages.push(`Does not meet QoS requirement (${service.qos.toFixed(2)} < desired ${requiredQos.toFixed(2)}).`);
                qosCheckResult = 'not_met';
            }
        } else {
          messages.push("QoS requirement was not strictly specified by the user, or agent QoS unknown; QoS check skipped.");
        }

        let costCheckResult: 'met' | 'partially_met' | 'not_met' | 'ignored' = 'ignored';
        if (!isCostIgnored) {
            if (service.cost === undefined) {
                 messages.push("Cost not specified by agent; cannot strictly meet user's cost requirement.");
                 costCheckResult = 'not_met'; 
            } else if (service.cost <= maxCost) {
                messages.push(`Within cost limit ($${service.cost.toFixed(2)} <= $${maxCost.toFixed(2)}).`);
                costCheckResult = 'met';
            } else if (service.cost <= maxCost * 1.2) { 
                messages.push(`Slightly exceeds cost limit ($${service.cost.toFixed(2)} vs max $${maxCost.toFixed(2)}).`);
                costCheckResult = 'partially_met';
            } else {
                messages.push(`Exceeds cost limit ($${service.cost.toFixed(2)} > max $${maxCost.toFixed(2)}).`);
                costCheckResult = 'not_met';
            }
        } else {
          messages.push("Maximum cost requirement was not strictly specified by the user, or agent cost unknown; cost check skipped.");
        }
        
        if (qosCheckResult === 'not_met' || costCheckResult === 'not_met') {
          serviceMatchStatus = 'failed'; 
        } else if (qosCheckResult === 'partially_met' || costCheckResult === 'partially_met') {
          serviceMatchStatus = 'partial'; 
        } else { 
          serviceMatchStatus = 'success';
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
          aiEvaluationMessage = `AI evaluation completed successfully for ${aiEvaluations.length} offer(s).`;
        } catch (error) {
          console.error("API - AI Offer evaluation error:", error);
          aiEvaluationStatus = 'failed';
          aiEvaluationMessage = "An error occurred during AI evaluation. Results shown without AI scores for some/all offers.";
        }
      } else if (offersForAI.length > 0 && candidatesForAIProcessing.length === 0) {
        aiEvaluationStatus = 'skipped_no_candidates';
        aiEvaluationMessage = "AI evaluation skipped: No offers met the combined criteria (capability, QoS, cost) to proceed to security evaluation.";
      } else { 
        aiEvaluationStatus = 'skipped_no_candidates';
        aiEvaluationMessage = "AI evaluation skipped: No offers initially matched basic capability/skills to be considered for further evaluation.";
      }
    } else {
      aiEvaluationStatus = 'skipped_no_requirements';
      aiEvaluationMessage = "AI evaluation skipped: No security requirements were provided by the user.";
    }

    if (finalFilteredResults.length === 0 && registeredAgentRows.length > 0) {
         finalFilteredResults.push({ 
            service: {id: "system-no-match", name: "System Message", capability: "N/A", description: "No registered agents matched the specified criteria.", qos:0, cost:0, protocol: "N/A", ansEndpoint: "N/A"},
            matchStatus: 'failed', 
            matchMessage: "No agents found matching the desired capability and other specified criteria after filtering from registered agents."
        });
    } else if (registeredAgentRows.length === 0) {
         finalFilteredResults.push({
            service: {id: "system-no-agents", name: "System Message", capability: "N/A", description: "No agents are currently registered in the ANS.", qos:0, cost:0, protocol: "N/A", ansEndpoint: "N/A"},
            matchStatus: 'failed',
            matchMessage: "No agents available in the ANS registry to evaluate."
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
        results: [{
            service: {
                id: "system-error", 
                name: "System Error", 
                capability: "N/A", 
                description: `Server error: ${message}`, 
                protocol: "N/A", 
                ansEndpoint: "N/A",
                qos: undefined, 
                cost: undefined
            },
            matchStatus: 'failed',
            matchMessage: `Server error: ${message}`
        }],
        aiEvaluationStatus: 'failed',
        aiEvaluationMessage: `Server error during negotiation: ${message}`
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
    

    