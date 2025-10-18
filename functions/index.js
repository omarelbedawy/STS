
const functions = require("firebase-functions");
const { onCall } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

initializeApp();

exports.setCustomUserClaims = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const { uid, claims } = request.data;

  try {
    await getAuth().setCustomUserClaims(uid, claims);
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
