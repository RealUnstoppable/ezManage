const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('file://' + path.resolve('index.html'));

    const content = await page.content();
    if (content.includes('ezManageFirebaseConfig')) {
        console.log('Firebase config script successfully loaded in index.html');
    }
    await browser.close();
})();
