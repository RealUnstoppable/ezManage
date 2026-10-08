const fs = require('fs');
let code = fs.readFileSync('/tmp/index_main.js', 'utf8');

const s1 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt\${hash}:\${salt}\`;`;
const s2 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;`;

while (code.includes(s1)) code = code.replace(s1, s2);
while (code.includes(s2 + '\n\n' + s2)) code = code.replace(s2 + '\n\n' + s2, s2);

fs.writeFileSync('/tmp/index_main.js', code);
