const functions = require('firebase-functions');
const HttpsError = functions.https.HttpsError;

/**
 * Utility functions shared across Cloud Functions
 */

/**
 * Parse a value to a number.
 * @param {any} val The value to parse
 * @return {number} The parsed number
 */
function parseNum(val) {
  if (!val) return 0;
  const parsed = parseFloat(val.toString().replace(/[^0-9.]/g, ""));
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Get the day of the week from a date string.
 * @param {string} dateString The date string
 * @return {number} The day of the week (0-6), or -1 if invalid
 */
function getDayOfWeek(dateString) {
  if (!dateString) return -1;
  let d;
  if (dateString.includes("-")) {
    const [yyyy, mm, dd] = dateString.split("-");
    d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  } else {
    d = new Date(dateString);
  }
  if (isNaN(d.getTime())) return -1;
  return d.getDay();
}

/**
 * Escape HTML special characters in a string.
 * @param {string} str The string to escape
 * @return {string} The escaped string
 */
function escapeHTML(str) {
  if (typeof str !== "string") return str;
  return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}




/**
 * Helper to get a document, verify its existence, and verify its orgId.
 */
async function verifyDocAndAuth(admin, collection, docId, expectedOrgId, notFoundMessage, unauthorizedMessage) {
  const docRef = admin.firestore().collection(collection).doc(docId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    throw new HttpsError("not-found", notFoundMessage);
  }

  if (docSnap.data().orgId !== expectedOrgId) {
    throw new HttpsError("permission-denied", unauthorizedMessage);
  }

  return { docRef, docSnap };
}


/**
 * Helper to get the actual organization ID for a user.
 */
async function getActualOrgId(admin, uid) {
  try {
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }
    return userDoc.data().orgId || null;
  } catch (error) {
    logManagerError("Error getting actual org ID for uid: " + uid, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

function adaptGen2Params(data, context) {
  if (data && typeof data === "object" && "rawRequest" in data && "auth" in data) {
    return {data: data.data, context: data};
  }
  return {data, context};
}

function logManagerError(actionMessage, error) {
  console.error("Manager Troubleshooting: " + actionMessage, error);
}

module.exports = {
  verifyDocAndAuth,
  getActualOrgId,
  logManagerError,
  parseNum,
  getDayOfWeek,
  escapeHTML,
  adaptGen2Params,
};
