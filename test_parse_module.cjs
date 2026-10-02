const fs = require('fs');
const acorn = require('acorn');

const html = fs.readFileSync('index.html', 'utf8');

const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gm;

let match;
while ((match = regex.exec(html)) !== null) {
  let content = match[1];
  let typeMatch = match[0].match(/type="([^"]+)"/);
  let type = typeMatch ? typeMatch[1] : '';

  if (type !== 'module') continue;

  try {
    acorn.parse(content, {ecmaVersion: 2020, sourceType: 'module'});
  } catch (e) {
    let lineCount = html.substring(0, match.index + match[0].indexOf(content) + e.pos).split('\n').length;
    console.log('Error around HTML Line ' + lineCount + ':', e.message);
    let lines = html.split('\n');
    console.log('Line ' + (lineCount) + ': ' + lines[lineCount-1]);
  }
}
