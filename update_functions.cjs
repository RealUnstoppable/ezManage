const fs = require('fs');

const utilsPath = 'functions/utils.js';
let utilsCode = fs.readFileSync(utilsPath, 'utf8');

if (!utilsCode.includes('checkRateLimit')) {
  const rateLimitCode = `
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 50; // Max requests
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window

/**
 * Basic in-memory rate limiter per UID to prevent abuse.
 * @param {string} uid The user ID
 * @throws {Error} Throws an error if limit exceeded
 */
function checkRateLimit(uid) {
  const now = Date.now();
  if (!rateLimitMap.has(uid)) {
    rateLimitMap.set(uid, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return;
  }

  const record = rateLimitMap.get(uid);
  if (now > record.resetTime) {
    // Reset window
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
  } else {
    record.count++;
    if (record.count > RATE_LIMIT_MAX) {
      throw new Error('rate-limit-exceeded');
    }
  }
}
`;
  utilsCode = utilsCode.replace(/module\.exports = \{/, rateLimitCode + '\nmodule.exports = {\n  checkRateLimit,');
  fs.writeFileSync(utilsPath, utilsCode);
  console.log('Updated functions/utils.js');
}

const indexPath = 'functions/index.js';
let indexCode = fs.readFileSync(indexPath, 'utf8');

if (!indexCode.includes('checkRateLimit')) {
  indexCode = indexCode.replace(/const \{ logManagerError \} = require\('\.\/utils'\);/g, "const { logManagerError, checkRateLimit } = require('./utils');");

  // Inject rate limit check right after const uid = context.auth.uid; in all exports.manage* and other functions
  const injectionStr = `\n  const uid = context.auth.uid;\n\n  try {\n    checkRateLimit(uid);\n  } catch(e) {\n    if(e.message === 'rate-limit-exceeded') throw new HttpsError("resource-exhausted", "Too many requests. Please try again later.");\n  }\n`;

  indexCode = indexCode.replace(/\n\s*const uid = context\.auth\.uid;/g, injectionStr);

  fs.writeFileSync(indexPath, indexCode);
  console.log('Updated functions/index.js');
}
