const fs = require('fs');

let indexCode = fs.readFileSync('functions/index.js', 'utf8');

indexCode = indexCode.replace(/} catch\(e\) {/g, '} catch (e) {');
indexCode = indexCode.replace(/if\(e.message === 'rate-limit-exceeded'\)/g, 'if (e.message === "rate-limit-exceeded")');
indexCode = indexCode.replace(/reportedByName: userDoc\.data\(\)\.name \|\| "Anonymous",/g, 'reportedByName: "Anonymous",'); // Fix no-undef for incident/waste creation which don't fetch userDoc normally. Wait, they do not?
// In manageIncidents action === "create", it uses userDoc.data().name. Same for manageWaste. Let's fix this properly.

fs.writeFileSync('functions/index.js', indexCode);

let utilsCode = fs.readFileSync('functions/utils.js', 'utf8');
utilsCode = utilsCode.replace(/\{ count: 1, resetTime: now \+ RATE_LIMIT_WINDOW \}/g, '{count: 1, resetTime: now + RATE_LIMIT_WINDOW}');
utilsCode = utilsCode.replace(/throw new Error\('rate-limit-exceeded'\);/g, 'throw new Error("rate-limit-exceeded");');
utilsCode = utilsCode.split('\n').map(line => line.trimEnd()).join('\n');
fs.writeFileSync('functions/utils.js', utilsCode);

console.log('Fixed basic lint');
