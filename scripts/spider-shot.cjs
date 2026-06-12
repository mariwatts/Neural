const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.mouse.move(1100, 280);
  await page.waitForTimeout(2000);
  await page.mouse.move(1150, 320, { steps: 10 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screenshots/spider-light.png' });

  await page.evaluate(() => {
    localStorage.setItem('neurons-theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.mouse.move(1080, 300, { steps: 8 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshots/spider-dark.png' });
  await b.close();
  console.log('done');
})();
