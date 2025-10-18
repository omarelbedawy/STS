
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Ensure Firebase Admin is initialized only once
if (!admin.apps.length) {
  admin.initializeApp();
}

exports.setCustomUserClaims = functions.https.onCall(async (data, context) => {
  // Ensure the function is called by an authenticated user.
  // Note: For sign-up, the user is authenticated right after creation.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const { uid, claims } = data;

  if (!uid || !claims) {
      throw new functions.https.HttpsError(
          "invalid-argument",
          "The function must be called with 'uid' and 'claims' arguments."
      );
  }

  try {
    // Set custom user claims on the user's auth record.
    await admin.auth().setCustomUserClaims(uid, claims);
    return {
      message: `Success! Custom claims set for user ${uid}.`,
    };
  } catch (error) {
    console.error("Error setting custom claims:", error);
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while setting custom claims."
    );
  }
});
