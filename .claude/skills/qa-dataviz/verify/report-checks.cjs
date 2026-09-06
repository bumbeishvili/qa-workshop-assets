// Reviewer's measurement pass over a generated report page: every check the
// skill's self-check list makes measurable, run against the real page.
// usage: NODE_PATH="$(npm root -g)" node report-checks.cjs /abs/path/index.html [server-root]
// serves server-root (default: the page's parent's parent) over http so ../samples and ../vendor resolve
// exit 1 on any FAIL line.
const { chromium } = require('playwright');
const path = require('path');

const http = require('http');
const fs = require('fs');
const file = path.resolve(process.argv[2]);
// serve the folder above the page's directory so ../samples and ../vendor resolve, like report/ in the repo
const root = process.argv[3] ? path.resolve(process.argv[3]) : path.dirname(path.dirname(file));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.csv': 'text/csv', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let url = '';
const dataRequests = [];
// screenshots go beside the page only if CHECKS_OUT says so; default is a temp folder, so a repo stays clean
const outDir = process.env.CHECKS_OUT ? path.resolve(process.env.CHECKS_OUT) : path.join(require('os').tmpdir(), 'report-checks');
fs.mkdirSync(outDir, { recursive: true });

const overlaps = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function measure(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url);
  await page.waitForTimeout(2500); // let intro animations settle

  return page.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
    const inter = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

    // text boxes: every leaf element with visible text
    const texts = [...document.querySelectorAll('body *')]
      .filter((el) => el.children.length === 0 && el.textContent.trim() && !el.closest('[hidden]') && getComputedStyle(el).visibility !== 'hidden')
      .map((el) => ({ t: el.textContent.trim().slice(0, 40), b: r(el) }))
      .filter((o) => o.b.width > 0 && o.b.height > 0);
    let textOverlaps = 0;
    const overlapPairs = [];
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].b, b = texts[j].b;
      if (inter(a, b)) {
        const ix = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const iy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        if (ix > 1 && iy > 1) { textOverlaps++; overlapPairs.push([texts[i].t, texts[j].t]); }
      }
    }

    const markSel = (svg) => {
      let m = [...svg.querySelectorAll('.mark')];
      if (!m.length) m = [...svg.querySelectorAll('rect, circle')].filter((el) => !el.closest('g.annotation') && !el.closest('.annotation-group') && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0 && getComputedStyle(el).fill !== 'none' && getComputedStyle(el).fill !== 'rgba(0, 0, 0, 0)');
      return m.map(r);
    };
    // marks per panel
    let svgs = [...document.querySelectorAll('svg[data-panel]')];
    if (!svgs.length) svgs = [...document.querySelectorAll('svg')].filter((el) => el.getBoundingClientRect().height > 80);
    const panels = svgs.map((svg) => {
      const marks = markSel(svg);
      return { panel: svg.dataset.panel || svg.getAttribute('aria-label')?.slice(0, 30) || 'svg', box: r(svg), marks: marks.length, area: r(svg).width * r(svg).height };
    });

    // annotations
    const annos = [...document.querySelectorAll('g.annotation')].map((g) => {
      const svg = g.closest('svg');
      const marks = svg ? markSel(svg) : [];
      const subj = g.querySelector('.annotation-subject rect, .annotation-subject circle, .annotation-subject path, .annotation-subject');
      const conn = g.querySelector('.annotation-connector path, .annotation-connector line');
      const note = g.querySelector('.annotation-note');
      const sb = subj ? r(subj) : null;
      const enclosed = sb ? marks.filter((m) => m.x >= sb.x - 0.5 && m.y >= sb.y - 0.5 && m.x + m.width <= sb.x + sb.width + 0.5 && m.y + m.height <= sb.y + sb.height + 0.5) : [];
      const deep = (a, b) => Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1;
      const touched = sb ? marks.filter((m) => deep(m, sb) || (m.width < 2 && m.x >= sb.x && m.x <= sb.x + sb.width && m.y >= sb.y - 1 && m.y + m.height <= sb.y + sb.height + 1)) : [];
      const tight = enclosed.length === 1 ? Math.max(enclosed[0].x - sb.x, enclosed[0].y - sb.y, sb.x + sb.width - enclosed[0].x - enclosed[0].width, sb.y + sb.height - enclosed[0].y - enclosed[0].height) : null;
      const connLen = conn ? (conn.getTotalLength ? conn.getTotalLength() : -1) : 0;
      const svgArea = svg ? r(svg).width * r(svg).height : 0;
      return {
        panel: svg && (svg.dataset.panel || svg.getAttribute('aria-label')?.slice(0, 30) || 'svg'),
        subjectTag: subj && subj.tagName,
        subject: sb,
        marksEnclosed: enclosed.length,
        marksTouched: touched.length,
        maxMarginPx: tight,
        subjectShareOfSvg: sb && svgArea ? +(sb.width * sb.height / svgArea).toFixed(3) : null,
        connectorLength: +connLen.toFixed(1),
        noteText: note ? note.textContent.trim() : '',
        noteWords: note ? note.textContent.trim().split(/\s+/).length : 0,
      };
    });

    // text density: visible leaves outside headings and the data table with > 5 words
    const wordy = [...document.querySelectorAll('body *')]
      .filter((el) => el.children.length === 0 && el.textContent.trim() && !el.closest('[hidden], table, h1, h2, script, style') && el.getBoundingClientRect().height > 0)
      .map((el) => el.textContent.trim())
      .filter((t) => t.split(/\s+/).length > 5 && !/\.(csv|json)\b/.test(t));
    const visibleChars = [...document.querySelectorAll('body *')]
      .filter((el) => el.children.length === 0 && !el.closest('[hidden], table, script, style') && el.getBoundingClientRect().height > 0)
      .reduce((n, el) => n + el.textContent.trim().length, 0);
    const panelTitles = [...document.querySelectorAll('h2')].map((el) => el.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const badTitles = panelTitles.filter((t) => t.split(/\s+/).length > 10 || /;/.test(t) || /,(?!\d)/.test(t));
    const keyNames = [...document.querySelectorAll('.status-key')].map((k) => k.textContent.replace(/\s+/g, ' ').trim());
    const strayStatus = [...document.querySelectorAll('body *')]
      .filter((el) => el.children.length === 0 && !el.closest('.status-key, [hidden], table, svg') && el.getBoundingClientRect().height > 0)
      .map((el) => el.textContent.trim()).filter((t) => /^(pass|fail|error)(\s*\d+)?$/i.test(t));
    const h1Text = (document.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim();
    const h1Words = h1Text ? h1Text.split(' ').length : 0;
    const scrollW = document.documentElement.scrollWidth;
    const body = document.body.innerText;
    return { h1Text, h1Words, keyNames, strayStatus, panelTitles, badTitles, wordy, visibleChars, texts: texts.length, textOverlaps, overlapPairs: overlapPairs.slice(0, 5), panels, annos, scrollW, hasLie: /lie factor/i.test(body), hasTimestamp: /timestamp/i.test(body), title: document.title };
  });
}

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${server.address().port}/${path.relative(root, file).split(path.sep).join('/')}`;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('response', (r) => { if (/\.(csv|json)(\?|$)/.test(r.url())) dataRequests.push({ url: r.url(), status: r.status() }); });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  const wide = await measure(page, 1280);
  await page.screenshot({ path: path.join(outDir, 'desktop.png'), fullPage: true });
  for (const [i, a] of wide.annos.entries()) {
    if (a.subject) await page.screenshot({ path: path.join(outDir, `anno-${i + 1}.png`), clip: { x: Math.max(0, a.subject.x - 160), y: Math.max(0, a.subject.y - 60), width: a.subject.width + 420, height: a.subject.height + 120 } });
  }
  const narrow = await measure(page, 420);

  // pinned info popover must not float on page scroll
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(url); await page.waitForTimeout(1500);
  let pop = null;
  const info = page.locator('button.info').first();
  if (await info.count()) {
    await info.click(); await page.waitForTimeout(300);
    const opened = await page.evaluate(() => { const p = [...document.querySelectorAll('.popover, [role="tooltip"], [role="status"]')].find((el) => el.getBoundingClientRect().height > 0 && !el.hidden); if (!p) return null; return { pos: getComputedStyle(p).position, top: p.getBoundingClientRect().top }; });
    await page.evaluate(() => window.scrollBy(0, 300)); await page.waitForTimeout(300);
    const afterScroll = await page.evaluate(() => { const p = [...document.querySelectorAll('.popover, [role="tooltip"], [role="status"]')].find((el) => el.getBoundingClientRect().height > 0 && !el.hidden); if (!p) return { open: false }; const b = p.getBoundingClientRect(); const icon = document.querySelector('button.info'); return { open: true, top: b.top, iconBottom: icon.getBoundingClientRect().bottom }; });
    pop = { opened, afterScroll };
    await page.keyboard.press('Escape');
  }

  // data table opens in view
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(url); await page.waitForTimeout(1500);
  const btn = page.getByRole('button', { name: /data table|table/i }).first();
  let tableInView = null; var tableColumns = 0;
  if (await btn.count()) {
    await btn.click(); await page.waitForTimeout(500);
    tableInView = await page.evaluate(() => {
      const t = [...document.querySelectorAll('table')].find((el) => el.getBoundingClientRect().height > 0);
      if (!t) return false;
      const b = t.getBoundingClientRect();
      return b.top >= 0 && b.top < window.innerHeight;
    });
    var tableColumns = await page.evaluate(() => { const t = [...document.querySelectorAll('table')].find((el) => el.getBoundingClientRect().height > 0); return t ? t.querySelectorAll('thead th, tr:first-child th, tr:first-child td').length : 0; });
  }

  // filter: change the first select to its second option; marks must transition and never duplicate
  let filt = null;
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(url); await page.waitForTimeout(2500);
  // filter control: a native select, or a pill opening a listbox of options with counts and bars
  const sel = page.locator('select').first();
  let panel = null;
  const toggle = page.locator('.filters-toggle, button[aria-expanded]').filter({ hasText: /filters/i }).first();
  if (await toggle.count()) {
    const collapsedBefore = await page.evaluate(() => { const p = document.querySelector('.filter-panel'); if (!p) return true; const cs = getComputedStyle(p); return p.hidden || cs.display === 'none' || cs.visibility === 'hidden'; });
    await toggle.click(); await page.waitForTimeout(400);
    panel = await page.evaluate(() => {
      const p = document.querySelector('.filter-panel'); if (!p) return null;
      const b = p.getBoundingClientRect();
      const lists = [...p.querySelectorAll('button[aria-haspopup="listbox"], .filter')].map((el) => el.textContent.trim());
      const ranges = [...p.querySelectorAll('.range')].map((el) => el.textContent.replace(/\s+/g, ' ').trim().slice(0, 40));
      return { height: b.height, lists, ranges, controls: lists.length + ranges.length };
    });
    if (panel) panel.collapsedBefore = collapsedBefore;
  }
  const pill = page.locator('button[aria-haspopup="listbox"], .filter').first();
  let listbox = null;
  if (!(await sel.count()) && (await pill.count())) {
    await pill.click(); await page.waitForTimeout(300);
    listbox = await page.evaluate(() => {
      const lb = document.querySelector('[role="listbox"]');
      if (!lb) return null;
      const b = lb.getBoundingClientRect();
      const opts = [...lb.querySelectorAll('[role="option"]')].map((o) => {
        const bar = o.querySelector('.opt-bar, [class*="bar"]');
        const ob = o.getBoundingClientRect();
        return { text: o.textContent.replace(/\s+/g, ' ').trim(), count: +(o.dataset.count ?? (o.textContent.match(/[\d,]+\s*$/) || [''])[0].replace(/,/g, '')), barW: bar ? bar.getBoundingClientRect().width : 0, rowW: ob.width };
      });
      return { inView: b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth, opts };
    });
  }
  if (listbox) {
    const snap = () => page.evaluate(() => {
      const svgs = [...document.querySelectorAll('svg')].filter((el) => el.getBoundingClientRect().height > 80);
      const marks = svgs.map((svg) => [...svg.querySelectorAll('.mark')]);
      const ids = marks.map((m) => m.map((el) => el.__data__ && (el.__data__.id ?? el.__data__.key ?? JSON.stringify(el.__data__).slice(0, 60))));
      const dup = ids.map((a) => a.length - new Set(a).size);
      const widths = marks.map((m) => m.slice(0, 3).map((el) => +el.getBoundingClientRect().width.toFixed(1)));
      const prov = [...document.querySelectorAll('body *')].filter((el) => el.children.length === 0 || el.querySelectorAll('*').length < 4).map((el) => el.textContent.replace(/\s+/g, ' ').trim()).find((t) => t.length < 80 && /\d of [\d,]+ rows/.test(t)) || '';
      return { counts: marks.map((m) => m.length), dup, widths, prov: prov.trim().slice(0, 60), h1: document.querySelector('h1')?.textContent.trim(), kpis: [...document.querySelectorAll('.kpi-value')].map((el) => el.textContent.trim()).slice(0, 4) };
    });
    let search = null;
    const sInput = page.locator('[role="listbox"] input[type="search"], input[type="search"]').first();
    if (await sInput.count()) {
      const total = await page.locator('[role="listbox"] [role="option"]').count();
      await sInput.fill('mongo'); await page.waitForTimeout(250);
      const shown = await page.evaluate(() => [...document.querySelectorAll('[role="listbox"] [role="option"]')].filter((o) => o.getBoundingClientRect().height > 0).map((o) => o.textContent.replace(/\s+/g, ' ').trim()));
      search = { total, shown, allMatch: shown.every((t) => /mongo/i.test(t) || /^all/i.test(t)) };
      await sInput.fill('');
    }
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    const before = await snap();
    await pill.click(); await page.waitForTimeout(300);
    const opt = page.locator('[role="listbox"] [role="option"]').nth(1);
    const optText = (await opt.textContent()).replace(/\s+/g, ' ').trim();
    await opt.click();
    const kpiSamples = [];
    for (let k = 0; k < 6; k++) { await page.waitForTimeout(60); kpiSamples.push(await page.evaluate(() => [...document.querySelectorAll('.kpi-value')].map((el) => el.textContent.trim()))); }
    const mid = await snap();
    await page.waitForTimeout(1200);
    const after = await snap();
    const reset = page.getByRole('button', { name: /reset/i });
    const resetShown = (await reset.count()) > 0 && (await reset.first().isVisible());
    const keyFiltered = await page.evaluate(() => [...document.querySelectorAll('.status-key')].map((k) => k.textContent.replace(/\s+/g, ' ').trim()));
    // pill position: flush right of the buttons row
    const pillBox = await page.evaluate(() => { const ps = [...document.querySelectorAll('.filters-toggle')]; const src = ps.length ? ps : [...document.querySelectorAll('button[aria-haspopup="listbox"], .filter')]; const r = Math.max(...src.map((p) => p.getBoundingClientRect().right)); return { x: 0, width: r }; });
    const pageW = await page.evaluate(() => document.querySelector('h1').parentElement.getBoundingClientRect().right);
    if (resetShown) { await reset.first().click(); await page.waitForTimeout(1200); }
    const back = await snap();
    // longest listbox: height cap, internal scroll, closes on page scroll
    const pills = page.locator('button[aria-haspopup="listbox"], .filter');
    let longest = null;
    for (let i = 0; i < (await pills.count()); i++) {
      await pills.nth(i).click(); await page.waitForTimeout(300);
      const m = await page.evaluate(() => {
        const lb = document.querySelector('[role="listbox"]'); if (!lb) return null;
        const b = lb.getBoundingClientRect();
        return { n: lb.querySelectorAll('[role="option"]').length, top: b.top, bottom: b.bottom, height: b.height, scrollH: lb.scrollHeight, clientH: lb.clientHeight, pos: getComputedStyle(lb).position };
      });
      if (m && (!longest || m.n > longest.n)) {
        const lbEl = page.locator('[role="listbox"]').first();
        const box = await lbEl.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, 200); await page.waitForTimeout(200);
        const scrolledInside = await page.evaluate(() => document.querySelector('[role="listbox"]')?.scrollTop || 0);
        await page.evaluate(() => window.scrollBy(0, 300)); await page.waitForTimeout(300);
        const afterPageScroll = await page.evaluate(() => { const lb = document.querySelector('[role="listbox"]'); if (!lb || lb.hidden || getComputedStyle(lb).display === 'none' || lb.getBoundingClientRect().height === 0) return { open: false }; const p = document.querySelector('[aria-expanded="true"]'); return { open: true, top: lb.getBoundingClientRect().top, pillBottom: p ? p.getBoundingClientRect().bottom : null }; });
        await page.evaluate(() => window.scrollTo(0, 0));
        longest = { ...m, scrolledInside, afterPageScroll, viewportH: 900 };
      }
      await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    }
    // range slider: keyboard-move the first handle, expect the printed end and the row count to change
    let slider = null;
    const handle = page.locator('.range [role="slider"]').first();
    if (await handle.count()) {
      const endsBefore = await page.locator('.range .range-ends').first().textContent();
      const provBefore = (await snap()).prov;
      await handle.focus();
      for (let k = 0; k < 15; k++) await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(1300);
      const endsAfter = await page.locator('.range .range-ends').first().textContent();
      const s2 = await snap();
      const r2 = page.getByRole('button', { name: /reset/i });
      const resetAfterSlider = (await r2.count()) > 0 && (await r2.first().isVisible());
      if (resetAfterSlider) { await r2.first().click(); await page.waitForTimeout(1300); }
      const hist = await page.evaluate(() => { const r = document.querySelector('.range'); const bars = [...r.querySelectorAll('rect, .bin, [class*="bin"]')].map((el) => el.getBoundingClientRect().height).filter((h) => h > 0.5); return { bins: bars.length, tall: bars.filter((h) => h > 2).length }; });
      slider = { endsBefore: endsBefore.trim(), endsAfter: endsAfter.trim(), provBefore, provAfter: s2.prov, counts: s2.counts, dup: s2.dup, resetAfterSlider, hist };
    }
    filt = { option: optText, before, mid, after, back, resetShown, keyFiltered, listbox, longest, kpiSamples, panel, search, slider, pillRight: pillBox ? pillBox.x + pillBox.width : 0, pageRight: pageW };
  } else if (await sel.count()) {
    const snap = () => page.evaluate(() => {
      const svgs = [...document.querySelectorAll('svg')].filter((el) => el.getBoundingClientRect().height > 80);
      const marks = svgs.map((svg) => [...svg.querySelectorAll('.mark')]);
      const ids = marks.map((m) => m.map((el) => el.__data__ && (el.__data__.id ?? el.__data__.key ?? JSON.stringify(el.__data__).slice(0, 60))));
      const dup = ids.map((a) => a.length - new Set(a).size);
      const widths = marks.map((m) => m.slice(0, 3).map((el) => +el.getBoundingClientRect().width.toFixed(1)));
      const prov = [...document.querySelectorAll('body *')].filter((el) => el.children.length === 0 || el.querySelectorAll('*').length < 4).map((el) => el.textContent.replace(/\s+/g, ' ').trim()).find((t) => t.length < 80 && /\d of [\d,]+ rows/.test(t)) || '';
      return { counts: marks.map((m) => m.length), dup, widths, prov: prov.trim().slice(0, 60), h1: document.querySelector('h1')?.textContent.trim(), kpis: [...document.querySelectorAll('.kpi-value, [class*="kpi"] [class*="value"]')].map((el) => el.textContent.trim()).slice(0, 4) };
    });
    const before = await snap();
    const options = await sel.locator('option').allTextContents();
    await sel.selectOption({ index: 1 });
    await page.waitForTimeout(120);
    const mid = await snap();
    await page.waitForTimeout(1200);
    const after = await snap();
    const reset = page.getByRole('button', { name: /reset/i });
    const resetShown = (await reset.count()) > 0 && (await reset.first().isVisible());
    if (resetShown) { await reset.first().click(); await page.waitForTimeout(1200); }
    const back = await snap();
    const keyFiltered = await page.evaluate(() => [...document.querySelectorAll('.status-key')].map((k) => k.textContent.replace(/\s+/g, ' ').trim()));
    filt = { option: options[1], before, mid, after, back, resetShown, keyFiltered };
  }

  const verdict = [];
  const chk = (ok, msg) => verdict.push((ok ? 'PASS ' : 'FAIL ') + msg);
  chk(errors.length === 0, `page errors: ${errors.length}`);
  const html = fs.readFileSync(file, 'utf8');
  const embedded = /<script[^>]*type=["']text\/csv["']/.test(html) || html.length > 400000;
  chk(dataRequests.some((r) => r.status === 200), `data fetched at runtime: ${JSON.stringify([...new Set(dataRequests.map((r) => r.url.replace(/^.*\/\/[^/]+/, '') + ' ' + r.status))].slice(0, 3))}`);
  chk(!embedded, `no embedded rows (html ${(html.length / 1024).toFixed(0)} KB)`);
  chk(!/<script[^>]*src=["']https?:/.test(html), 'no external script URLs');
  chk(!wide.hasLie, 'no "lie factor" on page');
  chk(!wide.hasTimestamp, 'no "timestamp" on page');
  chk(wide.textOverlaps === 0, `text overlaps at 1280: ${wide.textOverlaps} ${JSON.stringify(wide.overlapPairs)}`);
  chk(narrow.textOverlaps === 0, `text overlaps at 420: ${narrow.textOverlaps} ${JSON.stringify(narrow.overlapPairs)}`);
  chk(narrow.scrollW <= 420, `no horizontal scroll at 420 (scrollWidth ${narrow.scrollW})`);
  verdict.push(`INFO chart svgs found: ${wide.panels.length}`);
  chk(wide.annos.length >= 1 && wide.annos.length <= wide.panels.length, `annotations: ${wide.annos.length}`);
  for (const a of wide.annos) {
    chk(a.marksEnclosed === 1 && a.marksTouched === 1, `[${a.panel}] subject encloses exactly one mark (enclosed ${a.marksEnclosed}, touched ${a.marksTouched})`);
    chk(a.maxMarginPx !== null && a.maxMarginPx <= 4, `[${a.panel}] subject margin <= 4px (${a.maxMarginPx})`);
    chk(a.subjectShareOfSvg !== null && a.subjectShareOfSvg < 0.15, `[${a.panel}] subject is small (${a.subjectShareOfSvg} of svg area)`);
    chk(a.noteWords <= 5, `[${a.panel}] note "${a.noteText}" ${a.noteWords} words`);
    verdict.push(`INFO [${a.panel}] subject <${a.subjectTag}>, connector length ${a.connectorLength}`);
  }
  chk(tableInView === true, `data table opens in viewport (${tableInView})`);
  if (pop && pop.opened) {
    chk(pop.opened.pos !== 'fixed', `info popover not position:fixed (${pop.opened.pos})`);
    chk(!pop.afterScroll.open || Math.abs(pop.afterScroll.top - pop.afterScroll.iconBottom) < 12, `page scroll closes the pinned popover or keeps it under its icon: ${JSON.stringify(pop.afterScroll)}`);
  }
  if (filt) {
    const moved = filt.mid.widths.some((w, i) => JSON.stringify(w) !== JSON.stringify(filt.after.widths[i]));
    chk(true, `filter applied: "${filt.option}" marks ${filt.before.counts} -> ${filt.after.counts}`);
    chk(filt.after.dup.every((d) => d === 0), `no duplicate mark ids after filter: ${filt.after.dup}`);
    chk(JSON.stringify(filt.before.counts) !== JSON.stringify(filt.after.counts) || JSON.stringify(filt.before.kpis) !== JSON.stringify(filt.after.kpis), `page recomputed on filter (kpis ${filt.before.kpis} -> ${filt.after.kpis})`);
    chk(filt.before.h1 === filt.after.h1, `page title fixed across filters ("${filt.before.h1}" -> "${filt.after.h1}")`);
    chk(moved, `marks were mid-transition 120 ms after the filter (widths ${JSON.stringify(filt.mid.widths)} vs settled ${JSON.stringify(filt.after.widths)})`);
    chk(/of [\d,]+ rows/.test(filt.after.prov), `provenance shows filtered of total: "${filt.after.prov}"`);
    chk(filt.resetShown, 'Reset control visible while filtered');
    chk(JSON.stringify(filt.keyFiltered) === JSON.stringify(wide.keyNames), `status key unchanged by filter: ${JSON.stringify(filt.keyFiltered)}`);
    if (filt.panel) {
      chk(filt.panel.collapsedBefore, 'filter panel collapsed by default (hidden, not clipped)');
      chk(filt.panel.height > 20, `filter panel opens (height ${filt.panel.height.toFixed(0)})`);
      chk(filt.panel.controls >= 3, `one control per column (${filt.panel.controls} controls; table shows ${tableColumns || '?'} columns, derived ones included): listboxes ${JSON.stringify(filt.panel.lists)} + ranges ${JSON.stringify(filt.panel.ranges)}`);
      chk(filt.panel.ranges.length >= 1, 'numeric column has a range slider');
    } else { chk(false, 'no Filters toggle / panel found'); }
    if (filt.search) chk(filt.search.shown.length < filt.search.total && filt.search.allMatch && filt.search.shown.length > 0, `search narrows options: ${filt.search.total} -> ${filt.search.shown.length}, all match ${filt.search.allMatch}`);
    else chk(false, 'no search field in the listbox');
    if (filt.slider) {
      chk(filt.slider.endsAfter !== filt.slider.endsBefore, `slider handle moves the printed end: "${filt.slider.endsBefore}" -> "${filt.slider.endsAfter}"`);
      chk(filt.slider.provAfter !== filt.slider.provBefore && /of [\d,]+ rows/.test(filt.slider.provAfter), `slider release re-filters the page: "${filt.slider.provAfter}"`);
      chk(filt.slider.dup.every((d) => d === 0), `no duplicate mark ids after slider: ${filt.slider.dup}`);
      chk(filt.slider.resetAfterSlider, 'Reset appears after a slider change');
      chk(filt.slider.hist.tall >= 4, `histogram shows a shape (${filt.slider.hist.tall} of ${filt.slider.hist.bins} bins taller than 2px)`);
    } else { chk(false, 'no range slider handle found'); }
    if (filt.kpiSamples) {
      const decimals = (t) => { const m = t.match(/\d+\.(\d+)/); return m ? m[1].length : 0; };
      const finals = filt.after.kpis;
      const bad = [];
      filt.kpiSamples.forEach((sample) => sample.forEach((t, i) => { if (decimals(t) > Math.max(1, decimals(finals[i] || ''))) bad.push(t); }));
      chk(bad.length === 0, `tweened KPI numerals stay rounded (${filt.kpiSamples.length} samples): ${JSON.stringify(bad.slice(0, 5))} · seen ${JSON.stringify(filt.kpiSamples.map((x) => x.join(' | ')).slice(0, 3))}`);
    }
    if (filt.listbox) {
      const o = filt.listbox.opts;
      const withCounts = o.filter((x) => x.count > 0);
      const max = Math.max(...withCounts.map((x) => x.count));
      const bars = withCounts.filter((x) => !/^all/i.test(x.text));
      const maxBar = Math.max(...bars.map((x) => x.count));
      const proportional = bars.every((x) => x.barW > 0 && Math.abs(x.barW / (bars.find((y) => y.count === maxBar).barW) - x.count / maxBar) < 0.05);
      chk(filt.listbox.inView, 'listbox opens inside the viewport');
      chk(o.length >= 3 && withCounts.length >= 2, `listbox options carry counts: ${o.slice(0, 4).map((x) => x.text).join(' | ')}`);
      chk(proportional, `option bars proportional to counts (max ${maxBar}): ${bars.slice(0, 4).map((x) => `${x.count}:${x.barW.toFixed(0)}px`).join(', ')}`);
      const sorted = bars.every((x, i) => i === 0 || bars[i - 1].count >= x.count);
      chk(sorted, 'options sorted by count desc');
      const L = filt.longest;
      if (L) {
        chk(L.pos !== 'fixed', `listbox not position:fixed (${L.pos})`);
        chk(L.height <= 321 && L.bottom <= L.viewportH && L.top >= 0, `longest listbox (${L.n} options) capped and in view: height ${L.height.toFixed(0)}, bottom ${L.bottom.toFixed(0)} of ${L.viewportH}`);
        chk(L.scrollH <= L.clientH + 1 || L.scrolledInside > 0, `wheel scrolls inside the listbox (scrollTop ${L.scrolledInside}, content ${L.scrollH} in ${L.clientH})`);
        chk(!L.afterPageScroll.open || (L.afterPageScroll.pillBottom !== null && Math.abs(L.afterPageScroll.top - L.afterPageScroll.pillBottom) < 12), `page scroll closes the listbox or keeps it anchored to its pill: ${JSON.stringify(L.afterPageScroll)}`);
      }
      chk(filt.pillRight >= filt.pageRight - 40, `Filters toggle flush right (right ${filt.pillRight.toFixed(0)} vs page right ${filt.pageRight.toFixed(0)})`);
    }
    chk(JSON.stringify(filt.back.counts) === JSON.stringify(filt.before.counts) && filt.back.dup.every((d) => d === 0), `reset restores counts ${filt.before.counts} -> ${filt.back.counts}, dups ${filt.back.dup}`);
  } else {
    chk(false, 'no select filter found on the page');
  }
  chk(wide.keyNames.length === 1, `one page-level status key: ${JSON.stringify(wide.keyNames)}`);
  chk(wide.strayStatus.length === 0, `no panel legend entries outside the key: ${JSON.stringify(wide.strayStatus)}`);
  chk((wide.h1Words || 0) <= 4 && !/\d/.test(wide.h1Text || ''), `page title is a plain name, <= 4 words, no numbers: "${wide.h1Text}"`);
  chk(wide.badTitles.length === 0, `panel titles one clause, <= 10 words: ${wide.badTitles.length} bad ${JSON.stringify(wide.badTitles)}`);
  verdict.push(`INFO visible characters outside the table: ${wide.visibleChars}`);
  chk(wide.wordy.length === 0, `lines over 5 words outside headings: ${wide.wordy.length} ${JSON.stringify(wide.wordy.slice(0, 8))}`);
  console.log(`title: ${wide.title}`);
  console.log(`screenshots: ${outDir}`);
  console.log(`panels: ${wide.panels.map((p) => `${p.panel}(${p.marks} marks)`).join(', ')}`);
  console.log(verdict.join('\n'));
  if (errors.length) console.log(errors.join('\n'));
  await browser.close();
  server.close();
  process.exit(verdict.some((v) => v.startsWith('FAIL')) ? 1 : 0);
})();
