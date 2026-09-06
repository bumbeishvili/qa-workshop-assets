---
name: qa-dataviz
description: Build, prompt for, verify and review QA data visualizations (test runs, defects, coverage) with D3. Use when asked to chart test results, flakiness, durations, coverage or defect flow, to analyze a QA data file and report findings, to write a prompt that turns a data file into a report, or to critique a chart or the text around it. Enforces anti-pattern rules and data-grounded claims; carries the reusable D3 Chart convention (d3/), Playwright measurement verification (verify/), and prose rules (writing.md); ships canonical schemas, a JUnit XML parser, a fixed status palette, and real sample data.
---

# QA data visualization

Rules for producing decision-grade charts of testing data, the claims
around them, and the prompts that generate them. Every chart passes the
self-check list below before it is shown. Nothing here is stylistic
preference; each rule blocks a specific documented misreading.

Three sub-guides travel with this skill and are part of it:

- **[`d3/`](d3/README.md)** — the reusable D3 Chart-class convention:
  chainable state, `_add()` enter/exit/update, responsive sizing. Start
  new charts from `d3/template.js`.
- **[`verify/`](verify/README.md)** — verification by measurement with
  throwaway Playwright scripts: reproduce, measure against ground truth,
  fix, re-run the same script.
- **[`writing.md`](writing.md)** — prose rules for every word a reader
  sees: findings, titles, captions, notes, chat replies, docs.

## Workflow (always in this order)

1. **Identify the QA question, not the chart named.** "Make a pie chart of
   failures" names a chart; the question underneath might be "which failures
   share a cause?" If the named chart conflicts with the question, say so
   before building (see Conflicts below).
2. **Analyze the data before claiming anything about it.** Compute from the
   rows; tier every statement per the Claims section. Parse input to a
   canonical shape — `reference/schemas.md`. JUnit XML goes through
   `scripts/parse_junit.py`, which also emits explicit gap records for
   missing periods. Never chart a raw export directly.
3. **Choose the chart** from `reference/chart-selection.md` and state which
   row picked it.
4. **Build.**
   - The page follows `reference/page-design.md`: its tokens, type scale,
     layout, mark specs, form-richness rule, and text budget.
   - C-1: the chart re-renders on new data without duplicating elements and
     is a function of (container, data, options). The Chart-class convention
     in `d3/` is the reference implementation; start from `d3/template.js`.
   - C-2: print provenance on the page itself: data source, window, N.
     Compute the lie factor and report it in the build report — the phrase
     never appears on the page; a report announcing its own honesty reads
     as generated, and the honesty is visible in the zero-based axes.
   - Status colors are the page-design tokens on the report page and
     `reference/palette.md` elsewhere — one fixed lookup by status value,
     never a library default cycle.
   - A panel title states the finding, with numbers — not the chart
     type. "87% of the test time buys nothing", not "Test time by
     module". The page title is the opposite: a plain name for the
     report ("Test run report"), no numbers; the top finding is the
     first KPI, and the file name lives in the provenance line.
   - Marks animate in once on first render — bars grow from the baseline,
     dots slide to position, cells fade in, staggered by a few tens of
     milliseconds. A filter change transitions: exit shrinks and fades,
     update moves, enter grows, 500 ms, keyed by id. A resize draws
     instantly (track a firstRender flag, as `d3/template.js` does; pass
     `enterTransition`/`exitTransition` to `_add`).
   - Every column of the file is a filter, per
     `reference/page-design.md` (Filters): a `Filters` toggle flush
     right on the buttons row opens a collapsible panel with one
     control per column — a searchable listbox with count bars for a
     categorical column, a range slider with a histogram for a numeric
     one — and a `Reset` pill while any is active. Every number and
     mark below the buttons row is a function of the rows passing all
     filters; the page title is a plain name and stays fixed; the provenance line counts filtered rows against the file.
   - Every sentence on the page passes writing.md. Notes explain the
     encoding in one sentence; sentences about the page's own machinery
     ("this page computes...", "charts re-render on...") stay off the page.
   - The page opens with a KPI row: three or four headline numbers, each
     a finding (value, one-line sub, a quieter second line for context),
     before any chart. A reader who stops there has the answers.
   - An annotation points at a finding the title and labels cannot carry
     alone — at most one per panel, a single bold line ("0 passes in 240"
     at the bar that owns them), built with d3-annotation using the
     preset `reference/annotations.md` assigns to the mark: a rect
     subject encloses one bar or one cell, a circle encloses one point,
     a threshold line is a level. The subject is one mark plus 2px,
     never a group of marks and never a mark that dominates the panel;
     a ring never sits on a filled mark. The note sits beside its subject when there is room; a leader
     is drawn only when it cannot, through empty space, never across
     other marks. Detail beyond that line lives in the mark's tooltip or
     the panel's info icon. Titles state findings; annotations point at
     them.
   - The page loads its data at runtime — `d3.csv` / `d3.json` from a
     relative path to the file beside it — and never embeds the rows in
     the HTML; the download button links to that same file. Libraries
     load from relative `<script src>` paths too. A page that fetches
     needs an http origin (`python3 -m http.server`), so verification
     serves the folder instead of opening `file://`.
   - The reader can open the data from the page: a data button that shows
     the rows as a table, or downloads the source file. The table appears
     where the reader is — an overlay, or scrolled into view on open; a
     table appended below the fold reads as a dead button. A page that
     names its source lets the reader reach it. A download-PDF button
     sits beside the data buttons.
   - Every chart svg carries role="img" and an aria-label that states the
     panel's finding in a sentence. Identity is readable without color:
     the name sits on or beside the mark, and one page-level status key
     names the colors once (page-design.md, Legends); no panel legends.
   - The page stays readable at narrow widths: label gutters shrink before
     the plot area does, and chart widths clamp at a floor instead of going
     negative. The verified minimum width goes in the build report — the
     page itself carries no builder notes.
5. **Self-check.** Verify A-1..A-8 and C-1..C-2, printing one pass/fail line
   per rule. Fix any failure and re-check before presenting.
6. **Verify by measurement** (`verify/`): render the real page and assert —
   no text bounding boxes intersect, nothing exceeds the frame, every
   reveal stage renders, exports reopen with text intact (`pdftotext` for
   PDF). Re-run the same script after each fix.

## Hard rules

Full text, detection steps, and fixes: `reference/anti-patterns.md`.

- **A-1** Zero-based axes for rates and counts; a non-zero base requires a
  labeled threshold and an axis annotation.
- **A-2** Size encodings map value to area, never radius — and sorted bars
  beat bubbles anyway.
- **A-3** Durations render as distributions or quantile bands (alert on
  p95), never a lone mean.
- **A-4** Missing periods break the line and render as labeled shaded
  bands; never bridge a gap.
- **A-5** A time dimension bans pies; composition over time is stacked bars
  or area.
- **A-6** No dual y-axes; index both series to a baseline or use aligned
  panels.
- **A-7** Status colors are semantic and colorblind-safe (Okabe–Ito, fixed
  mapping in `reference/palette.md`), never assigned by series order.
- **A-8** Ranking questions get value-sorted categories; alphabetical order
  is reserved for lookup.
- **C-1** Chart code re-renders on new data without duplicating elements;
  a function of (container, data, options). Reference implementation: `d3/`.
- **C-2** Source, window, and N are printed on the chart.

## Claims

Everything the reader can see — findings, chart titles, captions, KPI
labels — holds only claims computable from the data the reader holds.
Where the data came from is told, not derived: it belongs in the source
line and the speaker notes, phrased as provenance, and stays out of the
findings.

- **Three tiers, kept apart.** A fact is computed from the rows and carries
  its computation. An inference states its evidence and the alternatives
  that remain: two adjacent near-identical rows support "recorded twice";
  "retried" needs an attempt column the file lacks. An unknown is named as
  one. On-screen text shows facts; notes may carry the rest.
- **Blind-agent test.** To find claims that lean on outside knowledge, give
  a fresh agent the data file alone — copied to a neutral path, no project
  access, told nothing about the file's origin — and ask for facts,
  inferences and unknowns, each with its computation. A claim the blind
  agent files under unknowns moves to the notes or gets reworded to what it
  did derive. A time axis over ids the agent could not order chronologically
  is the canonical catch.
- **Match the reader's view.** Claims check out against the data as
  displayed, not as stored. A viewer that drops an empty column removes the
  evidence for a claim about that column; a facet counting 89 rows per
  build contradicts "86 tests per build" until the sentence carries both
  numbers ("89 rows over the same 86 tests").
- **State what the data is.** Write the fact ("every build runs the same 86
  tests") and let the reader draw the conclusion. A line built on what
  something is not ("nothing here is a trend", "no column says when")
  gives the reader nothing to check.

## Prompting for a one-page report

Analysis comes first; the prompt carries its results. With this skill
loaded, a prompt is THREE blocks — the file, the checked findings, the
task; every craft, text, and interaction rule above is already binding,
so the prompt never restates presentation. Block 4 exists only for a
session running without the skill. Plain sentences, ASCII:

1. **The file.** Name, what one row is, the columns, the shape numbers —
   and the rules the model cannot see in the rows: a column that reads as
   time but is a category, the disjoint subset that must be summed instead
   of the overlapping whole, the working unit (absolute lines, because a
   percentage reads 38 lines and 9,377 lines as the same kind of number).
2. **Checked findings.** "I checked the data. Use these numbers:" followed
   by your verified findings with their numbers. The report then reproduces
   checked values instead of inventing its own. For the shipped samples
   this block is pre-computed in `samples/FINDINGS.md`.
3. **The task.** "Make a one page report. One answer per chart title." Then
   the questions — only ones the file can answer: "which tests cause them",
   never "why they fail" when causes are not in the data.
4. **The contract — skill-less sessions only.** Compute every number
   from the file. Sort bars by value. Start axes at zero. Same color per
   status. Label values. Put the file name, window and N on the page.
   Title the page with the top finding. Animate the charts in on load.
   Add a button that downloads the page as a PDF.

Wording is dry: simple words, full sentences, no jargon ("the red", "the
hole"), no judgment words ("waste"), no invented audience or personas.
Worked example:

```
Here is runs_real.csv. Each row is one test execution.
Columns: test_id, build_id, status, duration_ms, module.
3,560 rows, 40 builds, 89 rows per build, 86 tests.
Treat build_id as a category.

I checked the data. Use these numbers:
3 mongodb tests error twice in every build, 20 s each;
210 of the 240 errors land in 20.0-20.9 s.
They take 87% of the test time: a build runs 139 s
with them and 18 s without.
240 errors and 11 failures. Show them separately.
The doubled rows sit adjacent, 1 ms apart at the median.
84 of 86 tests never change status: 81 pass, 3 error.
deactivationTest fails 10 of 40 builds, 73 ms vs 72 ms.
persistedTimerTest fails once, in r05344.
11 builds hold a failure, never two in one.
Passing runs: median 14 ms, mean 220. Two Hello tests
hold 6.5% of all time.
275 rows record 0 ms and two record negative time.
Build totals stay between 134 and 150 s.

Make a one page report. One answer per chart title.
Answer: how much time errors and failures take,
which tests cause them, which are unstable,
and what the data itself records wrongly.
```

With the skill loaded, that is the whole prompt.

## Conflicts

If the request conflicts with a rule ("start the axis at 90%", "make it a
pie per sprint"), build BOTH versions side by side — the requested one and
the honest one — and name the difference in one sentence, with the lie
factor if an axis is involved. Never silently comply; never silently refuse.

## Review mode (input is a chart, not data)

Run the self-check list as a reviewer:

1. Verdict per rule: pass / fail / not applicable, one line each.
2. If an axis is truncated, compute the lie factor literally:
   visual effect (% change in drawn length) ÷ data effect (% change in
   values). Honest is ≈ 1; report the number.
3. Check the words against the Claims section: every visible claim
   computable from the charted data, positive statements, tiers kept apart.
4. On any failure, produce the corrected version of the same data and a
   two-sentence note to the chart's author: what misreads, what to change.

## Self-check list

The workshop handout carries the same rules. The builder runs this list
at build time, reviewers at review time.

1. **AXIS-01** — rates/counts zero-based, or a labeled threshold justifies the window
2. **SIZE-01** — size encodings map value → area, never radius
3. **DIST-01** — aggregates over tests show distribution/quantiles, not a lone mean
4. **GAP-01** — missing periods are labeled gaps, never bridged
5. **TIME-01** — no pies where time is a dimension
6. **AXES-02** — no dual y-axes; index or aligned panels
7. **COLOR-01** — status colors semantic, one fixed lookup (page-design tokens on the report page, palette.md elsewhere), never a default cycle
8. **SORT-01** — ranking questions get value-sorted categories
9. **CODE-01** — chart re-renders without duplicate elements; function of (container, data, options)
10. **PROV-01** — source and N printed on the page; the window behind the provenance info icon
11. **LIE-01** — lie factor ≈ 1 (Tufte tolerance 0.95–1.05), computed and reported at build time; the phrase never appears on the page
12. **CLAIM-01** — every visible claim computable from the charted data; provenance told, not derived
13. **MOTION-01** — marks animate in once on first render; a filter change transitions exit, update and enter in 500 ms keyed by id; resizes draw instantly
14. **TEXT-01** — page text passes writing.md and the text budget in reference/page-design.md; the page title is a plain name and the first KPI the top finding; each panel title is one clause of ≤ 10 words, no semicolon or comma-joined clause
15. **ANNO-01** — at most one single-line annotation per panel, drawn with the d3-annotation preset reference/annotations.md assigns to its mark (rect around one bar or one cell, circle around one point, threshold for a level; never a group of marks, never the dominant mark, under 15% of the plot); note beside the subject when there is room, else a leader through empty space; detail in tooltips or the info icon
16. **DATA-01** — the page fetches its data file at runtime from a relative path and embeds no rows; the reader can open the data from the page (table view or file download); the table opens in view — an overlay, or scrolled to on open — verified by clicking the control and asserting the table is inside the viewport
17. **A11Y-01** — each chart svg has role="img" and an aria-label stating its finding
18. **FIT-01** — narrow widths shrink gutters, never invert the plot; the verified width is reported to the builder, never printed on the page
19. **KPI-01** — the page opens with a KPI row of three or four headline findings
20. **LOOK-01** — the page follows reference/page-design.md: tokens, type scale, no boxed cards, tinted marks, in-place labels, one page-level status key and no panel legends
21. **FORM-01** — each answer uses the form it earns; at least one non-bar panel when the data offers one; a panel whose marks add nothing over their labels becomes a stat strip; a panel's title and its marks state the same finding
22. **FILTER-01** — a collapsible panel holds one control per column (searchable listbox with count bars, or range slider with histogram), plus Reset; every panel, KPI and panel title re-renders from the rows passing all filters while the page title stays fixed; mark counts after a filter equal the filtered distinct ids (no duplicates, no orphans); the provenance line shows filtered of total

## Task templates

- **T1 · build** — "Parse this JUnit XML to the test-run schema; build the
  flakiness matrix (rows sorted by instability, all-green collapsed,
  semantic colors)."
- **T2 · coverage** — "From this coverage report: treemap, area = LOC,
  color = coverage %, CVD-safe. Annotate the largest module under 50%."
- **T3 · pipeline** — "From this defect export: 90-day CFD + severity × age
  chart. Question: is the pipeline keeping up?"
- **T4 · root cause** — "Compute pairwise co-failure rates (tests with ≥5
  failures); render the matrix ordered so clusters are contiguous; annotate
  blocks ≥3."
- **T5 · modules** — "Twelve modules × 12 weeks: small multiples, shared
  scales, flag negative slopes. No overlays, no dual axes."
- **T6 · critique** — "Critique the attached chart against the anti-pattern
  rules; compute its lie factor; produce the corrected version and a
  two-sentence note."
- **T7 · report** — the four-block prompt above, filled in for your file.

## Boundaries

- This skill covers charts that answer known QA questions. It does not
  cover novel interaction design — dashboards with bespoke linked-brushing,
  new chart forms. State this instead of attempting it.
- The co-failure matrix suggests a shared cause; it does not prove one.
  Findings are phrased as leads ("t01–t05 fail in the same builds — check
  the shared fixture"), not conclusions.
- Sample data in `samples/` is real (provenance in `samples/README.md`)
  except `samples/synthetic/`, which is generated with planted pathologies
  and must always be introduced as synthetic.
