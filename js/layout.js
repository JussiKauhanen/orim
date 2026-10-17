/* orim · layout.js
 * Code, Split and Canvas views and the pane splitter.
 */
'use strict';
const narrow=matchMedia('(max-width:760px)');
function setMode(mode){
  if(narrow.matches&&mode==='split') mode='canvas';
  state.mode=mode; LS.set('mab.mode',mode); app.dataset.mode=mode;
  for(const b of document.querySelectorAll('#viewSeg button')) b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
  if(mode!=='code') requestAnimationFrame(()=>{ applyView(); render(); });
}
$('#viewSeg').addEventListener('click',e=>{ const b=e.target.closest('[data-mode]'); if(b) setMode(b.dataset.mode); });
narrow.addEventListener('change',()=>setMode(state.mode==='split'?'canvas':state.mode));
const work=$('#work'); const savedSplit=LS.get('mab.split',null); if(savedSplit) work.style.setProperty('--split',savedSplit+'px');
const splitter=$('#splitter');
splitter.addEventListener('pointerdown',e=>{
  e.preventDefault(); splitter.setPointerCapture(e.pointerId); const wr=work.getBoundingClientRect();
  const mv=ev=>{ const w=clamp(ev.clientX-wr.left,260,wr.width-340); work.style.setProperty('--split',w+'px'); applyView(); };
  const up=ev=>{ splitter.removeEventListener('pointermove',mv); splitter.removeEventListener('pointerup',up); const w=$('#codePane').getBoundingClientRect().width; LS.set('mab.split',Math.round(w)); };
  splitter.addEventListener('pointermove',mv); splitter.addEventListener('pointerup',up);
});
splitter.addEventListener('keydown',e=>{ if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight') return; e.preventDefault(); const wr=work.getBoundingClientRect(); const cur=$('#codePane').getBoundingClientRect().width; const w=clamp(cur+(e.key==='ArrowLeft'?-24:24),260,wr.width-340); work.style.setProperty('--split',w+'px'); LS.set('mab.split',Math.round(w)); });
window.addEventListener('resize',()=>{ applyView(); });
