/* Rendering for the merged live-canvas / value-study workspace. */
import {
  $, S, doc, clamp, layerCount, totalSteps, activeLayer, activePass,
  curvesEnabled, shade, levelName, OVERLAY
} from './state.js';
import { dPath, area } from './geometry.js';
import { errAt, getCurve } from './polygons.js';

/* What the given progressive step fills and outlines. */
export function stepParts(step) {
  const fills = [];
  const outlines = [];
  if (!doc.layers.length) return { fills, outlines };
  const lc = layerCount();
  const cv = curvesEnabled();
  for (let j = 0; j < lc; j++) {
    let fill = false;
    let outline = false;
    if (step > 0) {
      const n = step - 1;
      const level = Math.floor(n / 3);
      const phase = n % 3;
      if (j < level) fill = true;
      else if (j === level) {
        fill = phase >= 1;
        outline = phase <= 1;
      }
    }
    if (!fill && !outline) continue;
    const d = (doc.layers[j] || []).map(q => dPath(q, cv)).join('');
    if (!d) continue;
    if (fill) fills.push({ d, gray: shade(j + 1) });
    if (outline) outlines.push({ d });
  }
  return { fills, outlines };
}

export function buildSteppedParts(step, isOverlay) {
  const { fills, outlines } = stepParts(step);
  let f = '';
  let o = '';
  for (const q of fills)
    f += `<path d="${q.d}" fill="rgb(${q.gray},${q.gray},${q.gray})" fill-rule="evenodd" stroke="none"/>`;
  for (const q of outlines) {
    const halo = isOverlay
      ? `<path d="${q.d}" fill="none" fill-rule="evenodd" stroke="#ffffff" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" opacity="0.7"/>`
      : '';
    const color = isOverlay ? OVERLAY : '#2b2b2b';
    o += `${halo}<path d="${q.d}" fill="none" fill-rule="evenodd" stroke="${color}" stroke-width="1.35" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
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
  if (S.outlines && outlines.length) {
    s += `<g opacity="${S.lineOpacity}">`;
    for (const q of outlines) {
      s += `<path d="${q.d}" fill="none" fill-rule="evenodd" stroke="#ffffff" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" opacity="0.7"/>`;
      s += `<path d="${q.d}" fill="none" fill-rule="evenodd" stroke="${OVERLAY}" stroke-width="1.35" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    s += '</g>';
  }

  const list = doc.layers[activeLayer()] || [];
  if (S.dots) {
    for (const q of list)
      for (let i = 0; i < q.length; i += 2)
        s += `<circle cx="${q[i].toFixed(1)}" cy="${q[i + 1].toFixed(1)}" r="2.4" fill="${OVERLAY}" stroke="#fff" stroke-width="0.8"/>`;
  }

  if (interactive && S.mode === 'poly') {
    for (const q of list.slice().sort((a, b) => area(b) - area(a))) {
      const on = q.key === S.selKey;
      s += `<path data-k="${q.key}" d="${dPath(q, cv)}" fill="none" stroke="${on ? OVERLAY : 'rgba(54,146,231,.35)'}" stroke-width="${on ? 2.5 : 1}" stroke-linejoin="round" style="cursor:pointer;pointer-events:all"/>`;
    }
  }
  return s + '</svg>';
}

/* Right pane: the progressive value study on a white base. */
export function studySvgStr() {
  const parts = buildSteppedParts(S.studyStep, false);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${doc.W} ${doc.H}" width="${doc.W}" height="${doc.H}" role="img" aria-label="Progressive value study">
   <rect width="${doc.W}" height="${doc.H}" fill="#ffffff"/>
   ${parts.fills}
   ${parts.outlines}
  </svg>`;
}

function updateStepCopy() {
  const step = S.studyStep;
  const lc = layerCount();
  const total = totalSteps();
  let heading = 'PURE WHITE';
  let detail = 'Blank white base';
  if (step > 0) {
    const n = step - 1;
    const j = Math.floor(n / 3);
    const phase = n % 3;
    const name = j === lc - 1 ? 'BLACK' : 'G' + j;
    heading = name + ' · ' + ['OUTLINE ONLY', 'FILL + OUTLINE', 'OUTLINE REMOVED'][phase];
    detail = 'Level ' + (j + 1) + '/' + lc + ' · ' + ['Contour only', 'Grey fill + contour', 'Clean fill'][phase];
  }
  $('studyStepTitle').textContent = heading;
  $('studyStepCount').textContent = step + ' / ' + (total - 1);
  $('stepStageSub').textContent = detail;
  $('vPass').textContent = 'STEP ' + step + ' / ' + (total - 1);
  const edit = S.mode === 'poly' ? 'Editing ' + levelName(activePass()) + ' · ' : '';
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
    d.className = 'chip' + (i === 0 ? ' fix' : '') + (i === doc.sel ? ' sel' : '');
    d.style.background = `rgb(${g},${g},${g})`;
    d.style.color = g > 128 ? '#000' : '#fff';
    d.textContent = levelName(i);
    if (i > 0) d.onclick = () => { doc.sel = i; chips(); editor(); };
    c.appendChild(d);
  }
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
  const j = activeLayer();
  return S.selKey && doc.layers[j] ? doc.layers[j].find(a => a.key === S.selKey) : null;
}

export function panel() {
  const q = curShape();
  const active = S.mode === 'poly';
  $('selectedTools').style.display = active ? 'grid' : 'none';
  ['sMinus10', 'sMinus', 'shapeSides', 'sPlus', 'sPlus10', 'sReset'].forEach(id => {
    $(id).disabled = !q;
  });
  $('sClear').disabled = !Object.keys(S.over).length;
  if (q) {
    const custom = S.over[S.selKey] !== undefined;
    const err = errAt(getCurve(S.selKey), q.length / 2).toFixed(1);
    $('selTxt').textContent =
      levelName(activePass()) + ' level · ' + q.length / 2 + ' edges rendered · worst error ' + err +
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
}
