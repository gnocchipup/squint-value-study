# Progress

## Status

Feature-complete for the requested merge and restructure. Validated in headless Edge.

## Working

- Sample image loads and traces on first paint.
- Merged workspace: live canvas + value study, shared step navigation, play, keyboard.
- Step phases render correctly in both panes.
- Blocking polygon mode: clickable shapes, selection, per-shape limit (±1/±10/typed/reset/clear).
- Auto-refine: a full pass resets the default limit to 4 and refines every shape on every level;
  a scoped pass refines only the polygon selected on the live canvas and reports the edge change.
- Live-canvas toggles: fills, split dots, curved paths. The blue reference contour mirrors the
  study's outline phase and fades with the Line slider; unselected hit areas are invisible until
  hovered.
- Pre-filters, thresholds, gamma, smoothing, segment budget.
- Exports: stepped SVG, PDF, copy current step SVG.
- Responsive desktop/mobile layout; dark theme.
- Source-image and auto-refine action buttons share a 36 px height and align on both edges;
  the file-picker label resets the global label margin and matches the button font.
- README and .gitignore.

## Validation

- `node --check` passed for all ten modules (checked as `.mjs`).
- Every `$('id')` reference exists in `index.html`.
- Headless Edge CDP suite: 25 checks passed, zero console/runtime errors, including a real pointer
  hit-test, contour mirroring/removal and colour, line-slider hiding, header order, shared
  action-button heights/alignment and mobile stage height.
- Refine-current-shape CDP suite: 18/18 checks passed. At 4 px tolerance a full pass produced
  20 per-shape limits; selecting shape `0:370,323` (89 edges) and refining at 1.5 px took it to 173
  edges while every other shape kept its limit, edge count and exact geometry and `maxSides`
  stayed at 4; re-refining at 4 px returned it to 89 edges. Deselecting disables the button.
- Screenshots reviewed at 1440×900 and 390×844.

## Known issues / deliberate behaviour

- The selected polygon keeps a dashed blue highlight even when the study has removed its contour;
  this is the editing affordance, not part of the value rendering.
- "Refine current shape" targets the polygon selected on the active level; only shapes on that level
  are clickable, and at step 0 the active level is G0.
- Per-shape selections are tied to a level; switching levels leaves the editor waiting for a click.
- The sample image includes random noise, so shape counts vary slightly between reloads.

## Evolution

- v1: single HTML file with separate Preview and Value Study modes.
- v2: merged workspace, lichess-inspired palette, modular ES module structure, new defaults and
  auto-refine behaviour, documented static deployment.
- v2.1: header hierarchy (Squint above the subtitle); reference contour mirrors the study phase and
  is controlled by the Line slider; invisible hit areas with hover/selection cues.
- v2.2: action buttons share a height and align; the reference contour stays blue for readability
  while the study keeps its dark contour.
- v2.3: "Refine current level" replaced by "Refine current shape"; a full pass at a loose tolerance
  can be followed by per-shape passes at tighter tolerances without disturbing other shapes.
