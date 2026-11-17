/* Pixel-space geometry: region cleanup, marching-squares contours,
   smoothing, simplification and SVG path building. */
import { clamp, doc } from './state.js';

/* Merge components smaller than minA pixels into their dominant neighbour. */
export function cleanup(L, minA) {
  if (minA < 2) return;
  const comp = new Int32Array(doc.W * doc.H).fill(-1);
  const q = new Int32Array(doc.W * doc.H);
  let id = 0;
  for (let s = 0; s < doc.W * doc.H; s++) {
    if (comp[s] >= 0) continue;
    const lb = L[s];
    let h = 0;
    let t = 0;
    q[t++] = s;
    comp[s] = id;
    const cnt = {};
    while (h < t) {
      const p = q[h++];
      const x = p % doc.W;
      const y = (p / doc.W) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0);
        const ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= doc.W || ny >= doc.H) continue;
        const n = ny * doc.W + nx;
        if (L[n] === lb) {
          if (comp[n] < 0) {
            comp[n] = id;
            q[t++] = n;
          }
        } else cnt[L[n]] = (cnt[L[n]] || 0) + 1;
      }
    }
    if (t < minA) {
      let b = -1;
      let bc = 0;
      for (const k in cnt) if (cnt[k] > bc) { bc = cnt[k]; b = +k; }
      if (b >= 0) for (let i = 0; i < t; i++) L[q[i]] = b;
    }
    id++;
  }
}

/* Marching squares over a binary mask, returning closed point loops. */
export function trace(m) {
  const V = doc.W + 1;
  const bits = new Uint8Array(V * (doc.H + 1));
  for (let y = 0; y < doc.H; y++)
    for (let x = 0; x < doc.W; x++) {
      if (!m[y * doc.W + x]) continue;
      if (y === 0 || !m[(y - 1) * doc.W + x]) bits[y * V + x] |= 1;
      if (x === doc.W - 1 || !m[y * doc.W + x + 1]) bits[y * V + x + 1] |= 2;
      if (y === doc.H - 1 || !m[(y + 1) * doc.W + x]) bits[(y + 1) * V + x + 1] |= 4;
      if (x === 0 || !m[y * doc.W + x - 1]) bits[(y + 1) * V + x] |= 8;
    }
  const DX = [1, 0, -1, 0];
  const DY = [0, 1, 0, -1];
  const out = [];
  for (let s = 0; s < bits.length; s++)
    while (bits[s]) {
      let d = 0;
      while (!((bits[s] >> d) & 1)) d++;
      const pts = [];
      let v = s;
      let dd = d;
      do {
        bits[v] &= ~(1 << dd);
        pts.push(v % V, (v / V) | 0);
        v = (((v / V) | 0) + DY[dd]) * V + (v % V) + DX[dd];
        const b = bits[v];
        if (!b) break;
        const r = (dd + 1) & 3;
        const l = (dd + 3) & 3;
        dd = (b >> r) & 1 ? r : (b >> dd) & 1 ? dd : l;
      } while (v !== s);
      out.push(Float32Array.from(pts));
    }
  return out;
}

export function area(p) {
  let a = 0;
  const n = p.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1];
  }
  return Math.abs(a / 2);
}

/* Circular Gaussian smoothing of a closed contour. */
export function smoothL(p, s) {
  if (s <= 0) return p;
  const n = p.length / 2;
  const k = Math.ceil(s * 2.5);
  const w = [];
  let t = 0;
  for (let i = -k; i <= k; i++) {
    const v = Math.exp(-(i * i) / (2 * s * s));
    w.push(v);
    t += v;
  }
  const o = new Float32Array(p.length);
  for (let i = 0; i < n; i++) {
    let sx = 0;
    let sy = 0;
    for (let j = -k; j <= k; j++) {
      const id = (((i + j) % n) + n) % n;
      sx += p[2 * id] * w[j + k];
      sy += p[2 * id + 1] * w[j + k];
    }
    o[2 * i] = sx / t;
    o[2 * i + 1] = sy / t;
  }
  return o;
}

/* Ramer–Douglas–Peucker on a closed loop. */
export function rdp(p, eps) {
  const n = p.length / 2;
  if (n < 6) return Array.from(p);
  let f = 0;
  let fd = 0;
  for (let i = 1; i < n; i++) {
    const d = (p[2 * i] - p[0]) ** 2 + (p[2 * i + 1] - p[1]) ** 2;
    if (d > fd) { fd = d; f = i; }
  }
  const keep = new Uint8Array(n);
  keep[0] = keep[f] = 1;
  const st = [[0, f], [f, n]];
  while (st.length) {
    const [a, b] = st.pop();
    const ax = p[2 * a];
    const ay = p[2 * a + 1];
    const bi = b % n;
    const bx = p[2 * bi];
    const by = p[2 * bi + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const L = Math.hypot(dx, dy) || 1e-9;
    let dm = 0;
    let mi = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((p[2 * i] - ax) * dy - (p[2 * i + 1] - ay) * dx) / L;
      if (d > dm) { dm = d; mi = i; }
    }
    if (dm > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  const o = [];
  for (let i = 0; i < n; i++) if (keep[i]) o.push(p[2 * i], p[2 * i + 1]);
  return o;
}

/* Path data: smooth Catmull-Rom curves or straight polygon edges. */
export function dPath(p, cv) {
  const n = p.length / 2;
  if (n < 3) return '';
  const f = v => Math.round(v * 10) / 10;
  if (!cv || n < 4) {
    let s = 'M' + f(p[0]) + ' ' + f(p[1]);
    for (let i = 1; i < n; i++) s += 'L' + f(p[2 * i]) + ' ' + f(p[2 * i + 1]);
    return s + 'Z';
  }
  const g = i => {
    const k = ((i % n) + n) % n;
    return [p[2 * k], p[2 * k + 1]];
  };
  let s = 'M' + f(p[0]) + ' ' + f(p[1]);
  for (let i = 0; i < n; i++) {
    const a = g(i - 1), b = g(i), c = g(i + 1), d = g(i + 2);
    s +=
      'C' + f(b[0] + (c[0] - a[0]) / 6) + ' ' + f(b[1] + (c[1] - a[1]) / 6) +
      ' ' + f(c[0] - (d[0] - b[0]) / 6) + ' ' + f(c[1] - (d[1] - b[1]) / 6) +
      ' ' + f(c[0]) + ' ' + f(c[1]);
  }
  return s + 'Z';
}

/* Farthest contour point from the segment a→b, used by polygon splitting. */
export function far(p, a, b) {
  const n = p.length / 2;
  const ax = p[2 * a];
  const ay = p[2 * a + 1];
  const bi = b % n;
  const dx = p[2 * bi] - ax;
  const dy = p[2 * bi + 1] - ay;
  const L = Math.hypot(dx, dy) || 1e-9;
  let dm = 0;
  let mi = -1;
  for (let i = a + 1; i < b; i++) {
    const d = Math.abs((p[2 * i] - ax) * dy - (p[2 * i + 1] - ay) * dx) / L;
    if (d > dm) { dm = d; mi = i; }
  }
  return [dm, mi];
}
