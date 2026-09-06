# Page design

The visual language for generated report pages. The values are the
reference look; a design system may substitute its own tokens — the
structure, budgets, and mark specs stay.

## Tokens

| token | value | use |
|---|---|---|
| paper | `#FBFCFD` | page background — the page sits on paper, never white cards on gray |
| ink | `#182430` | headings, KPI values, key labels |
| muted | `#5D7186` | captions, subs, axis text, value labels |
| line | `#DCE3EA` | axes, tracks, rules, control borders |
| blue | `#4F46E5` | neutral series |
| verm | `#F43F5E` | alarm — fail, zero coverage |
| green | `#0D9488` | pass, good |
| amber | `#F59E0B` | error, warning |

The report page's status colors are these tokens: pass `green`, fail
`verm`, error `amber`; a chart on this page never reaches for
`palette.md`'s Okabe–Ito hexes, which serve charts built outside this
page design. Series that are not statuses use `blue`.

Fonts: a serif for the page title only (`Charter, Georgia, serif`,
weight 700); system sans for everything else; `ui-monospace` for the
eyebrow and the provenance line.

Fills are tinted, not raw: mix the series color 10–15% toward paper —
`d3.interpolateLab(color, paper)(0.12)` — so large areas read softened,
not fluorescent. Text never wears a series color: ink or muted only,
with a colored mark beside it carrying identity. KPI numerals are the
exception: color them by meaning (alarm color when the number is bad,
ink when neutral).

## Page structure

```
eyebrow            mono 12px uppercase muted, ≤ 4 words: the project or
                   scope ("orbit · 40 builds", "commons-math")
page title         serif 700, 30–36px — a plain name for the report,
                   ≤ 4 words ("Test run report", "Coverage report");
                   never a finding, never a number. The top finding is
                   the first KPI tile.
provenance line    13px mono, file · N; the window and any further
                   detail sit behind its info icon. The file is the
                   one the page fetched at load, by relative path;
                   the rows are never embedded in the HTML
buttons + filters  one row: pill buttons on the left (download PDF ·
                   data table · download file); flush right, the
                   `Filters` toggle pill and, while any filter is
                   active, a `Reset` pill beside it (see Filters)
filter panel       collapsible, full width, under the buttons row: one
                   control per column of the file (see Filters)
status key         under the buttons row (under the panel when open),
                   flush right (see Legends)
KPI row            3–4 tiles, NO boxes: value 40–44px/700 colored by
                   meaning · sub 14–15px ink, ≤ 5 words. Context beyond
                   the sub sits behind the tile's info icon. A value that
                   is a share of a whole carries a micro-mark in the same
                   color: a small donut arc (44–52px, remainder in
                   `line`) beside the numeral — one style per page.
two panels         side by side (stack under ~760px)
full-width panel   the part-to-whole or per-item view
```

No boxed cards anywhere: whitespace and type hierarchy separate
sections; borders belong to controls (buttons, the data table), not to
content. Panel header = title 16px/600 ink, then one caption line 13px
muted.

## Marks

- **Sorted horizontal bars** — band step 38–42px, padding ≈ 0.32,
  rounded data-end radius 2, tinted fill, value label 13px muted just
  past the bar end, category labels right-aligned in the gutter.
- **Unit / waffle** — one square per item for per-item status over a
  small count (≤ ~60): 30–38px cells, 8–10px gap, corner radius 4,
  semantic fill; counts per status in the panel's info line, not a key
  row.
- **Dots on the full axis** — percentages plot as dots on a 0–100 axis
  with a `line`-colored track per row; a reference line marks the
  overall value.
- **Proportion split** — part-to-whole as one full-width bar 56–62px
  tall, 2px paper gaps between segments. Each segment wide enough for
  its label (≥ 90px) carries `name · share` inside it, ink on the tint;
  a thinner segment gets a 13px `muted` `name · share` label directly
  under its own position, and nothing else. Count, seconds, medians,
  modules: the segment's tooltip. No key rows.
- **Annotation** — at most ONE per panel, and only when the title and
  value labels do not already carry the finding: a single bold line,
  ≤ 4 words with its number, drawn with the d3-annotation preset that
  `annotations.md` assigns to the mark being named — a rect subject
  around one bar or one cell, a circle around one point, a threshold
  line for a level; never a group of marks — with the note beside its
  subject and no leader when the gutter has room. A second line is a caption in disguise — its content
  goes to the mark's hover tooltip or the panel's info icon.

## Legends

Status colors mean the same thing on every panel, so the page carries
ONE status key, once, and no panel carries its own:

- The key sits under the buttons row — under the filter panel while
  it is open — flush right: swatch 12px radius 3, name 13px `muted`, in
  the fixed order pass · fail · error, one entry per status present in
  the file. Names only, no counts.
- Filtering never changes the key; a status absent from the filtered
  rows stays listed at 0.4 opacity.
- No panel legend, key row, or key line. A mark's value sits on or
  beside the mark: in-mark label, value label at a bar's end, a small
  `name · share` label under a segment too thin to carry one. Per-status
  counts for a waffle or matrix go to the panel's info line
  ("fail 10 · pass 30") or to cell tooltips.
- A series that is not a status (a module, a test) is named on its mark
  or in the gutter, never in a legend.

## Form richness

A page of only horizontal bars reads as a spreadsheet. Each answer uses
the form it earns: totals → sorted bars; per-item status across a small
count → unit/waffle; percentages that share a denominator and whose
comparison is the question → dots on the full axis; part-to-whole →
proportion split; heterogeneous facts that share no axis → a stat strip.
At least one panel is a non-bar form whenever the data offers one.

**A chart must beat its labels.** When mark positions are degenerate —
values piled at the axis ends, one row at 100% against rows under 10%,
counts spanning three orders of magnitude — the marks add nothing the
value labels already say, and the panel is a stat strip instead: each
fact as a named number, 24–28px ink value with a muted name beneath,
laid out in a row, no axis. The panel keeps its title, info icon, and
tooltip behavior.

**The title and the marks state the same finding.** A panel's title is
the finding of the data drawn below it; marks are that title's evidence.
A title about one fact above marks showing another fails the panel.

## Filters

Every column of the file is a filter, and every KPI, panel title,
mark, key line and annotation is a function of the rows that pass all
of them. The page title is not: it is the report's plain name, static
text, and never changes with a filter — a title that rewraps shifts the
whole page under the reader. The provenance line's count is the only
thing above the buttons row that moves.
The filters are what make enter, exit and update visible: a
filtered-out bar shrinks to the baseline and leaves, a re-ranked bar
slides to its new row, a KPI numeral counts to its new value.

**Toggle and panel.** A `Filters` pill sits flush right on the buttons
row, styled like the buttons (13px, `line` border, `paper` fill,
999px radius, chevron at the right). It reads `Filters` at rest and
`Filters · 2` while two filters are active; a `Reset` pill sits at its
left only while any filter is active and clears them all. Clicking the
toggle opens a full-width panel under the buttons row, collapsed by
default, 200 ms height transition, `aria-expanded` on the toggle; once
collapsed the panel is `hidden` (display none), so its controls leave
the tab order and the accessibility tree — clipping alone is not
collapsing. The
panel is not a box: a 1px `line` rule above and below, 16px padding,
controls laid out left to right in the file's column order, wrapping
as needed; no heading, no label text, no helper text.

**One control per column, typed by the column.**

- A *categorical* column (strings, or numbers with ≤ 50 distinct
  values) gets a **listbox pill**: the pill reads the column name, or
  `column · value` in `ink` once a value is chosen. It opens a
  data-driven listbox (`role="listbox"`, options `role="option"`,
  `aria-selected`) styled like the info popover: `paper`, 1px `line`
  border, 10px radius, the same shadow, 4px padding, min-width 240px,
  anchored to its pill — absolutely positioned inside the pill's
  `position: relative` wrapper 6px below it, never `position: fixed`.
  Height is capped: `max-height: min(320px, space below the pill −
  16px)`, `overflow-y: auto`; it opens above the pill when fewer than
  160px remain below. Inside, top to bottom:
  - a **search field**: `<input type="search">`, 13px, no border but
    a 1px `line` rule beneath, placeholder = the column name, focused
    on open; typing narrows the rows to values containing the text
    (case-insensitive); Esc clears the text first and closes on the
    second press; the field is present even for short lists;
  - one row per value, sorted by count desc, plus a first row `all`:
    value name left, 13px `ink`; its row count right, 12px mono
    `muted`; a bar behind the row, `blue` mixed 80% toward paper
    (`d3.interpolateLab(blue, paper)(0.8)`), height = row height,
    width = count / max count of the list, radius 4; the `all` row
    carries no bar; counts are computed over the rows that pass the
    *other* filters, so the list updates when another filter changes;
    a value with 0 rows stays listed at 0.4 opacity and is still
    selectable; the selected row's name is 600 weight; hover and
    keyboard focus tint the row `line`, text stays `ink` and `muted`.
  Arrow keys move, Enter selects, outside click, page scroll and
  resize close; the selected row is scrolled into view on open; one
  popover open at a time, shared with the info icons.
- A *numeric* column (> 50 distinct numbers) gets a **range slider**
  with a histogram: a 240px-wide control showing the column name in
  13px `ink` at its left, the selected ends in 12px mono `muted` at
  its right (`0 – 25,271 ms`, in the column's unit, formatted like the
  page's numbers), and beneath them a 32px-tall histogram of the
  values (20 equal bins over the column's min–max, bars `blue` mixed
  80% toward paper, radius 2, bins outside the selected range at 0.4
  opacity, counts over the rows passing the other filters) above a
  2px `line` track with two 14px round handles (`paper` fill, 1.5px
  `ink` stroke, `role="slider"` with `aria-valuemin/max/now`,
  keyboard arrows step them). Dragging updates the printed ends live
  and snaps to the column's step; the page re-renders on release, not
  on every pixel. The track's scale follows the column's shape: linear
  when max ≤ 50 × median; otherwise `d3.scaleSymlog` with the median as
  its constant, so a duration column whose rows sit under 100 ms but
  reach 25 s spreads across the track instead of piling in its first
  pixel. The 20 bins are equal-width in the scale's space, so the
  histogram shows the distribution's shape either way; the printed ends
  and the handles' `aria-valuenow` stay in data units.
- A column with one distinct value still appears, at 0.4 opacity,
  disabled.

**Shared rules.**

- The provenance line counts the filtered rows against the file:
  `1,240 of 3,560 rows`.
- A filter that leaves a panel without rows shows the panel's title in
  `muted` with "no rows" and no marks; it never hides the panel.
- Transitions on a filter change: 500 ms, `d3.easeCubicOut`. Exit
  shrinks to the baseline and fades; update moves position, size and
  label together; enter grows from the baseline after the exits, no
  stagger. Panel titles and KPI text swap at once; KPI numerals tween;
  the page title stays. A resize still draws instantly.
- A tweened number is formatted on every frame by the same formatter
  as its final value, and snapped to that formatter's step before
  formatting: an integer counts 0, 1, 2; a one-decimal value counts
  0, 0.2, 0.4; a percentage counts in whole points. The raw
  interpolated float never reaches the DOM — no 0.1999999, no
  0.3132132. When the start and end values use different precisions
  (18 s → 4.6 s), the frame uses the precision of the final value.
- Marks are keyed by id (`test_id`, `build_id`, status), never by
  index, so an update is the same element moving, not a new one.
- Listboxes, the search field, the slider and the panel stay out of
  the PDF.

**Verify by measurement.** The panel opens and holds one control per
column with the type the column earns. In the longest listbox: its box
inside the viewport and ≤ 320px tall, wheel-scrolling moves its
content, typing in the search narrows the rows to matches, a page
scroll closes it. On the slider: moving a handle changes the printed
end and, on release, the marks and the provenance count. During a
filter transition: sample each numeral's text several times and assert
no sample has more decimals than the final value; mark counts after a
filter equal the filtered distinct ids; Reset restores the original
counts and collapses nothing.

## Info icons

Visible text is findings and value labels; explanation hides until asked
for. The icon is this exact SVG inside a focusable button — a text "i",
"ⓘ" glyph, or emoji reads as improvised:

```html
<button class="info" aria-label="About this panel">
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="8.25" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="10" cy="6.4" r="1.15" fill="currentColor"/>
    <rect x="9.1" y="8.9" width="1.8" height="5.6" rx="0.9" fill="currentColor"/>
  </svg>
</button>
```

Button: transparent, borderless, `muted` at rest at 0.55 opacity, `ink`
at full opacity on hover/focus/open, vertically centered 6px from its
text. Popover: one lean line (≤ 12 words) — the encoding, the breakdown,
the window — on a `paper` background, 1px `line` border, 10px radius,
shadow `0 6px 18px rgba(24,36,48,0.10)`, 12px 14px padding, 13px `muted`
text, anchored to its icon — absolutely positioned inside the icon's
`position: relative` wrapper, 6px below it, flipped above when fewer
than 120px remain below, shifted left when it would cross the
viewport's right edge — never `position: fixed`. Opens on hover or
focus, pins on click, closes on Esc, outside click, page scroll or
resize; one open at a time, shared with the filter listboxes. The PDF prints the visible page; popover lines stay out of it.

## Text budget

- Page title ≤ 4 words, a name, no numbers; eyebrow ≤ 4.
- A panel title is one finding in one clause, ≤ 10 words: no
  semicolon, no comma-joined second clause ("3 tests hold 240 errors,
  2 tests 11 failures" is two titles). A second finding about the same
  marks goes to the info line, a tooltip, a KPI, or the row label —
  never joined onto the title. Commas appear only inside numbers.
- Numbers in visible text are rounded to the unit a reader says aloud:
  "4,847 of 5,577 s", never "4,846,979 of 5,576,661 ms"; three or four
  significant figures at most. Exact values live in tooltips.
- Filter controls carry no text beyond the column name, their options,
  and the range ends; the info icon on the provenance line names what
  a filter does if anything must be said.
- A stat-strip name is ≤ 3 words ("rows at 0 ms"); the qualifier goes
  to the tile's tooltip.
- Panels show a title only; the encoding line lives behind the panel's
  info icon.
- KPI sub ≤ 5 words; anything more sits behind the tile's info icon.
- A proportion split labels its segments in place; breakdowns beyond the
  in-mark labels sit in tooltips.
- The page's one status key carries names only. Row counts,
  durations, module names, and "8 modules, 83 tests" are tooltip or
  info-line text.
- At most one annotation per panel, one line, preset per
  `annotations.md`; detail lives in the mark's tooltip or the panel's
  info icon.
- No paragraph blocks anywhere on the page — detail lives in the data
  table and tooltips.
- Content only: no intro or context sentences, and no caption that
  restates what the marks already show — a caption exists only where the
  encoding needs a word ("one cell per test and build").
- Each fact appears once. The first KPI carries the top finding; every
  other KPI, caption, and annotation adds a fact the page does not
  already state.
- Builder facts (supported widths, rendering notes, library names,
  re-render behavior) go in the build report, never on the page.
