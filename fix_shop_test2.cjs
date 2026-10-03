const fs = require('fs');
let code = fs.readFileSync('js/tests/shop.test.js', 'utf8');

code = code.replace(/afterAll\([\s\S]*?\}\);/, '');

fs.writeFileSync('js/tests/shop.test.js', code);
