const fs = require('fs');

let indexCode = fs.readFileSync('functions/index.js', 'utf8');

indexCode = indexCode.replace(/const \{adaptGen2Params, logManagerError\} = require\("\.\/utils"\);/g, 'const {adaptGen2Params, logManagerError, checkRateLimit} = require("./utils");');

fs.writeFileSync('functions/index.js', indexCode);
console.log('Fixed checkRateLimit import');
