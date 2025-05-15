
// Describes a service listed in the system, used by the negotiation API and frontend.
export interface AgentService {
  id: string;
  name: string;
  capability: string;
  description: string;
  qos: number; // 0-1 (Quality of Service)
  cost: number;
  protocol: string;
}

// Result item for capability negotiation, returned by API to client.
export interface NegotiationResult {
  service: AgentService;
  matchStatus: 'success' | 'partial' | 'failed' | 'capability_mismatch';
  matchMessage: string;
  aiScore?: number;
  aiReasoning?: string;
}

// Input structure for the /api/negotiate-capabilities endpoint
export interface NegotiationRequestInput {
  desiredCapability: string;
  requiredQos: number;
  maxCost: number;
  securityRequirements?: string;
}

// Response structure from the /api/negotiate-capabilities endpoint
export interface NegotiationApiResponse {
  results: NegotiationResult[];
  aiEvaluationStatus: 'not_attempted' | 'skipped_no_requirements' | 'skipped_no_candidates' | 'success' | 'failed';
  aiEvaluationMessage?: string;
}


// For Agent Directory Page
export interface AgentRegistration {
  id: string;
  name: string;
  address: string;
  capabilities: string[];
  protocolExtensions: string[];
  timestamp: string; // Should be ISO string for data, can be formatted for display
}

// These types are related to what the evaluateOffers AI flow expects/returns,
// but the primary types for that flow are defined within the flow file itself using Zod.
// These are more for conceptual reference if needed elsewhere, though not directly used by the flow.

// For AI Flow input preparation - conceptual, Zod schema in flow is source of truth.
export interface CapabilityOfferForAI {
  id: string;
  description: string;
  cost: number;
  qos: number;
  protocolCompatibility: string;
}

// For AI Flow output processing - conceptual, Zod schema in flow is source of truth.
export interface EvaluatedOfferFromAI {
  id:string;
  description: string;
  cost: number;
  qos: number;
  protocolCompatibility: string;
  score: number;
  reasoning: string;
}
