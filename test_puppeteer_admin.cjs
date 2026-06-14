const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:8081/admin.html', { waitUntil: 'networkidle2' });
  
  // Try to click a sidebar link
  try {
    await page.evaluate(() => {
      const link = document.querySelector('a[href="#bookings"]');
      if (link) {
         link.click();
      } else {
         console.log("Link not found");
      }
    });
    console.log("Clicked bookings link");
  } catch (e) {
    console.log("Failed to click:", e.message);
  }
  
  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
})();
