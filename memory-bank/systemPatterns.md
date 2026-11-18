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
  export-svg.js steppedSvgStr (embedded interactive script)
  export-pdf.js PDF writer with JPEG-embedded panes
  app.js        wiring, keyboard, file input, init
```

## State

- `S` holds user settings and render options (`mode`, `ptype`, `maxSides`, `over`, `steps`,
  `studyStep`, `fills`, `outlines`, `dots`, `curves`, opacities, filter settings).
- `doc` holds per-image data: dimensions, luminance, thresholds, manual thresholds, selected grey,
  layers, cached contours (`LP`) and error curves (`EC`), source data URLs.
- Both are exported objects, not reassigned imports, so modules stay acyclic and live-updating.

## Step model

- `layerCount = steps - 1`.
- `totalSteps = 1 + 3 * layerCount`.
- Step 0 = white base. For step > 0: `j = floor((step-1)/3)`, `phase = (step-1) % 3`.
- `activeLayer()` returns `j` (0 at step 0); `activePass()` is `layerCount` naming (`W`, `G0..`,
  `B`).
- `stepParts(step)` returns fills for `j < level`, plus fill/outline rules for the current level.

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

- `liveSvgStr(true)` = source image + step fills + the same contour as the study (white halo,
  blue line, `lineOpacity`) + vertex dots + clickable hit paths for the active level (polygon mode
  only). Hit paths are transparent until hovered/selected.
- `studySvgStr()` = white rect + step fills + dark contours + a centred crosshair group drawn last
  (so it is never covered; `S.crossOpacity` 0 removes it).
- `render()` clamps the step, updates slider/nav, rewrites both panes, then updates the editor.

## Conventions

- 2-space indentation, semicolons, single quotes in JS.
- DOM lookups through `$`; no inline HTML handlers.
- Debounced reprocessing (`go`) at 80 ms for slider input.
- UI copy uses "level" for value layers and "step" for the progressive study position.
