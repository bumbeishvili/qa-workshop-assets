# Blind run: how the shipped reports were generated

Two prompts are involved. The **user prompt** (`PROMPT.txt`) is the
three-block prompt from SKILL.md, filled in per sample; both are in
`PROMPTS.md`. The **agent instruction** below is what the coordinating
session gave a fresh subagent that could see nothing but the sandbox.

## Sandbox layout

```
<sandbox>/
├─ qa-dataviz-skill/      copy of this skill directory
├─ samples/runs_real.csv  the sample (or coverage_real.json)
├─ vendor/                d3.v7.min.js, d3-annotation.min.js,
│                         jspdf.umd.min.js, svg2pdf.min.js
├─ PROMPT.txt             the user prompt from PROMPTS.md
└─ out/                   empty; the agent writes index.html here
```

The layout mirrors the repo, so a page written to `out/` loads
`../samples/<file>` and `../vendor/<lib>` by relative path and can be
copied into `report/` unchanged. The page fetches its data at runtime
and embeds nothing; serve the sandbox (`python3 -m http.server 8123`)
and open `http://127.0.0.1:8123/out/index.html`, since `file://` blocks
fetch.

Playwright must be installed globally (`npm i -g playwright` and
`npx playwright install chromium`); the agent runs its scripts with
`NODE_PATH="$(npm root -g)"`.

## Agent instruction, verbatim (runs_real.csv, the last run shipped)

Replace `<sandbox>` with the absolute path.

```
You are an AI session with exactly one skill installed and NO other context. Work entirely inside <sandbox> — do not read anything outside that directory.

Your installed skill is at ./qa-dataviz-skill/. Start by reading qa-dataviz-skill/SKILL.md in full and follow it exactly — its workflow, hard rules, Claims section, and all 22 self-check items. reference/page-design.md is binding in every detail: tokens (its status colors are the report page's palette), page structure, serif title, boxless KPI row with donut micro-marks on share values, tinted marks, the Filters section in full (a Filters toggle pill flush right on the buttons row opening a collapsible panel; one control per column of the file, typed by the column: a searchable listbox with count bars for a categorical column, a range slider with a 20-bin histogram for a numeric column; Reset pill while any filter is active; listboxes anchored to their pills with a height cap; counts computed over the other filters; 500 ms keyed transitions; tweened numerals snapped to their final precision on every frame; provenance counts filtered of total), the Legends section (one page-level status key, no panel legends), form richness, the Info icons section (exact SVG markup and popover styling, popovers anchored to their icons and closed by page scroll; popovers, listboxes, the search field, the slider and the panel out of the PDF), and the text budget (one-clause panel titles of at most 10 words; rounded units; stat names of at most 3 words; each fact once; no "lie factor" phrase). reference/annotations.md governs every annotation: d3-annotation presets (inline vendor/d3-annotation.min.js), subject enclosing exactly one mark plus 2px, under 15% of the panel, never the dominant mark and never a mark under 2px, note beside the subject with the connector disabled when there is room. DATA-01: the data table opens in view or as an overlay, and a download-PDF button sits beside the data buttons. d3/README.md and d3/template.js govern chart code (use _add with enterTransition/exitTransition, keyed by id), writing.md all text, verify/ the verification.

The user's request is in PROMPT.txt — note it contains NO presentation instructions; every craft, motion, text, filter and interaction rule comes from your skill alone. It asks four questions; the fourth (what the data records wrongly) deserves its own panel. The data file is samples/runs_real.csv; from out/index.html its relative path is ../samples/runs_real.csv, and the page must load it at runtime with d3.csv from that path — never embed the rows. Its columns are exactly the ones PROMPT.txt names; claim only what those columns hold. Every one of those columns is a filter, status included: a filter that empties a panel shows that panel's title muted with "no rows", per the skill.

Deliverable: one HTML page at out/index.html. It loads d3.v7.min.js, d3-annotation.min.js, jspdf.umd.min.js and svg2pdf.min.js from ../vendor/ by relative script src and the data from ../samples/ with d3.csv; no external URLs, nothing inlined. Serve the sandbox with python3 -m http.server on a free port and drive http://127.0.0.1:<port>/out/index.html in verification; file:// blocks fetch. Reviewer hooks: every chart svg carries a data-panel attribute; every data mark (bar rect, cell rect, dot circle, segment rect) has the class "mark" and a datum with an id field; the Filters toggle is a button with class "filters-toggle" and aria-expanded; the panel has the class "filter-panel"; each listbox pill is a button with class "filter" and aria-haspopup="listbox"; each option has role="option", a data-count attribute, and a child with class "opt-bar"; each listbox search input is type="search"; each range slider control has the class "range" with two role="slider" handles and a child with class "range-ends" holding the printed ends; the Reset button's accessible name is "Reset"; KPI value elements have the class "kpi-value"; the page status key has the class "status-key".

Do not skip: workflow step 2 (analyze the CSV yourself with python3 and verify every number in the prompt before using it), step 5 (print the self-check verdict, one line per all 22 items, in your final answer), and step 6 (verify by measurement with a throwaway playwright script — run with NODE_PATH="$(npm root -g)" node yourscript.cjs — everything the Filters section's "Verify by measurement" paragraph lists, plus page errors, overlapping text boxes, text outside its svg, the annotation subject containing exactly one mark within 4px and under 15% of its panel, every info icon a focusable button whose anchored popover opens in view and closes on page scroll, the data table opening inside the viewport, the PDF containing the visible text and none of the popover, listbox, search or slider text or the phrase "lie factor", and a 420px viewport). Save a full-page desktop screenshot to out/desktop.png, the panel open to out/panel.png, a listbox open with a search term typed to out/listbox.png, the slider narrowed to out/slider.png, the filtered state to out/filtered.png, and a close-up crop of each annotation to out/anno-N.png. Audit every visible sentence against the text budget. Fix what verification finds and re-run the same script before finishing.

Final answer: the self-check verdict (22 lines), the text audit including every visible control label, the control type chosen for each column and why, for each annotation its preset and the single mark it encloses, the last clean verification measurements including the panel, search, slider, listbox and tween numbers, and any item you could not satisfy with the reason.
```

For `coverage_real.json` the same instruction was used with these
substitutions: the data file line reads "The data file is
samples/coverage_real.json, loaded at runtime with d3.json from
../samples/coverage_real.json: its root node holds children, a flat list of
all 76 directories at every depth, each with path, loc and covered_pct
and no children of their own. Flatten to one row per directory with
path, depth (slashes in path), loc and covered_pct for the table, the
filters and the charts, and respect the prompt's rule that rows at
different depths overlap. Every column of that flattened table is a
filter, per the skill."; the fourth question is "what the file counts
more than once"; and the reviewer-hook sentence names treemap cell
rects among the marks.

Later fixes were sent to the same agent as follow-up messages, each
one quoting the rule that had changed in the skill; the shipped pages
are the state after those messages. The rules they carried are all in
the skill now, so a fresh run starts from the same rules.

## What the instruction adds beyond the skill

The second paragraph restates rules that already live in SKILL.md and
page-design.md. It exists because early runs missed rules that were
only in the reference files. The reviewer hooks (class names and
attributes) exist only so `verify/report-checks.cjs` can measure the
page; they are not part of the skill's rules.

A stricter test of the skill alone is the minimal instruction:

```
You are an AI session with exactly one skill installed and NO other context. Work entirely inside <sandbox>.

Your installed skill is at ./qa-dataviz-skill/. Read qa-dataviz-skill/SKILL.md in full and follow it, including every reference file it names and all 22 self-check items.

The user's request is in PROMPT.txt. The data file is in samples/; the libraries are in vendor/. Deliver one HTML page at out/index.html that loads both by relative path at runtime (../samples/<file> with d3.csv or d3.json, ../vendor/<lib> by script src) and embeds nothing, plus out/desktop.png. Serve the sandbox over http for verification.

Do not skip workflow steps 2, 5 and 6. Final answer: the self-check verdict, one line per item, and the last clean verification measurements.
```

If a page built from the minimal instruction fails a rule that the full
instruction's restatement would have caught, the fix belongs in the
skill text, not in the instruction.

## Reviewing the result

```
NODE_PATH="$(npm root -g)" node qa-dataviz-skill/verify/report-checks.cjs <sandbox>/out/index.html
NODE_PATH="$(npm root -g)" node qa-dataviz-skill/verify/report-checks.cjs report/runs-report.html .
```

The script serves the second argument (default: the page's parent's
parent) over http on a free port, so `../samples` and `../vendor`
resolve, and asserts the data request returned 200 and no rows are
embedded. Screenshots go to a temp folder unless `CHECKS_OUT` names
one. Exit 1 on any FAIL line. The hooks above are what it looks for; without
them several checks report as failures rather than passes.
