const fs = require('fs');
let code = fs.readFileSync('backend/index.js', 'utf8');

let lines = code.split('\n');
let braces = 0;
for (let i = 0; i < lines.length; i++) {
    for (let j = 0; j < lines[i].length; j++) {
        if (lines[i][j] === '{') braces++;
        if (lines[i][j] === '}') braces--;
    }
    if (braces < 0) {
        console.log("Unmatched } at line " + (i + 1));
        break;
    }
}
if (braces > 0) {
    console.log("Unmatched { somewhere! Final count: " + braces);
} else if (braces === 0) {
    console.log("Braces are perfectly matched!");
}
