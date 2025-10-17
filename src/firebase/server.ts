import { initializeApp, getApps, App, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let db: Firestore;

let serviceAccount: ServiceAccount | undefined;

// This service account is automatically generated and populated
// by the Firebase CLI during deployment.
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    // Vercel and other environments may pass this as a base64 encoded string
    const decodedCreds = Buffer.from(
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      'base64'
    ).toString('utf-8');
    serviceAccount = JSON.parse(decodedCreds);
  } catch (e) {
     // Or it might just be a stringified JSON
    try {
      serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } catch (e2) {
       console.error("Could not parse GOOGLE_APPLICATION_CREDENTIALS. Ensure it's a valid JSON string or base64 encoded JSON.", e2);
    }
  }
}


if (!getApps().length) {
  app = initializeApp({
    // Use the parsed service account if available
    credential: serviceAccount ? cert(serviceAccount) : undefined,
    // The project ID is still useful as a fallback or for local emulation
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
  db = getFirestore(app);
} else {
  app = getApps()[0];
  db = getFirestore(app);
}

export { app, db };
