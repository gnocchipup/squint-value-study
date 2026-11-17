# Project Brief — Squint

## Purpose

Squint is a browser-based value study tool. It converts a reference photo into a progressive
greyscale study, then rebuilds each tonal region as a blocking polygon with the fewest edges that
preserve the shape.

## Scope

- Single-page static app, deployed to GitHub Pages from the repository root.
- Merged workspace: live canvas (photo + value overlay, editable polygons) beside a progressive
  value study on white.
- One shared step scrubber drives both panes; each value level has three phases (outline only,
  fill + outline, outline removed).
- Blocking polygons with per-shape edge limits and an auto-refine pass that starts at 4 edges.
- Exports: self-contained stepped SVG, multi-page PDF, copy current step SVG.
- No backend, no uploads, no build step, no runtime dependencies.

## Non-goals

- Colour painting or palette guidance.
- Server-side processing or persistence between sessions.
- Vectorising arbitrary colour images beyond tonal blocking.
