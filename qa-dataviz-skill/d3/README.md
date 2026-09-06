# D3 chart convention

A convention for D3 visualizations that are **responsive, updatable, framework-agnostic, and free of the duplicate-element bug** that naive `.append()` code causes on re-render.

**Start every new chart by copying [`template.js`](template.js)**, then rename the `Chart` class and replace `deleteOrReplaceThisMethod()` with your own `drawX()` methods. The template already wires up state, `_add`, responsiveness, and the render pipeline — you only write the drawing.

- **[`reference/conventions.md`](reference/conventions.md)** — the full write-up (why each piece exists).
- **[`reference/replacements.js`](reference/replacements.js)** — cheatsheet: old d3 `.append()`/enter-exit → `_add`.
- **[`examples/`](examples/)** — complete `line-chart.js`, `sankey-chart.js`, `map-chart.js` built on the template.

## The 5 pillars

### 1. Chainable state (single `attrs` object)
All render-to-render state lives in one `attrs` object. Getters/setters are auto-generated per key: call with an arg to **set** (chainable, returns `this`), with no arg to **get**.
```js
chart.data(newData).svgHeight(300).marginLeft(40); // set + chain
const w = chart.svgWidth();                          // get
```
`getState()` / `setState({...})` access the whole object. Auto-managed keys: `svgWidth` (set from container width → responsive), `chartWidth`/`chartHeight` (svg minus margins), `firstRender` (true only on first render — guard declare-once things like zoom), `guiEnabled` (auto lil-gui panel of every numeric/string/boolean attr for client tweaking).

### 2. `_add()` — enter/exit/update in one call
**Never use bare `.append()` in a re-runnable render** — it duplicates elements every redraw. Use the prototype helper instead:
```js
const g = chart._add('g.wrapper');          // class comes from the selector
g._add('rect.bar', data);                    // data-bind an array
g._add('g.row', d => d.values);              // or a function of parent datum
```
It classes the element, binds data (**tracks objects by `id` if present**, else index), removes exits, merges enter+update, returns the merged selection. A **red-stroked element with a "no class" tooltip = you forgot the `.class`** in the selector.

### 3. `render()` pipeline (all steps re-run safely)
`setDynamicContainer()` (measures container, adds resize listener → responsive) → `calculateProperties()` (margins, `chartWidth/Height`) → `drawSvgAndWrappers()` (creates `svg.svg-container` + `g.chart` translated by margins) → **your `drawX()` methods** → return `this`.

### 4. Usage
```js
const chart = new Chart().container('.my-el').data(data).render();
chart.data(newData).render(); // update — no re-instantiation
```

### 5. Framework integration
Same rule everywhere: get DOM ref → `new Chart().container(ref).data(data).render()` → re-render on data change. Svelte/React/Vue/Angular snippets are in `reference/conventions.md`. Svelte:
```svelte
<script>
  import { onMount } from 'svelte';
  import { Chart } from './chart.d3.js';
  export let data;
  let el, chart;
  $: if (chart) chart.data(data).render();
  onMount(() => (chart = new Chart().container(el).data(data).render()));
</script>
<div bind:this={el} />
```

## Rules
- **Every `_add` selector needs a class** (`tag.class`) — bare tags trigger the red "no class" warning marker.
- Give bound objects a stable **`id`** so they track correctly across redraws (not by index).
- **Width is automatic/responsive; `svgHeight` is fixed** — never hardcode width.
- Guard declare-once setup (zoom, one-time listeners) with `firstRender`.
- Keep the API **chainable** — setters and `render()` return `this`.
- One `g.chart` wrapper holds all drawing; append visualization layers under it, not under `svg` directly.
