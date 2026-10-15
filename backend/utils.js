const functions = require("firebase-functions");
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
 * Adapts Gen2 parameters to a common format.
 * @param {Object} data - The data object
 * @param {Object} context - The context object
 * @return {Object} The adapted parameters
 */
function adaptGen2Params(data, context) {
  if (data && typeof data === "object" && "rawRequest" in data && "auth" in data) {
    return {data: data.data, context: data};
  }
  return {data, context};
}

/**
 * Logs a manager error.
 * @param {string} actionMessage - The action message
 * @param {Error} error - The error object
 */
function handleInternalError(actionMessage, error) {
  logManagerError(actionMessage, error);
  if (error instanceof HttpsError) throw error;
  throw new HttpsError("internal", "An internal error occurred.");
}

/**
 * Safely executes a Firestore query with orderBy, falling back to in-memory sort if composite index is missing.
 * @param {Object} query - The Firestore query object
 * @param {string} [orderByField] - Field to order by
 * @param {string} [orderDir="desc"] - "asc" or "desc"
 * @param {number} [limitCount=50] - Number of documents to limit to
 * @return {Promise<Array<Object>>} Array of document data objects with id
 */
async function safeGetOrderedDocs(query, orderByField, orderDir = "desc", limitCount = 50) {
  try {
    let q = query;
    if (orderByField) {
      q = q.orderBy(orderByField, orderDir);
    }
    if (limitCount) {
      q = q.limit(limitCount);
    }
    const snap = await q.get();
    const docs = [];
    snap.forEach((doc) => docs.push({id: doc.id, ...doc.data()}));
    return docs;
  } catch (err) {
    console.warn(`Query with orderBy failed, falling back to in-memory sort: ${err.message}`);
    let fallbackQ = query;
    if (limitCount) {
      fallbackQ = fallbackQ.limit(Math.max(limitCount * 2, 100));
    }
    const snap = await fallbackQ.get();
    const docs = [];
    snap.forEach((doc) => docs.push({id: doc.id, ...doc.data()}));
    if (orderByField) {
      docs.sort((a, b) => {
        const valA = a[orderByField];
        const valB = b[orderByField];
        const toMs = (v) => {
          if (!v) return 0;
          if (v.toMillis) return v.toMillis();
          if (v._seconds) return v._seconds * 1000;
          return new Date(v).getTime() || 0;
        };
        const numA = toMs(valA);
        const numB = toMs(valB);
        return orderDir === "desc" ? (numB - numA) : (numA - numB);
      });
    }
    return limitCount ? docs.slice(0, limitCount) : docs;
  }
}

/**
 * Logs a manager error.
 * @param {string} actionMessage - The action message
 * @param {Error} error - The error object
 */
function logManagerError(actionMessage, error) {
  console.error("Manager Troubleshooting: " + actionMessage, error);
}


/**
 * Helper to check if required fields are present in a payload.
 * @param {Object} payload - The payload object to check.
 * @param {string[]} requiredKeys - Array of keys that must be present and truthy.
 * @param {string} [errorMessage="Missing required fields"] - Optional custom error message.
 * @throws {HttpsError} Throws an HttpsError if any key is missing.
 */
function checkRequiredFields(payload, requiredKeys, errorMessage = "Missing required fields") {
  if (!payload || typeof payload !== "object") {
    throw new HttpsError("invalid-argument", "Missing action or payload");
  }
  for (const key of requiredKeys) {
    if (!payload[key]) {
      throw new HttpsError("invalid-argument", errorMessage);
    }
  }
}

module.exports = {
  checkRequiredFields,
  logManagerError,
  handleInternalError,
  safeGetOrderedDocs,
  parseNum,
  getDayOfWeek,
  escapeHTML,
  adaptGen2Params,
};
