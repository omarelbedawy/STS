
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
        const serviceAccountJson = JSON.parse(serviceAccountString);
        if (serviceAccountJson.private_key) {
            serviceAccountJson.private_key = serviceAccountJson.private_key.replace(/\\n/g, '\n');
        }
        
        app = initializeApp({
          credential: cert(serviceAccountJson)
        });

      } catch (e: any) {
        console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS or initialize app with cert:', e);
        app = initializeApp();
      }
    } else {
      console.log('Initializing Firebase Admin SDK with Application Default Credentials.');
      app = initializeApp();
    }
  }

  db = getFirestore(app);
  auth = getAuth(app);
}

initializeAdminApp();

export { app, db, auth };
