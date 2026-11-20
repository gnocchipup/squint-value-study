# Active Context

## Current focus

The single-file prototype has been restructured into a dependency-free static site and the two
former workspace modes (preview and value study) are merged.

## Recent changes (this session)

- Added a **settings-panel toggle**: a "Hide panel / Show panel" button in the workspace header
  (sidebar icon, `aria-expanded`, `aria-controls="sidebar"`) plus a `\` keyboard shortcut (ignored
  while typing in a field). Hiding adds `.panel-hidden` to `.app`, which collapses the shell to a
  single grid column and removes the sidebar, so the live canvas and value study take the reclaimed
  width (measured 333 → 473 px of artwork on a 1100 px-wide window). Focus moves to the button when
  the panel is hidden; the choice is stored in `localStorage` (`squint.panelHidden`) and restored on
  load.
- Replaced “Refine current level” with **Refine current shape**: it re-refines only the polygon
  selected on the live canvas (from 4 edges up to the tolerance) and writes only that shape's
  limit. “Refine all levels” remains the full reset pass. The button is disabled until a polygon
  is selected and its message reports the shape's edge change and that other shapes kept their
  limits.
- Merged Preview and Value Study into one always-split workspace. The left pane is the live
  canvas (source + current step overlay, clickable polygons); the right pane is the progressive
  study. A single step slider/nav/play controls both.
- Removed the mode switch, the separate preview bar and duplicate study export buttons.
- Header hierarchy changed: “Squint” on top, with “Live canvas — Value study” beneath it.
- New palette: neutral greys and a single green accent, one shade lighter than lichess.
  Reference contours stay blue with a white halo for visibility over photos; the study uses dark
  ink; selection is a dashed blue outline. Dark theme updated.
- File picker restyled as a button-sized label with an upload icon and a filename line.
- Defaults: fills on, split dots off, curved paths off. The reference contour follows the study
  phase and its opacity is controlled by the Line slider; the Outlines checkbox was removed.
- Clickable hit areas are invisible until hovered or selected; the selected polygon gets a dashed
  blue outline.
- Source-image actions (Load sample / Choose image) and auto-refine actions (Refine current level /
  Refine all levels) share one fixed 36 px height. The file-picker label resets the global label
  margin so it aligns exactly with the buttons, and uses the standard button font size.
- Blocking polygons default to Containing and a 250-edge default limit.
- Auto-refine now resets `maxSides` to 4 and clears custom limits before growing shapes (all-levels
  pass only; the per-shape pass leaves the default and other limits alone).
- Split the app into `index.html`, `assets/css/main.css` and ten ES modules. Old
  `squint-value-study.html` deleted.
- Added `README.md` and `.gitignore`; commit made with GitHub Desktop's bundled git.

## Next steps

- Try a real photograph (not the noisy sample) to judge defaults for smoothness and noise.
- Consider persisting settings/thresholds in `localStorage`.
- Consider showing a hover preview of edge counts before selecting a polygon.

## Recent changes (this session)

- Replaced “Squint” h2 title with inline SVG logo (eye + script “Squint”) based on image 1; CSS added for sizing.
- Replaced green+white-dot favicon data URI with black eye-icon SVG favicon based on image 2.
- PDF header now uses the app logo instead of the "Squint" text title: the inline SVG paths are converted to PDF vector ops at export time and drawn once per page through a shared Form XObject. A right-aligned green link to the hosted app sits in the header, clickable via a per-page /Link /URI annotation.
- Crosshair fixed: it is now the last element of the study SVG, pinned to the image centre, 0.5 px dashed, and driven by one Cross opacity slider (`crossOpacity`, default 0.6, 0 hides it). The old Cross X / Cross Y position sliders were removed.
- Added guide crosshair to the value study: Cross opacity range input in workbar-opts, `crossOpacity` state in state.js, crosshair dashed lines rendered on the study pane SVG, slider wiring in app.js.
- Crosshair is now a grid: **V** and **H** number inputs beside the Cross opacity slider set 1–3 evenly spaced lines per axis, so 3 + 3 lines divide the study into 16 boxes (1 + 1 keeps the old centre cross). `crossV` / `crossH` live in `S` and go through `crossCount()` (1–3 clamp); the inputs normalise on `change`.
- Crosshair visibility raised: a 1.3 px green core over a 2.6 px translucent white halo, 6/4 dashes and a 0.9 default opacity (was 0.5 px, 4/4, 0.6), so it reads over pale and dark fills; the Cross slider is still the only way to tone it down, and 0 removes it from the markup.
- The crosshair is now exported: `crosshairStr()` is shared with the stepped SVG (painted after every outline group, inside the artwork group) and the PDF rasteriser draws the same halo + core on the study pane of every page. Both omit it entirely when the Cross opacity is 0.
- Changing the grey count no longer rewinds the step slider to pure white: `remapStep(step, oldSteps, newSteps)` in `state.js` keeps the same step number (so the same level and phase stay in view), clamps it into the new range, and maps a study that was on its last step to the new last step (12 → 15 when adding a grey, 9 → 3 when dropping to 2 greys). `app.js` applies it before assigning `S.steps`; the step slider's `max` still only updates once reprocessing finishes.

## Decisions

- Auto-refine workflow: one full pass at a loose tolerance, then select individual shapes for
  tighter tolerances. Per-shape refinement is intentionally non-destructive to other shapes.
- Editing level is derived from the study step (`activeLayer`), not a separate pass control.
- The reference contour is generated from the same `stepParts` data as the study, so it appears
  only in the outline phases; the Line slider is its only visibility control.
- ES modules require HTTP; README documents `python -m http.server` / `npx serve`.
