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
export const totalSteps = () => 1 + layerCount() * 3;

/* Keep the study where it is when the grey count changes. The same step number
   is kept (so the same level and phase stay in view) unless it is past the new
   range, and a study that had reached its last step moves to the new last step
   instead of drifting back to an intermediate level. */
export function remapStep(step, oldSteps, newSteps) {
  const oldMax = 3 * (oldSteps - 1);
  const newMax = 3 * (newSteps - 1);
  return step >= oldMax ? newMax : clamp(step, 0, newMax);
}

/* The value level currently shown by the progressive step. */
export const activeLayer = () =>
  S.studyStep <= 0 ? 0 : clamp(Math.floor((S.studyStep - 1) / 3), 0, layerCount() - 1);
export const activePass = () => activeLayer() + 1;

/* Crosshair lines per axis: 1-3 each (3 vertical + 3 horizontal = 16 boxes). */
export const crossCount = v => clamp(Math.round(+v) || 1, 1, 3);

export const curvesEnabled = () => S.curves && S.mode !== 'poly';
export const shade = i => Math.round(255 * (1 - i / (S.steps - 1)));
export const levelName = i => (i === 0 ? 'W' : i === S.steps - 1 ? 'B' : 'G' + (i - 1));
