/* orim · tools.js
 * Left toolbar, tool fly-outs, tool switching.
 */
'use strict';
const TOOLS=[['select','select','Select (V)'],['hand','hand','Hand (H or Space)'],'|',['sticky','sticky','Sticky note (N)'],['text','text','Text (T)'],['shapes','shapes','Shapes (S)'],['connector','arCurved','Arrows and connectors (A)'],['ink','pen','Pen, highlighter and eraser (P)'],['frame','frame','Frame (F)'],['image','picture','Image: paste, drop or pick a file'],'|',['library','library','Icon library (I)']];
state.inkColor=LS.get('mab.inkColor',{pen:0,hl:0}); state.stickyColor=LS.get('mab.stickyColor',0); state.lastShape='rect'; state.lastInk='pen'; state.fly=null;
const INK_TOOLS=['pen','hl','eraser'];
state.arrowKind=LS.get('mab.arrowKind','curved'); state.arrowW=LS.get('mab.arrowW',2); state.arrowColor=LS.get('mab.arrowColor',0);
function renderTools(){
  $('#tools').innerHTML=TOOLS.map(t=>t==='|'?'<span class="vsep"></span>':'<button type="button" class="ibtn" data-tool="'+t[0]+'" title="'+t[2]+'" aria-label="'+t[2]+'">'+ico(t[1])+'</button>').join('');
  updTools();
}
function updTools(){
  const t=state.tool;
  for(const b of document.querySelectorAll('#tools [data-tool]')){
    const id=b.dataset.tool; let on;
    if(id==='library') on=state.libOpen; else if(id==='shapes') on=SHAPE_TOOLS.includes(t); else if(id==='ink') on=INK_TOOLS.includes(t); else on=t===id;
    b.setAttribute('aria-pressed',String(on));
    if(id==='shapes'){ const k=SHAPE_TOOLS.includes(t)?t:state.lastShape; b.innerHTML=ico(k==='rect'?'shapes':k); }
    if(id==='ink'){ const k=INK_TOOLS.includes(t)?t:state.lastInk; b.innerHTML=ico(k); }
    if(id==='connector'){ const ak=ARROW_KINDS.find(x=>x[0]===state.arrowKind); b.innerHTML=ico(ak?ak[1]:'arCurved'); }
  }
  board.classList.toggle('t-hand',t==='hand');
  board.classList.toggle('t-draw',[...SHAPE_TOOLS,'text','frame','sticky'].includes(t));
  board.classList.toggle('t-connector',t==='connector');
  board.classList.toggle('t-ink',t==='pen'||t==='hl');
  board.classList.toggle('t-eraser',t==='eraser');
  renderFly();
}
function renderFly(){
  const fl=$('#flyout'); const t=state.tool; const kind=state.fly&&state.fly===toolFamily(t)?state.fly:null;
  if(!kind){ fl.hidden=true; return; }
  let h='';
  if(kind==='shapes') h='<div class="fly-grid">'+SHAPE_TOOLS.map(id=>{ const sh=SHAPES.find(x=>x.id===id); return '<button type="button" class="ibtn" data-fly-tool="'+id+'" aria-pressed="'+(t===id)+'" title="'+sh.name+(sh.key?' ('+sh.key.toUpperCase()+')':'')+'" aria-label="'+sh.name+'">'+ico(id)+'</button>'; }).join('')+'</div>';
  if(kind==='ink'){
    h=[['pen','pen','Pen (P)'],['hl','hl','Highlighter (Shift+P)'],['eraser','eraser','Eraser (E)']].map(([id,ic,tt])=>'<button type="button" class="ibtn" data-fly-tool="'+id+'" aria-pressed="'+(t===id)+'" title="'+tt+'" aria-label="'+tt+'">'+ico(ic)+'</button>').join('');
    if(t!=='eraser'){
      const names=t==='pen'?['Black','Red','Blue']:['Yellow','Pink','Green'];
      h+='<span class="hsep"></span>'+INK_COLORS[t].map((c,i)=>'<button type="button" class="ink-dot" data-ink-color="'+i+'" aria-pressed="'+(state.inkColor[t]===i)+'" title="'+names[i]+'" aria-label="'+names[i]+'" style="background:'+(c==='#1a1a1a'?'var(--ink-black)':c)+';'+(t==='hl'?'opacity:.75':'')+'"></button>').join('');
    }
  }
  if(kind==='connector'){
    h=ARROW_KINDS.map(([id,ic,tt])=>'<button type="button" class="ibtn" data-akind="'+id+'" aria-pressed="'+(state.arrowKind===id)+'" title="'+tt+'" aria-label="'+tt+'">'+ico(ic)+'</button>').join('');
    h+='<span class="hsep"></span><label class="thick" title="Thickness"><output>'+state.arrowW+'</output><input type="range" min="1" max="12" step="0.5" value="'+state.arrowW+'" data-fly-thick aria-label="Thickness"></label>';
    h+='<span class="hsep"></span><div class="fly-colors" style="grid-template-columns:repeat(2,22px);gap:6px">'+ARROW_COLORS.map((c,i)=>'<button type="button" class="ink-dot" data-fly-acolor="'+i+'" aria-pressed="'+(state.arrowColor===i)+'" title="'+c+'" style="width:22px;height:22px;background:'+(c==='#1a1a1a'?'var(--ink-black)':c)+'"></button>').join('')+'</div>';
  }
  if(kind==='sticky') h='<div class="pop-label" style="margin:2px 4px 4px">Sticky color</div><div class="fly-colors">'+STICKY_COLORS.slice(0,12).map((c,i)=>'<button type="button" class="ink-dot" data-sticky-color="'+i+'" aria-pressed="'+(state.stickyColor===i)+'" title="'+c+'" style="background:'+c+';border-radius:4px"></button>').join('')+'</div>';
  fl.innerHTML=h+'<span class="hsep"></span><button type="button" class="ibtn fly-close" data-fly-close title="Close panel (Esc)" aria-label="Close panel"><svg class="i" viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg></button>'; fl.hidden=false;
  const btn=$('#tools [data-tool="'+kind+'"]'); const pr=boardPane.getBoundingClientRect(); const lb=$('#leftbar').getBoundingClientRect(); const br=btn?btn.getBoundingClientRect():lb;
  fl.style.left=(lb.right-pr.left+8)+'px';
  fl.style.top=clamp(br.top-pr.top-6,8,Math.max(8,pr.height-fl.offsetHeight-8))+'px';
}
$('#flyout').addEventListener('pointerdown',e=>e.stopPropagation());
$('#flyout').addEventListener('input',e=>{ if(!e.target.matches('[data-fly-thick]')) return; state.arrowW=+e.target.value; LS.set('mab.arrowW',state.arrowW); const o=e.target.parentElement.querySelector('output'); if(o) o.textContent=state.arrowW; });
$('#flyout').addEventListener('click',e=>{
  if(e.target.closest('[data-fly-close]')){ closeFly(); return; }
  const ft=e.target.closest('[data-fly-tool]'),ic=e.target.closest('[data-ink-color]'),sc=e.target.closest('[data-sticky-color]');
  if(ft) setTool(ft.dataset.flyTool);
  const ak=e.target.closest('[data-akind]'),ac=e.target.closest('[data-fly-acolor]');
  if(ak){ state.arrowKind=ak.dataset.akind; LS.set('mab.arrowKind',state.arrowKind); updTools(); }
  if(ac){ state.arrowColor=+ac.dataset.flyAcolor; LS.set('mab.arrowColor',state.arrowColor); renderFly(); }
  if(ic){ state.inkColor[state.tool]=+ic.dataset.inkColor; LS.set('mab.inkColor',state.inkColor); renderFly(); }
  if(sc){ state.stickyColor=+sc.dataset.stickyColor; LS.set('mab.stickyColor',state.stickyColor); renderFly(); }
});
function toolFamily(t){ return SHAPE_TOOLS.includes(t)?'shapes':INK_TOOLS.includes(t)?'ink':t==='sticky'?'sticky':t==='connector'?'connector':null; }
function setTool(t,fromBar){
  if(t==='library'){ setLib(!state.libOpen); return; }
  if(t==='image'){ $('#imgIn').click(); return; }
  const fam0=toolFamily(state.tool);
  if(t==='shapes') t=SHAPE_TOOLS.includes(state.tool)?state.tool:state.lastShape;
  else if(t==='ink') t=INK_TOOLS.includes(state.tool)?state.tool:state.lastInk;
  const fam=toolFamily(t);
  if(fromBar&&fam&&fam===fam0&&state.fly===fam){ state.fly=null; renderFly(); updTools(); return; }
  state.fly=fam;
  if(SHAPE_TOOLS.includes(t)) state.lastShape=t;
  if(INK_TOOLS.includes(t)) state.lastInk=t;
  const was=state.tool; state.tool=t; state.hover=null; state.pendingFrom=null;
  if(INK_TOOLS.includes(t)&&state.sel.size){ state.sel.clear(); selChanged(); }
  updTools(); renderOverlay();
  if(t==='connector'&&was!=='connector') toast('Drag to draw an arrow. Start and end on shapes to connect them.');
}
function closeFly(){ if(state.fly){ state.fly=null; renderFly(); } }
$('#tools').addEventListener('click',e=>{ const b=e.target.closest('[data-tool]'); if(b) setTool(b.dataset.tool,true); });
$('#tools').addEventListener('pointerdown',e=>e.stopPropagation());
$('#zoomBar').addEventListener('pointerdown',e=>e.stopPropagation());
$('#leftbar').addEventListener('pointerdown',e=>e.stopPropagation());
