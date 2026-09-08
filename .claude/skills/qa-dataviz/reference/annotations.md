# Annotations

Every annotation is three parts: a **subject** (what is marked), a
**connector** (the leader), and a **note** (the text). d3-annotation
(`d3.annotation()`, loaded by script tag beside d3) ships eight presets
that differ only in which parts they draw and how. The geometry of the
mark being pointed at picks the preset.

## Presets

| preset | subject | connector | note | use it for |
|---|---|---|---|---|
| `annotationLabel` | none | straight stem from the anchor | centered text at the stem's end, no underline | naming a thing with a short stem: a line's end, the gap between two marks, a point with clear space beside it |
| `annotationCallout` | none | straight line | text with a horizontal rule, left- or right-aligned | pointing at one spot on a mark from text that sits elsewhere; the default when nothing needs enclosing |
| `annotationCalloutElbow` | none | one right-angle elbow | same as callout | the note sits diagonally off the anchor in a grid of marks; an axis-aligned leader crosses less than a diagonal |
| `annotationCalloutCurve` | none | curve through given points | same as callout | routing a leader around marks; narrative graphics, rarely a report |
| `annotationCalloutCircle` | circle (`radius`, or `innerRadius`/`outerRadius` ring), `radiusPadding` | elbow | horizontal rule | enclosing one point; the ring holds the dot, not a patch of a bar |
| `annotationCalloutRect` | rectangle (`width`, `height`; negative values extend left or up from the anchor) | elbow | horizontal rule | enclosing one rectangular mark: a bar, a waffle cell, a matrix cell |
| `annotationXYThreshold` | a line spanning `x1`–`x2` at y, or `y1`–`y2` at x | straight line | horizontal rule | a reference level or marker that is itself the finding: median, p95, an SLA, the build where something changed |
| `annotationBadge` | a filled circle carrying `text`, placed at a corner (`x`: left/right, `y`: top/bottom) | none | none | numbering points of interest that a list beside the chart explains; the badge is an index, not a sentence |

Connector options on any preset: `type` line / elbow / curve, `end`
none / dot / arrow, `endScale`. Note options: `align` left / right /
middle / dynamic, `orientation` topBottom / leftRight, `lineType`
horizontal / vertical / none, `wrap`, `padding`, `bgPadding`. `dx`/`dy`
offset the note from the anchor; `disable: ["connector"]` drops the
leader when the note sits adjacent.

## Choosing

The subject encloses exactly one mark: one bar, one cell, one dot, one
segment. A finding about a group of marks — a run of bars, a row or
block of cells, a cluster of points — is the panel title's job or a
key row's; drawn as a subject it frames most of the panel and marks
nothing. The subject is small: the mark's own box plus 2px, or the dot
plus 4px, and never more than 15% of the panel's plot area. A mark
larger than that — the 87% segment of a split, the one bar that fills
the panel — is the panel's finding and gets no annotation; its facts
sit in the title, its in-mark label, and its tooltip. Rings around
fill, rectangles around groups, and subjects around the dominant mark
all fail ANNO-01.

The note states a fact about that one mark ("in r05344", "20 s each"),
not a fact about the whole ("121 s per build" belongs to the panel's
info line). A note that repeats the mark's own label, in any unit, is
dropped. A mark under 2px — a 0.01% split segment — has nothing to
enclose and gets no annotation; its label beneath already locates it.

| what the annotation is about | preset | subject |
|---|---|---|
| one bar ("20 s each" on the longest error bar) | `annotationCalloutRect` | that bar's box, 2px outside |
| one cell in a waffle or matrix ("in r05344") | `annotationCalloutRect` | that cell's box, 2px outside |
| one point on a dot plot or line | `annotationCalloutCircle`, radius = dot radius + 4 | the dot |
| a level (median, p95, threshold) | `annotationXYThreshold` | the line itself, full plot width |
| a gap or the space between two marks | `annotationLabel` | none |
| a spot on a mark from text elsewhere, nothing to enclose | `annotationCallout` or `annotationCalloutElbow` | none |
| several points keyed to a side list | `annotationBadge` | numbered badge |

## Placement

- The note sits beside its subject when the gutter has room — past the
  bar end, above or beside the cell — and the connector is disabled.
- Otherwise `dx`/`dy` put the note in empty plot space and the
  connector runs straight or with one elbow; a leader never crosses a
  mark or another label.
- One note per panel, one line, bold, ≤ 4 words with its number
  (`note.title` only, no `label`; `lineType: "none"`).
- Subject stroke 1.5px `ink`, no fill; connector 1px `ink`; note text
  13px `ink`.
- Verify by measurement: the subject's box contains exactly one mark's
  box (rect) or one point (circle), is no more than 4px larger on each
  side, and covers under 15% of the panel's plot; the connector's segments intersect no mark rectangle and no
  text box.
