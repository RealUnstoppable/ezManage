const fs = require('fs');
let html = fs.readFileSync('easy-ai.html', 'utf8');

html = html.replace(/href="javascript:void\(0\)" onclick="navTo\('([^']+)'\)/g, 'href="index.html#$1" onclick="navTo(\'$1\'); return false;');
html = html.replace(/href="#" onclick="navTo\('([^']+)'\)/g, 'href="index.html#$1" onclick="navTo(\'$1\'); return false;');

fs.writeFileSync('easy-ai.html', html);
