
'use server';

import { analyzeScheduleFromImage, AnalyzeScheduleFromImageInput, AnalyzeScheduleFromImageOutput } from '@/ai/flows/analyze-schedule-from-image';

/**
 * A server action that analyzes a schedule image using the Genkit AI flow.
 * @param input The image data as a base64-encoded string.
 * @returns A promise that resolves to the analyzed schedule data or an error object.
 */
export async function analyzeScheduleAction(
  input: AnalyzeScheduleFromImageInput
): Promise<AnalyzeScheduleFromImageOutput> {
  try {
    const result = await analyzeScheduleFromImage(input);
    return result;
  } catch (e: any) {
    console.error('Error in analyzeScheduleAction:', e);
    // Return a structured error that the client can display
    return {
      schedule: [],
      errors: e.message || 'An unexpected error occurred while analyzing the schedule. The AI model might be unavailable, misconfigured, or the image format could be unsupported. Please check the server logs and environment variables, then try again.'
    };
  }
}
