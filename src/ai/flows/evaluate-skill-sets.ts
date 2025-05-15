'use server';

/**
 * @fileOverview Evaluates skill set offers based on cost, QoS, protocol compatibility, and security requirements.
 *
 * - evaluateSkillSets - A function that handles the skill set evaluation process.
 * - EvaluateSkillSetsInput - The input type for the evaluateSkillSets function.
 * - EvaluateSkillSetsOutput - The return type for the evaluateSkillSets function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EvaluateSkillSetsInputSchema = z.object({
  skillSetOffers: z.array(
    z.object({
      description: z.string().describe('A description of the skill set being offered.'),
      cost: z.number().describe('The cost of the skill set.'),
      qos: z.number().describe('The quality of service offered (0-1).'),
      protocolCompatibility: z.string().describe('The protocol compatibility of the offer.'),
    })
  ).describe('A list of skill set offers to evaluate.'),
  securityRequirements: z.string().describe('The security requirements for the agent selection.'),
});
export type EvaluateSkillSetsInput = z.infer<typeof EvaluateSkillSetsInputSchema>;

const EvaluatedSkillSetSchema = z.object({
  description: z.string().describe('A description of the skill set being offered.'),
  cost: z.number().describe('The cost of the skill set.'),
  qos: z.number().describe('The quality of service offered (0-1).'),
  protocolCompatibility: z.string().describe('The protocol compatibility of the offer.'),
  score: z.number().describe('The overall score of the skill set offer based on cost, QoS, protocol compatibility and security requirements.'),
  reasoning: z.string().describe('The reasoning behind the score assigned to the skill set offer.'),
});

const EvaluateSkillSetsOutputSchema = z.array(EvaluatedSkillSetSchema).describe('A list of evaluated skill set offers with scores and reasoning.');
export type EvaluateSkillSetsOutput = z.infer<typeof EvaluateSkillSetsOutputSchema>;

export async function evaluateSkillSets(input: EvaluateSkillSetsInput): Promise<EvaluateSkillSetsOutput> {
  return evaluateSkillSetsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluateSkillSetsPrompt',
  input: {schema: EvaluateSkillSetsInputSchema},
  output: {schema: EvaluateSkillSetsOutputSchema},
  prompt: `You are an expert in evaluating skill set offers from agents based on cost, QoS, protocol compatibility, and security requirements.

You will receive a list of skill set offers and the security requirements. You will evaluate each skill set offer based on how well it meets the requirements, its cost, quality of service, and protocol compatibility.

You will output a list of evaluated skill set offers, each with a score and reasoning for the score.

Security Requirements: {{{securityRequirements}}}

Skill Set Offers:
{{#each skillSetOffers}}
Description: {{{this.description}}}
Cost: {{{this.cost}}}
QoS: {{{this.qos}}}
Protocol Compatibility: {{{this.protocolCompatibility}}}
{{/each}}

Output each skill set offer with a score (0-100) and reasoning for the score.
Ensure that the output is a valid JSON array of evaluated skill set offers.
`,
});

const evaluateSkillSetsFlow = ai.defineFlow(
  {
    name: 'evaluateSkillSetsFlow',
    inputSchema: EvaluateSkillSetsInputSchema,
    outputSchema: EvaluateSkillSetsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
