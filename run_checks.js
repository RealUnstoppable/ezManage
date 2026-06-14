const fs = require('fs');
let code = fs.readFileSync('tmp_script.js', 'utf8');

// Quick fixes for the known issues:
// 1. Duplicate escapeHTML
code = code.replace(/function escapeHTML[\s\S]*?\}[\s\S]*?function escapeHTML/, 'function escapeHTML');

// Write back to check
fs.writeFileSync('tmp_script.js', code);
