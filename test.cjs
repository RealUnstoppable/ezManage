const fs = require('fs');
const html = fs.readFileSync('admin.html', 'utf8');
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
fs.writeFileSync('work_admin.js', script);
