const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const search = `      window.deleteAnnouncement = deleteAnnouncement;`;
const replace = ``;

if (html.includes(search)) {
    html = html.replace(search, replace); // wait, there might be multiple. We'll leave it as is if it's not the cause.
}
