#!/usr/bin/env node
// Copy this per page, fill in check(), then run it with:
//   NODE_PATH="$(npm root -g)" node check.cjs
// Serve the folder first (python3 -m http.server <port>) and point URL at the page.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  url: process.env.URL || 'http://127.0.0.1:8123/out/index.html',
  viewport: { width: 1280, height: 900 },
  artifacts: path.join(__dirname, 'artifacts'),
};

const problems = [];

// Wait on a real condition. Use this for anything the page has to finish first.
async function until(page, fn, { timeout = 20000, every = 100 } = {}) {
  const start = Date.now();
  for (;;) {
    if (await page.evaluate(fn)) return true;
    if (Date.now() - start > timeout) throw new Error(`timed out waiting for: ${fn}`);
    await page.waitForTimeout(every);
  }
}

function watch(page) {
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`http ${r.status()}: ${r.url()}`); });
}

async function shot(page, name) {
  fs.mkdirSync(CONFIG.artifacts, { recursive: true });
  const file = path.join(CONFIG.artifacts, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

// Everything specific to the page goes here. Return the measurements, do not judge them.
async function check(page) {
  await until(page, () => document.querySelectorAll('svg .mark').length > 0);
  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll('svg text')].map((t) => t.getBoundingClientRect().toJSON()));
  const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  let intersecting = 0;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (overlaps(boxes[i], boxes[j])) intersecting++;
  await shot(page, 'desktop');
  return { textBoxes: boxes.length, intersecting };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: CONFIG.viewport });
  watch(page);
  await page.goto(CONFIG.url, { waitUntil: 'load', timeout: 45000 });
  const observed = await check(page);
  console.log(JSON.stringify(observed, null, 2));
  console.log(`problems (${problems.length})`);
  problems.slice(0, 40).forEach((p) => console.log(`  ${p}`));
  await browser.close();
  process.exit(problems.length ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
