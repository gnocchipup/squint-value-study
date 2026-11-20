/* Standalone, interactive stepped-SVG export. */
import { $, S, doc, curvesEnabled, shade, parsePass, levelOn, blockName, CONTOUR } from './state.js';
import { crosshairStr, passD } from './render.js';

export function steppedSvgStr() {
  const lc = S.steps - 1;
  const passes = S.order.map(key => {
    const { level, size } = parsePass(key);
    return {
      name: blockName(level).toUpperCase() + (size === 'L' ? ' LARGE' : ' SMALL'),
      level,
      size,
      on: level < lc ? levelOn(level) : true
    };
  });
  const totalSteps = 1 + 3 * passes.length;
  const toolbarH = 82;
  const outW = Math.max(doc.W, 360);
  const offsetX = (outW - doc.W) / 2;
  const sliderX = 16;
  const sliderW = outW - 32;
  const cv = curvesEnabled();
  const parts = [];

  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${doc.H + toolbarH}" viewBox="0 0 ${outW} ${doc.H + toolbarH}" role="img" aria-labelledby="docTitle docDesc">`);
  parts.push(`<title id="docTitle">Interactive value study — progressive grey steps</title><desc id="docDesc">Use the Previous and Next buttons, the slider, or the left and right arrow keys to reveal each block-in pass (the large or small shapes of one value) in three stages: outline only, fill with outline, and fill with the outline removed.</desc>`);
  parts.push(`<rect width="${outW}" height="${doc.H + toolbarH}" fill="#ffffff"/>`);
  parts.push(`<rect width="${outW}" height="${toolbarH}" fill="#f7f7f7"/><path d="M0 ${toolbarH - 0.5}H${outW}" stroke="#dcdcdc"/>`);

  const button = (id, x, label) =>
    `<g id="${id}" role="button" tabindex="0" aria-label="${label}" style="cursor:pointer"><rect x="${x}" y="11" width="64" height="28" rx="7" fill="#76b234"/><text x="${x + 32}" y="29.5" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="#ffffff">${label}</text></g>`;
  parts.push(button('prevStep', 12, '← Prev'));
  parts.push(button('nextStep', 82, 'Next →'));
  parts.push('<text id="stageTitle" x="158" y="22" font-family="system-ui,sans-serif" font-size="12" font-weight="750" fill="#2f2f2f">PURE WHITE</text>');
  parts.push('<text id="stageSub" x="158" y="36" font-family="system-ui,sans-serif" font-size="9.5" fill="#757575">Blank white base</text>');
  parts.push(`<text id="stepCount" x="${outW - 14}" y="27" text-anchor="end" font-family="system-ui,sans-serif" font-size="10" font-weight="700" fill="#757575">0 / ${totalSteps - 1}</text>`);
  parts.push(`<g id="stepSlider" role="slider" tabindex="0" aria-label="Progressive value step" aria-valuemin="0" aria-valuemax="${totalSteps - 1}" aria-valuenow="0" style="cursor:pointer;touch-action:none"><rect x="${sliderX}" y="47" width="${sliderW}" height="24" fill="transparent"/><line x1="${sliderX}" y1="59" x2="${sliderX + sliderW}" y2="59" stroke="#d6d6d6" stroke-width="4" stroke-linecap="round"/><line id="sliderProgress" x1="${sliderX}" y1="59" x2="${sliderX}" y2="59" stroke="#76b234" stroke-width="4" stroke-linecap="round"/><circle id="sliderThumb" cx="${sliderX}" cy="59" r="6" fill="#76b234" stroke="#ffffff" stroke-width="2"/></g>`);
  parts.push(`<g transform="translate(${offsetX} ${toolbarH})">`);
  parts.push(`<rect width="${doc.W}" height="${doc.H}" fill="#ffffff"/>`);
  /* Fills paint in value order (light → dark) whatever the block-in order, so an
     earlier pass can never be covered by a lighter one; outlines sit above all
     fills, matching the study pane. Group ids stay tied to the pass index. */
  const dOf = passes.map(p => passD(p.level, p.size, cv));
  const fillOrder = passes.map((p, i) => i).sort((a, b) => passes[a].level - passes[b].level);
  for (const i of fillOrder) {
    const p = passes[i];
    const gray = shade(p.level + 1);
    parts.push(`<g id="fill-${i}" visibility="${p.on ? 'visible' : 'hidden'}"><path d="${dOf[i]}" fill="rgb(${gray},${gray},${gray})" fill-rule="evenodd" stroke="none"/></g>`);
  }
  for (let i = 0; i < passes.length; i++) {
    parts.push(`<g id="outline-${i}" visibility="hidden"><path d="${dOf[i]}" fill="none" fill-rule="evenodd" stroke="${CONTOUR}" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round"/></g>`);
  }
  /* Guide crosshair stays on top of every step, mirroring the on-screen study. */
  parts.push(crosshairStr());
  parts.push('</g>');
  parts.push('<script><![CDATA[' + embeddedScript(passes, totalSteps, sliderX, sliderW) + ']]>');
  parts.push('</scr' + 'ipt>');
  parts.push('</svg>');
  return parts.join('');
}

function embeddedScript(PASSES, TOTAL, X0, XW) {
  return `(function(){
  'use strict';
  const PASSES=${JSON.stringify(PASSES)}, N=PASSES.length, TOTAL=${TOTAL}, X0=${X0}, XW=${XW};
  const svg=document.documentElement;
  const byId=id=>document.getElementById(id);
  const title=byId('stageTitle'), sub=byId('stageSub'), count=byId('stepCount');
  const thumb=byId('sliderThumb'), progress=byId('sliderProgress'), slider=byId('stepSlider');
  const prev=byId('prevStep'), next=byId('nextStep');
  let current=0, dragging=false;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function setStep(value){
   current=clamp(Math.round(Number(value)||0),0,TOTAL-1);
   const n=current-1, idx=current>0?Math.floor(n/3):0, phase=current>0?n%3:0;
   for(let i=0;i<N;i++){
    let fill=false,outline=false;
    if(PASSES[i].on&&current>0){
     if(i<idx)fill=true;
     else if(i===idx){fill=phase>=1;outline=phase<=1;}
    }
    byId('fill-'+i).setAttribute('visibility',fill?'visible':'hidden');
    byId('outline-'+i).setAttribute('visibility',outline?'visible':'hidden');
   }
   let heading,detail;
   if(current===0){heading='PURE WHITE';detail='Blank white base';}
   else{
    const pass=PASSES[Math.min(idx,N-1)];
    heading=pass.name+' · '+(phase===0?'OUTLINE ONLY':phase===1?'FILL + OUTLINE':'OUTLINE REMOVED');
    detail='Pass '+(idx+1)+' of '+N+' · '+(phase===0?'Contour only':phase===1?'Grey fill added; contour remains':'Clean fill; contour hidden');
   }
   title.textContent=heading;sub.textContent=detail;count.textContent=current+' / '+(TOTAL-1);
   const x=X0+(TOTAL===1?0:current/(TOTAL-1))*XW;
   thumb.setAttribute('cx',x);progress.setAttribute('x2',x);
   slider.setAttribute('aria-valuenow',current);
   prev.setAttribute('opacity',current===0?'.38':'1');prev.setAttribute('aria-disabled',current===0?'true':'false');
   next.setAttribute('opacity',current===TOTAL-1?'.38':'1');next.setAttribute('aria-disabled',current===TOTAL-1?'true':'false');
  }
  function moveFromEvent(ev){
   const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;
   const local=pt.matrixTransform(slider.getScreenCTM().inverse());
   setStep((local.x-X0)/XW*(TOTAL-1));
  }
  prev.addEventListener('click',()=>setStep(current-1));
  next.addEventListener('click',()=>setStep(current+1));
  [prev,next].forEach((el,index)=>el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setStep(current+(index?1:-1));}}));
  slider.addEventListener('pointerdown',e=>{dragging=true;slider.setPointerCapture(e.pointerId);moveFromEvent(e);});
  slider.addEventListener('pointermove',e=>{if(dragging)moveFromEvent(e);});
  slider.addEventListener('pointerup',()=>{dragging=false;});
  slider.addEventListener('pointercancel',()=>{dragging=false;});
  slider.addEventListener('keydown',e=>{
   if(e.key==='ArrowRight'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();setStep(current+1);}
   else if(e.key==='ArrowLeft'||e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();setStep(current-1);}
   else if(e.key==='Home'){e.preventDefault();e.stopPropagation();setStep(0);}
   else if(e.key==='End'){e.preventDefault();e.stopPropagation();setStep(TOTAL-1);}
   else if(e.key==='PageUp'){e.preventDefault();e.stopPropagation();setStep(current+3);}
   else if(e.key==='PageDown'){e.preventDefault();e.stopPropagation();setStep(current-3);}
  });
  document.addEventListener('keydown',e=>{
   if(e.altKey||e.ctrlKey||e.metaKey)return;
   if(e.key==='ArrowRight'){e.preventDefault();setStep(current+1);}
   else if(e.key==='ArrowLeft'){e.preventDefault();setStep(current-1);}
   else if(e.key==='Home'){e.preventDefault();setStep(0);}
   else if(e.key==='End'){e.preventDefault();setStep(TOTAL-1);}
  });
  setStep(0);
 })();`;
}

export function exportSteppedSvg(btnId) {
  if (!doc.layers.length) return;
  const data = steppedSvgStr();
  const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'squint-value-study-progressive-steps.svg';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  const b = $(btnId);
  const old = b.textContent;
  b.textContent = 'Exported ✓';
  setTimeout(() => { b.textContent = old; }, 1800);
}


