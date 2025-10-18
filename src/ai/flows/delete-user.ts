'use server';
/**
 * @fileOverview A secure flow to delete a user from Firebase Authentication.
 *
 * - deleteUser - A function that handles the user deletion process.
 * - DeleteUserInput - The input type for the deleteUser function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { auth as adminAuth } from '@/firebase/server';


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
      await adminAuth.deleteUser(userId);
      console.log(`Successfully deleted user with UID: ${userId}`);
    } catch (error: any) {
      console.error(`Error deleting user ${userId}:`, error);
      // Throw an error that can be caught by the calling server action
      throw new Error(`Failed to delete user from Authentication: ${error.message}`);
    }
  }
);
