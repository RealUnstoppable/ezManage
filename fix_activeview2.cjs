const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const search = `            activeView = document.querySelector(".view-section.active");`;
const replace = `            let activeView = document.querySelector(".view-section.active");`;

if (html.includes(search)) {
    html = html.replace(search, replace);
    fs.writeFileSync('index.html', html);
    console.log("Replaced successfully!");
} else {
    console.log("Search string not found!");
}
