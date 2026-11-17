# Active Context

## Current focus

The single-file prototype has been restructured into a dependency-free static site and the two
former workspace modes (preview and value study) are merged.

## Recent changes (this session)

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
- Auto-refine now resets `maxSides` to 4 and clears custom limits before growing shapes.
- Split the app into `index.html`, `assets/css/main.css` and ten ES modules. Old
  `squint-value-study.html` deleted.
- Added `README.md` and `.gitignore`; commit made with GitHub Desktop's bundled git.

## Next steps

- Try a real photograph (not the noisy sample) to judge defaults for smoothness and noise.
- Consider persisting settings/thresholds in `localStorage`.
- Consider showing a hover preview of edge counts before selecting a polygon.

## Decisions

- Editing level is derived from the study step (`activeLayer`), not a separate pass control.
- The reference contour is generated from the same `stepParts` data as the study, so it appears
  only in the outline phases; the Line slider is its only visibility control.
- ES modules require HTTP; README documents `python -m http.server` / `npx serve`.
