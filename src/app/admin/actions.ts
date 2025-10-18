
'use server';

import { deleteUser } from '@/ai/flows/delete-user';
import { db } from '@/firebase/server';


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
    // Delete from Firestore first using the Admin SDK
    await db.collection("users").doc(input.userId).delete();

    // Then, call the Genkit flow to delete from Firebase Auth
    await deleteUser({ userId: input.userId });

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { success: false, message: error.message || 'An unexpected error occurred during user deletion.' };
  }
}
