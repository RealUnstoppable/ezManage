const fs = require('fs');
let code = fs.readFileSync('backend/index.js', 'utf8');

const startMarker = `      throw new HttpsError("invalid-argument", "Invalid action.");
    } catch (error) {
      logManagerError("Error in manageTemperatureLogs: ", error);
      throw new HttpsError("internal", error.message);
    }
  });`;

const endMarker = `});`;

let startIdx = code.indexOf(startMarker);
if (startIdx !== -1) {
    let badBlockEndIdx = code.indexOf(endMarker, startIdx + startMarker.length) + endMarker.length;
    code = code.substring(0, startIdx + startMarker.length) + code.substring(badBlockEndIdx);
}
fs.writeFileSync('backend/index.js', code);
