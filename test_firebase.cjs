const fs = require('fs');
const code = fs.readFileSync('firebase.js', 'utf8');
try {
  eval(code.replace(/export .*/, ''));
  console.log("Parsed OK");
} catch(e) {
  console.error("Eval error", e);
}
