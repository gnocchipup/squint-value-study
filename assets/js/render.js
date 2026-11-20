/* Rendering for the merged live-canvas / value-study workspace. */
import {
  $, S, doc, clamp, layerCount, totalSteps, activeLayer, activeSize,
  stepMeta, parsePass, defaultOrder, curvesEnabled, shade, levelName, blockName,
  crossCount, levelOn, OVERLAY, CONTOUR, CROSS
} from './state.js';
import { dPath, area } from './geometry.js';
import { errAt, getCurve } from './polygons.js';

/* A level's contours are plain loops; they only read as holes because fills use
   even-odd. A hole loop must therefore be painted with the ring around it, so
   loops are grouped by containment before they are split into passes. */
function pointInLoop(q, x, y) {
  let inside = false;
  const n = q.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = q[2 * i], yi = q[2 * i + 1];
    const xj = q[2 * j], yj = q[2 * j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* Each level becomes a list of shape groups: an even-depth ring plus its direct
   holes. Islands inside holes are their own groups. Cached per layers array. */
let groupCache = { layers: null, levels: [] };
function levelGroups() {
  if (groupCache.layers === doc.layers) return groupCache.levels;
  const levels = doc.layers.map(loops => {
    const info = loops.map(q => {
      let minx = Infinity;
      let miny = Infinity;
      let maxx = -Infinity;
      let maxy = -Infinity;
      for (let i = 0; i < q.length; i += 2) {
        const x = q[i];
        const y = q[i + 1];
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
        if (y < miny) miny = y;
        if (y > maxy) maxy = y;
      }
      return { q, a: area(q), minx, miny, maxx, maxy, parent: -1, depth: 0 };
    });
    const order = info.map((_, i) => i).sort((i, k) => info[k].a - info[i].a);
    order.forEach((idx, s) => {
      const b = info[idx];
      let parent = -1;
      let pa = Infinity;
      for (let t = 0; t < s; t++) {
        const p = info[order[t]];
        if (p.a <= b.a || p.a >= pa) continue;
        if (b.minx < p.minx || b.maxx > p.maxx || b.miny < p.miny || b.maxy > p.maxy) continue;
        if (!pointInLoop(p.q, b.q[0], b.q[1])) continue;
        parent = order[t];
        pa = p.a;
      }
      b.parent = parent;
      b.depth = parent < 0 ? 0 : info[parent].depth + 1;
    });
    const holes = info.map(() => []);
    info.forEach((it, i) => { if (it.parent >= 0) holes[it.parent].push(i); });
    const groups = [];
    info.forEach((it, i) => {
      if (it.depth % 2 !== 0) return;
      const inner = holes[i];
      const net = inner.reduce((s, h) => s - info[h].a, it.a);
      groups.push({ loops: [it.q, ...inner.map(h => info[h].q)], area: Math.max(0, net) });
    });
    return groups;
  });
  groupCache = { layers: doc.layers, levels };
  return levels;
}

/* Groups split into large / small at S.passArea, cached against the layers
   array and the threshold, so a step change is cheap. */
let partCache = { layers: null, area: 0, parts: [] };
function partitions() {
  if (partCache.layers === doc.layers && partCache.area === S.passArea) return partCache.parts;
  const parts = levelGroups().map(groups => {
    const big = [];
    const small = [];
    for (const g of groups) (g.area >= S.passArea ? big : small).push(g);
    return { L: big, S: small };
  });
  partCache = { layers: doc.layers, area: S.passArea, parts };
  return parts;
}

/* The shape groups of one pass (a level's large or small set). */
export function passGroups(level, size) {
  const p = partitions()[level];
  return p ? p[size] || [] : [];
}

/* Every contour in the pass, for hit areas and split dots. */
export function passLoops(level, size) {
  const out = [];
  for (const g of passGroups(level, size)) out.push(...g.loops);
  return out;
}

/* Shape count for one pass (rings and islands, holes are part of their ring). */
export const passCount = (level, size) => passGroups(level, size).length;

/* Path data for one pass. Each group is written as a unit so its holes stay
   holes under the even-odd fill rule. */
export function passD(level, size, cv) {
  let d = '';
  for (const g of passGroups(level, size))
    for (const q of g.loops) d += dPath(q, cv);
  return d;
}

/* What the given progressive step fills and outlines: every earlier pass is
   filled, the current pass follows its phase, later passes are untouched. */
export function stepParts(step) {
  const fills = [];
  const outlines = [];
  if (!doc.layers.length || !S.order.length) return { fills, outlines };
  const cv = curvesEnabled();
  const meta = stepMeta(step);
  const lc = layerCount();
  for (let i = 0; i < S.order.length; i++) {
    if (meta && i > meta.index) break;
    const { level, size } = parsePass(S.order[i]);
    if (level >= lc || !levelOn(level)) continue;
    let fill = false;
    let outline = false;
    if (meta) {
      if (i < meta.index) fill = true;
      else {
        fill = meta.phase >= 1;
        outline = meta.phase <= 1;
      }
    }
    if (!fill && !outline) continue;
    const d = passD(level, size, cv);
    if (!d) continue;
    if (fill) fills.push({ d, gray: shade(level + 1), level });
    if (outline) outlines.push({ d });
  }
  /* Stack fills by value, not by block-in order: darker levels always paint over
     lighter ones, so moving a pass earlier only changes when it appears. */
  fills.sort((a, b) => a.level - b.level);
  return { fills, outlines };
}

export function buildSteppedParts(step) {
  const { fills, outlines } = stepParts(step);
  let f = '';
  let o = '';
  for (const q of fills)
    f += `<path d="${q.d}" fill="rgb(${q.gray},${q.gray},${q.gray})" fill-rule="evenodd" stroke="none"/>`;
  for (const q of outlines)
    o += `<path d="${q.d}" fill="none" fill-rule="evenodd" stroke="${CONTOUR}" stroke-width="1.35" stroke-linejoin="round" stroke-linecap="round"/>`;
  return { fills: f, outlines: o };
}

const refHref = () => (S.studyGray ? doc.srcGray : doc.srcColor);

/* Left pane: source image with the active step's fills/outlines and, in
   blocking-polygon mode, clickable polygons for the active value level. */
export function liveSvgStr(interactive) {
  const { fills, outlines } = stepParts(S.studyStep);
  const cv = curvesEnabled();
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${doc.W} ${doc.H}" width="${doc.W}" height="${doc.H}" role="img" aria-label="Live canvas with value overlay">`;
  s += `<image href="${refHref()}" width="${doc.W}" height="${doc.H}"/>`;

  if (S.fills && fills.length) {
    s += `<g opacity="${S.fillOpacity}">`;
    for (const q of fills)
      s += `<path d="${q.d}" fill="rgb(${q.gray},${q.gray},${q.gray})" fill-rule="evenodd" stroke="none"/>`;
    s += '</g>';
  }
  /* The reference contour mirrors the study's phases but stays blue so it
     reads clearly over photographs; the Line slider sets its opacity. */
  if (S.lineOpacity > 0 && outlines.length) {
    s += `<g opacity="${S.lineOpacity}">`;
    for (const q of outlines) {
      s += `<path d="${q.d}" fill="none" fill-rule="evenodd" stroke="#ffffff" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" opacity="0.7"/>`;
      s += `<path d="${q.d}" fill="none" fill-rule="evenodd" stroke="${OVERLAY}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    s += '</g>';
  }

  const meta = stepMeta(S.studyStep);
  const list = meta ? passLoops(meta.level, meta.size) : (doc.layers[0] || []);
  const activeOn = levelOn(meta ? meta.level : 0);
  if (S.dots && activeOn) {
    for (const q of list)
      for (let i = 0; i < q.length; i += 2)
        s += `<circle cx="${q[i].toFixed(1)}" cy="${q[i + 1].toFixed(1)}" r="2.4" fill="${OVERLAY}" stroke="#fff" stroke-width="0.8"/>`;
  }

  if (interactive && S.mode === 'poly' && activeOn) {
    for (const q of list.slice().sort((a, b) => area(b) - area(a))) {
      const on = q.key === S.selKey;
      s += `<path class="hit${on ? ' sel' : ''}" data-k="${q.key}" d="${dPath(q, cv)}"/>`;
    }
  }
  return s + '</svg>';
}

/* Guide crosshair for the study. V and H set how many evenly-spaced lines each
   axis draws (1-3), so 3 + 3 lines split the image into 16 boxes. It is emitted
   after every fill and contour so no value level can cover it; the Cross slider
   only fades it (0 removes it from the markup entirely). A white halo keeps the
   green line legible over dark fills and pale ones alike. */
export function crosshairStr() {
  if (!(S.crossOpacity > 0)) return '';
  const v = crossCount(S.crossV);
  const h = crossCount(S.crossH);
  const f = n => Math.round(n * 10) / 10;
  let d = '';
  for (let k = 1; k <= v; k++) {
    const x = f((doc.W * k) / (v + 1));
    d += 'M' + x + ' 0V' + f(doc.H);
  }
  for (let k = 1; k <= h; k++) {
    const y = f((doc.H * k) / (h + 1));
    d += 'M0 ' + y + 'H' + f(doc.W);
  }
  return `<g opacity="${S.crossOpacity}" stroke-dasharray="6 4" stroke-linecap="round">
   <path d="${d}" fill="none" stroke="#ffffff" stroke-width="2.6" opacity="0.55"/>
   <path d="${d}" fill="none" stroke="${CROSS}" stroke-width="1.3"/>
  </g>`;
}

/* Right pane: the progressive value study on a white base. */
export function studySvgStr() {
  const parts = buildSteppedParts(S.studyStep);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${doc.W} ${doc.H}" width="${doc.W}" height="${doc.H}" role="img" aria-label="Progressive value study">
   <rect width="${doc.W}" height="${doc.H}" fill="#ffffff"/>
   ${parts.fills}
   ${parts.outlines}
   ${crosshairStr()}
  </svg>`;
}

function updateStepCopy() {
  const step = S.studyStep;
  const total = totalSteps();
  const meta = stepMeta(step);
  let heading = 'PURE WHITE';
  let detail = 'Blank white base';
  if (meta) {
    const name = blockName(meta.level).toUpperCase() + (meta.size === 'L' ? ' LARGE' : ' SMALL');
    heading = name + ' · ' + ['OUTLINE ONLY', 'FILL + OUTLINE', 'OUTLINE REMOVED'][meta.phase];
    detail = 'Pass ' + (meta.index + 1) + '/' + S.order.length + ' · ' +
      (meta.size === 'L' ? 'Large' : 'Small') + ' shapes · ' +
      ['Contour only', 'Grey fill + contour', 'Clean fill'][meta.phase];
  }
  $('studyStepTitle').textContent = heading;
  $('studyStepCount').textContent = step + ' / ' + (total - 1);
  $('stepStageSub').textContent = detail;
  $('vPass').textContent = 'STEP ' + step + ' / ' + (total - 1);
  const hidden = !levelOn(activeLayer());
  const edit = S.mode === 'poly'
    ? 'Editing ' + blockName(activeLayer()) + (activeSize() === 'L' ? ' large' : ' small') +
      (hidden ? ' (hidden) · ' : ' · ')
    : '';
  $('liveBadge').textContent =
    edit + 'Line ' + Math.round(S.lineOpacity * 100) + '% · Fill ' + Math.round(S.fillOpacity * 100) + '%';
}

export function render() {
  if (!doc.layers.length) return;
  const total = totalSteps();
  S.studyStep = clamp(S.studyStep, 0, total - 1);
  $('studySlider').max = total - 1;
  $('studySlider').value = S.studyStep;
  $('studyPrev').disabled = S.studyStep === 0;
  $('studyNext').disabled = S.studyStep === total - 1;
  $('livePane').innerHTML = liveSvgStr(true);
  $('studyPane').innerHTML = studySvgStr();
  updateStepCopy();
  panel();
}

export function chips() {
  const c = $('chips');
  c.innerHTML = '';
  for (let i = 0; i < S.steps; i++) {
    const d = document.createElement('div');
    const g = shade(i);
    d.className = 'chip' + (i === 0 ? ' fix' : '') + (i === doc.sel ? ' sel' : '') +
      (i > 0 && !levelOn(i - 1) ? ' off' : '');
    d.style.background = `rgb(${g},${g},${g})`;
    d.style.color = g > 128 ? '#000' : '#fff';
    d.textContent = levelName(i);
    if (i > 0) d.onclick = () => { doc.sel = i; chips(); editor(); };
    c.appendChild(d);
  }
  levelToggles();
  passList();
}

/* One switch per value level (G0 … black), all on by default. A level that is
   switched off keeps its threshold and polygons, but its fills, contours and
   hit areas are left out of the study, the live canvas and the exports. */
function levelToggles() {
  const box = $('levelToggles');
  const n = layerCount();
  if (box.querySelectorAll('input[data-level]').length !== n) {
    box.querySelectorAll('.level-toggle').forEach(el => el.remove());
    for (let j = 0; j < n; j++) {
      const key = levelName(j + 1);
      const name = j === n - 1 ? 'Black' : 'G' + j;
      const l = document.createElement('label');
      l.className = 'chk level-toggle';
      l.title = 'Show ' + name + ' in the study, the live canvas and the exports';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.level = key;
      cb.onchange = () => { S.levelOn[key] = cb.checked; chips(); render(); };
      l.appendChild(cb);
      l.appendChild(document.createTextNode(name));
      box.appendChild(l);
    }
  }
  [...box.querySelectorAll('input[data-level]')].forEach((cb, j) => {
    cb.checked = levelOn(j);
  });
}

/* Draggable block-in order: one row per pass. Dragging a row (or the arrow
   buttons) changes which shapes block in first; the step slider follows. */
let dragKey = null;

function keepPass(meta, key) {
  if (!meta || !key) return;
  const index = S.order.indexOf(key);
  if (index >= 0) S.studyStep = 1 + 3 * index + meta.phase;
}

function reorderPass(from, to) {
  if (from === to || to < 0 || to >= S.order.length) return;
  const meta = stepMeta(S.studyStep);
  const key = meta ? S.order[meta.index] : null;
  const [moved] = S.order.splice(from, 1);
  S.order.splice(to, 0, moved);
  keepPass(meta, key);
  passList();
  render();
}

/* Back to large-in-value-order then small-in-value-order. */
export function resetOrder() {
  const meta = stepMeta(S.studyStep);
  const key = meta ? S.order[meta.index] : null;
  S.order = defaultOrder();
  keepPass(meta, key);
  passList();
  render();
}

export function passList() {
  const box = $('passList');
  box.replaceChildren(...S.order.map((key, i) => {
    const { level, size } = parsePass(key);
    const label = blockName(level) + ' · ' + (size === 'L' ? 'Large' : 'Small');
    const g = shade(level + 1);
    const li = document.createElement('li');
    li.className = 'pass-row' + (levelOn(level) ? '' : ' off');
    li.draggable = true;
    li.dataset.key = key;
    li.title = 'Pass ' + (i + 1) + ' · drag to change the blocking order';
    const grip = document.createElement('span');
    grip.className = 'pass-grip';
    grip.setAttribute('aria-hidden', 'true');
    grip.textContent = '⠿';
    const sw = document.createElement('span');
    sw.className = 'pass-swatch';
    sw.style.background = `rgb(${g},${g},${g})`;
    const name = document.createElement('span');
    name.className = 'pass-name';
    name.textContent = label;
    const count = document.createElement('span');
    count.className = 'pass-count';
    count.textContent = passCount(level, size);
    const mkMove = (glyph, dir, title) => {
      const b = document.createElement('button');
      b.className = 'pass-move ' + (dir < 0 ? 'pass-up' : 'pass-down');
      b.textContent = glyph;
      b.title = title;
      b.setAttribute('aria-label', title);
      b.onclick = e => { e.stopPropagation(); reorderPass(i, i + dir); };
      return b;
    };
    li.append(grip, sw, name, count,
      mkMove('↑', -1, 'Move ' + label + ' earlier'),
      mkMove('↓', 1, 'Move ' + label + ' later'));
    li.ondragstart = e => {
      dragKey = key;
      li.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', key); } catch (err) { /* ignore */ }
      }
    };
    li.ondragend = () => {
      dragKey = null;
      li.classList.remove('dragging');
      box.querySelectorAll('.pass-row.over').forEach(el => el.classList.remove('over'));
    };
    li.ondragover = e => {
      if (dragKey && dragKey !== key) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        li.classList.add('over');
      }
    };
    li.ondragleave = () => li.classList.remove('over');
    li.ondrop = e => {
      e.preventDefault();
      li.classList.remove('over');
      const from = S.order.indexOf(dragKey);
      const to = S.order.indexOf(key);
      if (from >= 0 && to >= 0) reorderPass(from, to);
    };
    return li;
  }));
}

export function editor() {
  const j = doc.sel - 1;
  const e = $('ed');
  if (j < 0 || j >= doc.thr.length) return;
  e.value = doc.thr[j];
  $('edLbl').textContent = levelName(doc.sel) + ' begins below luminance';
  $('edVal').textContent = doc.thr[j];
  $('thrTxt').textContent = 'Thresholds: ' + doc.thr.join(' · ');
}

export function curShape() {
  const meta = stepMeta(S.studyStep);
  const j = meta ? meta.level : 0;
  if (!levelOn(j) || !S.selKey || !doc.layers[j]) return null;
  const q = doc.layers[j].find(a => a.key === S.selKey);
  if (!q) return null;
  /* Only the pass in view is editable, the same set that gets hit areas. */
  const list = meta ? passLoops(meta.level, meta.size) : (doc.layers[0] || []);
  return list.includes(q) ? q : null;
}

export function panel() {
  const q = curShape();
  const active = S.mode === 'poly';
  $('selectedTools').style.display = active ? 'grid' : 'none';
  $('refPass').disabled = !(active && q);
  ['sMinus10', 'sMinus', 'shapeSides', 'sPlus', 'sPlus10', 'sReset'].forEach(id => {
    $(id).disabled = !q;
  });
  $('sClear').disabled = !Object.keys(S.over).length;
  if (q) {
    const custom = S.over[S.selKey] !== undefined;
    const err = errAt(getCurve(S.selKey), q.length / 2).toFixed(1);
    $('selTxt').textContent =
      blockName(activeLayer()) + (activeSize() === 'L' ? ' large' : ' small') + ' · ' +
      q.length / 2 + ' edges rendered · worst error ' + err +
      ' px' + (custom ? ' · custom edge limit' : ' · default edge limit');
    $('shapeSides').value = S.over[S.selKey] ?? Math.max(S.maxSides, q.length / 2);
  } else {
    $('selTxt').textContent = 'Click a polygon on the live canvas to edit its edge limit.';
    $('shapeSides').value = S.maxSides;
  }
}

export function labels() {
  $('vSteps').textContent = S.steps;
  $('vG').textContent = S.gamma.toFixed(2);
  $('vFr').textContent = S.fr;
  $('vMin').textContent = S.minA;
  $('vSm').textContent = S.smooth;
  $('vSeg').textContent = S.seg;
  $('vTol').textContent = S.tol;
  $('vMs').textContent = S.maxSides;
  $('maxs').value = S.maxSides;
  $('steps').value = S.steps;
  $('passArea').value = S.passArea;
  $('vPassArea').textContent = S.passArea;
}
