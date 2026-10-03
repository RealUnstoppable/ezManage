const fs = require('fs');
let code = fs.readFileSync('js/tests/shop.test.js', 'utf8');

code = code.replace(/global\.window\.location = \{[\s\S]*?\};\n\}\);\n/g, `global.window.location = {
    search: "?group=test_group",
    href: "http://localhost/shop.html",
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    toString: () => 'http://localhost/'
};\n`);

fs.writeFileSync('js/tests/shop.test.js', code);
