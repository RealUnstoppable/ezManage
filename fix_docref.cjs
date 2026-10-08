const fs = require('fs');
let content = fs.readFileSync('backend/index.js', 'utf8');

const legacyBlock = `      const docRef = await admin.firestore()
          .collection("shift_groups")
          .add(newGroupLegacy);`;

content = content.replace(legacyBlock, "");
fs.writeFileSync('backend/index.js', content);
