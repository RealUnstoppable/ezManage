const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    await page.goto(`file://${process.cwd()}/index.html`, {waitUntil: 'networkidle0'});
    
    console.log("Clicking Tracker link...");
    await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const trackerLink = links.find(l => l.getAttribute('onclick') === "navTo('tracker')");
        if (trackerLink) trackerLink.click();
    });
    
    await page.waitForTimeout(500);
    
    const result = await page.evaluate(() => {
        const el = document.getElementById('view-tracker');
        return "Tracker class: " + el.className;
    });
    console.log(result);
    
    await browser.close();
})();
