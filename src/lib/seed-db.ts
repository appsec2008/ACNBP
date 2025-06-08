
'use server';

import { getDb } from './db';
import type { AgentRegistration, ANSProtocol, SignedCertificate } from './types';
import crypto from 'crypto';

// Helper to construct ANSName (consistent with registration logic)
function constructANSName(parts: {
  protocol: ANSProtocol;
  agentID: string;
  agentCapability: string;
  provider: string;
  version: string;
  extension?: string;
}): string {
  let name = `${parts.protocol}://${parts.agentID}.${parts.agentCapability}.${parts.provider}.v${parts.version}`;
  if (parts.extension && parts.extension.trim() !== "") {
    name += `.${parts.extension.trim()}`;
  }
  return name;
}

// Generates placeholder certificate data for seeded agents
const generatePlaceholderCert = (agentId: string, ansName: string): SignedCertificate => ({
    subjectAgentId: agentId,
    subjectPublicKey: `DEMO_PUB_KEY_FOR_${agentId.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    subjectAnsEndpoint: ansName,
    issuer: "DemoCA-Seed",
    // Randomize validFrom to be within the last 60 days
    validFrom: new Date(Date.now() - 86400000 * Math.floor(Math.random() * 60 + 1)).toISOString(),
    // Randomize validTo to be 1 year + up to 30 additional days from now
    validTo: new Date(Date.now() + 86400000 * (365 + Math.floor(Math.random() * 30))).toISOString(),
    signature: `DEMO_SIGNATURE_FOR_${ansName.substring(0,20).toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${crypto.randomBytes(4).toString('hex')}`
});

// Data for agents to be seeded
const agentsData: Omit<AgentRegistration, 'id' | 'timestamp' | 'agentCertificate' | 'ansName' | 'isRevoked' | 'revocationTimestamp'>[] = [
  {
    protocol: 'a2a',
    agentID: 'ImageEnhancerProSeed',
    agentCapability: 'ImageEnhancement',
    provider: 'VisionSolutionsSeed',
    version: '1.1.0',
    extension: 'gpu-optimized',
    protocolExtensions: {
      a2aAgentCard: {
        version: "1.0.1",
        name: "ImageEnhancerProSeed",
        description: "Advanced AI-powered image upscaling and enhancement service (Seeded). Uses GPU optimization.",
        url: "https://example.com/seed/imageenhancer/pro",
        skills: [
          { id: "UpscaleImage_4x", name: "AI Image Upscaling (4x)", description: "Increases image resolution up to 4x with quality preservation.", tags: ["upscale", "resolution", "ai", "4x"] },
          { id: "DenoiseImage_Advanced", name: "Advanced Image Denoising", description: "Removes complex noise and artifacts from images.", tags: ["denoise", "cleanup", "quality", "advanced"] }
        ],
        defaultInputModes: ["image/jpeg", "image/png"], defaultOutputModes: ["image/png"],
        capabilities: {"streaming": false, "pushNotifications": true, "stateTransitionHistory": true},
        securitySchemes: {"apiKey": {"type": "apiKey", "in": "header", "name": "X-VisionSeed-Token"}},
        security: [{"apiKey": []}],
        provider: {"organization": "VisionSolutionsSeed International", "url": "https://visionsolutionsseed.com"},
        defaultCost": 65.50, defaultQos": 0.92 // Example cost and QoS in AgentCard
      },
      cost: 65.50, // Top-level cost for easier access by negotiation logic
      qos: 0.92,   // Top-level QoS
      customData: {"region": "us-west-2-seed", "tier": "premium"}
    }
  },
  {
    protocol: 'a2a',
    agentID: 'DocTranslatorSeed',
    agentCapability: 'DocumentTranslation',
    provider: 'LinguaTechSeed',
    version: '2.0.1',
    extension: 'batch-secure',
    protocolExtensions: {
      a2aAgentCard: {
        version: "2.0.1",
        name: "DocTranslatorSeed",
        description: "Translates full documents (PDF, DOCX) between multiple languages with enhanced security (Seeded).",
        url: "https://example.com/seed/doctranslator/secure",
        skills: [
          { id: "TranslatePDF_LayoutPreserving", name: "Secure PDF Translation (Layout Preserving)", description: "Translates PDF content with high security, attempting to preserve layout.", tags: ["pdf", "secure", "translation", "layout"] },
          { id: "TranslateDOCX_TrackChanges", name: "Secure DOCX Translation (with Track Changes option)", description: "Translates DOCX with end-to-end encryption consideration and optional track changes.", tags: ["docx", "secure", "e2ee", "track-changes"] }
        ],
        defaultInputModes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], defaultOutputModes: ["application/json"],
        capabilities: {"streaming": false, "stateTransitionHistory": true, "batchProcessing": true},
        securitySchemes: {"oauth2": {"type": "oauth2", "flows": {"clientCredentials": {"tokenUrl": "https://auth.linguatechseed.ai/token", "scopes": {"translate:doc_secure": "Securely translate documents"}}}}},
        security: [{"oauth2": ["translate:doc_secure"]}],
        provider: {"organization": "LinguaTechSeed AI Solutions", "url": "https://linguatechseed.ai"},
        defaultCost": 150.00, defaultQos": 0.88
      },
      cost": 150.00, qos": 0.88,
      customData: {"compliance": ["HIPAA-ready-seed", "GDPR-compliant-seed"], "maxFileSizeMB": 50}
    }
  },
  {
    protocol: 'a2a',
    agentID: 'MarketAnalyzerSeed',
    agentCapability: 'FinancialAnalysis',
    provider: 'FinIntelSeed',
    version: '1.5.2',
    // No extension for this ANSName part to test that path
    protocolExtensions: {
      a2aAgentCard: {
        version: "1.5.2",
        name: "MarketAnalyzerSeed",
        description: "AI agent for real-time market trends and financial insights (Seeded).",
        url: "https://example.com/seed/marketanalyzer/live",
        skills: [
          { id: "PredictStockTrend", name: "Stock Trend Prediction", description: "Predicts short-term stock price trends based on historical data and news.", tags: ["stock", "prediction", "finance", "ai", "trends"] },
          { id: "SectorSentimentAnalysis", name: "Market Sector Sentiment Analysis", description: "Provides sentiment overview and trend analysis for a given market sector.", tags: ["market-sector", "analysis", "trends", "sentiment"] }
        ],
        defaultInputModes: ["application/json"], defaultOutputModes: ["application/json"],
        capabilities": {"streaming": true, "pushNotifications": false, "historicalData": true},
        securitySchemes": {"bearerAuth": {"type": "http", "scheme": "bearer"}},
        security": [{"bearerAuth": []}],
        provider": {"organization": "FinIntelSeed Corp.", "url": "https://finintelseed.co"},
        defaultCost": 250.75, defaultQos": 0.79
      },
      cost": 250.75, qos": 0.79,
      customData": {"dataUpdateFrequency": "real-time-seed", "coverage": ["NYSE", "NASDAQ", "LSE"]}
    }
  },
  {
    protocol: 'mcp', // Example of a non-A2A agent
    agentID: 'GenericComputeSeed',
    agentCapability: 'DataProcessing',
    provider: 'ComputeWorksSeed',
    version: '1.0.3',
    extension: 'low-latency',
    protocolExtensions: {
        endpoint: "mcp://computeworks.seed/api/v1/process/fast",
        description: "Generic low-latency data processing agent using MCP (Seeded).",
        cost: 30.00,
        qos: 0.99,
        parametersSchema: { "type": "object", "properties": { "data": { "type": "string", "description": "Base64 encoded data" }, "config": {"type": "object"} }, "required": ["data"] },
        outputSchema: { "type": "object", "properties": { "result": { "type": "string" }, "metadata": {"type": "object"} } },
        customData: {"maxPayloadSizeKB": 1024, "supportedEncodings": ["base64", "utf-8"]}
    }
  }
];

export async function seedDatabase(): Promise<{ success: boolean; message: string; seededCount: number; skippedCount: number; errorCount: number; errors: string[] }> {
  const db = await getDb();
  let seededCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const agentData of agentsData) {
    const ansNameParts = {
      protocol: agentData.protocol,
      agentID: agentData.agentID,
      agentCapability: agentData.agentCapability,
      provider: agentData.provider,
      version: agentData.version,
      extension: agentData.extension,
    };
    const ansName = constructANSName(ansNameParts);

    try {
      const existingAgent = await db.get('SELECT id FROM agents WHERE ansName = ?', ansName);
      if (existingAgent) {
        console.log(`SeedDB: Agent with ANSName '${ansName}' already exists. Skipping.`);
        skippedCount++;
        continue;
      }

      const registrationId = `seed-reg-${crypto.randomBytes(4).toString('hex')}-${agentData.agentID.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0,10)}`;
      const agentCertificate = generatePlaceholderCert(agentData.agentID, ansName);
      const timestamp = new Date().toISOString();

      await db.run(
        'INSERT INTO agents (id, protocol, agentID, agentCapability, provider, version, extension, ansName, agentCertificate, protocolExtensions, timestamp, isRevoked, revocationTimestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        registrationId,
        agentData.protocol,
        agentData.agentID,
        agentData.agentCapability,
        agentData.provider,
        agentData.version,
        agentData.extension ?? null,
        ansName,
        JSON.stringify(agentCertificate),
        JSON.stringify(agentData.protocolExtensions),
        timestamp,
        0, // isRevoked = false
        null // revocationTimestamp
      );
      console.log(`SeedDB: Seeded agent: ${ansName}`);
      seededCount++;
    } catch (error: any) {
      const errorMessage = `SeedDB: Failed to seed agent ${ansName}: ${error.message}`;
      console.error(errorMessage);
      errors.push(errorMessage);
      errorCount++;
    }
  }

  let message = `Database seeding processed. Seeded: ${seededCount} new agent(s). Skipped: ${skippedCount} existing agent(s).`;
  if (errorCount > 0) {
    message += ` Errors: ${errorCount}. Check server logs for details.`;
  }
  console.log(message);
  return { success: errorCount === 0, message, seededCount, skippedCount, errorCount, errors };
}

    