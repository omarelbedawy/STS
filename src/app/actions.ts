'use server';

import { analyzeScheduleFromImage, AnalyzeScheduleFromImageInput, AnalyzeScheduleFromImageOutput } from '@/ai/flows/analyze-schedule-from-image';
import { deleteUser } from '@/ai/flows/delete-user';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase/server';

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
  } catch (e) {
    console.error('Error analyzing schedule:', e);
    // Return a structured error that the client can display
    return {
      schedule: [],
      errors: 'An unexpected error occurred while analyzing the schedule. The AI model might be unavailable or the image format could be unsupported. Please try again later.'
    };
  }
}

interface DeleteUserInput {
  userId: string;
}

/**
 * A server action that securely deletes a user from both Firestore and Firebase Authentication.
 * @param input An object containing the userId of the user to delete.
 * @returns A promise that resolves when the user is deleted.
 */
export async function deleteUserAction(
  input: DeleteUserInput
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!db) {
        throw new Error('Firestore is not initialized on the server.');
    }
    // Delete from Firestore first
    await deleteDoc(doc(db, "users", input.userId));

    // Then, call the Genkit flow to delete from Firebase Auth
    await deleteUser({ userId: input.userId });

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { success: false, message: error.message || 'An unexpected error occurred during user deletion.' };
  }
}
