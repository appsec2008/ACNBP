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

// Renamed from EvaluateSkillSetsInputSchema
const EvaluateOffersInputSchema = z.object({
  capabilityOffers: z.array( // Renamed from skillSetOffers
    z.object({
      description: z.string().describe('A description of the capability being offered.'), // Updated description
      cost: z.number().describe('The cost of the capability offer.'), // Updated description
      qos: z.number().describe('The quality of service offered (0-1).'),
      protocolCompatibility: z.string().describe('The protocol compatibility of the offer.'),
    })
  ).describe('A list of capability offers to evaluate.'), // Updated description
  securityRequirements: z.string().describe('The security requirements for the agent selection.'),
});
export type EvaluateOffersInput = z.infer<typeof EvaluateOffersInputSchema>; // Renamed type

// Renamed from EvaluatedSkillSetSchema
const EvaluatedOfferSchema = z.object({
  description: z.string().describe('A description of the capability being offered.'), // Updated description
  cost: z.number().describe('The cost of the capability offer.'), // Updated description
  qos: z.number().describe('The quality of service offered (0-1).'),
  protocolCompatibility: z.string().describe('The protocol compatibility of the offer.'),
  score: z.number().describe('The overall score of the capability offer based on cost, QoS, protocol compatibility and security requirements.'), // Updated description
  reasoning: z.string().describe('The reasoning behind the score assigned to the capability offer.'), // Updated description
});

// Renamed from EvaluateSkillSetsOutputSchema
const EvaluateOffersOutputSchema = z.array(EvaluatedOfferSchema).describe('A list of evaluated capability offers with scores and reasoning.'); // Updated description
export type EvaluateOffersOutput = z.infer<typeof EvaluateOffersOutputSchema>; // Renamed type

// Renamed from evaluateSkillSets
export async function evaluateOffers(input: EvaluateOffersInput): Promise<EvaluateOffersOutput> {
  return evaluateOffersFlow(input); // Renamed flow call
}

// Renamed from evaluateSkillSetsPrompt
const prompt = ai.definePrompt({
  name: 'evaluateOffersPrompt', // Renamed prompt
  input: {schema: EvaluateOffersInputSchema},
  output: {schema: EvaluateOffersOutputSchema},
  prompt: `You are an expert in evaluating capability offers from agents based on cost, QoS, protocol compatibility, and security requirements.

You will receive a list of capability offers and the security requirements. You will evaluate each capability offer based on how well it meets the requirements, its cost, quality of service, and protocol compatibility.

You will output a list of evaluated capability offers, each with a score and reasoning for the score.

Security Requirements: {{{securityRequirements}}}

Capability Offers:
{{#each capabilityOffers}}
Description: {{{this.description}}}
Cost: {{{this.cost}}}
QoS: {{{this.qos}}}
Protocol Compatibility: {{{this.protocolCompatibility}}}
{{/each}}

Output each capability offer with a score (0-100) and reasoning for the score.
Ensure that the output is a valid JSON array of evaluated capability offers.
`,
});

// Renamed from evaluateSkillSetsFlow
const evaluateOffersFlow = ai.defineFlow(
  {
    name: 'evaluateOffersFlow', // Renamed flow
    inputSchema: EvaluateOffersInputSchema,
    outputSchema: EvaluateOffersOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
