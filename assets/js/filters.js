/* Pre-filters that simplify the image before thresholding. */
import { clamp, doc, S } from './state.js';

export function gauss(a, s) {
  const k = Math.ceil(s * 3);
  const w = [];
  let t = 0;
  for (let i = -k; i <= k; i++) {
    const v = Math.exp(-(i * i) / (2 * s * s));
    w.push(v);
    t += v;
  }
  const b = new Float32Array(a.length);
  const c = new Float32Array(a.length);
  for (let y = 0; y < doc.H; y++)
    for (let x = 0; x < doc.W; x++) {
      let q = 0;
      for (let i = -k; i <= k; i++) q += a[y * doc.W + clamp(x + i, 0, doc.W - 1)] * w[i + k];
      b[y * doc.W + x] = q / t;
    }
  for (let y = 0; y < doc.H; y++)
    for (let x = 0; x < doc.W; x++) {
      let q = 0;
      for (let i = -k; i <= k; i++) q += b[clamp(y + i, 0, doc.H - 1) * doc.W + x] * w[i + k];
      c[y * doc.W + x] = q / t;
    }
  return c;
}

export function bilateral(a, r) {
  const o = new Float32Array(a.length);
  const ss = 2 * r * r;
  const sr = 2 * 28 * 28;
  for (let y = 0; y < doc.H; y++)
    for (let x = 0; x < doc.W; x++) {
      const c = a[y * doc.W + x];
      let s = 0;
      let t = 0;
      for (let j = -r; j <= r; j++) {
        const yy = clamp(y + j, 0, doc.H - 1);
        for (let i = -r; i <= r; i++) {
          const v = a[yy * doc.W + clamp(x + i, 0, doc.W - 1)];
          const w = Math.exp(-(i * i + j * j) / ss - ((v - c) * (v - c)) / sr);
          s += v * w;
          t += w;
        }
      }
      o[y * doc.W + x] = s / t;
    }
  return o;
}

export function kuwahara(a, r) {
  const o = new Float32Array(a.length);
  const Q = [[-r, 0, -r, 0], [0, r, -r, 0], [-r, 0, 0, r], [0, r, 0, r]];
  for (let y = 0; y < doc.H; y++)
    for (let x = 0; x < doc.W; x++) {
      let bv = 1e18;
      let bm = 0;
      for (const [q0, q1, p0, p1] of Q) {
        let s = 0;
        let s2 = 0;
        let n = 0;
        for (let j = p0; j <= p1; j++) {
          const yy = clamp(y + j, 0, doc.H - 1);
          for (let i = q0; i <= q1; i++) {
            const v = a[yy * doc.W + clamp(x + i, 0, doc.W - 1)];
            s += v;
            s2 += v * v;
            n++;
          }
        }
        const m = s / n;
        const vr = s2 / n - m * m;
        if (vr < bv) {
          bv = vr;
          bm = m;
        }
      }
      o[y * doc.W + x] = bm;
    }
  return o;
}

export function prefilter() {
  doc.lum =
    S.filt === 'gauss'
      ? gauss(doc.lum0, S.fr)
      : S.filt === 'bilateral'
        ? bilateral(doc.lum0, S.fr)
        : S.filt === 'kuwahara'
          ? kuwahara(doc.lum0, S.fr)
          : doc.lum0;
}
