const fs = require('fs');
let code = fs.readFileSync('/tmp/index_main.js', 'utf8');

// Regex replace all consecutive duplicate salt blocks
code = code.replace(/(?:\s*const salt = crypto\.randomBytes\(16\)\.toString\("hex"\);\s*const hash = crypto\.scryptSync\(password, salt, 64\)\.toString\("hex"\);\s*const hashedPassword = `\$scrypt\$?\{hash\}:\$\{salt\}`;\s*)+/g, `\n  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;\n`);

fs.writeFileSync('/tmp/index_main.js', code);
