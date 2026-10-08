const fs = require('fs');
let code = fs.readFileSync('backend/index.js', 'utf8');

const badPattern = /    \}\n    throw new HttpsError\("internal", "An internal error occurred\."\);\n  \}\n\}\);/g;
const goodPattern = '    }\n    throw new HttpsError("internal", "An internal error occurred.");\n});';

code = code.replace(badPattern, goodPattern);

fs.writeFileSync('backend/index.js', code);
