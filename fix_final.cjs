const fs = require('fs');
let code = fs.readFileSync('backend/index.js', 'utf8');

const s1 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt\${hash}:\${salt}\`;\n\n`;
const s2 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;\n\n`;
const s3 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;`;
const s4 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt\${hash}:\${salt}\`;`;

code = code.replaceAll(s1, "");
code = code.replaceAll(s2, "");
code = code.replaceAll(s3, "");
code = code.replaceAll(s4, "");

const hook = `checkRequiredFields(payload, ["groupName", "password"]);`;
code = code.replace(hook, hook + "\n\n  const salt = crypto.randomBytes(16).toString(\"hex\");\n  const hash = crypto.scryptSync(password, salt, 64).toString(\"hex\");\n  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;\n");

// Also there was an issue with `newGroupLegacy` let's remove it if it exists.
const legacyBlock = `      const docRef = await admin.firestore()
          .collection("shift_groups")
          .add(newGroupLegacy);`;
code = code.replace(legacyBlock, "");

fs.writeFileSync('backend/index.js', code);
