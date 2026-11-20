# System Patterns

## Architecture

Static page with ES modules. No framework, no bundler.

```
index.html
assets/css/main.css
assets/js/
  state.js      S (settings), doc (image/derived data), helpers, OVERLAY/CONTOUR colours
  image.js      sample image, file decode, luminance + grey data URLs
  filters.js    gauss / bilateral / kuwahara, prefilter()
  geometry.js   cleanup, trace (marching squares), smoothL, rdp, dPath, far
  polygons.js   polyBuild, error curve, stagedLimit, refinePasses
  pipeline.js   thresholds → masks → contours → layers → chips/editor/render
  render.js     stepParts, live/study SVG, chips, editor, panel, labels, render
  export-svg.js steppedSvgStr (embedded interactive script, reuses crosshairStr)
  export-pdf.js PDF writer with JPEG panes, vector logo, site link
  app.js        wiring, keyboard, file input, init
```

## State

- `S` holds user settings and render options (`mode`, `ptype`, `maxSides`, `over`, `steps`,
  `studyStep`, `fills`, `outlines`, `dots`, `curves`, opacities, `crossV`/`crossH`, filter settings).
- `S.levelOn` maps level names (`G0`, `G1`, … `B`) to `false` when a level is switched off in
  **Levels shown**; a missing entry means on. `levelOn(j)` clamps the lookup to the level's name,
  so switches survive grey-count changes.
- `S.passArea` (default 1500 px²) splits each level's shapes into large and small; `S.order` is the
  user's block-in sequence of pass keys (`'0L'`, `'2S'`, …). `rebuildOrder()` reconciles that list
  with the grey count, keeping custom positions and slotting new large passes after the last large
  pass and new small passes at the end.
- `doc` holds per-image data: dimensions, luminance, thresholds, manual thresholds, selected grey,
  layers, cached contours (`LP`) and error curves (`EC`), source data URLs.
- Both are exported objects, not reassigned imports, so modules stay acyclic and live-updating.
- Shell layout (settings panel shown/hidden) is deliberately not in `S`: it is an `.app` class
  toggled by `setPanelHidden()` in `app.js` and mirrored to `localStorage`.

## Step model

- A value level has shapes, and the shapes split at `S.passArea` into a **large** and a **small**
  pass. `S.order` lists those passes (`<level><L|S>`) in block-in order; the default is every large
  pass by value, then every small pass by value.
- `totalSteps = 1 + 3 * S.order.length` (8 passes → 24 steps at 5 greys).
- Pass keys are parsed with `parsePass(key)`; levels are labelled `blockName(level)` (`G0`, …,
  `Black`).
- `stepMeta(step)` returns `{ index, level, size, phase }` (null at step 0): `index` is the position
  in `S.order`, `phase` 0/1/2 is outline, fill + outline, outline removed. `activeLayer()` and
  `activeSize()` read the same meta.
- Changing the grey count keeps the study on the same pass and phase: `remapStep(step, oldMax,
  oldKey, oldPhase, newMax)` looks the old pass key up in the rebuilt order, and a study that was
  on its last step moves to the new last step.
- Reordering passes (`reorderPass`, `resetOrder`) re-finds the current pass by key, so the step the
  artist is looking at does not jump to another pass when rows move.
- Selection is pass-scoped: `curShape()` only returns a polygon that belongs to the active pass's
  shape group (the same set that receives hit areas), so stepping to another pass empties the
  editor until a shape in the new pass is clicked.
- `stepParts(step)` fills every earlier pass, applies the phase to the current one, and skips passes
  whose level is hidden or whose shape group is empty.

## Processing pipeline

1. Optional pre-filter produces `doc.lum`.
2. Thresholds (manual overrides or gamma curve) produce a level index per pixel.
3. Small components merge into their dominant neighbour.
4. One binary mask per layer → marching-squares loops → area filter → circular smoothing.
5. Curve mode: RDP with a tolerance chosen by binary search against the segment budget.
   Polygon mode: `polyBuild` (initial extreme points, then split the worst edge).
6. Layers are stored per value level; render and exports consume them.

## Auto-refine

- `errCurve(p)` records worst-point distance after each additional edge.
- `stagedLimit(E, L0, tol, steps)` grows from `L0` with coarse steps then backs off and refines.
- `refinePasses(schedule)` walks every level and writes resulting limits into `S.over[key]`.
- `refineShape(q, schedule)` re-refines one shape from 4 edges and writes only that key.
- `app.handleRefineAll` sets `maxSides = 4`, clears `over`, rebuilds synchronously, refines, then
  schedules a rebuild that applies the per-shape limits.
- `app.handleRefineShape` takes the polygon selected on the live canvas (`curShape()`), refines it
  alone, rebuilds synchronously and keeps `S.maxSides` and every other `S.over` entry untouched.
  `panel()` disables the button when no shape is selected (or the mode is not polygons).

## Rendering

- `partitions()` splits each level's shapes at `S.passArea` into `{ L, S }`, cached against the
  current `doc.layers` array and threshold; `passShapes(level, size)` and `passCount` read it.
- `stepParts(step)` walks `S.order` up to the current pass, skipping hidden levels, so both panes,
  the PDF panes and the copied step SVG all follow the order and the **Levels shown** switches
  without extra branching.
- `liveSvgStr(true)` = source image + step fills + the same contour as the study (white halo,
  blue line, `lineOpacity`) + vertex dots + clickable hit paths for the active pass (polygon mode
  only). Hit paths and split dots are only drawn when the active pass's level is on; `.hit` paths
  are transparent until hovered/selected.
- `studySvgStr()` = white rect + step fills + dark contours + the crosshair group drawn last
  (so it is never covered; `S.crossOpacity` 0 removes it). `crosshairStr()` is exported and
  reused by the stepped SVG export.
- The crosshair draws `crossCount(S.crossV)` vertical and `crossCount(S.crossH)` horizontal
  lines at `k/(n+1)` of the image, as one path stroked twice: a 2.6 px white halo at 55 %
  under a 1.3 px `CROSS` (#76b234) core, dashed 6/4.
- `passList()` builds the draggable order rows (grip, swatch, name, shape count, ↑/↓ buttons);
  `reorderPass` handles both the buttons and HTML5 drag/drop.
- `render()` clamps the step, updates slider/nav, rewrites both panes, then updates the editor.
- `steppedSvgStr()` emits a `fill-i`/`outline-i` pair per pass (in `S.order` order), starts
  hidden-level passes `visibility="hidden"`, and passes a `PASSES` array (name, level, size, on)
  into the embedded script, which fills passes before the current index and applies the phase to it.
- The PDF writer takes its page count from `totalSteps()`, so it stays one page per step.

## PDF export

- `export-pdf.js` writes PDF 1.4 by hand: one page per step, two JPEG panes (DCTDecode) and
  Helvetica text. No library.
- Header logo: `logoPdfOps()` reads `svg.logo path` from `index.html` at export time (single
  source of truth), converts `M/L/H/V/C/Z` into `m/l/c/h` operators with the path's own fill
  colour and `f*` fill rule, and the result is stored once in a shared Form XObject. Each page
  draws it with `q <scale> 0 0 <scale> 36 536 cm /Logo Do Q`, where the scale is
  `26 / 230` (header height ÷ viewBox height) — not the logo's width/height, which would scale it
  off the page.
- The hosted app is linked from a right-aligned green label (`SITE_LABEL`) in the header. Its x is
  computed from Helvetica AFM advance widths, and each page carries a `/Link` annotation with a
  `/URI` action over the label, so the whole line is clickable.
- `drawCrosshair()` mirrors the SVG crosshair on the rasterised study pane (never the reference
  pane): same 1–3 lines per axis, 6/4 dash, white halo then green core, scaled with the pane. It is
  skipped entirely at opacity 0, so a hidden crosshair never reaches the PDF.

## Conventions

- 2-space indentation, semicolons, single quotes in JS.
- DOM lookups through `$`; no inline HTML handlers.
- Debounced reprocessing (`go`) at 80 ms for slider input.
- UI copy uses "level" for value layers and "step" for the progressive study position.
- Shell layout state lives as a class on `.app` (`panel-hidden`) rather than inline styles, so CSS
  owns the two-column → one-column switch.
