const fs = require('fs');
let code = fs.readFileSync('backend/index.js', 'utf8');

const badBlock = `    throw new HttpsError("invalid-argument", "Invalid action.");
  } catch (error) {
    logManagerError("Error in manageTemperatureLogs: ", error);
    throw new HttpsError("internal", "An internal error occurred.");
  }
});

    try {`;

const goodBlock = `exports.manageVendorDeliveries = functions.https.onCall(async (data, context) => {
  const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

    try {`;

code = code.replace(badBlock, goodBlock);
fs.writeFileSync('backend/index.js', code);
