# Progress

## Status

Feature-complete for the requested merge and restructure. Validated in headless Edge.

## Working

- Sample image loads and traces on first paint.
- Merged workspace: live canvas + value study, shared step navigation, play, keyboard.
- Changing the grey count keeps the step slider in place: the same level and phase stay in view, a
  complete study stays complete, and the step only clamps when the new range is shorter.
- Step phases render correctly in both panes.
- Blocking polygon mode: clickable shapes, selection, per-shape limit (±1/±10/typed/reset/clear).
- Auto-refine: a full pass resets the default limit to 4 and refines every shape on every level;
  a scoped pass refines only the polygon selected on the live canvas and reports the edge change.
- Live-canvas toggles: fills, split dots, curved paths. The blue reference contour mirrors the
  study's outline phase and fades with the Line slider; unselected hit areas are invisible until
  hovered.
- Guide crosshair: independent **V** and **H** line counts (1–3 each; 3 + 3 = 16 boxes), a white
  halo under a green core with 6/4 dashes, and a Cross opacity slider that fades or hides it. It is
  included in the stepped SVG and in every PDF page's study pane.
- **Levels shown** switches per value level (G0 … Black), all on by default; a level that is off
  leaves its fills, contours, hit areas and split dots out of both panes and out of the SVG/PDF
  exports, while its threshold and polygons are kept.
- **Block-in order**: each value splits into a large and a small pass at a settable area threshold,
  and a draggable list (plus ↑/↓ and **Reset order**) sets the block-in sequence. The step slider
  follows the order: 8 passes at 5 greys, 24 steps, three phases each.
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
- Crosshair-grid suite: 29/29 checks in headless Edge at 1440×900 and 390×844 — defaults (1 + 1, 0.9 opacity, 6/4 dash, 2.6 px white halo + 1.3 px green core, last child of the study SVG), V and H set independently to 3, lines land on the quarter marks (480×600 → x 120/240/360, y 150/300/450), values clamp to 1–3 and the inputs normalise on change, opacity 0 removes the group. Stepped SVG carries the crosshair after every outline group inside the artwork group and omits it at 0; the 13-page PDF drew 13 dash passes and 156 moveTo/lineTo pairs (12 segments per page: halo + core, right pane only) and drew none at 0. No mobile overflow; screenshots reviewed at step 6 (3 × 3) and step 12 (1 × 1).
- Step-preservation suite: 18/18 checks in headless Edge — at the last step, adding a grey moves 12/12 to 15/15 and stays on BLACK · OUTLINE REMOVED; step 6 is untouched when greys go 5 → 7 (range 18) or 4 (range 9), keeping G1 · OUTLINE REMOVED; last step 9 → 3 when dropping to 2 greys and the study is still complete (fills present); step 0 stays PURE WHITE while greys go 2 → 9; step 7 survives 9 → 5 → 9; a four-tick drag from 9 → 5 greys at the end lands on 12/12, not an intermediate step; zero runtime errors. Screenshot reviewed.
- Levels-shown suite: 30/30 checks in headless Edge at 1440×900 — four switches (G0/G1/G2/Black) all on by default and the finished study carries all four tones (191/128/64/0); switching G1 off removes 128 from the study and live canvas and dims its threshold chip; G0 + Black leaves only 191 and 0; at step 8 a hidden G2 contributes no contour and switching it back restores its fill and contour; switches survive grey-count changes by level name (4 greys keeps G1 off while the new Black stays on, G2 returns off, Black stays off when it becomes the third level); hidden black loses its hit paths and split dots and the badge reads "(hidden)"; the stepped SVG carries `ON=[true,false,false,true]`, starts disabled groups hidden and, loaded in an iframe and stepped to 12 / 12, shows only fill-0 and fill-3; the PDF painted only #bfbfbf and #000000 (26 fill calls); zero runtime errors. Screenshot reviewed.
- Block-in suite: 48/48 checks in headless Edge at 1440×900 and 390×844 — eight passes in default order with shape counts, 24-step slider, step 1/2/3 phases on G0 large, step 13 opening the small passes over all four large tones, the last step filling every non-empty pass; ↓/↑ buttons and an HTML5 drag (DataTransfer + DragEvent) reorder the list while the current pass stays in view; the area slider at 100 / 8000 px² shifts shapes between large and small (11/20 → 24/7 → 9/22) and shrinks the leading pass d from 6933 to 3940; hiding G1 dims and drops both its passes; grey-count changes rebuild the order (6 passes at 4 greys, default restored at 5) while keeping a mid-study pass/phase or the finished last step; polygon selection is scoped to the pass in view (a large G0 shape is editable at pass 1, and switching to the G0 small pass clears the editor while exposing the small hit areas); the stepped SVG has 8 per-pass groups, `TOTAL=25`, pass names, follows a reorder (fill 0 black) and ends at 24 / 24 with every group visible; the PDF has 25 pages titled with pass and size; crosshair still drawn last; no runtime errors; no mobile overflow. Screenshots reviewed.
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
- Crosshair guides scaled up: **V** and **H** counts (1–3 lines per axis, 16 boxes at 3 + 3), a thicker high-contrast halo + green core with a 0.9 default opacity, and the crosshair is now part of the stepped SVG and PDF exports.
- Step slider no longer rewinds when the grey count changes: `remapStep()` keeps the current level and phase (a complete study stays complete) and only clamps when the new range is shorter.
- Per-level **Levels shown** switches (G0 … Black) filter fills, contours, hit areas and split dots in both panes and in the stepped SVG and PDF exports, while thresholds and polygons are untouched.
- **Block-in passes**: every value splits into a large and a small shape pass at a settable area threshold, and a draggable order list (drag or ↑/↓) drives the step slider, the stepped SVG and the PDF.

## Known issues / deliberate behaviour

- The selected polygon keeps a dashed blue highlight even when the study has removed its contour;
  this is the editing affordance, not part of the value rendering.
- A level switched off in **Levels shown** keeps its three steps in the progression (they simply
  show no change), so step numbering, exports and the PDF page count stay stable. The polygon data
  is preserved, so switching the level back on restores its shapes and any selection.
- A pass can be empty when no shape of that level falls on its side of the area threshold; it still
  owns its three steps and simply paints nothing, so the order list and step numbers stay stable.
- Polygon editing is scoped to the pass in view: only that pass's shapes get hit areas, and
  `curShape()` ignores a selection made in another pass of the same level, so stepping to a new
  pass leaves the editor waiting for a click.
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
- v2.8: crosshair becomes a configurable guide grid (1–3 vertical + 1–3 horizontal lines, 16 boxes
  at maximum) with a high-contrast white-halo/green-core stroke, and it is exported in the stepped
  SVG and the PDF study panes.
- v2.9: changing the grey count keeps the study's step (same level and phase, complete stays
  complete) instead of rewinding to pure white.
- v3.0: **Levels shown** switches per value level (G0 … Black) filter fills, contours, hit areas and
  dots from both panes and from the SVG/PDF exports, so a study can be reduced to a chosen subset of
  values.
- v3.1: block-in passes — each value splits at a settable area into a large and a small shape pass,
  and a draggable pass order drives the study, the stepped SVG and the PDF.
