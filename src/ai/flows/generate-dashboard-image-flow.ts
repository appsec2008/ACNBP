
'use server';
/**
 * @fileOverview A Genkit flow to generate images for dashboard feature cards using Gemini.
 *
 * - generateDashboardImage - A function that calls the image generation flow.
 * - GenerateDashboardImageInput - The input type for the image generation function.
 * - GenerateDashboardImageOutput - The return type for the image generation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDashboardImageInputSchema = z.object({
  prompt: z.string().describe('The text prompt to generate an image from.'),
});
export type GenerateDashboardImageInput = z.infer<typeof GenerateDashboardImageInputSchema>;

const GenerateDashboardImageOutputSchema = z.object({
  imageDataUri: z.string().optional().describe(
    "The generated image as a data URI (e.g., 'data:image/png;base64,...'). Optional if generation fails."
  ),
});
export type GenerateDashboardImageOutput = z.infer<typeof GenerateDashboardImageOutputSchema>;

export async function generateDashboardImage(input: GenerateDashboardImageInput): Promise<GenerateDashboardImageOutput> {
  return generateDashboardImageFlow(input);
}

const generateDashboardImageFlow = ai.defineFlow(
  {
    name: 'generateDashboardImageFlow',
    inputSchema: GenerateDashboardImageInputSchema,
    outputSchema: GenerateDashboardImageOutputSchema,
  },
  async (input) => {
    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // Specific model for image generation
        prompt: input.prompt,
        config: {
          responseModalities: ['IMAGE', 'TEXT'], // Must include IMAGE, TEXT only won't work well for image generation focus
        },
      });

      if (media?.url) {
        return { imageDataUri: media.url };
      }
      return { imageDataUri: undefined }; // Return undefined if no image URL
    } catch (error) {
      console.error('Error generating image with Genkit:', error);
      // It's often good to return a structured error or specific undefined rather than throwing
      // if the caller is expected to handle this gracefully (e.g., by showing a placeholder).
      return { imageDataUri: undefined };
    }
  }
);
