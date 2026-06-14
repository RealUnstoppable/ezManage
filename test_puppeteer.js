const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:8081', { waitUntil: 'networkidle2' });
  
  // Try to click a sidebar link
  try {
    await page.evaluate(() => {
      document.querySelector('a[onclick="navTo(\\'schedule\\')"]').click();
    });
    console.log("Clicked schedule link");
  } catch (e) {
    console.log("Failed to click:", e.message);
  }
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
