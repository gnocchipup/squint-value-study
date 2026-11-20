/* Shared state for the whole app.
   Everything mutable lives on two objects so the small ES modules in this
   folder can cooperate without circular imports. */

export const $ = id => document.getElementById(id);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* Outline colour on top of photographs (selection + vertex dots). */
export const OVERLAY = '#3692e7';
/* Value-study contour colour, mirrored on the live canvas. */
export const CONTOUR = '#2b2b2b';
/* Guide-crosshair colour on the value study (same accent as the UI). */
export const CROSS = '#76b234';

/* User settings. */
export const S = {
  mode: 'curve',
  ptype: 'out',
  maxSides: 250,
  over: {},
  selKey: null,
  /* Per-level switches; a level is shown unless its entry is set to false. */
  levelOn: {},
  /* Block-in passes: every level is split at passArea into a large and a small
     shape pass, and S.order lists those passes in the order they block in. */
  passArea: 1500,
  order: [],
  steps: 5,
  gamma: 0.8,
  seg: 1500,
  minA: 60,
  filt: 'kuwahara',
  fr: 3,
  smooth: 2.5,
  studyStep: 0,
  lineOpacity: 0.9,
  fillOpacity: 0.25,
  studyGray: false,
  crossOpacity: 0.9,
  crossV: 1,
  crossH: 1,
  tol: 3,
  /* live-canvas render options */
  fills: true,
  dots: false,
  curves: false
};

/* Per-image document data and derived geometry. */
export const doc = {
  W: 0,
  H: 0,
  lum0: null,
  lum: null,
  thr: [],
  manual: {},
  sel: 1,
  layers: [],
  LP: {},
  EC: {},
  srcColor: '',
  srcGray: ''
};

export const layerCount = () => S.steps - 1;

/* Pass keys are '<level><L|S>': '0L' is G0's large shapes, '3S' black's small
   ones. Each pass owns three steps (outline, fill + outline, outline removed). */
export const passKey = (level, size) => level + size;
export const parsePass = key => ({ level: +key.slice(0, -1), size: key.slice(-1) });

/* Default block-in: every large pass in value order, then every small pass. */
export function defaultOrder(lc = layerCount()) {
  const out = [];
  for (let j = 0; j < lc; j++) out.push(passKey(j, 'L'));
  for (let j = 0; j < lc; j++) out.push(passKey(j, 'S'));
  return out;
}

export const totalSteps = () => 1 + 3 * (S.order.length || layerCount() * 2);

/* Keep a custom order when the grey count changes: surviving passes hold their
   place, new large passes join the large group after the last large pass, and
   new small passes go to the end. */
export function rebuildOrder(lc = layerCount()) {
  const want = defaultOrder(lc);
  const keep = S.order.filter(k => want.includes(k));
  for (const k of want) {
    if (keep.includes(k)) continue;
    if (k.endsWith('L')) {
      let at = -1;
      keep.forEach((x, i) => { if (x.endsWith('L')) at = i; });
      keep.splice(at + 1, 0, k);
    } else keep.push(k);
  }
  S.order = keep;
}

/* Which pass and phase a progressive step shows (null at step 0). */
export const stepMeta = step => {
  if (step <= 0 || !S.order.length) return null;
  const n = step - 1;
  const index = clamp(Math.floor(n / 3), 0, S.order.length - 1);
  const { level, size } = parsePass(S.order[index]);
  return { index, level, size, phase: n % 3 };
};

/* Keep the study on the same pass and phase when the grey count changes: the
   pass is matched by key in the rebuilt order, so inserting or dropping a grey
   does not slide the study onto a different shape group. A study that had
   reached its last step stays on the new last step. */
export function remapStep(step, oldMax, oldKey, oldPhase, newMax) {
  if (step <= 0) return 0;
  if (step >= oldMax) return newMax;
  const index = oldKey ? S.order.indexOf(oldKey) : -1;
  return index < 0 ? clamp(step, 1, newMax) : clamp(1 + 3 * index + oldPhase, 1, newMax);
}

/* The pass currently shown by the progressive step. */
export const activeLayer = () => {
  const m = stepMeta(S.studyStep);
  return m ? m.level : 0;
};
export const activeSize = () => {
  const m = stepMeta(S.studyStep);
  return m ? m.size : 'L';
};
export const activePass = () => activeLayer() + 1;

/* Crosshair lines per axis: 1-3 each (3 vertical + 3 horizontal = 16 boxes). */
export const crossCount = v => clamp(Math.round(+v) || 1, 1, 3);

export const curvesEnabled = () => S.curves && S.mode !== 'poly';
export const shade = i => Math.round(255 * (1 - i / (S.steps - 1)));
export const levelName = i => (i === 0 ? 'W' : i === S.steps - 1 ? 'B' : 'G' + (i - 1));

/* Display name for a value level's block-in pass: G0, G1, … Black. */
export const blockName = level => (level === S.steps - 2 ? 'Black' : 'G' + level);

/* Is the value level (layer) part of the study? Off means its fills, contours
   and hit areas are left out of both panes and of the exports. Switches are
   stored by level name (G0, G1, … B) so they survive a change in grey count. */
export const levelOn = j => S.levelOn[levelName(j + 1)] !== false;
