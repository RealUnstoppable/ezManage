const fs = require('fs');
let content = fs.readFileSync('js/shop.js', 'utf8');

if (!content.includes('escapeHTML')) {
  content = content.replace(/import \{ logManagerError \} from '\.\/utils\.js';/g, "import { logManagerError, escapeHTML } from './utils.js';");
}

content = content.replace(/\$\{product\.name\}/g, '${escapeHTML(product.name)}');
content = content.replace(/\$\{product\.description\}/g, '${escapeHTML(product.description)}');


fs.writeFileSync('js/shop.js', content);
