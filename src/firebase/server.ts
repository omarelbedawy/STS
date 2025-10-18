
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let app: App;
let db: Firestore;
let auth: Auth;

// This function robustly initializes the Firebase Admin SDK.
// It relies on Application Default Credentials (ADC) being set up in the environment.
function initializeAdminApp() {
  if (getApps().length > 0) {
    app = getApps()[0];
  } else {
    // Calling initializeApp() without arguments relies on ADC.
    // This is the recommended approach for server-side environments like Cloud Run.
    app = initializeApp();
  }
  db = getFirestore(app);
  auth = getAuth(app);
}

// Initialize the app when the module is first loaded
initializeAdminApp();

export { app, db, auth };
