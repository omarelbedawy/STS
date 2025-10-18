
'use server';

import { db, auth as adminAuth } from '@/firebase/server';
import { CollectionReference } from 'firebase-admin/firestore';
import { config } from 'dotenv';

config({ path: '.env.local' });

const ADMIN_SECRET = process.env.ADMIN_SECRET || "Iamtheonlyadminonearth";


interface DeleteAllDataInput {
  target: 'all' | 'users' | 'schedules';
  adminSecret: string;
  adminUid: string; // The UID of the admin performing the action
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
      // Fetch all users to find the admin
      const listUsersResult = await adminAuth.listUsers(1000);
      
      // Filter out the admin performing the action
      const uidsToDelete = listUsersResult.users
        .filter(userRecord => userRecord.uid !== input.adminUid)
        .map(userRecord => userRecord.uid);

      if (uidsToDelete.length > 0) {
        // Max 500 users can be deleted at once from auth
        for (let i = 0; i < uidsToDelete.length; i += 500) {
            const chunk = uidsToDelete.slice(i, i + 500);
            await adminAuth.deleteUsers(chunk);
        }
        
        const usersCollection = db.collection('users');
        const batch = db.batch();
        uidsToDelete.forEach(uid => {
            batch.delete(usersCollection.doc(uid));
        });
        await batch.commit();
      }
    }

    if (input.target === 'schedules' || input.target === 'all') {
      const classroomsCollection = db.collection('classrooms');
      const classroomDocs = await classroomsCollection.listDocuments();
      for (const docRef of classroomDocs) {
        await deleteSubcollections(docRef);
        await docRef.delete();
      }
    }

    return { success: true, message: `Successfully deleted selected ${input.target} data.` };

  } catch (error: any) {
    console.error(`Error during bulk deletion (target: ${input.target}):`, error);
    return { success: false, message: error.message || `An unexpected error occurred.` };
  }
}
