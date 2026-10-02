const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const search = `                const activeView2 = document.querySelector(
                  ".view-section.active",
                );
                if (!navigator.onLine) {
                  if (activeView2 && activeView2.id !== "view-tracker")
                    navTo("tracker");
                }`;
const replace = `                let activeView2 = document.querySelector(
                  ".view-section.active",
                );
                if (!navigator.onLine) {
                  if (activeView2 && activeView2.id !== "view-tracker")
                    navTo("tracker");
                }`;

if (html.includes(search)) {
    html = html.replace(search, replace);
    fs.writeFileSync('index.html', html);
    console.log("Replaced successfully!");
}
