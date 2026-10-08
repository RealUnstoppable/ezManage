const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

if (!html.includes("window.fetchLostAndFound = fetchLostAndFound;")) {
    html = html.replace('async function fetchLostAndFound() {', 'window.fetchLostAndFound = fetchLostAndFound;\n        async function fetchLostAndFound() {');
}

fs.writeFileSync('index.html', html);
