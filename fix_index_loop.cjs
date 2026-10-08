const fs = require('fs');
let content = fs.readFileSync('backend/index.js', 'utf8');

const s1 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt\${hash}:\${salt}\`;`;
const s2 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;`;

// Wipe out ALL instances of s1 and s2, and replace with a SINGLE placeholder.
let parts = content.split(s1);
content = parts.join('');

let parts2 = content.split(s2);
content = parts2.join('');

// But wait, if I remove them all, I lose the single one I need!
