const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    console.log("Loading page...");
    await page.goto(`file://${process.cwd()}/index.html`, {waitUntil: 'networkidle0'});
    
    console.log("Evaluating navTo...");
    const result = await page.evaluate(() => {
        try {
            window.navTo('tracker');
            const el = document.getElementById('view-tracker');
            return "Success: class is " + el.className;
        } catch(e) {
            return "Error: " + e.message;
        }
    });
    console.log("navTo result:", result);
    
    await browser.close();
})();
