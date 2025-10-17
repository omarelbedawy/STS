'use server';

/**
 * @fileOverview Analyzes a school schedule image to extract subjects, times, and days.
 *
 * - analyzeScheduleFromImage - A function that handles the schedule analysis process.
 * - AnalyzeScheduleFromImageInput - The input type for the analyzeScheduleFromImage function.
 * - AnalyzeScheduleFromImageOutput - The return type for the analyzeScheduleFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeScheduleFromImageInputSchema = z.object({
  scheduleImage: z
    .string()
    .describe(
      "A photo of a school schedule, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeScheduleFromImageInput = z.infer<
  typeof AnalyzeScheduleFromImageInputSchema
>;

const ScheduleRowSchema = z.object({
  session: z.string().describe('The session number or "Break 1" / "Break 2".'),
  time: z.string().describe('The time slot for the session.'),
  sunday: z.string().describe('Subject on Sunday.'),
  monday: z.string().describe('Subject on Monday.'),
  tuesday: z.string().describe('Subject on Tuesday.'),
  wednesday: z.string().describe('Subject on Wednesday.'),
  thursday: z.string().describe('Subject on Thursday.'),
});

const AnalyzeScheduleFromImageOutputSchema = z.object({
  schedule: z
    .array(ScheduleRowSchema)
    .describe(
      'An array of objects representing the schedule, with each object being a row.'
    ),
  errors: z
    .string()
    .optional()
    .describe(
      'Any errors or ambiguities found in the schedule, or empty string if no errors found.'
    ),
});

export type AnalyzeScheduleFromImageOutput = z.infer<
  typeof AnalyzeScheduleFromImageOutputSchema
>;

export async function analyzeScheduleFromImage(
  input: AnalyzeScheduleFromImageInput
): Promise<AnalyzeScheduleFromImageOutput> {
  return analyzeScheduleFromImageFlow(input);
}

const analyzeScheduleFromImagePrompt = ai.definePrompt({
  name: 'analyzeScheduleFromImagePrompt',
  input: {schema: AnalyzeScheduleFromImageInputSchema},
  output: {schema: AnalyzeScheduleFromImageOutputSchema},
  prompt: `You are an intelligent timetable parser.
Your task: analyze raw or visual school schedules (that may include half sessions, full sessions, and breaks) and convert them into a structured JSON format. Pay close attention to schedules that might be in a right-to-left language like Arabic.

**Schedule Image to Analyze:**
{{media url=scheduleImage}}

---

**Your Instructions (Follow These Rules Exactly):**

**⚙️ Rules:**
1.  **Right-to-Left (RTL) Language Detection:**
    *   If you see Arabic days of the week (e.g., الأحد, الإثنين), you **MUST** process the schedule from RIGHT to LEFT, meaning the first column on the right is Sunday, the next is Monday, and so on.

2.  **Session Structure (Time-Based):**
    *   There are 5 main sessions and 2 breaks. Your output **must** contain exactly 7 rows in the 'schedule' array.
    *   Use the provided time slots for each session. Do not guess or change them.
    *   **Breaks:** Always include "Break 1" and "Break 2" in their designated rows. For these rows, the 'session' field should be "Break 1" or "Break 2", and all other fields (time, days) must be empty strings.

3.  **Subject Parsing:**
    *   **Single Subject per Timeslot:** If a single subject occupies a full time block (e.g., a full 80-minute slot), write the subject name **only once**. For example, \`Bio\`. **NEVER** write \`Bio / Bio\`.
    *   **Split Subjects (Half Sessions):** If a time block is split between two different subjects, write them with a slash, like \`Bio / CAP\`.
    *   **Optional Subjects:** If a slot offers a choice (e.g., French or German), write them with a slash: \`F / G\`. If you only see "F", you must expand it to \`F / G\`.

4.  **Special Cases & Empty Slots:**
    *   **Leaving Early:** If the final session of any day is unscheduled/empty, you **must** write **"Leave School"** in that slot. This is especially true for the 5th session on Thursday if it is free.
    *   **Empty/Free Slots:** If any other session is completely empty, use a single dash (—).

5.  **Subject Codes (Use Only These):**
    *   You must use the following codes. Do not invent new ones. If you see a subject not on this list, make your best guess to map it to one of these codes.
    *   **Codes:** \`Arabic, EN, Bio, CH, PH, MATH, MEC, CITZ, ACTV, ADV, CAP, REL, F, G, PE, CS, Geo, SOCIAL, —, Leave School\`

6.  **Output Format (Strictly JSON):**
    *   You **MUST** produce a JSON object with a 'schedule' field containing an array of 7 objects.
    *   The structure for each row object must be:
        \`{ "session": "...", "time": "...", "sunday": "...", "monday": "...", "tuesday": "...", "wednesday": "...", "thursday": "..." }\`
    *   Use this exact template. Do not add, remove, or change keys.
        \`[
          { "session": "1", "time": "7:45–9:05", "sunday": "...", "monday": "...", "tuesday": "...", "wednesday": "...", "thursday": "..." },
          { "session": "2", "time": "9:05–10:25", "sunday": "...", "monday": "...", "tuesday": "...", "wednesday": "...", "thursday": "..." },
          { "session": "Break 1", "time": "", "sunday": "", "monday": "", "tuesday": "", "wednesday": "", "thursday": "" },
          { "session": "3", "time": "10:45–12:05", "sunday": "...", "monday": "...", "tuesday": "...", "wednesday": "...", "thursday": "..." },
          { "session": "4", "time": "12:05–13:25", "sunday": "...", "monday": "...", "tuesday": "...", "wednesday": "...", "thursday": "..." },
          { "session": "Break 2", "time": "", "sunday": "", "monday": "", "tuesday": "", "wednesday": "", "thursday": "" },
          { "session": "5", "time": "13:45–15:00", "sunday": "...", "monday": "...", "tuesday": "...", "wednesday": "...", "thursday": "..." }
        ]\`

**✅ Important "Don'ts":**
*   **Do not** include teacher names or any other text not in the subject code list.
*   **Do not** repeat identical subjects for a full session (e.g., "Bio / Bio").
*   Keep capitalization consistent with the provided subject codes.

---

Produce **only** the JSON output. If you cannot parse the schedule, describe the problem in the \`errors\` field and leave the \`schedule\` array empty.`,
});

const analyzeScheduleFromImageFlow = ai.defineFlow(
  {
    name: 'analyzeScheduleFromImageFlow',
    inputSchema: AnalyzeScheduleFromImageInputSchema,
    outputSchema: AnalyzeScheduleFromImageOutputSchema,
  },
  async input => {
    const {output} = await analyzeScheduleFromImagePrompt(input);
    return output!;
  }
);
