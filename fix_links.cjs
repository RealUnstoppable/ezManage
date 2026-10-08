const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/href="javascript:void\(0\)" onclick="navTo\('([^']+)'\)/g, 'href="#$1" onclick="navTo(\'$1\'); return false;');
html = html.replace(/href="#" onclick="navTo\('([^']+)'\)/g, 'href="#$1" onclick="navTo(\'$1\'); return false;');

fs.writeFileSync('index.html', html);
