const fs = require('fs');
let code = fs.readFileSync('backend/index.js', 'utf8');

const blockRegex = /([ \t]*const salt = crypto\.randomBytes\(16\)\.toString\("hex"\);\n[ \t]*const hash = crypto\.scryptSync\(password, salt, 64\)\.toString\("hex"\);\n[ \t]*const hashedPassword = `\$scrypt\$?\{hash\}:\$\{salt\}`;\n)+/g;

const cleanBlock = \`  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \\\`$scrypt$$\{hash}:\$\{salt\}\\\`;\n\`;

code = code.replace(blockRegex, cleanBlock);

const badDanglingBlock = \`  return {success: true};\n}\n\n    // Upgrade to salted hash if correct\n    if (isValid) {\n      const salt = crypto.randomBytes(16).toString("hex");\n      const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n      await admin.firestore().collection("shift_groups").doc(groupId).update({\n        password: \\\`$scrypt$$\{hash}:\$\{salt\}\\\`,\n      });\n    }\n  }\n\n  if (!isValid) {\n    throw new HttpsError(\n        "permission-denied", "Invalid password");\n  }\`;

code = code.replace(badDanglingBlock, \`  return {success: true};\n}\`);

fs.writeFileSync('backend/index.js', code);
