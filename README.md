# Squint — Live Canvas + Value Study

Squint turns a reference photo into a **progressive greyscale value study**, then rebuilds each
tonal shape as a **blocking polygon with the fewest edges that still hold the likeness**.

The live canvas and the value study share one workspace: the left pane overlays the current
value step on your photo and lets you click individual shapes, while the right pane shows the
same step as a clean, self-contained study on white. One scrubber drives both.

No build step, no dependencies — plain HTML, CSS and ES modules.

## Features

- **One merged workspace** — live canvas (left) + progressive value study (right), driven by a
  single step slider. No mode switching.
- **Blocking polygons** — shapes start as a rectangle around each contour, then split their worst
  edge until a per-shape edge limit or the global segment budget is reached.
- **Auto-refine edges** — starts every shape at the minimum of 4 edges, then adds edges in
  coarse-to-fine steps (`5, 3, 1`) until the worst contour point is inside the tolerance. The
  result is the smallest workable polygon per shape. Run it on **all levels** first, then select
  individual shapes and refine **just that shape** at a tighter tolerance — other shapes keep
  their limits.
- **Collapsible settings panel** — once the image, thresholds and shape settings are dialled in,
  hide the right-hand settings column with **Hide panel** (or the `\` key) so the live canvas and
  value study get the whole window. The choice is remembered between visits.
- **Per-shape edge limits** — click any polygon on the live canvas, then nudge its limit by ±1 or
  ±10, type an exact value, reset it, or clear every custom limit.
- **Tunable value steps** — 2–9 steps, manual thresholds per grey, and a threshold curve (γ).
- **Pre-filters** — Kuwahara, bilateral, Gaussian or none, ahead of thresholding.
- **Exports** — a self-contained interactive stepped SVG, a landscape PDF with one page per step,
  or a copy of the current step as SVG.
- **Live-canvas display options** — fills, split dots and curved paths. The blue reference contour
  is drawn from the same data as the value study, so it appears in the outline phases, disappears
  when the study removes the outline, and fades with the Line slider (0 hides it).
- **Guide crosshair** — 1–3 vertical and 1–3 horizontal guide lines over the value study (3 + 3
  divides the image into 16 boxes) for judging placement and proportion. The **Cross** slider sets
  opacity (0 hides it); while visible, the crosshair is included in the SVG and PDF exports.
- **Levels shown** — one switch per value level under the grey chips (G0 … black). All are on by
  default; switch one off and its fills, contours and hit areas leave the study, the live canvas and
  the exports, so you can study, say, just G0 and black.
- **Lichess-inspired light palette** (neutral greys + a single green accent, one shade lighter
  than lichess) with a matching dark theme.
- **Keyboard-first stepping** — arrow keys, Home/End and PageUp/PageDown, plus `\` to show or
  hide the settings panel.

## Quick start

ES modules need to be served over HTTP; opening `index.html` from the filesystem (`file://`) will
not load the app. Any static server works:

```powershell
# Python 3
python -m http.server 8000

# or Node (no install)
npx serve .
```

Then open <http://localhost:8000/>. Click **Load sample** to explore without an image.

## Workflow

1. **Load an image** with *Choose image* (or start from the sample).
2. Set the number of **grey steps** and adjust thresholds if needed. The study keeps its current
   step when the count changes — the same level and phase stay in view, and a study that was
   already complete stays complete. **Levels shown** switches any grey (or black) out of the study
   without changing its threshold or polygons.
3. Pick a **shape style**:
   - *Smooth curves* — tolerance-based simplification, good for painterly output.
   - *Blocking polygons* — polygon construction with per-shape edge limits.
4. For blocking polygons, choose **Inscribed** or **Containing** (Containing is the default) and a
   default edge limit.
5. Click a shape on the **live canvas** to select it, then tune its edge limit in the polygon editor.
6. Click **Refine all levels** for a full pass. Every shape is reset to 4 edges first, so
   refinement grows each one from the minimum to the least number of edges that meets the
   tolerance. Then select individual shapes on the live canvas, lower the tolerance (for example
   `1.5` or `2`), and click **Refine current shape** to add detail to that shape only — every
   other shape keeps the limit the full pass gave it.
7. Step through the study with **← Prev / Next →**, the slider, **Play**, or the arrow keys.
   Each level has three phases: *outline only* → *fill + outline* → *outline removed*. The live
   canvas mirrors those phases, and the **Line** slider controls the reference contour's opacity.
   The **Cross** slider sets the guide crosshair's opacity, and **V**/**H** set how many vertical
   and horizontal guide lines it draws (1–3 each).
8. When the settings are settled, click **Hide panel** (or press `\`) to give the whole window to
   the live canvas and the study. **Show panel** brings the settings back; the button stays in the
   header, and the last choice is restored on the next visit.
9. Export with **Export stepped SVG**, **Export PDF**, or **Copy step SVG**.

### Defaults

| Setting | Default |
| --- | --- |
| Fills | On |
| Split dots / Curved paths | Off |
| Reference contour | Mirrors the study phase; Line slider sets opacity (0 hides) |
| Guide crosshair | 1 × 1 lines on the study at 90% opacity; **V**/**H** set 1–3 lines per axis, **Cross** sets opacity |
| Levels shown | Every level on (G0 … black); switches are kept by level name across grey-count changes |
| Shape style | Smooth curves |
| Polygon type | Containing (edges outside the shape) |
| Default edge limit per shape | 250 |
| Auto-refine starting limit | 4 edges, then coarse → fine steps (all levels, or the selected shape) |

> The live canvas mirrors the study's current phase: fills appear as the study fills levels,
> and the blue contour only exists while the study shows an outline. Use the **Line** slider to
> fade it; **Split dots** shows the active level's polygon vertices.

## Deploying to GitHub Pages

The site is a plain static build rooted at the repository root.

1. Commit and push the repository to GitHub.
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/ (root)**, then **Save**.
5. The app is published at `https://<username>.github.io/<repository>/`.

For this repo the expected address is `https://<your-username>.github.io/squint-value-study/`.

## Project structure

```
index.html                  Markup for the merged workspace and sidebar
assets/
  css/main.css              Theme tokens, layout, responsive rules, dark mode
  js/
    app.js                  Wiring: controls, keyboard, image input, init
    state.js                Shared settings, document data and derived helpers
    image.js                Sample image, file decoding and luminance extraction
    filters.js              Kuwahara, bilateral and Gaussian pre-filters
    geometry.js             Cleanup, contour tracing, smoothing, RDP, SVG paths
    polygons.js             Blocking-polygon build, error curves, auto-refine
    pipeline.js             Thresholds → contours → layers → render
    render.js               Live canvas, value study, polygon editor, labels
    export-svg.js           Self-contained interactive stepped SVG
    export-pdf.js           Multi-page landscape PDF writer
README.md
.gitignore
```

### How the step model works

With `n` grey steps there are `n-1` value layers. The study runs `1 + 3(n-1)` steps:

- step `0` — pure white base;
- for each level `j`, three phases — outline only, fill + outline, outline removed.

The active level for editing is derived from the current study step, so the live canvas and the
selectable polygons always match what you are looking at. At step `0`, level 1 (`G0`) is active.

### Technical notes

- Contours are traced with marching squares, smoothed with a circular Gaussian, and simplified
  with Ramer–Douglas–Peucker (curve mode) or worst-edge splitting (polygon mode).
- `S` (settings) and `doc` (image, thresholds, layers, cached error curves) are shared mutable
  objects exported from `state.js`; this keeps the modules acyclic.
- The PDF is written byte-by-byte with embedded JPEG panes, so no external library is needed.
- Source images are downscaled to a maximum dimension of 680 px for responsive tracing.
- The only thing kept between visits is the settings-panel preference (`squint.panelHidden` in
  `localStorage`); all other settings reset on reload.
- Everything runs locally in the browser; no uploads, no analytics.

### Browser support

Modern evergreen browsers (Chrome, Edge, Firefox, Safari) with ES modules, `dvh/svh` units and
`Path2D` support. The clipboard fallback reveals a text box when the async Clipboard API is not
available (for example on `file://` or non-secure origins).
