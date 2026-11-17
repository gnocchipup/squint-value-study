/* Application wiring: controls, keyboard, image input and init. */
import { $, S, doc, clamp, totalSteps, activePass, levelName } from './state.js';
import { loadCanvas, sampleImage, readFile } from './image.js';
import { processImage } from './pipeline.js';
import { render, labels, curShape, studySvgStr } from './render.js';
import { refinePasses, refineShape } from './polygons.js';
import { exportSteppedSvg } from './export-svg.js';
import { exportPdf } from './export-pdf.js';

let timer = null;
function go(refilter) {
  labels();
  clearTimeout(timer);
  timer = setTimeout(() => processImage(refilter), 80);
}

/* ---------- shared step controls ---------- */
let playTimer = null;
function stopPlay() {
  if (!playTimer) return;
  clearInterval(playTimer);
  playTimer = null;
  $('play').textContent = '▶ Play';
}
function setStep(v) {
  stopPlay();
  S.studyStep = clamp(v, 0, totalSteps() - 1);
  render();
}
$('studyPrev').onclick = () => setStep(S.studyStep - 1);
$('studyNext').onclick = () => setStep(S.studyStep + 1);
$('studySlider').oninput = e => {
  stopPlay();
  S.studyStep = +e.target.value;
  render();
};
$('play').onclick = () => {
  if (playTimer) {
    stopPlay();
    return;
  }
  if (S.studyStep >= totalSteps() - 1) S.studyStep = 0;
  $('play').textContent = '■ Stop';
  playTimer = setInterval(() => {
    if (S.studyStep >= totalSteps() - 1) {
      stopPlay();
      render();
      return;
    }
    S.studyStep++;
    render();
  }, 700);
};

document.addEventListener('keydown', e => {
  if (e.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const max = totalSteps() - 1;
  if (e.key === 'ArrowRight') { e.preventDefault(); setStep(S.studyStep + 1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); setStep(S.studyStep - 1); }
  else if (e.key === 'Home') { e.preventDefault(); setStep(0); }
  else if (e.key === 'End') { e.preventDefault(); setStep(max); }
  else if (e.key === 'PageUp') { e.preventDefault(); setStep(S.studyStep + 3); }
  else if (e.key === 'PageDown') { e.preventDefault(); setStep(S.studyStep - 3); }
});

/* ---------- processing settings ---------- */
$('steps').oninput = e => {
  S.steps = +e.target.value;
  doc.manual = {};
  S.over = {};
  S.selKey = null;
  doc.sel = Math.min(doc.sel, S.steps - 1);
  S.studyStep = 0;
  go();
};
$('gamma').oninput = e => { S.gamma = +e.target.value; go(); };
$('ed').oninput = e => {
  const j = doc.sel - 1;
  const hi = j > 0 ? doc.thr[j - 1] - 1 : 254;
  const lo = j < doc.thr.length - 1 ? doc.thr[j + 1] + 1 : 1;
  doc.manual[j] = clamp(+e.target.value, lo, hi);
  $('edVal').textContent = doc.manual[j];
  go();
};
$('auto').onclick = () => { doc.manual = {}; go(); };
$('mode').onchange = e => {
  S.mode = e.target.value;
  $('ptype').style.display = $('poly-default').style.display = S.mode === 'poly' ? 'block' : 'none';
  render();
  go();
};
$('maxs').oninput = e => { S.maxSides = +e.target.value; $('vMs').textContent = S.maxSides; go(); };
$('ptype').onchange = e => { S.ptype = e.target.value; go(); };
$('filt').onchange = e => { S.filt = e.target.value; go(true); };
$('fr').oninput = e => { S.fr = +e.target.value; go(true); };
$('minA').oninput = e => { S.minA = +e.target.value; go(); };
$('smooth').oninput = e => { S.smooth = +e.target.value; go(); };
$('seg').oninput = e => { S.seg = +e.target.value; go(); };
$('tol').oninput = e => { S.tol = +e.target.value; $('vTol').textContent = S.tol; };

/* ---------- auto-refine ---------- */
const readSchedule = () =>
  ($('sched').value || '')
    .split(/[ ,]+/)
    .map(Number)
    .filter(v => v >= 1)
    .map(Math.round);

function handleRefineAll() {
  if (S.mode !== 'poly') {
    alert('Set Shape style to Blocking polygons first.');
    return;
  }
  /* Full pass: reset every shape to the minimum edge count so the result
     is the smallest workable polygon per shape. */
  S.maxSides = 4;
  S.over = {};
  S.selKey = null;
  $('maxs').value = 4;
  $('vMs').textContent = '4';
  processImage(false);

  const res = refinePasses(readSchedule());
  $('refTxt').textContent = res.count
    ? `${res.count} shapes refined on every level · +${res.added} edges · each started at 4 edges, worst point now within ${S.tol} px (steps +${res.steps.join(' → +')})`
    : `Every shape on every level is already within ${S.tol} px at 4 edges.`;
  go();
}

function handleRefineShape() {
  if (S.mode !== 'poly') {
    alert('Set Shape style to Blocking polygons first.');
    return;
  }
  const q = curShape();
  if (!q) {
    $('refTxt').textContent = 'Click a polygon on the live canvas to select it, then refine that shape.';
    return;
  }
  const res = refineShape(q, readSchedule());
  if (!res) {
    $('refTxt').textContent = 'That shape has no contour detail left to refine.';
    return;
  }
  const level = levelName(activePass());
  processImage(false);

  const delta = res.limit - res.before;
  const change = delta === 0
    ? `stayed at ${res.limit} edges`
    : `${res.before} → ${res.limit} edges (${delta > 0 ? '+' : ''}${delta})`;
  const fit = res.err <= S.tol
    ? `worst point now within ${S.tol} px`
    : `closest possible is ${res.err.toFixed(1)} px at this contour detail`;
  $('refTxt').textContent =
    `${level} shape ${change} · ${fit} (steps +${res.steps.join(' → +')}). Other shapes keep their limits.`;
}
$('refPass').onclick = handleRefineShape;
$('refAll').onclick = handleRefineAll;

/* ---------- polygon editor ---------- */
const bump = d => {
  const q = curShape();
  if (!q) return;
  const base = S.over[S.selKey] ?? Math.max(S.maxSides, q.length / 2);
  S.over[S.selKey] = clamp(base + d, 4, 1000);
  $('shapeSides').value = S.over[S.selKey];
  go();
};
const setShapeLimit = () => {
  if (!curShape()) return;
  const v = Number($('shapeSides').value);
  if (!Number.isFinite(v)) {
    render();
    return;
  }
  S.over[S.selKey] = clamp(Math.round(v), 4, 1000);
  $('shapeSides').value = S.over[S.selKey];
  go();
};
$('sPlus').onclick = () => bump(1);
$('sMinus').onclick = () => bump(-1);
$('sPlus10').onclick = () => bump(10);
$('sMinus10').onclick = () => bump(-10);
$('shapeSides').onchange = setShapeLimit;
$('sReset').onclick = () => {
  if (!S.selKey) return;
  delete S.over[S.selKey];
  go();
};
$('sClear').onclick = () => {
  S.over = {};
  go();
};

/* Click a polygon on the live canvas to edit it. */
$('livePane').onclick = e => {
  const t = e.target.closest && e.target.closest('[data-k]');
  S.selKey = t ? t.getAttribute('data-k') : null;
  render();
};

/* ---------- live-canvas view options ---------- */
$('fills').onchange = e => { S.fills = e.target.checked; render(); };
$('dots').onchange = e => { S.dots = e.target.checked; render(); };
$('curves').onchange = e => { S.curves = e.target.checked; render(); };
$('lineOpacity').oninput = e => { S.lineOpacity = +e.target.value; render(); };
$('fillOpacity').oninput = e => { S.fillOpacity = +e.target.value; render(); };
$('studyGray').onchange = e => { S.studyGray = e.target.checked; render(); };

/* ---------- copy & export ---------- */
$('copy').onclick = async () => {
  const t = studySvgStr();
  const c = $('code');
  c.value = t;
  try {
    await navigator.clipboard.writeText(t);
    $('copy').textContent = 'Copied ✓';
  } catch (err) {
    c.style.display = 'block';
    c.select();
    $('copy').textContent = 'Copy from box below';
  }
  setTimeout(() => { $('copy').textContent = 'Copy step SVG'; }, 2500);
};
$('exportSteps').onclick = () => exportSteppedSvg('exportSteps');
$('exportPdf').onclick = () => exportPdf('exportPdf');

/* ---------- source image ---------- */
function startImage(cv) {
  loadCanvas(cv);
  S.over = {};
  S.selKey = null;
  S.studyStep = 0;
  go(true);
}

$('sample').onclick = () => startImage(sampleImage());

$('file').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  $('fileName').textContent = f.name;
  try {
    startImage(await readFile(f));
  } catch (err) {
    console.error(err);
    alert('Could not load that image.');
    $('fileName').textContent = 'No image selected · PNG, JPG, WebP';
  }
});

/* ---------- init ---------- */
$('fills').checked = S.fills;
$('dots').checked = S.dots;
$('curves').checked = S.curves;
$('studyGray').checked = S.studyGray;
$('lineOpacity').value = S.lineOpacity;
$('fillOpacity').value = S.fillOpacity;
$('mode').value = S.mode;
$('ptype').value = S.ptype;
$('maxs').value = S.maxSides;
$('tol').value = S.tol;
$('sched').value = '5,3,1';
$('ptype').style.display = $('poly-default').style.display = S.mode === 'poly' ? 'block' : 'none';

labels();
startImage(sampleImage());
