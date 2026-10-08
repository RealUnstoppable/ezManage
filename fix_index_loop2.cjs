const fs = require('fs');
let content = fs.readFileSync('backend/index.js', 'utf8');

const s1 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt\${hash}:\${salt}\`;\n\n`;
const s2 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;\n\n`;
const s3 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;`;
const s4 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt\${hash}:\${salt}\`;`;

// Replace all occurrences of s1, s2, s3, s4 with nothing
content = content.replaceAll(s1, "");
content = content.replaceAll(s2, "");
content = content.replaceAll(s3, "");
content = content.replaceAll(s4, "");

// Add back exactly one instance after checkRequiredFields
const hook = `checkRequiredFields(payload, ["groupName", "password"]);`;
content = content.replace(hook, hook + "\n\n  const salt = crypto.randomBytes(16).toString(\"hex\");\n  const hash = crypto.scryptSync(password, salt, 64).toString(\"hex\");\n  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;\n");

fs.writeFileSync('backend/index.js', content);
