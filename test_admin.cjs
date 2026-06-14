const fs = require('fs');
const content = fs.readFileSync('admin.html', 'utf8');
const scriptMatch = content.match(/<script type="module">([\s\S]*?)<\/script>/g);
if(scriptMatch && scriptMatch.length > 1) {
  const code = scriptMatch[1].replace(/<script type="module">|<\/script>/g, '');
  fs.writeFileSync('work_admin.js', code);
}
