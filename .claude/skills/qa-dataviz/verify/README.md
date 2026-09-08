# Verification by measurement

A report page is verified by a throwaway Playwright script that renders
it, measures it, and compares what it shows against the data file. Copy
`template.cjs`, fill in `check()`, run it, fix what it names, and run the
same script again. `report-checks.cjs` is the reviewer's pass over a
finished page.

## Setup

- Playwright, once per machine: `npm i -g playwright && playwright install chromium`
- Run scripts with the global root on the path: `NODE_PATH="$(npm root -g)" node check.cjs`
- Serve the folder that holds the page, its data file and its libraries
  over http (`python3 -m http.server <port>`) and open the page by URL.
  `file://` blocks the data fetch.
- Headless. Nobody watches the window in this workflow; a screenshot per
  state is the record.

## The loop

1. **Measure.** Read real values out of the rendered page: bounding
   boxes, text content, attributes, element counts.
2. **Compare against ground truth.** Compute the same number from the
   data file in Node (read the CSV or JSON, count, sum, take the median)
   and assert the page shows it. A check against your own expectation
   tests the expectation.
3. **Validate the measurement** on a case whose answer is known before
   trusting it on the unknown one. A wrong measuring function produces a
   consistent, convincing, fake signal.
4. **Fix** the smallest thing the measurement names, then re-run the
   same script. Only the script that found the failure can show it gone.
5. **Report** what was measured, the numbers, and what remains
   unverified. An unnamed gap reads as verified.

## Capture before the first `goto`

```js
page.on('console', m => { if (m.type() === 'error') problems.push(m.text()); });
page.on('pageerror', e => problems.push(e.message));
page.on('requestfailed', r => problems.push(`${r.url()} ${r.failure()?.errorText}`));
page.on('response', r => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`); });
```

A failed data request or a thrown handler names the failing file and
line; read these before forming a theory about a visual symptom.

## Wait on a condition

```js
await page.waitForFunction(() => document.querySelectorAll('svg .mark').length > 0);
await page.waitForResponse(r => r.url().endsWith('.csv') && r.ok());
```

A fixed `waitForTimeout` is a guess that passes on one machine and hides
a race on another; use it only as the interval inside a poll loop.

## Measurement traps

- `boundingBox()` is page space; SVG `getBBox()` is the element's local
  space. Convert before comparing the two.
- Screenshot pixels may be 2× CSS pixels; divide by the device pixel
  ratio.
- One sample proves nothing. Sample every text box, every mark, and
  report the count of failures and the worst case.

## What the self-check list makes measurable

- No two text boxes intersect; no text sits outside its svg or the
  frame; at 1280 px and at 420 px.
- Each annotation subject contains exactly one mark's box, within 4 px
  on each side, under 15% of the panel's plot; its connector crosses no
  mark and no text box.
- The data table opens inside the viewport when its button is clicked.
- Filters: one control per column; the longest listbox sits inside the
  viewport and is at most 320 px tall; typing in its search narrows the
  rows; moving a slider handle changes the printed end and, on release,
  the marks and the provenance count; during a transition no numeral
  shows more decimals than its final value; mark counts after a filter
  equal the filtered distinct ids; Reset restores the original counts.
- Every info icon is a focusable button whose popover opens in view and
  closes on page scroll.
- The PDF reopens with the visible text (`pdftotext`) and without
  popover, listbox, search or slider text, and without the phrase "lie
  factor".

## report-checks.cjs

```
NODE_PATH="$(npm root -g)" node verify/report-checks.cjs /abs/path/index.html [server-root]
```

It serves `server-root` (default: the page's parent's parent) over http
so `../samples` and `../vendor` resolve, asserts the data request
returned 200 and no rows are embedded, runs the measurements above at
1280 and 420 px, and exits 1 on any FAIL line. Screenshots go to a temp
folder unless `CHECKS_OUT` names one.

It finds elements by these hooks, so a page carries them:

- every chart svg: a `data-panel` attribute
- every data mark (bar rect, cell rect, dot circle, segment rect): class
  `mark` and a datum with an `id` field
- the Filters toggle: a button with class `filters-toggle` and
  `aria-expanded`; the panel: class `filter-panel`
- each listbox pill: a button with class `filter` and
  `aria-haspopup="listbox"`; each option: `role="option"`, a
  `data-count` attribute, a child with class `opt-bar`; the search
  input: `type="search"`
- each range slider: class `range`, two `role="slider"` handles, a
  child with class `range-ends` holding the printed ends
- the Reset button's accessible name: `Reset`
- KPI values: class `kpi-value`; the page status key: class `status-key`
