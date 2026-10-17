/* orim · view.js
 * Pan, zoom, fit and tidy up.
 */
'use strict';
function boardRect(){ return board.getBoundingClientRect(); }
function toWorld(e){ const r=boardRect(); return {x:(e.clientX-r.left-state.view.x)/state.view.z,y:(e.clientY-r.top-state.view.y)/state.view.z}; }
function toScreen(p){ return {x:p.x*state.view.z+state.view.x,y:p.y*state.view.z+state.view.y}; }
function zoomAt(f,sx,sy){
  const v=state.view; const nz=clamp(v.z*f,0.1,4); const wx=(sx-v.x)/v.z,wy=(sy-v.y)/v.z;
  v.x=sx-wx*nz; v.y=sy-wy*nz; v.z=nz; renderOverlay(); applyView();
}
function contentBounds(m){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const n of m.nodes.values()){ if(n.x==null) continue; x0=Math.min(x0,n.x);y0=Math.min(y0,n.y);x1=Math.max(x1,n.x+n.w);y1=Math.max(y1,n.y+n.h); }
  for(const b of m.images||[]){ x0=Math.min(x0,b.x);y0=Math.min(y0,b.y);x1=Math.max(x1,b.x+b.w);y1=Math.max(y1,b.y+b.h); }
  for(const a of m.arrows||[]){ const b=arrowBox(resolveArrow(m,a)); x0=Math.min(x0,b.x);y0=Math.min(y0,b.y);x1=Math.max(x1,b.x+b.w);y1=Math.max(y1,b.y+b.h); }
  for(const k of m.inks||[]){ const b=inkBox(k); x0=Math.min(x0,b.x);y0=Math.min(y0,b.y);x1=Math.max(x1,b.x+b.w);y1=Math.max(y1,b.y+b.h); }
  for(const b of groupBoxes(m).values()){ x0=Math.min(x0,b.x);y0=Math.min(y0,b.y-30);x1=Math.max(x1,b.x+b.w);y1=Math.max(y1,b.y+b.h); }
  m.edges.forEach(e=>{ if(e.from===e.to){ const n=m.nodes.get(e.from); if(n){ x1=Math.max(x1,n.x+n.w+50); y0=Math.min(y0,n.y-50);} } });
  return x0===Infinity?null:{x:x0,y:y0,w:x1-x0,h:y1-y0};
}
function visibleArea(){ const r=boardRect(); return {r,left:64+((state.libOpen&&r.width>760)?300:0),top:8,bottom:24}; }
function fitTarget(){
  const {r,left,top,bottom}=visibleArea(); if(!r.width) return null;
  const b=state.model&&contentBounds(state.model);
  const W=r.width-left, Hh=r.height-bottom-top;
  if(!b) return {x:left+W/2,y:top+Hh/2,z:1};
  const z=clamp(Math.min((W-64)/b.w,(Hh-48)/b.h,1.25),0.15,1.25);
  return {x:left+(W-b.w*z)/2-b.x*z,y:top+(Hh-b.h*z)/2-b.y*z,z};
}
let viewAnim=0;
function fit(animate){
  const t=fitTarget(); if(!t) return;
  cancelAnimationFrame(viewAnim);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!animate||reduce){ state.view=t; applyView(); renderOverlay(); return; }
  const s0={...state.view},t0=performance.now(),D=320;
  const step=now=>{ const k=Math.min(1,(now-t0)/D),e=1-Math.pow(1-k,3);
    state.view={x:s0.x+(t.x-s0.x)*e,y:s0.y+(t.y-s0.y)*e,z:s0.z+(t.z-s0.z)*e}; applyView(); if(k<1) viewAnim=requestAnimationFrame(step); else renderOverlay(); };
  viewAnim=requestAnimationFrame(step);
}
/* After text edits: bring new things into view and flash them briefly */
function nodeIds(){ return new Set(state.model?state.model.nodes.keys():[]); }
function revealNew(prev){
  const m=state.model; if(!m||!prev||app.hidden) return;
  const fresh=[...m.nodes.keys()].filter(id=>!prev.has(id)); if(!fresh.length) return;
  const {r,left,top,bottom}=visibleArea(); if(!r.width) return;
  const v=state.view; let out=false;
  for(const id of fresh){ const n=m.nodes.get(id); if(!n||n.x==null) continue; const x0=n.x*v.z+v.x,y0=n.y*v.z+v.y,x1=(n.x+n.w)*v.z+v.x,y1=(n.y+n.h)*v.z+v.y; if(x0<left+8||y0<top+8||x1>r.width-8||y1>r.height-bottom-8){ out=true; break; } }
  if(out) fit(true);
  setTimeout(()=>{ for(const id of fresh.slice(-12)){ const el=R.nodeEls.get(id); if(!el) continue; el.classList.remove('flash'); void el.getBoundingClientRect(); el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),1700); } },out?260:0);
}
$('#zoomIn').addEventListener('click',()=>{const r=boardRect();zoomAt(1.2,r.width/2,r.height/2);});
$('#zoomOut').addEventListener('click',()=>{const r=boardRect();zoomAt(1/1.2,r.width/2,r.height/2);});
$('#zoomPct').addEventListener('click',()=>{const r=boardRect();zoomAt(1/state.view.z,r.width/2,r.height/2);});
$('#zoomFit').addEventListener('click',fit);
$('#tidyBtn').addEventListener('click',tidy);
function tidy(){
  const m=state.model; if(!m||!m.nodes.size) return;
  for(const gid of m.groupOrder) if(groupHasMembers(m,gid)) m.pos.delete(gid);
  autoLayout(m); mutate(()=>{}, {structural:false}); fit(); toast('Layout tidied');
}
