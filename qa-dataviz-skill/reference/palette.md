# Palette

All chart colors come from the Okabe–Ito palette (Color Universal Design):
eight hues chosen for separability under the common forms of color vision
deficiency. No other hues; no library default cycles (rule A-7).

The eight Okabe–Ito colors:

| Name | Hex |
|---|---|
| blue | `#0072B2` |
| vermillion | `#D55E00` |
| bluish green | `#009E73` |
| orange | `#E69F00` |
| sky blue | `#56B4E9` |
| reddish purple | `#CC79A7` |
| yellow | `#F0E442` |
| black | `#000000` |

Plus neutral gray `#999999` for de-emphasis.

## Status colors (fixed mapping — look up by value, never by index)

| Status | Color | Hex |
|---|---|---|
| pass | bluish green | `#009E73` |
| fail | vermillion | `#D55E00` |
| error | reddish purple | `#CC79A7` |
| skip / no data | gray | `#999999` |

```js
const STATUS_COLOR = {
  pass: "#009E73", fail: "#D55E00", error: "#CC79A7", skip: "#999999",
};
// usage: STATUS_COLOR[d.status] — never scaleOrdinal over whatever order
// the statuses happen to appear in.
```

Rationale for green/vermillion over green/red: vermillion stays separable
from the green for deuteranopes and protanopes; pure red does not.

## Defect states (CFD bands, aging charts)

| State | Color | Hex |
|---|---|---|
| open | sky blue | `#56B4E9` |
| in progress | blue | `#0072B2` |
| closed | bluish green | `#009E73` |

Severity emphasis (aging chart): the 90+ day bucket of the highest severity
gets vermillion `#D55E00`; other buckets stay in blues/grays — one alarm
color per chart, pointed at the finding.

## Series colors (lines, small multiples, non-status categories)

Assign in this fixed order, skipping any hue already carrying status
meaning in the same chart:

`#0072B2`, `#E69F00`, `#56B4E9`, `#009E73`, `#CC79A7`, `#D55E00`, `#000000`

Yellow `#F0E442` is reserved for fills/highlights on white — too light for
1px lines.

## Coverage ramp (treemap color, diverging)

Low coverage = vermillion, high = blue, neutral midpoint at the team's
target (default 75%):

```js
const coverageColor = d3.scaleDiverging()
  .domain([0, 75, 100])            // [worst, target, best]
  .interpolator(d3.piecewise(d3.interpolateLab,
    ["#D55E00", "#F5F2EE", "#0072B2"]));
```

Not green-to-red: the diverging pair must survive CVD, and vermillion/blue
does. Label the midpoint ("target 75%") in the legend.

## Hard rules

- Never map a red-family hue to a good state or a green-family hue to a bad
  one, in any chart.
- One alarm color per chart, pointed at the single finding the title
  states.
- Text and marks meet 4.5:1 contrast against the background; the palette
  above passes on white.
