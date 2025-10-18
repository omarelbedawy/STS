
'use server';

import { auth as adminAuth, db } from '@/firebase/server';

interface DeleteUserInput {
  userId: string;
}

/**
 * A server action that securely deletes a user from both Firestore and Firebase Authentication,
 * handling cases where the user may already be deleted from one service but not the other.
 * @param input An object containing the userId of the user to delete.
 * @returns A promise that resolves with the success status.
 */
export async function deleteUserAction(
  input: DeleteUserInput
): Promise<{ success: boolean; message?: string }> {
  const { userId } = input;

  try {
    if (!db || !adminAuth) {
        throw new Error('Firebase Admin services are not initialized on the server.');
    }

    // Always attempt to delete from Firestore first to clean up orphaned profiles.
    const userDocRef = db.collection("users").doc(userId);
    await userDocRef.delete();

    // Now, attempt to delete from Firebase Auth, but handle the case where the user is already gone.
    try {
      await adminAuth.deleteUser(userId);
    } catch (authError: any) {
      // If the error is 'user-not-found', it means the user is already deleted from Auth.
      // This is an acceptable state, so we can ignore this specific error and proceed.
      if (authError.code === 'auth/user-not-found') {
        console.log(`User ${userId} not found in Authentication, but Firestore profile was cleaned up.`);
      } else {
        // If it's a different error, we should re-throw it.
        throw authError;
      }
    }

    return { success: true };

  } catch (error: any) {
    console.error(`Error deleting user ${userId}:`, error);
    return { success: false, message: error.message || 'An unexpected error occurred during user deletion.' };
  }
}
