/* orim · keyboard.js
 * Keyboard shortcuts and clipboard paste.
 */
'use strict';
document.addEventListener('keydown',e=>{
  if(Boards.isHome()){ if(e.key==='Escape'){ $('#homeMenu').hidden=true; closeModal(); } return; }
  const t=e.target; const inField=t&&t.closest&&t.closest('input,textarea,select,[contenteditable="true"]');
  const mod=e.metaKey||e.ctrlKey; const key=e.key.toLowerCase();
  if(mod&&(key==='z'||key==='y')){
    if(inField&&t!==ta) return;
    e.preventDefault(); (key==='y'||e.shiftKey)?redo():undo(); return;
  }
  if(e.altKey&&!mod&&['1','2','3'].includes(e.key)){ e.preventDefault(); setMode(['code','split','canvas'][+e.key-1]); return; }
  if(inField) return;
  if(e.key==='Escape'&&state.fly){ e.preventDefault(); closeFly(); return; }
  if(e.key==='Escape'){ hideFrameOffer(); closeMenus(); closePop(); $('#help').hidden=true; if(state.pick){endPick();return;} if(state.pendingFrom){state.pendingFrom=null;renderOverlay();return;} if(state.tool!=='select'){setTool('select');return;} if(state.sel.size){state.sel.clear();selChanged();} return; }
  if(e.key===' '){ if(!spaceDown){ spaceDown=true; board.classList.add('t-hand'); } e.preventDefault(); return; }
  if(mod&&key==='a'){ e.preventDefault(); const m=state.model; if(!m) return; state.sel=new Set([...m.nodeOrder.map(id=>'n:'+id)]); selChanged(); return; }
  if(mod&&key==='c'){ if(copySel()){ e.preventDefault(); state.clipWritten=false; try{ const pr=navigator.clipboard&&navigator.clipboard.writeText(CLIP_MARK+' '+Date.now()); if(pr) pr.then(()=>{state.clipWritten=true;},()=>{}); }catch(_){} toast('Copied'); } return; }
  if(mod&&key==='x'){ if(copySel()){ e.preventDefault(); deleteSel(); } return; }
  if(mod&&key==='v'){ if(state.clip&&!state.clipWritten){ e.preventDefault(); pasteClip(); } return; }
  if(mod&&key==='d'){ e.preventDefault(); if(copySel()){ state.pasteN=0; pasteClip(); } return; }
  if(mod&&key==='g'){ e.preventDefault(); e.shiftKey?ungroupSel():groupSel(); return; }
  if(mod&&(key==='='||key==='+')){ e.preventDefault(); const r=boardRect(); zoomAt(1.2,r.width/2,r.height/2); return; }
  if(mod&&key==='-'){ e.preventDefault(); const r=boardRect(); zoomAt(1/1.2,r.width/2,r.height/2); return; }
  if(mod&&key==='0'){ e.preventDefault(); const r=boardRect(); zoomAt(1/state.view.z,r.width/2,r.height/2); return; }
  if(mod&&(key==='b'||key==='i')&&selNodes().length){ e.preventDefault(); toggleTextStyle(key==='b'?'bold':'italic'); return; }
  if(mod) return;
  if(e.key==='Delete'||e.key==='Backspace'){ if(state.sel.size){ e.preventDefault(); deleteSel(); } return; }
  if(e.key==='Enter'){ const k=[...state.sel]; if(k.length===1){ e.preventDefault(); openEditor(k[0][0]==='n'?'node':k[0][0]==='e'?'edge':'group',k[0][0]==='e'?+k[0].slice(2):k[0].slice(2)); } return; }
  if(e.key.startsWith('Arrow')&&state.sel.size){ e.preventDefault(); const s=e.shiftKey?1:GRID; nudge(e.key==='ArrowLeft'?-s:e.key==='ArrowRight'?s:0,e.key==='ArrowUp'?-s:e.key==='ArrowDown'?s:0); return; }
  if(e.shiftKey&&(e.code==='Digit1')){ e.preventDefault(); fit(); return; }
  if(e.shiftKey&&key==='l'){ e.preventDefault(); tidy(); return; }
  if(e.key.length===1&&!e.altKey&&state.sel.size===1&&[...state.sel][0][0]==='n'&&e.key!==' '){
    const id=[...state.sel][0].slice(2); const n=state.model&&state.model.nodes.get(id);
    if(n&&n.shape!=='icon'){ e.preventDefault(); openEditor('node',id); const ed=state.editing; if(ed){ ed.el.value=e.key; ed.el.setSelectionRange(1,1); placeEditor(); } return; }
  }
  if(e.shiftKey&&key==='p'){ e.preventDefault(); setTool('hl'); return; }
  const map={v:'select',h:'hand',r:'rect',o:'circle',d:'diamond',b:'cyl',t:'text',a:'connector',c:'connector',f:'frame',i:'library',n:'sticky',p:'pen',e:'eraser',s:'shapes'};
  if(map[key]&&!e.shiftKey&&!e.altKey){ e.preventDefault(); setTool(map[key]); }
});
document.addEventListener('keyup',e=>{ if(e.key===' '){ spaceDown=false; updTools(); } });
const CLIP_MARK='%% mermaid-board-clip';
document.addEventListener('paste',e=>{
  const t=e.target; if(t&&t.closest&&t.closest('input,textarea')) return;
  const files=[]; for(const it of (e.clipboardData&&e.clipboardData.items)||[]) if(it.kind==='file'&&/^image\//.test(it.type)){ const f=it.getAsFile(); if(f) files.push(f); }
  if(Boards.isHome()){
    const tx=(e.clipboardData&&e.clipboardData.getData('text/plain'))||'';
    if(!files.length&&!tx.trim()) return; e.preventDefault();
    Boards.openNew('flowchart LR\n','Untitled board');
    requestAnimationFrame(()=>{ if(files.length) addImageFiles(files,null); else if(/^\s*(---\s*\n|%%|flowchart\b|graph\b)/.test(tx)) importText(tx,'clipboard'); else quickToBoard(tx,true,true); });
    return;
  }
  if(files.length){ e.preventDefault(); addImageFiles(files,null); return; }
  const text=(e.clipboardData&&e.clipboardData.getData('text/plain'))||'';
  if(text.startsWith(CLIP_MARK)||(!text.trim()&&state.clip)){ if(state.clip){ e.preventDefault(); pasteClip(); } return; }
  if(!text.trim()) return;
  e.preventDefault();
  if(/^\s*(---\s*\n|%%|flowchart\b|graph\b)/.test(text)) importText(text,'clipboard');
  else quickToBoard(text,false,true);
});
