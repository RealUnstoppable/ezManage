const fs = require('fs');
let code = fs.readFileSync('work.js', 'utf8');

// 1. Remove duplicate escapeHTML
code = code.replace(/function escapeHTML[\s\S]*?\}[\s\S]*?function escapeHTML/, 'function escapeHTML');

// 2. Fix manageShiftGroups
code = code.replace(/const manageShiftGroups = firebase\.functions\(\)\.httpsCallable\('manageShiftGroups'\);\n\s*await manageShiftGroups\(\{/, '');

fs.writeFileSync('work.js', code);
