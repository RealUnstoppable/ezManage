const fs = require('fs');
let code = fs.readFileSync('/tmp/index_main.js', 'utf8');

const badSaltTriplet = `  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  const hashedPassword = \`$scrypt\${hash}:\${salt}\`;

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;`;

const goodSaltBlock = `  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;`;

code = code.replace(badSaltBlock, goodSaltBlock);
// also replace it if there are 4:
const badSaltQuad = `  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  const hashedPassword = \`$scrypt\${hash}:\${salt}\`;

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  const hashedPassword = \`$scrypt\${hash}:\${salt}\`;`;
if(code.includes(badSaltQuad)) {
  code = code.replace(badSaltQuad, goodSaltBlock);
}

// Just globally strip out ANY repeated salt declarations
code = code.replace(/(  const salt = crypto\.randomBytes\(16\)\.toString\("hex"\);\n  const hash = crypto\.scryptSync\(password, salt, 64\)\.toString\("hex"\);\n  const hashedPassword = `\$scrypt\$?\{hash\}:\{salt\}`;\n)+/g, goodSaltBlock + '\n');


fs.writeFileSync('/tmp/index_main.js', code);
