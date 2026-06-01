const fs = require('fs');

let html = fs.readFileSync('company.html', 'utf8');

// Find the last <script> block
const scriptStartIdx = html.lastIndexOf('<script>');
const scriptEndIdx = html.lastIndexOf('</script>');

let js = html.substring(scriptStartIdx + 8, scriptEndIdx);

// Write to work.js
fs.writeFileSync('work.js', js);
console.log('work.js created');
