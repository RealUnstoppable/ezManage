const fs = require('fs');

let code = fs.readFileSync('backend/index.js', 'utf8');

// There are duplicates of exports.getActualOrgId = getActualOrgId;
code = code.replace(
  `exports.getActualOrgId = getActualOrgId;

exports.getActualOrgId = getActualOrgId;`,
  `exports.getActualOrgId = getActualOrgId;`
);

fs.writeFileSync('backend/index.js', code);
