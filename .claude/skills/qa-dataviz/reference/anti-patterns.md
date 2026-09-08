# Anti-pattern rules A-1..A-8

Eight ways QA charts misread. Each is a library or tool default, so each
needs an explicit rule. For every rule: what happens, how to detect it in
a chart or in chart code, and the fix.

## A-1 · Truncated axis

**What happens.** Auto-scaling fits the axis to the data range. Ten sprints
of pass rate on an axis starting at 92.5% renders 1.3 points of noise as a
climb — the eye measures bar/line extent against the chart frame, not
against tick labels. In that example the amplification is about 50×.

**Detect.** Any rate/count axis whose minimum is not 0. In code: a scale
domain built from `d3.min(data)` or equivalent auto-extent.

**Fix.** Zero-based axis for rates and counts. If a window genuinely
matters (an SLA threshold), draw and label the threshold line and annotate
the axis break; the reader must see that the base is not zero. Compute and
report the lie factor when reviewing (LIE-01).

## A-2 · Radius–area confusion

**What happens.** Value mapped to circle radius: a 4× count displays as 16×
area, because the eye compares areas. Value→radius is the one-line naive
implementation; value→area needs a square root.

**Detect.** `r = scale(value)` with a linear scale. Any bubble chart where
doubling the value quadruples the visual size.

**Fix.** `r = sqrt(value / π)` scaled — or better, drop bubbles: position
beats area, so sorted bars answer the same question more accurately.

## A-3 · The average that describes nobody

**What happens.** A mean-duration line drifts 15% while an 80-test cluster
migrates from 1 s to 8 s. Means collapse distributions; bimodality — the
signature of a degrading subset — is invisible in any average trend. The QA
question is which tests changed.

**Detect.** A single line labeled "avg duration" (or mean of any per-test
metric) with no distribution behind it.

**Fix.** Distributions or quantile bands per period (p50 + p05–p95), alert
on p95; or a duration heatmap of tests × builds.

## A-4 · Interpolated ignorance

**What happens.** Line charts connect consecutive points, so a 5-day CI
outage becomes a confident straight segment — asserted knowledge exactly
where there is none. `d3.line` bridges missing points unless a `defined()`
accessor says otherwise, and most charting libraries do the same.

**Detect.** Compare the time axis against the data's build/day sequence:
any interval longer than the normal spacing with no points, crossed by an
unbroken line. In code: no `defined()` accessor (D3) or equivalent.

**Fix.** Break the line at gaps and render the gap as a labeled shaded band
("CI outage, Jul 28–Aug 1 — no data"). The parser emits explicit gap
records (schemas.md); use them. The gap is often the finding: five days of
no signal before a release is itself the risk.

## A-5 · Pies across time

**What happens.** Failure share doubling from 8% to 16% across four
sprints is invisible in four side-by-side pies: angle is a weak channel and
comparing across pies means memorizing wedges chart-to-chart. Allure,
Jenkins, and TestRail ship per-period pies as defaults.

**Detect.** More than one pie for the same measure at different times, or
any pie where a time dimension exists in the data.

**Fix.** Stacked bars per period (few periods) or stacked area (many);
consistent layer order and status colors.

## A-6 · The dual-axis correlation machine

**What happens.** With two independently scalable y-axes, almost any two
rising series can be tuned to overlap — the scales manufacture the
correlation. Bugs and coverage "tracking" while their growth rates differ
6×. One click in Excel and Grafana.

**Detect.** Two y-axes on one panel. That is the whole test.

**Fix.** Index both series to a common baseline (= 100 at the window start)
on one axis, or aligned panels with shared x. State growth rates in the
annotation if the comparison is the point.

## A-7 · Color without meaning

**What happens.** Libraries color by series order, so array order picks the
palette — a default cycle happily assigns red to "Passed" and green to
"Failed". Red/green conventions are hard-wired in readers, and about 8% of
men have a red–green deficiency (Okabe & Ito, Color Universal Design), so
hues are chosen for separability.

**Detect.** Status colors that change when the data order changes. Any
`schemeCategory10`/default-cycle assignment to status values. Green-family
colors on bad states or red-family on good ones.

**Fix.** The fixed semantic mapping in `palette.md` (Okabe–Ito). Status
colors are looked up by status value, never by index.

## A-8 · Unsorted categories

**What happens.** Alphabetical bars make the reader do the sorting.
Alphabetical order encodes nothing; QA categorical data is almost always
consumed as a ranking — "where is it worst?" Ordinal labels — depth,
sprint, build number — hide the same defect behind a natural order: eight
depths drawn 0 to 12 while the title says which depth repeats the most
lines is still a ranking left to the reader. Sort by value; when the
natural order is also needed for lookup, a two-state pill in the panel
header switches between them, value order first, marks keyed by id so
the bars slide rather than redraw.

**Detect.** Category axis in alphabetical or insertion order when the
question is a ranking.

**Fix.** Sort by value, descending (worst first for risk questions).
Alphabetical is reserved for lookup tables where the reader arrives knowing
the name. The fix is one `sort()` call.

## The metric: lie factor (LIE-01)

Tufte: lie factor = (% change shown visually) ÷ (% change in the data).
Honest ≈ 1; Tufte's tolerance is 0.95–1.05, the same band LIE-01 uses. A
truncated bar pair showing a 650% visual effect for a 1.4% data change has
lie factor ≈ 46. Compute it literally in review mode whenever A-1 or A-2
fails.
