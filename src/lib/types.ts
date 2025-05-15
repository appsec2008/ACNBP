export interface SkillSetOffer {
  description: string;
  cost: number;
  qos: number; // 0-1
  protocolCompatibility: string;
}

export interface EvaluatedSkillSetOffer extends SkillSetOffer {
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
  timestamp: string; // ISO string
}
