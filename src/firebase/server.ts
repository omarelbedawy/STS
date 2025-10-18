
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
    let serviceAccount: ServiceAccount | undefined;
    
    // Check if the environment variable is set
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        // Attempt to parse the environment variable as JSON
        serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      } catch (e) {
        console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS:', e);
        // If parsing fails, fall back to letting ADC work on its own.
        // This is useful for deployed environments where the variable might not be a direct JSON string.
      }
    }
    
    if (serviceAccount) {
      app = initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      // If no service account is provided via the env var,
      // initializeApp() will rely on Application Default Credentials (ADC).
      // This is the standard for Cloud Run, Cloud Functions, and other GCP environments.
      app = initializeApp();
    }
  }

  db = getFirestore(app);
  auth = getAuth(app);
}

// Initialize the app when the module is first loaded
initializeAdminApp();

export { app, db, auth };
