# Tech Context

## Stack

- HTML5 + CSS3 (custom properties, grid, `dvh`/`svh`, `prefers-color-scheme`).
- Vanilla JavaScript, native ES modules (`<script type="module">`).
- Canvas 2D for raster input and PDF page rasterisation; SVG for previews/exports.
- No package.json, bundler, framework or third-party runtime code.

## Development setup

- Serve the repository root over HTTP:
  - `python -m http.server 8000`
  - `npx serve .`
- Open `http://localhost:8000/`.

## Environment notes

- Windows 11, PowerShell. `git` is not on PATH; use GitHub Desktop's bundled binary:
  `C:\Users\Brennen Chua\AppData\Local\GitHubDesktop\app-3.6.11\resources\app\git\cmd\git.exe`.
- Node 24 is available for syntax checks (`node --check` with `.mjs` copies) and CDP test scripts.
- Edge is installed at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`; headless
  Edge + CDP was used for integration tests and screenshots.
- `npm.ps1` is blocked by PowerShell execution policy; invoke `node` directly.

## Constraints

- ES modules fail on `file://` — HTTP is required.
- Input images are capped at 680 px on the long edge for tracing speed.
- Kuwahara/bilateral are O(pixels × radius²); strength is capped at 6.
- Clipboard writes need a secure context (HTTPS or localhost); a textarea fallback exists.
- PDF export rasterises every step and can take a moment for many steps.

## Deployment

GitHub Pages, branch `main`, folder `/ (root)`. No Jekyll-specific files are required.
