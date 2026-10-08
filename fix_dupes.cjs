const fs = require('fs');
let code = fs.readFileSync('backend/index.js', 'utf8');

const hookStart = 'checkRequiredFields(payload, ["groupName", "password"]);';
const hookEnd = '  const newGroup = {';

let startIdx = code.indexOf(hookStart);
let endIdx = code.indexOf(hookEnd, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    let before = code.substring(0, startIdx + hookStart.length);
    let after = code.substring(endIdx);
    
    let replacement = '\n\n  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = `$scrypt$${hash}:${salt}`;\n\n';
    
    code = before + replacement + after;
}

fs.writeFileSync('backend/index.js', code);
