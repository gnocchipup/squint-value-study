# Product Context

## Why it exists

Value studies train artists to see big shapes before detail. Squinting blurs detail so the
light/dark structure becomes obvious. Squint automates that squint, then turns each tonal mass into
a polygonal block that can be drawn or painted with the fewest possible edges.

## Problems solved

- Artists cannot easily see how many edges a shape really needs.
- Comparing a reference against a progressive study usually requires two tools.
- Exporting a classroom-ready stepped study (SVG/PDF) is tedious.

## How it should feel

- Immediate: the sample image loads on first visit; controls are debounced but responsive.
- Comparative: the live canvas and the study sit side by side at the same scale.
- Deliberate: stepping through values is the primary navigation; editing is secondary and
  always tied to the level currently in view.
- Minimal: neutral chrome, one green accent, no decorative noise, so the artwork dominates.

## UX rules

- Live-canvas toggles (fills, split dots, curved paths) never change the value study's
  progression. The reference contour mirrors the study's outline phase and is faded by the Line
  slider only.
- Selecting a polygon is level-specific; changing levels may leave the editor idle until a shape
  on the new level is clicked.
- Auto-refine is destructive on purpose: it clears per-shape limits and restarts from 4 edges.
