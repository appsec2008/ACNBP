
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
        "defaultCost": 65.50, "defaultQos": 0.92
      },
      cost: 65.50,
      qos: 0.92,
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
        "defaultCost": 150.00, "defaultQos": 0.88
      },
      cost: 150.00, qos: 0.88,
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
        capabilities: {"streaming": true, "pushNotifications": false, "historicalData": true},
        securitySchemes: {"bearerAuth": {"type": "http", "scheme": "bearer"}},
        security: [{"bearerAuth": []}],
        provider: {"organization": "FinIntelSeed Corp.", "url": "https://finintelseed.co"},
        "defaultCost": 250.75, "defaultQos": 0.79
      },
      cost: 250.75, qos: 0.79,
      customData: {"dataUpdateFrequency": "real-time-seed", "coverage": ["NYSE", "NASDAQ", "LSE"]}
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
  },
  // New Agent 4: CodeHelperMasterSeed
  {
    protocol: 'a2a',
    agentID: 'CodeHelperMasterSeed',
    agentCapability: 'CodeGeneration',
    provider: 'DevToolsIncSeed',
    version: '2.1.0',
    extension: 'multi-lang',
    protocolExtensions: {
      a2aAgentCard: {
        version: "2.1.0",
        name: "CodeHelperMasterSeed",
        description: "AI assistant for code generation, explanation, and refactoring across multiple languages (Seeded).",
        url: "https://api.devtoolsincseed.com/v2/codehelper",
        skills: [
          { id: "GeneratePythonFunction", name: "Generate Python Function", description: "Generates Python function skeletons or full implementations based on descriptions.", tags: ["python", "code-generation", "function"] },
          { id: "ExplainCodeSnippet", name: "Explain Code Snippet", description: "Provides a natural language explanation for a given piece of code.", tags: ["code-explanation", "understanding", "debug"] },
          { id: "RefactorJavaScript", name: "Refactor JavaScript Code", description: "Suggests and applies refactoring patterns to JavaScript code for improved readability and performance.", tags: ["javascript", "refactoring", "code-quality"] }
        ],
        defaultInputModes: ["application/json", "text/plain"], defaultOutputModes: ["application/json", "text/plain"],
        capabilities: {"streaming": true, "stateTransitionHistory": false},
        securitySchemes: {"bearerAuth": {"type": "http", "scheme": "bearer", "description": "Bearer token for API access"}},
        security: [{"bearerAuth": []}],
        provider: {"organization": "DevToolsIncSeed Solutions", "url": "https://devtoolsincseed.com"},
        "defaultCost": 79.99, "defaultQos": 0.90
      },
      cost: 79.99, qos: 0.90,
      customData: {"supportedLanguages": ["python", "javascript", "java", "c#"], "ideIntegration": true}
    }
  },
  // New Agent 5: ResearchAssistantProSeed
  {
    protocol: 'a2a',
    agentID: 'ResearchAssistantProSeed',
    agentCapability: 'ScientificLiteratureSearch',
    provider: 'AcademiaNexusSeed',
    version: '1.0.0',
    extension: 'pubmed-focused',
    protocolExtensions: {
      a2aAgentCard: {
        version: "1.0.0",
        name: "ResearchAssistantProSeed",
        description: "AI-powered search and summarization for scientific literature, with a focus on PubMed (Seeded).",
        url: "https://api.academianexusseed.org/research",
        skills: [
          { id: "FindRelevantPapersByKeyword", name: "Find Relevant Papers by Keyword", description: "Searches literature databases (esp. PubMed) for papers matching keywords.", tags: ["search", "pubmed", "research", "literature"] },
          { id: "SummarizeAbstract", name: "Summarize Paper Abstract", description: "Provides a concise summary of a given scientific paper abstract.", tags: ["summary", "abstract", "nlp"] },
          { id: "ExtractKeyEntitiesFromText", name: "Extract Key Entities", description: "Identifies and extracts key entities (e.g., genes, proteins, diseases) from text.", tags: ["ner", "bioinformatics", "entity-extraction"] }
        ],
        defaultInputModes: ["application/json"], defaultOutputModes: ["application/json"],
        capabilities: {"batchProcessing": true, "stateTransitionHistory": true},
        securitySchemes: {"apiKey": {"type": "apiKey", "in": "header", "name": "X-Academia-Key"}},
        security: [{"apiKey": []}],
        provider: {"organization": "AcademiaNexusSeed Foundation", "url": "https://academianexusseed.org"},
        "defaultCost": 119.50, "defaultQos": 0.85
      },
      cost: 119.50, qos: 0.85,
      customData: {"databaseCoverage": ["PubMed", "arXiv", "SpringerLink"], "maxQueriesPerDay": 1000}
    }
  },
  // New Agent 6: TravelPlannerAISeed
  {
    protocol: 'a2a',
    agentID: 'TravelPlannerAISeed',
    agentCapability: 'ItineraryPlanning',
    provider: 'WanderlustAISeed',
    version: '3.2.1',
    // No extension for this one
    protocolExtensions: {
      a2aAgentCard: {
        version: "3.2.1",
        name: "TravelPlannerAISeed",
        description: "Your personal AI travel assistant for planning trips, booking flights, and finding accommodations (Seeded).",
        url: "https://api.wanderlustaiseed.com/plan",
        skills: [
          { id: "SuggestTravelDestinations", name: "Suggest Travel Destinations", description: "Recommends travel destinations based on user preferences (interests, budget, dates).", tags: ["travel", "destination", "recommendation"] },
          { id: "SearchAndBookFlights", name: "Search & Book Flights", description: "Finds and helps book flights according to specified criteria.", tags: ["flights", "booking", "travel-agent"] },
          { id: "FindHotelAccommodation", name: "Find Hotel Accommodation", description: "Searches for hotels and other accommodations matching criteria.", tags: ["hotel", "accommodation", "booking"] }
        ],
        defaultInputModes: ["application/json"], defaultOutputModes: ["application/json"],
        capabilities: {"streaming": false, "stateTransitionHistory": true, "thirdPartyIntegrations": true},
        securitySchemes: {"oauth2": {"type": "oauth2", "flows": {"authorizationCode": {"authorizationUrl": "https://auth.wanderlustaiseed.com/authorize", "tokenUrl": "https://auth.wanderlustaiseed.com/token", "scopes": {"plan_trip": "Plan and book trips"}}}}},
        security: [{"oauth2": ["plan_trip"]}],
        provider: {"organization": "WanderlustAISeed Inc.", "url": "https://wanderlustaiseed.com"},
        "defaultCost": 49.00, "defaultQos": 0.95
      },
      cost: 49.00, qos: 0.95,
      customData: {"loyaltyProgramIntegration": true, "supportedBookingPartners": ["Expedia", "Booking.com"]}
    }
  },
  // New Agent 7: HealthAdvisorLiteSeed
  {
    protocol: 'a2a',
    agentID: 'HealthAdvisorLiteSeed',
    agentCapability: 'SymptomChecking',
    provider: 'WellnessTechSeed',
    version: '0.9.0-beta',
    extension: 'free-tier',
    protocolExtensions: {
      a2aAgentCard: {
        version: "0.9.0-beta",
        name: "HealthAdvisorLiteSeed (Beta)",
        description: "Provides preliminary symptom analysis and general wellness tips. Not a replacement for professional medical advice (Seeded).",
        url: "https://api.wellnesstechseed.com/lite/symptoms",
        skills: [
          { id: "AnalyzeSymptomsInput", name: "Analyze User Symptoms", description: "Takes user-described symptoms and provides potential areas of concern.", tags: ["symptom-checker", "health", "wellness", "triage-lite"] },
          { id: "SuggestGeneralWellnessPractices", name: "Suggest Wellness Practices", description: "Offers general tips for healthy living based on common scenarios.", tags: ["wellness", "health-tips", "lifestyle"] },
          { id: "FindLocalClinicTypes", name: "Find Local Clinic Types (General)", description: "Suggests types of local healthcare facilities for general concerns (e.g., general practitioner, urgent care).", tags: ["clinic-finder", "healthcare-navigation", "local-services"] }
        ],
        defaultInputModes: ["application/json", "text/plain"], defaultOutputModes: ["application/json"],
        capabilities: {"streaming": false, "stateTransitionHistory": false},
        securitySchemes: {}, // No specific security for free tier demo
        security: [],
        provider: {"organization": "WellnessTechSeed Initiative", "url": "https://wellnesstechseed.com"},
        "defaultCost": 0.00, "defaultQos": 0.80 // Free tier
      },
      cost: 0.00, qos: 0.80,
      customData: {"disclaimer": "For informational purposes only. Consult a healthcare professional.", "betaFeatures": true}
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
    
