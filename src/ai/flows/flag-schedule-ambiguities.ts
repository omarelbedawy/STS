'use server';

/**
 * @fileOverview This flow analyzes a school schedule and flags potential ambiguities or errors.
 *
 * It takes schedule text as input and outputs a report of any issues found.
 * - flagScheduleAmbiguities - The main function to analyze and flag schedule issues.
 * - FlagScheduleAmbiguitiesInput - The input type for the flagScheduleAmbiguities function.
 * - FlagScheduleAmbiguitiesOutput - The output type for the flagScheduleAmbiguities function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FlagScheduleAmbiguitiesInputSchema = z.object({
  scheduleText: z
    .string()
    .describe("The OCR'd text of the school schedule."),
});
export type FlagScheduleAmbiguitiesInput = z.infer<
  typeof FlagScheduleAmbiguitiesInputSchema
>;

const FlagScheduleAmbiguitiesOutputSchema = z.object({
  ambiguityReport: z
    .string()
    .describe(
      'A report of any ambiguities or potential errors found in the schedule.'
    ),
});
export type FlagScheduleAmbiguitiesOutput = z.infer<
  typeof FlagScheduleAmbiguitiesOutputSchema
>;

export async function flagScheduleAmbiguities(
  input: FlagScheduleAmbiguitiesInput
): Promise<FlagScheduleAmbiguitiesOutput> {
  return flagScheduleAmbiguitiesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'flagScheduleAmbiguitiesPrompt',
  input: {schema: FlagScheduleAmbiguitiesInputSchema},
  output: {schema: FlagScheduleAmbiguitiesOutputSchema},
  prompt: `You are an AI assistant that reviews school schedules and flags potential issues such as overlapping classes, missing information, or any other ambiguities.

  Analyze the following schedule text and provide a report detailing any potential problems.

  Schedule Text: {{{scheduleText}}}
  `,
});

const flagScheduleAmbiguitiesFlow = ai.defineFlow(
  {
    name: 'flagScheduleAmbiguitiesFlow',
    inputSchema: FlagScheduleAmbiguitiesInputSchema,
    outputSchema: FlagScheduleAmbiguitiesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
