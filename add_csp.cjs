const fs = require('fs');

const files = fs.readdirSync('.').filter(file => file.endsWith('.html'));

const cspTag = `    <!-- 🛡️ Sentinel: Added Content Security Policy for defense-in-depth -->\n    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com;">`;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('Content-Security-Policy')) {
    content = content.replace(/<head>/i, `<head>\n${cspTag}`);
    fs.writeFileSync(file, content);
    console.log(`Added CSP to ${file}`);
  }
}
