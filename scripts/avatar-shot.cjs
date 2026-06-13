const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const files = ['av-meowagent', 'av-executor', 'av-meow', 'av-sentinel'];
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1280, height: 340 } })).newPage();
  const imgs = files
    .map((f) => {
      const svg = fs.readFileSync(path.resolve('screenshots', f + '.svg'), 'utf8');
      return `<div style="width:300px;height:300px">${svg.replace('width="600" height="600"', 'width="300" height="300"')}</div>`;
    })
    .join('');
  await page.setContent(`<body style="margin:0;background:#222;display:flex;gap:10px;padding:10px">${imgs}</body>`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/avatars-preview.png' });
  await b.close();
  console.log('done');
})();
