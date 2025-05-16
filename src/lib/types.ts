
// Describes a service listed in the system, used by the negotiation API and frontend.
// This interface defines the schema for an "AgentService" object.
export interface AgentService {
  id: string; // Unique identifier for the service
  name: string; // Human-readable name of the service
  capability: string; // Core capability offered (e.g., "Image Recognition", "Text Summarization")
  description: string; // Detailed description of the service
  qos: number; // Quality of Service score (0.0 to 1.0)
  cost: number; // Cost of using the service
  protocol: string; // Communication protocol supported (e.g., "ACNBP-Vision/1.0")
  ansEndpoint: string; // Agent Name Service endpoint (e.g., "a2a://ImagePro.ImageRecognition.VisionCorp.v1.2.0.gpu-optimized")
}

// Result item for capability negotiation, returned by API to client.
// This interface defines the schema for a "NegotiationResult" object.
export interface NegotiationResult {
  service: AgentService; // The agent service that was evaluated
  matchStatus: 'success' | 'partial' | 'failed' | 'capability_mismatch'; // Status of the match based on local filtering
  matchMessage: string; // Human-readable message describing the match status
  aiScore?: number; // Optional: Score assigned by AI evaluation (0-100)
  aiReasoning?: string; // Optional: Reasoning provided by AI evaluation
}

// --- Capability Negotiation API Schemas ---

// Defines the JSON schema for the request body sent to the POST /api/negotiate-capabilities endpoint.
export interface NegotiationRequestInput {
  desiredCapability: string; // The capability the user is looking for. Can be an empty string if not specified by the user.
  requiredQos: number; // Minimum acceptable Quality of Service (0.0 to 1.0). A low value (e.g., 0) indicates QoS is not a strict criterion.
  maxCost: number; // Maximum acceptable cost. A high value (e.g., 999999) indicates cost is not a strict criterion.
  securityRequirements?: string; // Optional: Specific security requirements for AI evaluation (e.g., "End-to-end encryption required").
}

// Defines the JSON schema for the response body from the POST /api/negotiate-capabilities endpoint.
export interface NegotiationApiResponse {
  results: NegotiationResult[]; // An array of negotiation results for each considered service.
  aiEvaluationStatus: 'not_attempted' | 'skipped_no_requirements' | 'skipped_no_candidates' | 'success' | 'failed'; // Status of the AI evaluation part of the process.
  aiEvaluationMessage?: string; // Optional: A message providing more details about the AI evaluation status.
}


// --- Agent Directory Service Schemas ---

// Defines the schema for an "AgentRegistration" object used in the Agent Directory.
export interface AgentRegistration {
  id: string; // Unique identifier for the agent registration
  name: string; // Name of the agent
  address: string; // Network address of the agent (e.g., "tcp://192.168.1.10:5555")
  capabilities: string[]; // List of capabilities the agent offers
  protocolExtensions: string[]; // List of protocol extensions supported by the agent
  timestamp: string; // ISO string representing the registration time. Can be formatted for display.
}

// --- AI Flow Schemas (Conceptual - Source of truth is Zod in flow files) ---
// These are for conceptual reference if needed elsewhere, though not directly used by the flow.

// Conceptual schema for capability offers prepared for AI evaluation.
// The actual schema is defined by 'EvaluateOffersInputSchema' in the 'evaluate-offers-flow.ts' file.
export interface CapabilityOfferForAI {
  id: string;
  description: string;
  cost: number;
  qos: number;
  protocolCompatibility: string;
}

// Conceptual schema for evaluated offers returned by the AI.
// The actual schema is defined by 'EvaluatedOfferSchema' in the 'evaluate-offers-flow.ts' file.
export interface EvaluatedOfferFromAI {
  id:string;
  description: string;
  cost: number;
  qos: number;
  protocolCompatibility: string;
  score: number;
  reasoning: string;
}
