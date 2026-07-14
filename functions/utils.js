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



// Shared utility to adapt Gen2 callable function parameters.
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
  logManagerError,
  parseNum,
  getDayOfWeek,
  escapeHTML,
  adaptGen2Params,
};
