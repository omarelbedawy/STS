
'use server';

import { db, auth as adminAuth } from '@/firebase/server';
import { CollectionReference } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import { UserRecord } from 'firebase-admin/auth';

config({ path: '.env.local' });

const ADMIN_SECRET = process.env.ADMIN_SECRET || "Iamtheonlyadminonearth";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";


interface DeleteAllDataInput {
  target: 'all' | 'users' | 'schedules';
  adminSecret: string;
}

// Helper function to delete all documents in a collection or subcollection
async function deleteCollection(collectionRef: CollectionReference, batchSize: number) {
    const query = collectionRef.limit(batchSize);
    let snapshot = await query.get();

    while (snapshot.size > 0) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        snapshot = await query.get();
    }
}

// Helper function to delete all subcollections for a given document
async function deleteSubcollections(docRef: FirebaseFirestore.DocumentReference) {
    const subcollections = await docRef.listCollections();
    for (const subcollection of subcollections) {
        await deleteCollection(subcollection, 100);
    }
}


export async function deleteAllDataAction(
  input: DeleteAllDataInput
): Promise<{ success: boolean; message: string }> {
  if (input.adminSecret !== ADMIN_SECRET) {
    return { success: false, message: "Incorrect admin secret." };
  }

  try {
    if (input.target === 'users' || input.target === 'all') {
      let adminUser: UserRecord | null = null;
      if (ADMIN_EMAIL) {
        try {
          adminUser = await adminAuth.getUserByEmail(ADMIN_EMAIL);
        } catch (error: any) {
            // This case happens if the admin user doesn't exist, which is fine.
           if (error.code !== 'auth/user-not-found') {
                throw error;
           }
        }
      }
      
      const listUsersResult = await adminAuth.listUsers(1000);
      const uidsToDelete = listUsersResult.users
        .filter(userRecord => userRecord.uid !== adminUser?.uid)
        .map(userRecord => userRecord.uid);

      if (uidsToDelete.length > 0) {
        await adminAuth.deleteUsers(uidsToDelete);
        
        const usersCollection = db.collection('users');
        const batch = db.batch();
        uidsToDelete.forEach(uid => {
            batch.delete(usersCollection.doc(uid));
        });
        await batch.commit();
      }
    }

    if (input.target === 'schedules' || input.target === 'all') {
      // 3. Delete all classroom data (schedules, explanations, etc.)
      const classroomsCollection = db.collection('classrooms');
      const classroomDocs = await classroomsCollection.listDocuments();
      for (const docRef of classroomDocs) {
        await deleteSubcollections(docRef);
        await docRef.delete();
      }
    }

    return { success: true, message: `Successfully deleted all ${input.target}.` };

  } catch (error: any) {
    console.error(`Error during bulk deletion (target: ${input.target}):`, error);
    return { success: false, message: error.message || `An unexpected error occurred.` };
  }
}
