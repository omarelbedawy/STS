import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let db: Firestore;

// This service account is automatically generated and populated
// by the Firebase CLI during deployment.
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? JSON.parse(
      Buffer.from(
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
        'base64'
      ).toString('utf-8')
    )
  : undefined;

if (!getApps().length) {
  app = initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : undefined,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
  db = getFirestore(app);
} else {
  app = getApps()[0];
  db = getFirestore(app);
}


export { app, db };
