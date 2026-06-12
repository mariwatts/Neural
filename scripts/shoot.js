// Proof-of-work screenshotter for NEURONS NeuralNS.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';
const API = 'http://localhost:4000/api';

async function main() {
  // pick a real agent for the detail page
  let agentName = 'scout.agent';
  try {
    const res = await fetch(`${API}/leaderboard?limit=1`);
    const j = await res.json();
    if (j[0]?.name) agentName = j[0].name;
  } catch {}

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  const page = await ctx.newPage();

  const shots = [
    ['01-landing-hero', '/', { full: false, wait: 2200 }],
    ['02-landing-full', '/', { full: true, wait: 2600 }],
    ['03-explore', '/explore', { full: false, wait: 2200 }],
    ['04-register', `/register?name=quantum&category=defi`, { full: false, wait: 2200 }],
    ['05-agent', `/agent/${agentName}`, { full: true, wait: 2000 }],
    ['06-stats', '/stats', { full: true, wait: 2600 }],
    ['07-docs', '/docs', { full: false, wait: 1600 }],
  ];

  // Scroll the whole page in steps to trigger scroll-reveals + lazy content,
  // then return to top — so a fullPage capture shows everything revealed.
  async function primeReveals() {
    await page.evaluate(async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y < h; y += Math.floor(window.innerHeight * 0.8)) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 300));
    });
  }

  for (const [name, url, opts] of shots) {
    await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(opts.wait);
    if (opts.full) await primeReveals();
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: !!opts.full });
    console.log('shot', name, url);
  }

  // command palette
  await page.goto(BASE + '/', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.keyboard.down('Control');
  await page.keyboard.press('K');
  await page.keyboard.up('Control');
  await page.waitForTimeout(500);
  await page.keyboard.type('exec', { delay: 60 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, '08-command-palette.png') });
  console.log('shot 08-command-palette');

  // connect wallet modal (Reown — official wallets)
  await page.goto(BASE + '/', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1200);
  const connect = page.locator('button:has-text("Connect Wallet")').first();
  if (await connect.count()) {
    await connect.click().catch(() => {});
    await page.waitForTimeout(3500); // let Reown modal + wallet registry load
    await page.screenshot({ path: path.join(OUT, '09-connect-wallet.png') });
    console.log('shot 09-connect-wallet');
  }

  await browser.close();
  console.log('DONE — screenshots in', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
