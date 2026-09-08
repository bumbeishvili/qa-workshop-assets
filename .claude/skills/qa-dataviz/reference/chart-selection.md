# Chart selection

Start from the QA question, not a chart name. Find the question in the
table, state the row, then build to the construction notes below.

| QA question | Chart | Never |
|---|---|---|
| Noise vs signal in failures? | Test × build matrix, sorted by instability | Aggregate pass-rate line alone |
| Durations degrading? | Histogram / quantile band per period | Mean-duration line |
| Coverage weakest, size-weighted? | Treemap (area = LOC, color = %) | Single overall percentage |
| Defect pipeline keeping up? | Cumulative flow diagram | Open-count snapshot |
| What are we ignoring? | Aging bars by severity | Total open count |
| Failures sharing a root cause? | Co-failure correlation matrix | Per-test flake list |
| Which module is different? | Small multiples, shared scales | Overlaid lines; dual axes |
| Pass/fail mix over time? | Stacked bars / area | Pie per period |

The ranking behind every row (Cleveland & McGill 1984): position > length >
angle > area > color. Encode the quantity the decision rests on as high on
that ladder as the data allows: bars beat bubbles beat pies, and color is
the weakest place to put meaning.

## Construction notes

### Test × build matrix (flakiness matrix)

- Rows = tests with ≥1 non-pass, columns = builds in chronological order.
- Collapse the all-green majority to a single summary row ("N tests, all
  pass") — the matrix is for the exceptions.
- Sort rows by instability: count of pass↔fail alternations across the
  build sequence, descending. Flaky tests stripe; regressions form a solid
  run from some build (bisect there); an isolated cell is infrastructure.
- Cell color: status palette. Missing (test, build) cells render as gaps in
  the neutral gap color, not as passes.

### Duration distribution / quantile band

- Per period (build or day): p50 band with p05–p95 envelope, or a
  histogram per period. Alert threshold on p95.
- A second mode appearing (bimodality) is the finding — a subset of tests
  degrading; never average it away.

### Coverage treemap

- Area = LOC, color = covered_pct on the diverging ramp (palette.md).
- Annotate the largest low-coverage module with its numbers ("legacy-sync:
  5,400 LOC at 12%").
- The treemap locates; for precise comparison between modules, produce
  sorted bars instead.

### Cumulative flow diagram

- Stacked areas of defect states (open → in progress → closed) over time,
  built from `transitions`. Band width = queue size, band slope = rate.
- The reading to surface: is the intake slope steeper than the resolution
  slope, and since when.

### Aging bars by severity

- Age buckets (0–7, 8–30, 31–90, 90+ days) within each severity, open
  defects only. The 90+ bucket of the highest severity is the headline;
  list its defect IDs so each can be assigned.

### Co-failure correlation matrix

- Consider only tests with ≥5 failures (below that, rates are noise).
- Cell (i, j) = P(both fail in the same build) / P(either fails) — or plain
  same-build co-failure rate; state which.
- Order rows/columns so clusters are contiguous (hierarchical clustering or
  simple greedy ordering); annotate blocks of ≥3 tests.
- Phrase results as leads, not conclusions ("t01–t05 co-fail — check the
  shared fixture").

### Small multiples

- One panel per module, identical x and y scales across all panels —
  free scales would reintroduce the truncated axis per panel (A-1).
- Flag panels meeting the stated criterion (negative slope, threshold
  crossing) with an annotation, not a different scale.

### Stacked bars / area over time

- Composition per period as one stacked bar (or area for many periods).
- Order layers consistently across periods; status palette for layers.
