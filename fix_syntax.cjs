const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const search = `                  const submitBtn = document.getElementById('btnSubmitShiftNote');`;
const replace = `                  const _submitBtn = document.getElementById('btnSubmitShiftNote');`;

if (html.includes(search)) {
    html = html.replace(search, replace);
    fs.writeFileSync('index.html', html);
    console.log("Replaced successfully!");
} else {
    console.log("Search string not found!");
}
