'use server';
/**
 * @fileOverview A secure flow to delete a user from Firebase Authentication.
 *
 * - deleteUser - A function that handles the user deletion process.
 * - DeleteUserInput - The input type for the deleteUser function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase Admin SDK if it hasn't been already.
// This runs in a secure server environment.
if (getApps().length === 0) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const DeleteUserInputSchema = z.object({
  userId: z.string().describe('The UID of the user to be deleted.'),
});
export type DeleteUserInput = z.infer<typeof DeleteUserInputSchema>;

// This flow is NOT using an LLM. It's a secure server-side function.
export const deleteUser = ai.defineFlow(
  {
    name: 'deleteUser',
    inputSchema: DeleteUserInputSchema,
    outputSchema: z.void(),
  },
  async ({ userId }) => {
    try {
      await getAuth().deleteUser(userId);
      console.log(`Successfully deleted user with UID: ${userId}`);
    } catch (error: any) {
      console.error(`Error deleting user ${userId}:`, error);
      // Throw an error that can be caught by the calling server action
      throw new Error(`Failed to delete user from Authentication: ${error.message}`);
    }
  }
);
