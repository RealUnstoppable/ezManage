const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('PAGE REQUEST FAILED:', request.url(), request.failure().errorText));
  
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.waitForTimeout(2000);
  
  // also check if hamburger exists
  const hamburger = await page.$('button[aria-label="Toggle Menu"]');
  if (hamburger) {
    const box = await hamburger.boundingBox();
    console.log("Hamburger bounding box:", box);
  } else {
    console.log("Hamburger button NOT FOUND");
  }
  
  await page.screenshot({ path: 'screenshot2.png' });
  await browser.close();
  console.log("Screenshot saved to screenshot2.png");
})();
