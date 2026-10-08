const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8');

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable"
});

dom.window.onerror = function(msg, source, lineno, colno, error) {
    console.error("JSDOM Error: ", msg, source, lineno, colno, error);
};

console.log("Loading JSDOM...");
setTimeout(() => {
    console.log("isInitializingAuth:", dom.window.isInitializingAuth);
    console.log("Done");
}, 3000);
