const fs = require('fs');

let indexCode = fs.readFileSync('functions/index.js', 'utf8');
if(indexCode.includes('checkRateLimit(uid);') && !indexCode.includes('const uid = context.auth.uid;')) {
    // Already replaced earlier, let's verify
}
