# Progress

## Status

Feature-complete for the requested merge and restructure. Validated in headless Edge.

## Working

- Sample image loads and traces on first paint.
- Merged workspace: live canvas + value study, shared step navigation, play, keyboard.
- Step phases render correctly in both panes.
- Blocking polygon mode: clickable shapes, selection, per-shape limit (±1/±10/typed/reset/clear).
- Auto-refine: resets the default limit to 4, refines the current or all levels, reports counts.
- Live-canvas toggles: fills, split dots, curved paths. The reference contour mirrors the study's
  outline phase and fades with the Line slider; unselected hit areas are invisible until hovered.
- Pre-filters, thresholds, gamma, smoothing, segment budget.
- Exports: stepped SVG, PDF, copy current step SVG.
- Responsive desktop/mobile layout; dark theme.
- README and .gitignore.

## Validation

- `node --check` passed for all ten modules (checked as `.mjs`).
- Every `$('id')` reference exists in `index.html`.
- Headless Edge CDP suite: 21 checks passed, zero console/runtime errors, including a real pointer
  hit-test, contour mirroring/removal, line-slider hiding, header order and mobile stage height.
- Screenshots reviewed at 1440×900 and 390×844.

## Known issues / deliberate behaviour

- The selected polygon keeps a dashed blue highlight even when the study has removed its contour;
  this is the editing affordance, not part of the value rendering.
- "Refine current level" at step 0 targets level G0 (shown as "Editing G0" in the live badge).
- Per-shape selections are tied to a level; switching levels leaves the editor waiting for a click.
- The sample image includes random noise, so shape counts vary slightly between reloads.

## Evolution

- v1: single HTML file with separate Preview and Value Study modes.
- v2: merged workspace, lichess-inspired palette, modular ES module structure, new defaults and
  auto-refine behaviour, documented static deployment.
- v2.1: header hierarchy (Squint above the subtitle); reference contour mirrors the study phase and
  is controlled by the Line slider; invisible hit areas with hover/selection cues.
