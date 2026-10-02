const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const search = `activeView`;
console.log(html.includes(search));
