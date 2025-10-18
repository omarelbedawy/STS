import { initializeApp, getApps, App, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let db: Firestore;

// This function robustly initializes the Firebase Admin SDK
function initializeAdminApp() {
  if (getApps().length > 0) {
    app = getApps()[0];
    db = getFirestore(app);
    return;
  }

  let serviceAccount: ServiceAccount | undefined;
  
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      // Handles Base64 encoded credentials
      const decodedCreds = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decodedCreds);
    } catch (e) {
      try {
        // Handles plain JSON string credentials
        serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      } catch (e2) {
        console.error("Could not parse GOOGLE_APPLICATION_CREDENTIALS. Ensure it's a valid JSON string or base64 encoded JSON.", e2);
      }
    }
  }

  // Initialize with credentials if available, otherwise rely on Application Default Credentials
  app = initializeApp(serviceAccount ? { credential: cert(serviceAccount) } : {});
  db = getFirestore(app);
}

// Initialize the app when the module is first loaded
initializeAdminApp();

export { app, db };
