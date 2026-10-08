const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const search = `                  const originalText = submitBtn ? submitBtn.innerHTML : "Post Note";`;
const replace = `                  const originalText = _submitBtn ? _submitBtn.innerHTML : "Post Note";`;

if (html.includes(search)) {
    html = html.replace(search, replace);
    fs.writeFileSync('index.html', html);
    console.log("Replaced successfully!");
} else {
    console.log("Search string not found!");
}
