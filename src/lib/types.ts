// Renamed from SkillSetOffer
export interface CapabilityOffer {
  description: string;
  cost: number;
  qos: number; // 0-1
  protocolCompatibility: string;
}

// Renamed from EvaluatedSkillSetOffer
export interface EvaluatedCapabilityOffer extends CapabilityOffer {
  id: string; // Added for unique key in UI lists
  score: number;
  reasoning: string;
}

export interface AgentRegistration {
  id: string;
  name: string;
  address: string;
  capabilities: string[];
  protocolExtensions: string[];
  timestamp: string; // Should be ISO string for data, can be formatted for display
}
