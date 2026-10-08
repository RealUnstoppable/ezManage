const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const navIndex = html.indexOf('<nav class="space-y-6">');
const endNavIndex = html.indexOf('</nav>', navIndex);

console.log(html.substring(navIndex, endNavIndex + 6));
