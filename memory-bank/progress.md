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
- Settings panel can be hidden from the header (**Hide panel** / **Show panel**) or with `\`, giving
  the live canvas and study the full window; the choice persists in `localStorage`.
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
- Crosshair suite: 73 checks across all 13 steps (present, painted after every fill/contour, centred, 0.5 px, opacity mirrored, hidden at 0) plus a live CDP run at step 4 — crosshair on top, both axes centred and full-span, opacity slider live, zero console errors. A preview page confirmed G0 fill, fully dark and opacity-0 rendering.
- PDF header suite: 32 structural checks on a 13-page export (xref offsets, stream lengths, shared logo form BBox and 4 fills, one /Link annotation per page, green right-aligned label, no text-title fallback). Rendered pages 1, 6 and 13 with the Windows PDF engine to confirm the logo and link appear on every page.
- Settings-panel suite: 21/21 checks in headless Edge via CDP at 1440×900, 1100×900 and 390×844 —
  button presence/copy/ARIA, sidebar `display:none`, single-column shell, pane widths 503 → 686 px,
  step navigation while hidden, `\` shortcut toggling both ways (and ignored inside a text field),
  focus hand-off, stored preference surviving reload in both directions, artwork growing 333 → 473 px
  on a width-bound 1100 px window, no horizontal overflow on mobile, and zero console errors.
  Screenshots reviewed in light, dark and mobile layouts.

## Completed (this session)

- Collapsible settings panel: header toggle + `\` shortcut collapses the right-hand sidebar to a
  single-column shell, restores focus out of the hidden panel and remembers the choice in
  `localStorage`.
- SVG logo replaces “Squint” text title (image 1 converted to inline SVG).
- SVG favicon replaces green+white-dot favicon (image 2 converted to inline SVG).
- Guide cross slider added to value study (Cross X / Cross Y controls render dashed crosshair on study pane).
- Crosshair corrected: pinned to the centre, drawn as the top layer of the study SVG so no fill or contour can hide it, thinned to a 0.5 px dashed line, and controlled by a single Cross opacity slider; Cross X / Cross Y removed.
- PDF export header: the logo replaces the "Squint" text title (inline SVG paths converted to PDF vector ops, shared Form XObject, uniform 26/230 scale), and a right-aligned green label links to https://gnocchipup.github.io/squint-value-study/ through a /Link /URI annotation on every page.

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
- v2.4: SVG logo replaces "Squint" title; black eye-icon SVG favicon replaces green+white-dot favicon;
  guide cross slider added to value study with Cross X / Cross Y dashed crosshair overlay.
- v2.5: crosshair pinned to the centre, painted last so it never disappears behind fills, thinned to
  0.5 px, and controlled by a single Cross opacity slider instead of Cross X / Cross Y.
- v2.6: PDF header carries the app logo as vector paths plus a clickable link to the hosted site.
- v2.7: settings panel can be collapsed (header toggle or `\`), letting the live canvas and value
  study take the full window; the preference persists across visits.
