/* Blocking-polygon construction and the auto-refine pass. */
import { S, doc, clamp, activeLayer, layerCount } from './state.js';
import { far } from './geometry.js';

/* Build one closed polygon per traced contour, growing each from a
   rectangle by repeatedly splitting the worst edge. */
export function polyBuild(raw) {
  const loops = [];
  const segs = [];
  let total = 0;
  doc.LP = {};
  doc.EC = {};

  raw.forEach((l, j) =>
    l.forEach(p => {
      const n = p.length / 2;
      if (n < 6) return;

      /* rotate so the lowest point is first (stable, comparable keys) */
      let t = 0;
      for (let i = 1; i < n; i++) if (p[2 * i + 1] < p[2 * t + 1]) t = i;
      if (t) {
        const q = new Float32Array(p.length);
        for (let i = 0; i < n; i++) {
          const s = (i + t) % n;
          q[2 * i] = p[2 * s];
          q[2 * i + 1] = p[2 * s + 1];
        }
        p = q;
      }

      const ex = [0, 0, 0];
      for (let i = 1; i < n; i++) {
        if (p[2 * i] > p[2 * ex[0]]) ex[0] = i;
        if (p[2 * i + 1] > p[2 * ex[1] + 1]) ex[1] = i;
        if (p[2 * i] < p[2 * ex[2]]) ex[2] = i;
      }
      let st = [...new Set([0, ...ex])].sort((x, y) => x - y);
      if (st.length < 3) st = [0, Math.floor(n / 3), Math.floor((2 * n) / 3)];

      const o = {
        j,
        p,
        keep: new Uint8Array(n),
        cnt: st.length,
        key: j + ':' + Math.round(p[0]) + ',' + Math.round(p[1])
      };
      st.forEach(i => { o.keep[i] = 1; });
      doc.LP[o.key] = p;
      loops.push(o);
      total += st.length;
      st.forEach((a, k) => {
        const b = k + 1 < st.length ? st[k + 1] : n;
        const [dm, mi] = far(p, a, b);
        segs.push({ o, a, b, dm, mi });
      });
    })
  );

  while (segs.length) {
    let bi = -1;
    for (let i = 0; i < segs.length; i++) {
      const o = segs[i].o;
      const cap = S.over[o.key] || S.maxSides;
      if (o.cnt < cap && (total < S.seg || S.over[o.key]) && (bi < 0 || segs[i].dm > segs[bi].dm)) bi = i;
    }
    if (bi < 0) break;
    const s = segs[bi];
    if (s.dm < 0.35 || s.mi < 0) break;
    segs.splice(bi, 1);
    s.o.keep[s.mi] = 1;
    total++;
    s.o.cnt++;
    for (const [a, b] of [[s.a, s.mi], [s.mi, s.b]]) {
      const [dm, mi] = far(s.o.p, a, b);
      segs.push({ o: s.o, a, b, dm, mi });
    }
  }

  const out = raw.map(() => []);
  for (const o of loops) {
    const idx = [];
    o.keep.forEach((k, i) => { if (k) idx.push(i); });
    const m = idx.length;
    if (m < 3) continue;
    const p = o.p;
    const n = p.length / 2;
    let pts = idx.map(i => [p[2 * i], p[2 * i + 1]]);

    /* Containing polygons: offset every supporting line outwards by the
       maximum contour distance, then intersect neighbouring lines. */
    if (S.ptype === 'out') {
      const ln = [];
      for (let k = 0; k < m; k++) {
        const a = idx[k];
        const b = k + 1 < m ? idx[k + 1] : n;
        const A = pts[k];
        const B = pts[(k + 1) % m];
        const dx = B[0] - A[0];
        const dy = B[1] - A[1];
        const L = Math.hypot(dx, dy) || 1e-9;
        let mx = 0;
        for (let i = a + 1; i < b; i++) {
          const c = ((p[2 * i] - A[0]) * dy - (p[2 * i + 1] - A[1]) * dx) / L;
          if (c > mx) mx = c;
        }
        ln.push({ x: A[0] + (dy / L) * mx, y: A[1] - (dx / L) * mx, dx, dy, m: mx });
      }
      pts = pts.map((v, k) => {
        const l1 = ln[(k - 1 + m) % m];
        const l2 = ln[k];
        const det = l1.dx * l2.dy - l1.dy * l2.dx;
        if (Math.abs(det) < 1e-6) return v;
        const t = ((l2.x - l1.x) * l2.dy - (l2.y - l1.y) * l2.dx) / det;
        const x = l1.x + t * l1.dx;
        const y = l1.y + t * l1.dy;
        return Math.hypot(x - v[0], y - v[1]) > 8 + 3 * (l1.m + l2.m) ? v : [x, y];
      });
    }

    const fl = pts.flat();
    fl.key = o.key;
    out[o.j].push(fl);
  }
  return out;
}

/* Error curve: worst contour distance after adding edges one at a time. */
export function errCurve(p) {
  const n = p.length / 2;
  const ex = [0, 0, 0];
  for (let i = 1; i < n; i++) {
    if (p[2 * i] > p[2 * ex[0]]) ex[0] = i;
    if (p[2 * i + 1] > p[2 * ex[1] + 1]) ex[1] = i;
    if (p[2 * i] < p[2 * ex[2]]) ex[2] = i;
  }
  let st = [...new Set([0, ...ex])].sort((x, y) => x - y);
  if (st.length < 3) st = [0, Math.floor(n / 3), Math.floor((2 * n) / 3)];
  const sg = st.map((a, k) => {
    const b = k + 1 < st.length ? st[k + 1] : n;
    const [dm, mi] = far(p, a, b);
    return { a, b, dm, mi };
  });
  const E = { base: st.length, v: [] };
  let c = st.length;
  for (;;) {
    let bi = 0;
    let mx = 0;
    sg.forEach((s, i) => { if (s.dm > mx) { mx = s.dm; bi = i; } });
    E.v[c] = mx;
    if (mx < 0.35 || c >= 1000) break;
    const s = sg.splice(bi, 1)[0];
    c++;
    for (const [a, b] of [[s.a, s.mi], [s.mi, s.b]]) {
      const [dm, mi] = far(p, a, b);
      sg.push({ a, b, dm, mi });
    }
  }
  E.end = c;
  return E;
}

export const getCurve = k => doc.EC[k] || (doc.LP[k] ? (doc.EC[k] = errCurve(doc.LP[k])) : null);
export const errAt = (E, c) => (E ? E.v[clamp(c, E.base, E.end)] : 0);

/* Coarse → fine staged search for the smallest limit within tolerance. */
export function stagedLimit(E, L0, tol, steps) {
  let L = L0;
  const trail = [L];
  steps.forEach((s, k) => {
    if (errAt(E, L) <= tol) return;
    while (errAt(E, L) > tol && L < E.end) {
      L += s;
      trail.push(L);
    }
    if (k < steps.length - 1 && s > 1) {
      L -= s;
      trail.push(L);
    }
  });
  return { limit: Math.min(L, 1000), trail };
}

/* Refine the active value level, or every level. Callers reset the
   default limit to 4 first so each shape grows from the minimum. */
export function refinePasses(all, schedule) {
  const steps = schedule.length ? schedule : [5, 3, 1];
  const lo = all ? 0 : activeLayer();
  const hi = all ? layerCount() - 1 : activeLayer();
  let count = 0;
  let added = 0;
  for (let j = lo; j <= hi; j++)
    for (const q of doc.layers[j] || []) {
      const E = getCurve(q.key);
      if (!E) continue;
      const L0 = Math.max(S.over[q.key] ?? S.maxSides, S.maxSides);
      const r = stagedLimit(E, L0, S.tol, steps);
      if (r.limit > L0) {
        S.over[q.key] = r.limit;
        count++;
        added += r.limit - L0;
      }
    }
  return { count, added, steps, all };
}
