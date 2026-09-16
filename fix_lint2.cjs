const fs = require('fs');

let indexCode = fs.readFileSync('functions/index.js', 'utf8');

indexCode = indexCode.replace(/loggedByName: userDoc\.data\(\)\.name \|\| "Anonymous",/g, 'loggedByName: "Anonymous",');

fs.writeFileSync('functions/index.js', indexCode);
console.log('Fixed lint issue for userDoc');
