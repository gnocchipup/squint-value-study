/* Thresholding, contour extraction and the full processing pipeline. */
import { $, S, doc, layerCount, totalSteps } from './state.js';
import { prefilter } from './filters.js';
import { cleanup, trace, area, smoothL, rdp } from './geometry.js';
import { polyBuild } from './polygons.js';
import { chips, editor, render } from './render.js';

export function calcThresholds() {
  const n = layerCount();
  doc.thr = [];
  for (let j = 0; j < n; j++) {
    doc.thr.push(
      doc.manual[j] !== undefined
        ? doc.manual[j]
        : Math.round(255 * (1 - Math.pow((j + 1) / S.steps, 1 / S.gamma)))
    );
  }
  for (let j = 1; j < n; j++) if (doc.thr[j] >= doc.thr[j - 1]) doc.thr[j] = Math.max(1, doc.thr[j - 1] - 1);
}

export function processImage(refilter) {
  if (!doc.lum0) return;
  if (refilter || !doc.lum) prefilter();
  calcThresholds();

  const n = layerCount();
  const L = new Uint8Array(doc.W * doc.H);
  for (let i = 0; i < doc.W * doc.H; i++) {
    let l = 0;
    const v = doc.lum[i];
    while (l < n && v < doc.thr[l]) l++;
    L[i] = l;
  }
  cleanup(L, S.minA);

  const raw = [];
  for (let j = 0; j < n; j++) {
    const m = new Uint8Array(doc.W * doc.H);
    for (let i = 0; i < doc.W * doc.H; i++) m[i] = L[i] > j ? 1 : 0;
    raw.push(
      trace(m)
        .filter(p => area(p) >= Math.max(4, S.minA * 0.5))
        .map(p => smoothL(p, S.smooth))
    );
  }

  /* choose the curve tolerance that respects the segment budget */
  const total = e => {
    let t = 0;
    for (const l of raw) for (const p of l) t += rdp(p, e).length / 2;
    return t;
  };
  let lo = 0.05;
  let hi = 40;
  let eps = hi;
  if (S.mode === 'poly') eps = 0;
  else if (total(lo) <= S.seg) eps = lo;
  else {
    for (let k = 0; k < 9; k++) {
      const m = (lo + hi) / 2;
      if (total(m) <= S.seg) hi = m;
      else lo = m;
    }
    eps = hi;
  }

  doc.layers =
    S.mode === 'poly'
      ? polyBuild(raw)
      : raw.map(l => l.map(p => rdp(p, eps)).filter(p => p.length >= 6));

  let used = 0;
  for (const l of doc.layers) for (const p of l) used += p.length / 2;
  $('segUsed').textContent =
    used + ' segments used' + (S.mode === 'poly' ? '' : ' · tolerance ' + eps.toFixed(2) + ' px');

  const totalN = totalSteps();
  if (S.studyStep >= totalN) S.studyStep = totalN - 1;

  chips();
  editor();
  render();
}
