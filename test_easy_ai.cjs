const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    await page.goto(`file://${process.cwd()}/easy-ai.html`, {waitUntil: 'networkidle0'});
    
    const result = await page.evaluate(() => {
        try {
            window.navTo('tracker');
            return "navTo executed on easy-ai";
        } catch(e) {
            return "Error: " + e.message;
        }
    });
    console.log("Result:", result);
    
    await browser.close();
})();
