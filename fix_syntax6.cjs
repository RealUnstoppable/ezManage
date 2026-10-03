const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const search = `              function fetchTasks() {`;
const replace = ``;

if (html.includes(search)) {
    // let's actually just find where it is duplicated
    let first = html.indexOf(search);
    let last = html.lastIndexOf(search);
    if(first !== last && last > -1) {
        // We have a duplicate.
        // It's probably the function fetchTasks() { ... } block
        // Let's locate the entire block and remove the second one.
        // We can just remove the second occurrence using substring if we know its length, or we can just ignore it by removing the start.
    }
}
