const fs = require('fs');
let content = fs.readFileSync('panel-ai-admin.html', 'utf8');

// replace
content = content.replace(/\$\{k\.label\}/g, '${escapeHTML(k.label)}');
content = content.replace(/\$\{k\.color\}/g, '${escapeHTML(k.color)}');
content = content.replace(/\$\{k\.value\}/g, '${escapeHTML(k.value)}');

fs.writeFileSync('panel-ai-admin.html', content);
