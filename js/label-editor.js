/* orim · label-editor.js
 * Inline text editing on the board.
 */
'use strict';
function openEditor(kind,id){
  if(state.editing) closeEditor(true);
  const m=state.model; if(!m) return;
  let rect,label,fs=13,left=false;
  if(kind==='node'){ const n=m.nodes.get(id); if(!n) return; label=n.label; if(n.shape==='icon'){ const s=iconSize(n); rect={x:n.x-20,y:n.y+s+2,w:n.w+40,h:Math.max(20,n.h-s-2)}; fs=12; } else { rect={x:n.x,y:n.y,w:n.w,h:n.h}; fs=labelSize(n); } }
  else if(kind==='edge'){ const e=m.edges[id]; if(!e) return; const a=nodeRect(m,e.from,state.boxes),b=nodeRect(m,e.to,state.boxes); if(!a||!b) return; const g=edgeGeom(a,b,0,e.route); label=e.label; rect={x:g.mid.x-90,y:g.mid.y-14,w:180,h:28}; fs=12; }
  else { const b=state.boxes.get(id),g=m.groups.get(id); if(!b||!g) return; label=g.label; rect=PAL_LIVE.frameOut?{x:b.x-4,y:b.y-34,w:Math.max(180,Math.min(b.w,320)),h:26}:{x:b.x+8,y:b.y+8,w:Math.max(180,Math.min(b.w-16,320)),h:24}; fs=PAL_LIVE.frameOut?14:12; left=true; }
  const el=document.createElement('textarea'); el.className='label-editor'+(left?' left':''); el.value=label; el.setAttribute('aria-label','Edit label'); el.spellcheck=false;
  if(kind==='node'){ const st=m.styles.get(id); if(st&&st.bold) el.style.fontWeight='700'; if(st&&st.italic) el.style.fontStyle='italic'; }
  boardPane.appendChild(el);
  state.editing={kind,id,el,rect,fs,orig:label,group:kind==='group'};
  placeEditor(); render();
  try{ window.focus(); }catch(_){}
  el.focus({preventScroll:true}); el.select();
  el.addEventListener('keydown',ev=>{ ev.stopPropagation(); if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();closeEditor(true);} else if(ev.key==='Escape'){ev.preventDefault();closeEditor(false);} });
  el.addEventListener('input',placeEditor);
  el.addEventListener('blur',()=>closeEditor(true));
}
function placeEditor(){
  const ed=state.editing; if(!ed) return; const z=state.view.z; const el=ed.el;
  const lines=Math.max(1,el.value.split('\n').length); const lh=ed.fs*1.3*z; const hgt=lines*lh+8;
  const s=toScreen({x:ed.rect.x,y:ed.rect.y});
  el.style.fontSize=(ed.fs*z)+'px'; el.style.width=Math.max(80,ed.rect.w*z)+'px'; el.style.height=hgt+'px'; el.style.left=s.x+'px';
  el.style.top=(ed.group?s.y:s.y+ed.rect.h*z/2-hgt/2)+'px';
}
function closeEditor(commit){
  const ed=state.editing; if(!ed) return; state.editing=null;
  const v=ed.el.value; ed.el.remove();
  if(commit&&v!==ed.orig){
    mutate(m=>{
      if(ed.kind==='node'){ const n=m.nodes.get(ed.id); if(n) n.label=v.replace(/\s+$/,''); }
      else if(ed.kind==='edge'){ const e=m.edges[ed.id]; if(e) e.label=v.trim(); }
      else { const g=m.groups.get(ed.id); if(g) g.label=v.trim()||g.label; }
    });
  } else render();
}
