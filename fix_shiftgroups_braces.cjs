const fs = require('fs');
let content = fs.readFileSync('backend/index.js', 'utf8');

const badBlock = `    throw new HttpsError("internal", "An internal error occurred.");
  }
});`;

const goodBlock = `    throw new HttpsError("internal", "An internal error occurred.");
});`;

content = content.replace(badBlock, goodBlock);
fs.writeFileSync('backend/index.js', content);
