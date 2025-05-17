
'use server';

/**
 * @fileOverview Evaluates capability offers based on cost, QoS, protocol compatibility, and security requirements.
 *
 * - evaluateOffers - A function that handles the capability offer evaluation process.
 * - EvaluateOffersInput - The input type for the evaluateOffers function.
 * - EvaluateOffersOutput - The return type for the evaluateOffers function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EvaluateOffersInputSchema = z.object({
  capabilityOffers: z.array(
    z.object({
      id: z.string().describe('A unique identifier for this offer.'),
      description: z.string().describe('A description of the capability being offered.'),
      cost: z.number().describe('The cost of the capability offer.'),
      qos: z.number().describe('The quality of service offered (0-1).'),
      protocolCompatibility: z.string().describe('The protocol compatibility of the offer.'),
    })
  ).describe('A list of capability offers to evaluate.'),
  securityRequirements: z.string().optional().describe('The security requirements for the agent selection. If not provided, evaluation will focus on other factors.'),
});
export type EvaluateOffersInput = z.infer<typeof EvaluateOffersInputSchema>;

const EvaluatedOfferSchema = z.object({
  id: z.string().describe('The unique identifier of the offer being evaluated.'),
  description: z.string().describe('A description of the capability being offered.'),
  cost: z.number().describe('The cost of the capability offer.'),
  qos: z.number().describe('The quality of service offered (0-1).'),
  protocolCompatibility: z.string().describe('The protocol compatibility of the offer.'),
  score: z.number().describe('The overall score of the capability offer based on cost, QoS, protocol compatibility and security requirements (0-100).'),
  reasoning: z.string().describe('The reasoning behind the score assigned to the capability offer.'),
});

const EvaluateOffersOutputSchema = z.array(EvaluatedOfferSchema).describe('A list of evaluated capability offers with scores and reasoning.');
export type EvaluateOffersOutput = z.infer<typeof EvaluateOffersOutputSchema>;

export async function evaluateOffers(input: EvaluateOffersInput): Promise<EvaluateOffersOutput> {
  return evaluateOffersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluateOffersPrompt',
  input: {schema: EvaluateOffersInputSchema},
  output: {schema: EvaluateOffersOutputSchema},
  prompt: `You are an expert in evaluating capability offers from agents.
You will receive a list of capability offers, each with a unique ID, description, cost, QoS, and protocol compatibility.
{{#if securityRequirements}}
You will also receive security requirements.
Evaluate each capability offer based on how well it meets the security requirements, its cost, quality of service, and protocol compatibility.
{{else}}
Security requirements have not been specified. Evaluate each capability offer primarily based on its cost, quality of service, and protocol compatibility.
{{/if}}
You must output a list of evaluated capability offers. For each offer, include its original ID, description, cost, QoS, protocolCompatibility, a score (0-100), and detailed reasoning for the score.
Ensure the output is a valid JSON array of evaluated capability offers, precisely matching the output schema.

{{#if securityRequirements}}
Security Requirements: {{{securityRequirements}}}
{{/if}}

Capability Offers:
{{#each capabilityOffers}}
ID: {{{this.id}}}
Description: {{{this.description}}}
Cost: {{{this.cost}}}
QoS: {{{this.qos}}}
Protocol Compatibility: {{{this.protocolCompatibility}}}
---
{{/each}}

Respond with ONLY the JSON array of evaluated offers. Do not include any other text or explanation.
`,
});

const evaluateOffersFlow = ai.defineFlow(
  {
    name: 'evaluateOffersFlow',
    inputSchema: EvaluateOffersInputSchema,
    outputSchema: EvaluateOffersOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI did not return an output for offer evaluation.");
    }
    // Ensure the output is an array, sometimes the model might wrap it in an object.
    if (Array.isArray(output)) {
        return output;
    }
    // A common pattern if the model doesn't adhere strictly is to wrap in { "result": [...] } or similar
    if (typeof output === 'object' && output !== null) {
        const keys = Object.keys(output);
        if (keys.length === 1 && Array.isArray((output as any)[keys[0]])) {
            return (output as any)[keys[0]];
        }
    }
    // If still not an array, attempt to parse if it's a stringified JSON array
    if (typeof output === 'string') {
        try {
            const parsed = JSON.parse(output);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (e) {
            // parsing failed, fall through to error
        }
    }
    console.error("Unexpected AI output format for offer evaluation:", output);
    throw new Error("AI returned an output in an unexpected format. Expected a JSON array of offers.");
  }
);

