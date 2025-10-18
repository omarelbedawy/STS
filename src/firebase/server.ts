
'use server';

import { initializeApp, getApps, App, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { config } from 'dotenv';

config({ path: '.env.local' });

let app: App;
let db: Firestore;
let auth: Auth;

function initializeAdminApp() {
  if (getApps().length > 0) {
    app = getApps()[0];
  } else {
    let serviceAccountString = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (serviceAccountString) {
      try {
        // The private_key in the environment variable will have escaped newlines.
        // We need to replace them with actual newlines for the SDK to parse it correctly.
        const serviceAccountJson = JSON.parse(serviceAccountString);
        if (serviceAccountJson.private_key) {
            serviceAccountJson.private_key = serviceAccountJson.private_key.replace(/\\n/g, '\n');
        }
        
        app = initializeApp({
          credential: cert(serviceAccountJson)
        });

      } catch (e: any) {
        console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS or initialize app with cert:', e);
        // Fallback to default initialization if parsing or cert initialization fails.
        app = initializeApp();
      }
    } else {
      // If GOOGLE_APPLICATION_CREDENTIALS is not set, initializeApp() will
      // use Application Default Credentials (ADC). This is the standard for Cloud Run, etc.
      console.log('Initializing Firebase Admin SDK with Application Default Credentials.');
      app = initializeApp();
    }
  }

  db = getFirestore(app);
  auth = getAuth(app);
}

// Initialize the app when the module is first loaded
initializeAdminApp();

export { app, db, auth };
