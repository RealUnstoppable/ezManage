const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// replace err.message and error.message interpolations with escapeHTML
content = content.replace(/\$\{error\.message\}/g, '${escapeHTML(error.message)}');
content = content.replace(/\$\{err\.message\}/g, '${escapeHTML(err.message)}');

fs.writeFileSync('index.html', content);
