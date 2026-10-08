const fs = require('fs');
let code = fs.readFileSync('backend/index.js', 'utf8');

const badPattern = /      if \(error instanceof HttpsError\) \{\n        throw error;\n      \}\n      throw new HttpsError\("internal", error\.message\);\n    \}\n    throw new HttpsError\("internal", "An internal error occurred\."\);\n  \}\n\}\);/g;

const goodPattern = `      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
    throw new HttpsError("internal", "An internal error occurred.");
});`;

code = code.replace(badPattern, goodPattern);
fs.writeFileSync('backend/index.js', code);
