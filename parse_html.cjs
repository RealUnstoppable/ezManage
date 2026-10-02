const { JSDOM } = require("jsdom");
const fs = require("fs");

const html = fs.readFileSync("index.html", "utf-8");
const dom = new JSDOM(html, { runScripts: "outside-only" });

const scripts = Array.from(dom.window.document.querySelectorAll("script:not([src])"));

scripts.forEach((script, i) => {
    try {
        new Function(script.textContent);
    } catch (e) {
        console.error(`Syntax Error in script ${i}:`, e.message);
        const lines = script.textContent.split('\n');
        // print approximate location of error
        // we won't know the exact line without a better parser but we can try

        console.log(lines.slice(0, 50).join('\n'));
    }
});
