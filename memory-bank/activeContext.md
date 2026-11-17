# Active Context

## Current focus

The single-file prototype has been restructured into a dependency-free static site and the two
former workspace modes (preview and value study) are merged.

## Recent changes (this session)

- Merged Preview and Value Study into one always-split workspace. The left pane is the live
  canvas (source + current step overlay, clickable polygons); the right pane is the progressive
  study. A single step slider/nav/play controls both.
- Removed the mode switch, the separate preview bar and duplicate study export buttons.
- New palette: neutral greys and a single green accent, one shade lighter than lichess.
  Overlay contours and selection use a blue accent for contrast. Dark theme updated.
- File picker restyled as a button-sized label with an upload icon and a filename line.
- Defaults: fills on, outlines off, split dots off, curved paths off.
- Blocking polygons default to Containing and a 250-edge default limit.
- Auto-refine now resets `maxSides` to 4 and clears custom limits before growing shapes.
- Split the app into `index.html`, `assets/css/main.css` and ten ES modules. Old
  `squint-value-study.html` deleted.
- Added `README.md` and `.gitignore`; commit made with GitHub Desktop's bundled git.

## Next steps

- Try a real photograph (not the noisy sample) to judge defaults for smoothness and noise.
- Consider persisting settings/thresholds in `localStorage`.
- Consider a hover highlight on the live canvas.
- Evaluate whether the "outline only" phase should force a contour on the live canvas when the
  outlines toggle is off (currently the left pane shows only the photo).

## Decisions

- Editing level is derived from the study step (`activeLayer`), not a separate pass control.
- Render toggles apply to the live canvas only; the study always shows fills + contours.
- ES modules require HTTP; README documents `python -m http.server` / `npx serve`.
