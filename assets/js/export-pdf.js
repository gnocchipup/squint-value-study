/* Landscape PDF export: one page per progressive step, reference + study. */
import { $, S, doc, clamp, crossCount, OVERLAY, CONTOUR, CROSS } from './state.js';
import { stepParts } from './render.js';

const PDF_W = 842;
const PDF_H = 595; /* A4 landscape, points */

/* Header extras: the app's inline logo is redrawn as PDF vector paths and the
   hosted site is linked from a right-aligned label on every page. */
const SITE_URL = 'https://gnocchipup.github.io/squint-value-study/';
const SITE_LABEL = 'gnocchipup.github.io/squint-value-study';
const SITE_SIZE = 8.5;
const SITE_BASE = 546;
const SITE_RIGHT = PDF_W - 36;
const LOGO_BOX = { x: 36, y: 536, h: 26 };
const LOGO_VB = { x: 68, y: 46, w: 558, h: 230 };
const LOGO_SCALE = LOGO_BOX.h / LOGO_VB.h; /* header height / viewBox height */

/* Helvetica advance widths (/1000 em) for the characters in SITE_LABEL, so the
   link can be right-aligned without a text-shaping engine. */
const HELV_W = {
  a: 556, b: 556, c: 500, d: 556, e: 556, g: 556, h: 556, i: 222, l: 222,
  n: 556, o: 556, p: 556, q: 556, s: 500, t: 278, u: 556, v: 500, y: 500,
  '.': 278, '/': 278, '-': 333
};
const helvWidth = (s, size) =>
  ([...s].reduce((w, ch) => w + (HELV_W[ch] || 556), 0) * size) / 1000;
const siteX = () => SITE_RIGHT - helvWidth(SITE_LABEL, SITE_SIZE);
const siteRect = () => [siteX() - 1.5, SITE_BASE - 3, SITE_RIGHT + 1, SITE_BASE + 6.5];
const loadImg = src =>
  new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('image load failed'));
    im.src = src;
  });

function dataUrlBytes(u) {
  const bin = atob(u.slice(u.indexOf(',') + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pdfEsc(s) {
  return String(s)
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/* Guide crosshair, drawn over the study pane exactly as the on-screen SVG does:
   1-3 evenly-spaced dashed lines per axis, a white halo under a green core. */
function drawCrosshair(ctx) {
  if (!(S.crossOpacity > 0)) return;
  const v = crossCount(S.crossV);
  const h = crossCount(S.crossH);
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.lineCap = 'round';
  for (const [colour, width, alpha] of [['#ffffff', 2.6, 0.55], [CROSS, 1.3, 1]]) {
    ctx.globalAlpha = S.crossOpacity * alpha;
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let k = 1; k <= v; k++) {
      const x = (doc.W * k) / (v + 1);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, doc.H);
    }
    for (let k = 1; k <= h; k++) {
      const y = (doc.H * k) / (h + 1);
      ctx.moveTo(0, y);
      ctx.lineTo(doc.W, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/* Draw one study pane onto a 2D canvas (mirrors the on-screen SVG panes). */
function drawStudyPane(ctx, step, isOverlay, refImg, scale) {
  const { fills, outlines } = stepParts(step);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (isOverlay) ctx.drawImage(refImg, 0, 0, doc.W, doc.H);
  else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, doc.W, doc.H);
  }
  ctx.globalAlpha = isOverlay ? S.fillOpacity : 1;
  for (const q of fills) {
    ctx.fillStyle = `rgb(${q.gray},${q.gray},${q.gray})`;
    ctx.fill(new Path2D(q.d), 'evenodd');
  }
  ctx.globalAlpha = 1;
  if (isOverlay) {
    ctx.globalAlpha = S.lineOpacity * 0.7;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.4;
    for (const q of outlines) ctx.stroke(new Path2D(q.d));
    ctx.globalAlpha = S.lineOpacity;
    ctx.strokeStyle = OVERLAY;
    ctx.lineWidth = 1.5;
    for (const q of outlines) ctx.stroke(new Path2D(q.d));
    ctx.globalAlpha = 1;
  } else {
    ctx.strokeStyle = CONTOUR;
    ctx.lineWidth = 1.35;
    for (const q of outlines) ctx.stroke(new Path2D(q.d));
    drawCrosshair(ctx);
  }
}

function stepTitleAscii(step) {
  const layerCount = S.steps - 1;
  if (step === 0) return 'Pure white - blank base';
  const n = step - 1;
  const j = Math.floor(n / 3);
  const phase = n % 3;
  const name = j === layerCount - 1 ? 'Black' : 'G' + j;
  const ph = phase === 0 ? 'outline only' : phase === 1 ? 'fill + outline' : 'outline removed';
  return name + ' - ' + ph;
}

/* Path operators for the header logo, read from the inline SVG in index.html so
   the page markup stays the single source of truth. Coordinates are moved into
   the logo's own space (origin at the viewBox corner, y up) and the page scales
   them into the header box. Returns null when the markup uses a command this
   converter does not handle, and the header then falls back to the old text
   title. */
let logoOps = null;
function logoPdfOps() {
  const els = [...document.querySelectorAll('svg.logo path')];
  if (!els.length) return null;
  const r2 = v => Math.round(v * 100) / 100;
  const X = v => r2(v - LOGO_VB.x);
  const Y = v => r2(LOGO_VB.y + LOGO_VB.h - v);
  const out = [];
  for (const el of els) {
    const d = el.getAttribute('d') || '';
    const tok = d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/g);
    if (!tok) return null;
    const ops = [];
    let i = 0;
    let cmd = '';
    let x = 0;
    let y = 0;
    let sx = 0;
    let sy = 0;
    while (i < tok.length) {
      if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++];
      const up = cmd.toUpperCase();
      const rel = cmd !== up;
      const num = () => +tok[i++];
      if (up === 'M' || up === 'L') {
        const nx = num();
        const ny = num();
        x = rel ? x + nx : nx;
        y = rel ? y + ny : ny;
        if (up === 'M') {
          sx = x;
          sy = y;
          ops.push(`${X(x)} ${Y(y)} m`);
          cmd = rel ? 'l' : 'L';
        } else ops.push(`${X(x)} ${Y(y)} l`);
      } else if (up === 'H' || up === 'V') {
        const n = num();
        if (up === 'H') x = rel ? x + n : n;
        else y = rel ? y + n : n;
        ops.push(`${X(x)} ${Y(y)} l`);
      } else if (up === 'C') {
        const a = [num(), num(), num(), num(), num(), num()];
        const ox = rel ? x : 0;
        const oy = rel ? y : 0;
        ops.push(`${X(a[0] + ox)} ${Y(a[1] + oy)} ${X(a[2] + ox)} ${Y(a[3] + oy)} ${X(a[4] + ox)} ${Y(a[5] + oy)} c`);
        x = a[4] + ox;
        y = a[5] + oy;
      } else if (up === 'Z') {
        ops.push('h');
        x = sx;
        y = sy;
      } else return null;
    }
    const rgb = (el.getAttribute('fill') || 'rgb(0,0,0)').match(/\d+/g) || [0, 0, 0];
    out.push(rgb.slice(0, 3).map(v => (v / 255).toFixed(3)).join(' ') + ' rg');
    out.push(ops.join('\n'));
    out.push(el.getAttribute('fill-rule') === 'evenodd' ? 'f*' : 'f');
  }
  return out.join('\n');
}

function pdfPageContent(index, count, step) {
  const layerCount = S.steps - 1;
  const totalSteps = 1 + layerCount * 3;
  const title = stepTitleAscii(step);
  const boxTop = 486;
  const boxBottom = 56;
  const boxW = 373;
  const leftX = 36;
  const rightX = 433;
  const boxH = boxTop - boxBottom;
  const ar = doc.W / doc.H;
  let dh = boxH;
  let dw = dh * ar;
  if (dw > boxW) {
    dw = boxW;
    dh = dw / ar;
  }
  const x1 = leftX + (boxW - dw) / 2;
  const x2 = rightX + (boxW - dw) / 2;
  const y = boxBottom + (boxH - dh) / 2;
  const f = n => Math.round(n * 100) / 100;
  const L = [];
  L.push('q');
  L.push('0.16 0.16 0.16 rg');
  if (logoOps) {
    const s = Math.round(LOGO_SCALE * 10000) / 10000;
    L.push(`q ${s} 0 0 ${s} ${LOGO_BOX.x} ${LOGO_BOX.y} cm /Logo Do Q`);
  } else L.push(`BT /F2 22 Tf 1 0 0 1 36 545 Tm (${pdfEsc('Squint')}) Tj ET`);
  const linkX = f(siteX());
  L.push('0.463 0.698 0.204 rg');
  L.push(`BT /F1 ${SITE_SIZE} Tf 1 0 0 1 ${linkX} ${SITE_BASE} Tm (${pdfEsc(SITE_LABEL)}) Tj ET`);
  L.push(`0.463 0.698 0.204 RG 0.5 w ${linkX} ${SITE_BASE - 1.6} m ${f(SITE_RIGHT)} ${SITE_BASE - 1.6} l S`);
  L.push('0.47 0.47 0.47 rg');
  L.push(`BT /F1 10 Tf 1 0 0 1 36 527 Tm (${pdfEsc('Progressive value study - one page per step')}) Tj ET`);
  L.push('0.85 0.85 0.85 RG 0.8 w');
  L.push('36 514 m 806 514 l S');
  L.push('0.16 0.16 0.16 rg');
  L.push(`BT /F2 10 Tf 1 0 0 1 36 498 Tm (${pdfEsc('Reference + step overlay')}) Tj ET`);
  L.push(`BT /F2 10 Tf 1 0 0 1 433 498 Tm (${pdfEsc('Progressive step - ' + title)}) Tj ET`);
  L.push('0.85 0.85 0.85 RG 0.7 w');
  L.push(`${f(x1)} ${f(y)} ${f(dw)} ${f(dh)} re S`);
  L.push(`${f(x2)} ${f(y)} ${f(dw)} ${f(dh)} re S`);
  L.push(`q ${f(dw)} 0 0 ${f(dh)} ${f(x1)} ${f(y)} cm /Im0 Do Q`);
  L.push(`q ${f(dw)} 0 0 ${f(dh)} ${f(x2)} ${f(y)} cm /Im1 Do Q`);
  L.push('0.47 0.47 0.47 rg');
  const foot = `Page ${index + 1} of ${count}   -   Step ${step} of ${totalSteps - 1}   -   ${title}`;
  L.push(`BT /F1 9 Tf 1 0 0 1 36 28 Tm (${pdfEsc(foot)}) Tj ET`);
  L.push('Q');
  return L.join('\n') + '\n';
}

function buildPdf(pages) {
  const enc = new TextEncoder();
  const chunks = [];
  let size = 0;
  const push = d => {
    const b = typeof d === 'string' ? enc.encode(d) : d;
    chunks.push(b);
    size += b.length;
  };
  const offsets = [0];
  const mark = id => { offsets[id] = size; };

  push('%PDF-1.4\n');
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); /* binary marker */

  const n = pages.length;
  const perPage = 5;
  const LOGO = 3 + n * perPage;
  const F1 = LOGO + 1;
  const F2 = F1 + 1;
  const kids = pages.map((_, i) => 3 + i * perPage + ' 0 R').join(' ');
  mark(1); push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  mark(2); push(`2 0 obj\n<< /Type /Pages /Count ${n} /Kids [${kids}] >>\nendobj\n`);

  pages.forEach((pg, i) => {
    const pid = 3 + i * perPage;
    const cid = pid + 1;
    const i0 = pid + 2;
    const i1 = pid + 3;
    const aid = pid + 4;
    const content = enc.encode(pdfPageContent(i, n, pg.step));
    mark(cid);
    push(`${cid} 0 obj\n<< /Length ${content.length} >>\nstream\n`);
    push(content);
    push('\nendstream\nendobj\n');
    [[i0, pg.left], [i1, pg.right]].forEach(([id, img]) => {
      mark(id);
      push(`${id} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`);
      push(img.bytes);
      push('\nendstream\nendobj\n');
    });
    const [ax1, ay1, ax2, ay2] = siteRect();
    mark(aid);
    push(`${aid} 0 obj\n<< /Type /Annot /Subtype /Link /Rect [${ax1.toFixed(2)} ${ay1.toFixed(2)} ${ax2.toFixed(2)} ${ay2.toFixed(2)}] /Border [0 0 0] /A << /S /URI /URI (${pdfEsc(SITE_URL)}) >> >>\nendobj\n`);
    mark(pid);
    push(`${pid} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_W} ${PDF_H}] /Resources << /XObject << /Im0 ${i0} 0 R /Im1 ${i1} 0 R /Logo ${LOGO} 0 R >> /Font << /F1 ${F1} 0 R /F2 ${F2} 0 R >> >> /Annots [${aid} 0 R] /Contents ${cid} 0 R >>\nendobj\n`);
  });

  const logoBytes = enc.encode(logoOps || '');
  mark(LOGO);
  push(`${LOGO} 0 obj\n<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 ${LOGO_VB.w} ${LOGO_VB.h}] /Resources << >> /Length ${logoBytes.length} >>\nstream\n`);
  push(logoBytes);
  push('\nendstream\nendobj\n');

  mark(F1); push(`${F1} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`);
  mark(F2); push(`${F2} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`);

  const xrefPos = size;
  let x = 'xref\n0 ' + (F2 + 1) + '\n0000000000 65535 f \n';
  for (let i = 1; i <= F2; i++) x += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  push(x);
  push(`trailer\n<< /Size ${F2 + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

  const out = new Uint8Array(size);
  let p = 0;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return new Blob([out], { type: 'application/pdf' });
}

let pdfBusy = false;

export async function exportPdf(btnId) {
  if (!doc.layers.length || pdfBusy) return;
  pdfBusy = true;
  const btn = $(btnId);
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Building PDF…';
  try {
    const refHref = S.studyGray ? doc.srcGray : doc.srcColor;
    const refImg = await loadImg(refHref);
    logoOps = logoPdfOps();
    const layerCount = S.steps - 1;
    const totalSteps = 1 + layerCount * 3;
    const scale = clamp(820 / doc.W, 0.5, 4);
    const cw = Math.max(1, Math.round(doc.W * scale));
    const ch = Math.max(1, Math.round(doc.H * scale));
    const cv = document.createElement('canvas');
    cv.width = cw;
    cv.height = ch;
    const ctx = cv.getContext('2d');
    const pages = [];
    for (let step = 0; step < totalSteps; step++) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      drawStudyPane(ctx, step, true, refImg, scale);
      const left = { bytes: dataUrlBytes(cv.toDataURL('image/jpeg', 0.85)), w: cw, h: ch };
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      drawStudyPane(ctx, step, false, refImg, scale);
      const right = { bytes: dataUrlBytes(cv.toDataURL('image/jpeg', 0.85)), w: cw, h: ch };
      pages.push({ left, right, step });
      if (step % 2 === 1) await new Promise(r => setTimeout(r, 0));
    }
    const blob = buildPdf(pages);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'squint-value-study-pages.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    btn.textContent = 'Exported ✓';
    setTimeout(() => { btn.textContent = old; }, 1800);
  } catch (err) {
    console.error(err);
    alert('PDF export failed: ' + err.message);
    btn.textContent = old;
  } finally {
    pdfBusy = false;
    btn.disabled = false;
  }
}

