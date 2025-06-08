

// Basic Skill definition, aligning with common fields in an A2A AgentCard skill
export interface Skill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
}

// Describes a service listed in the system, used by the negotiation API and frontend.
// This interface defines the schema for an "AgentService" object.
export interface AgentService {
  id: string; // Unique identifier for the service
  name: string; // Human-readable name of the service
  capability: string; // Core capability offered (e.g., "Image Recognition", "Text Summarization")
  description: string; // Detailed description of the service
  qos?: number; // Quality of Service score (0.0 to 1.0) - Optional
  cost?: number; // Cost of using the service - Optional
  protocol: string; // Communication protocol supported (e.g., "ACNBP-Vision/1.0")
  ansEndpoint: string; // Agent Name Service endpoint (e.g., "a2a://ImagePro.ImageRecognition.VisionCorp.v1.2.0.gpu-optimized")
  skills?: Skill[]; // Optional: For A2A agents, lists skills from their AgentCard
  protocolExtensions?: { [key: string]: any }; // Optional: Full protocol extensions for context
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


// --- Agent Name Service (ANS) Schemas ---

export type ANSProtocol = "a2a" | "mcp" | "acp" | "other";

// Represents the constituent parts of an ANSName, used for construction and parsing.
export interface ANSNameParts {
  protocol: ANSProtocol;
  agentID: string;
  agentCapability: string;
  provider: string;
  version: string; // Should follow Semantic Versioning (e.g., "1.0.0", "2.1.3-beta")
  extension?: string; // Optional
}

// Defines the structure of the "certificate" issued by the CA to an agent.
// This is a JSON object signed by the CA.
export interface SignedCertificate {
  subjectAgentId: string;
  subjectPublicKey: string; // PEM format
  subjectAnsEndpoint: string; // The agent's full ANSName
  issuer: string; // e.g., "DemoCA"
  validFrom: string; // ISO Date string
  validTo: string; // ISO Date string
  signature: string; // Base64 signature of the above fields (excluding this signature field itself), made by the CA's private key
}


// Defines the schema for an "AgentRegistration" object stored in the ANS Agent Registry.
// This aligns with the AgentRegistrationRequest schema concept from the paper.
export interface AgentRegistration extends ANSNameParts {
  ansName: string; // The fully constructed ANSName string
  id: string; // Unique identifier for the registration entry itself (e.g., UUID)
  agentCertificate: SignedCertificate; // The CA-issued certificate for the agent.
  protocolExtensions: { [key: string]: any }; // Protocol-specific data (e.g., A2A Agent Card, MCP tool description with endpoint)
  timestamp: string; // ISO string representing the registration time.
  isRevoked?: boolean; // Optional: True if the agent registration/certificate is revoked
  revocationTimestamp?: string; // Optional: ISO string representing when it was revoked
}

// Schema for ANS Resolution Request (AgentCapabilityRequest from the paper, Section 4)
// Used when querying the ANS to resolve an ANSName by its components.
export interface ANSCapabilityRequest {
  requestType: "resolve";
  protocol: ANSProtocol;
  agentID: string;
  agentCapability: string;
  provider: string;
  version: string;
  extension?: string;
}

// Schema for ANS Resolution Response (AgentCapabilityResponse from the paper)
// Returned by the ANS when an ANSName is resolved.
export interface ANSCapabilityResponse {
  ansName: string; // The ANSName that was resolved.
  endpoint: string; // The resolved agent endpoint (e.g., URL, service binding from protocolExtensions)
  agentCertificate: SignedCertificate; // The agent's CA-issued certificate.
  protocolExtensions?: { [key: string]: any }; // The full protocolExtensions object for the agent
  signature?: string; // Optional: A signature from the Agent Registry over the (Endpoint + AgentCertificate + ANSName) data, proving authenticity of this resolution response.
}


// --- AI Flow Schemas (Conceptual - Source of truth is Zod in flow files) ---
// These are for conceptual reference if needed elsewhere, though not directly used by the flow.

// Conceptual schema for capability offers prepared for AI evaluation.
// The actual schema is defined by 'EvaluateOffersInputSchema' in the 'evaluate-offers-flow.ts' file.
export interface CapabilityOfferForAI {
  id: string;
  description: string;
  cost?: number;
  qos?: number;
  protocolCompatibility: string;
}

// Conceptual schema for evaluated offers returned by the AI.
// The actual schema is defined by 'EvaluatedOfferSchema' in the 'evaluate-offers-flow.ts' file.
export interface EvaluatedOfferFromAI {
  id:string;
  description: string;
  cost?: number;
  qos?: number;
  protocolCompatibility: string;
  score: number;
  reasoning: string;
}

