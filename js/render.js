/* orim · render.js
 * Draws frames, nodes, connectors, arrows, drawings, images and selection overlay.
 */
'use strict';
const R={nodeEls:new Map(),sig:new Map()};
function inkFor(hex){
  const m=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex||'').trim()); if(!m) return '#171e2b';
  let h=m[1]; if(h.length===3) h=h.split('').map(c=>c+c).join('');
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return (0.299*r+0.587*g+0.114*b)>150?'#171e2b':'#ffffff';
}
function nodeInner(n,m,P,live){
  const w=n.w,h=n.h,st=m.styles.get(n.id);
  const F=(st&&st.fill)||P.nodeFill, S=(st&&st.stroke)||P.nodeStroke, T=(st&&st.color)||((st&&st.fill)?inkFor(st.fill):P.nodeText);
  const sty='fill:'+F+';stroke:'+S+';stroke-width:'+P.nodeSw;
  let s='';
  switch(n.shape){
    case 'round': s='<rect class="shape" width="'+w+'" height="'+h+'" rx="14" style="'+sty+'"/>'; break;
    case 'stadium': s='<rect class="shape" width="'+w+'" height="'+h+'" rx="'+(h/2)+'" style="'+sty+'"/>'; break;
    case 'circle': s='<ellipse class="shape" cx="'+(w/2)+'" cy="'+(h/2)+'" rx="'+(w/2)+'" ry="'+(h/2)+'" style="'+sty+'"/>'; break;
    case 'diamond': s='<path class="shape" d="M'+(w/2)+' 0L'+w+' '+(h/2)+'L'+(w/2)+' '+h+'L0 '+(h/2)+'Z" style="'+sty+';stroke-linejoin:round"/>'; break;
    case 'hex': { const k=Math.min(18,w/4); s='<path class="shape" d="M'+k+' 0H'+(w-k)+'L'+w+' '+(h/2)+'L'+(w-k)+' '+h+'H'+k+'L0 '+(h/2)+'Z" style="'+sty+';stroke-linejoin:round"/>'; break; }
    case 'para': { const k=Math.min(16,w/5); s='<path class="shape" d="M'+k+' 0H'+w+'L'+(w-k)+' '+h+'H0Z" style="'+sty+';stroke-linejoin:round"/>'; break; }
    case 'cyl': { const ry=Math.min(9,h/6); s='<path class="shape" d="M0 '+ry+'A'+(w/2)+' '+ry+' 0 0 1 '+w+' '+ry+'V'+(h-ry)+'A'+(w/2)+' '+ry+' 0 0 1 0 '+(h-ry)+'Z" style="'+sty+'"/><path d="M0 '+ry+'A'+(w/2)+' '+ry+' 0 0 0 '+w+' '+ry+'" style="fill:none;stroke:'+S+';stroke-width:'+P.nodeSw+'"/>'; break; }
    case 'sub': s='<rect class="shape" width="'+w+'" height="'+h+'" rx="3" style="'+sty+'"/><path d="M8 0V'+h+'M'+(w-8)+' 0V'+h+'" style="stroke:'+S+';stroke-width:'+P.nodeSw+'"/>'; break;
    case 'sticky': s='<rect class="shape sticky" width="'+w+'" height="'+h+'" rx="2" style="fill:'+((st&&st.fill)||'#fff9b1')+';stroke:none"/>'; break;
    case 'text': s=live?'<rect class="hit" width="'+w+'" height="'+h+'" rx="4" style="fill:transparent;stroke:transparent"/>':''; break;
    case 'icon': {
      const is=iconSize(n); const ic=iconFor(n.icon);
      if(live) s+='<rect class="hit" x="-4" y="-4" width="'+(w+8)+'" height="'+(h+8)+'" rx="8" style="fill:transparent;stroke:transparent"/>';
      if(ic) s+='<image href="'+ic.uri+'" x="'+((w-is)/2)+'" y="0" width="'+is+'" height="'+is+'" preserveAspectRatio="xMidYMid meet"/>';
      else s+='<rect x="'+((w-is)/2)+'" y="0" width="'+is+'" height="'+is+'" rx="10" style="fill:'+P.nodeFill+';stroke:'+P.nodeStroke+';stroke-dasharray:4 3"/><text x="'+(w/2)+'" y="'+(is/2+4)+'" text-anchor="middle" style="fill:'+P.muted+';font:500 10px '+P.font+'">'+(Icons.ready||Icons.failed?'?':'…')+'</text>';
      break;
    }
    default: s='<rect class="shape" width="'+w+'" height="'+h+'" rx="4" style="'+sty+'"/>';
  }
  const lines=n.lines||[]; const lh=lineH(n),fs=labelSize(n);
  let y0;
  if(n.shape==='icon'){ y0=iconSize(n)+8+fs*0.95; }
  else if(n.shape==='text'){ const th=lines.length*lh; y0=(h-th)/2+lh*0.76; }
  else { const th=lines.length*lh; y0=(h-th)/2+lh*0.74+(n.shape==='cyl'?4:0); }
  if(lines.some(Boolean)){
    const tcol=n.shape==='sticky'?((st&&st.color)||'#1d2026'):(n.shape==='icon'||n.shape==='text'?P.nodeText:T);
    const tc=(st&&st.color)||tcol; const wt=st&&st.bold?700:(n.shape==='sticky'?400:500); const it=st&&st.italic?'italic ':'';
    if(st&&st.bg){ lines.forEach((l,k)=>{ if(!l) return; const lw=measureN(n,l,fs); s+='<rect class="lbl" x="'+(w/2-lw/2-3).toFixed(1)+'" y="'+(y0+k*lh-fs*0.86).toFixed(1)+'" width="'+(lw+6).toFixed(1)+'" height="'+(fs*1.18).toFixed(1)+'" rx="2" style="fill:'+st.bg+'"/>'; }); }
    s+='<text class="lbl" text-anchor="middle" style="fill:'+tc+';font:'+it+wt+' '+fs+'px '+P.font+'">';
    lines.forEach((l,k)=>{ s+='<tspan x="'+(w/2)+'" y="'+(y0+k*lh).toFixed(1)+'">'+esc(l)+'</tspan>'; });
    s+='</text>';
  }
  return s;
}
function nodeRect(m,id,boxes){ const n=m.nodes.get(id); if(n) return n; return boxes.get(id)||null; }
function markerDefs(P,pre){
  const mk=(id,c)=>
    '<marker id="'+pre+'a-'+id+'" viewBox="0 0 10 10" refX="9.6" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0.6 0.9L9.6 5L0.6 9.1Z" style="fill:'+c+'"/></marker>'+
    '<marker id="'+pre+'c-'+id+'" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><circle cx="5" cy="5" r="3.8" style="fill:'+P.labelBg+';stroke:'+c+';stroke-width:1.6"/></marker>'+
    '<marker id="'+pre+'x-'+id+'" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" style="fill:none;stroke:'+c+';stroke-width:1.8"/></marker>';
  return mk('n',P.edge)+mk('s',P.accent);
}
function edgesMarkup(m,boxes,P,live,pre){
  const counts=new Map(),idx=new Map();
  m.edges.forEach(e=>{const k=[e.from,e.to].sort().join('\u0001'); counts.set(k,(counts.get(k)||0)+1);});
  let out='';
  m.edges.forEach((e,i)=>{
    const a=nodeRect(m,e.from,boxes),b=nodeRect(m,e.to,boxes); if(!a||!b||a.x==null||b.x==null) return;
    if(!live&&e.line==='invis') return;
    const k=[e.from,e.to].sort().join('\u0001'); const c=counts.get(k); const j=idx.get(k)||0; idx.set(k,j+1);
    const off=c>1?(j-(c-1)/2)*28*(e.from<e.to?1:-1):0;
    const sel=live&&state.sel.has('e:'+i);
    const ecol=e.color?(e.color.toLowerCase()==='#1a1a1a'?P.inkBlack:e.color):P.edge; const col=sel?P.accent:ecol;
    const sw=e.width||(e.line==='thick'?P.edgeThick:P.edgeSw);
    const shp=edgeShape(a,b,off,e.route);
    const g=geomPath(shp,headInset(e.tail,sw),headInset(e.head,sw));
    const dash=e.line==='dotted'?';stroke-dasharray:'+(4+sw*1.5)+' '+(4+sw*1.5):e.line==='invis'?';stroke-dasharray:2 6;opacity:.45':'';
    out+='<g class="edge'+(sel?' sel':'')+'"'+(live?' data-kind="edge" data-idx="'+i+'"':'')+'>';
    if(live) out+='<path class="edge-hit" d="'+g.d+'" style="fill:none;stroke:transparent;stroke-width:'+Math.max(14,sw+10)+'"/>';
    out+='<path class="edge-line" d="'+g.d+'" style="fill:none;stroke:'+col+';stroke-width:'+sw+';stroke-linecap:round;stroke-linejoin:round'+dash+'"/>';
    if(e.line!=='invis'){ out+=headMarkup(e.head,g.p3,g.t3,sw,col,P.labelBg,'edge-head'); out+=headMarkup(e.tail,g.p0,g.t0,sw,col,P.labelBg,'edge-head'); }
    if(e.label&&!(live&&state.editing&&state.editing.kind==='edge'&&state.editing.id===i)){
      const ls=wrapText(e.label,180,12); const tw=Math.max(...ls.map(l=>Core.measure(l,12)))+12; const th=ls.length*15+6;
      out+='<rect x="'+(g.mid.x-tw/2)+'" y="'+(g.mid.y-th/2)+'" width="'+tw+'" height="'+th+'" rx="4" style="fill:'+P.labelBg+'"/>';
      out+='<text text-anchor="middle" style="fill:'+(sel?P.accent:P.labelText)+';font:500 12px '+P.font+'">';
      ls.forEach((l,k)=>{ out+='<tspan x="'+g.mid.x+'" y="'+(g.mid.y-th/2+3+12+k*15).toFixed(1)+'">'+esc(l)+'</tspan>'; });
      out+='</text>';
    }
    out+='</g>';
  });
  return out;
}
function arrowsMarkup(m,P,live,list){
  let out='';
  for(const a0 of list||m.arrows||[]){
    const a=list?a0:resolveArrow(m,a0);
    const col=a.color.toLowerCase()==='#1a1a1a'?P.inkBlack:a.color; const sel=live&&state.sel.has('a:'+a.id);
    out+='<g class="farrow"'+(live&&a.id?' data-kind="arrow" data-id="'+esc(a.id)+'"':'')+'>';
    if(a.kind==='block'){
      const pts=blockArrowPts(a);
      if(sel) out+='<polygon points="'+pts+'" style="fill:none;stroke:var(--accent);stroke-width:6;stroke-linejoin:round;opacity:.35"/>';
      out+='<polygon points="'+pts+'" style="fill:'+col+';stroke:'+col+';stroke-width:1.5;stroke-linejoin:round"/>';
    } else {
      const head=a.kind==='line'?'none':'arrow'; const g=geomPath(freeArrowShape(a),0,headInset(head,a.w));
      if(live) out+='<path d="'+g.d+'" style="fill:none;stroke:transparent;stroke-width:'+(a.w+14)+'"/>';
      if(sel) out+='<path d="'+g.d+'" style="fill:none;stroke:var(--accent);stroke-width:'+(a.w+6)+';stroke-linecap:round;opacity:.3"/>';
      out+='<path d="'+g.d+'" style="fill:none;stroke:'+col+';stroke-width:'+a.w+';stroke-linecap:round;stroke-linejoin:round"/>'+headMarkup(head,g.p3,g.t3,a.w,col,P.labelBg);
    }
    out+='</g>';
  }
  return out;
}
const imgEls=new Map();
function renderImages(m){
  const seen=new Set();
  for(const im of m.images||[]){
    seen.add(im.id); let el=imgEls.get(im.id);
    if(!el){ el=document.createElementNS(SVGNS,'g'); el.setAttribute('class','pic'); el.dataset.kind='pic'; el.dataset.id=im.id; imgEls.set(im.id,el); el._src=null; }
    const layer=im.front?lImgTop:lImg; if(el.parentNode!==layer||layer.lastChild!==el) layer.appendChild(el);
    const src=IMG[im.id]||null;
    if(el._src!==src){ el._src=src; el.innerHTML=src?'<image preserveAspectRatio="none"/>':'<rect style="fill:var(--panel-2);stroke:var(--line-strong);stroke-dasharray:6 4"/><text text-anchor="middle" style="fill:var(--muted);font:500 13px '+FONT_ATTR+'">Image missing</text>'; if(src) el.firstChild.setAttribute('href',src); }
    const a=el.firstChild; a.setAttribute('x',im.x); a.setAttribute('y',im.y); a.setAttribute('width',im.w); a.setAttribute('height',im.h);
    if(!src){ const t=el.lastChild; t.setAttribute('x',im.x+im.w/2); t.setAttribute('y',im.y+im.h/2); }
  }
  for(const [id,el] of imgEls) if(!seen.has(id)){ el.remove(); imgEls.delete(id); }
}
function imagesMarkup(m,front){ let o=''; for(const im of m.images||[]){ if(!!im.front!==!!front) continue; const src=IMG[im.id]; if(src) o+='<image href="'+src+'" x="'+im.x+'" y="'+im.y+'" width="'+im.w+'" height="'+im.h+'" preserveAspectRatio="none"/>'; } return o; }
function inkPath(pts){
  if(pts.length===1) return 'M'+pts[0][0]+' '+pts[0][1]+'l0.01 0';
  let d='M'+pts[0][0]+' '+pts[0][1];
  for(let i=1;i<pts.length-1;i++){ const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2; d+='Q'+pts[i][0]+' '+pts[i][1]+' '+r10(mx)+' '+r10(my); }
  const l=pts[pts.length-1]; return d+'L'+l[0]+' '+l[1];
}
function inkMarkup(m,P,live){
  let out=''; const hide=live&&state.drag&&state.drag.mode==='erase'?state.drag.hits:null;
  for(const k of m.inks||[]){
    if(hide&&hide.has(k.id)) continue;
    const d=inkPath(k.pts); const col=k.color.toLowerCase()==='#1a1a1a'?P.inkBlack:k.color; const op=k.tool==='hl'?0.55:1;
    const sel=live&&state.sel.has('k:'+k.id);
    out+='<g class="ink"'+(live?' data-kind="ink" data-id="'+esc(k.id)+'"':'')+'>';
    if(sel) out+='<path d="'+d+'" style="fill:none;stroke:var(--accent);stroke-width:'+(k.w+6)+';stroke-linecap:round;stroke-linejoin:round;opacity:.3"/>';
    if(live) out+='<path d="'+d+'" style="fill:none;stroke:transparent;stroke-width:'+(k.w+12)+';stroke-linecap:round"/>';
    out+='<path d="'+d+'" style="fill:none;stroke:'+col+';stroke-width:'+k.w+';stroke-linecap:round;stroke-linejoin:round;opacity:'+op+'"/></g>';
  }
  return out;
}
function groupsMarkup(m,boxes,P,live){
  let out='';
  const order=[...m.groupOrder].sort((a,b)=>groupDepth(m,a)-groupDepth(m,b));
  for(const gid of order){
    const g=m.groups.get(gid),b=boxes.get(gid); if(!b) continue;
    const st=m.styles.get(gid); const sel=live&&state.sel.has('g:'+gid); const drop=live&&state.dropGroup===gid;
    const stroke=sel||drop?P.accent:((st&&st.stroke)||P.frameStroke);
    const fo=P.frameOut, rx=fo?2:12;
    out+='<g class="frame">';
    const depth=groupDepth(m,gid); const nfill=depth&&fo?(depth%2?'#f7f7f7':'#ffffff'):P.frameFill; const nstroke=depth&&fo&&!sel&&!drop&&!(st&&st.stroke)?'#e2e2e2':stroke;
    out+='<rect'+(live?' class="frame-body" data-kind="group" data-part="body" data-id="'+esc(gid)+'"':'')+' x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.h+'" rx="'+rx+'" style="fill:'+((st&&st.fill)||nfill)+';stroke:'+nstroke+';stroke-width:'+(drop?2:sel&&fo?1.5:P.frameSw)+(drop?';stroke-dasharray:6 4':'')+'"/>';
    const editingThis=live&&state.editing&&state.editing.kind==='group'&&state.editing.id===gid;
    if(!editingThis){
      if(fo) out+='<text x="'+(b.x+1)+'" y="'+(b.y-10)+'" style="fill:'+(sel?P.accent:((st&&st.color)||P.frameText))+';font:500 14px '+P.font+'">'+esc(g.label)+'</text>';
      else out+='<text x="'+(b.x+14)+'" y="'+(b.y+24)+'" style="fill:'+((st&&st.color)||P.frameText)+';font:600 12.5px '+P.font+';letter-spacing:.01em">'+esc(g.label)+'</text>';
    }
    if(live){
      const lw=Core.measure(g.label,fo?14:12)+28;
      if(fo) out+='<rect class="frame-hit" data-kind="group" data-id="'+esc(gid)+'" x="'+b.x+'" y="'+(b.y-30)+'" width="'+Math.max(60,lw)+'" height="28" style="fill:transparent"/>';
      else out+='<rect class="frame-hit" data-kind="group" data-id="'+esc(gid)+'" x="'+b.x+'" y="'+b.y+'" width="'+Math.min(b.w,Math.max(60,lw))+'" height="34" rx="12" style="fill:transparent"/>';
      out+='<rect class="frame-hit" data-kind="group" data-id="'+esc(gid)+'" x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.h+'" rx="12" style="fill:none;stroke:transparent;stroke-width:10;pointer-events:stroke"/>';
    }
    out+='</g>';
  }
  return out;
}
function render(){
  const m=state.model;
  $('#emptyHint').hidden=!!(m&&(m.nodes.size||m.groups.size||m.inks.length||m.arrows.length||m.images.length));
  if(!m){ lGroups.innerHTML=lEdges.innerHTML=lOver.innerHTML=lInk.innerHTML=''; for(const el of imgEls.values()) el.remove(); imgEls.clear(); for(const el of R.nodeEls.values()) el.remove(); R.nodeEls.clear(); R.sig.clear(); applyView(); updCtx(); return; }
  if(state.dragExclude&&state.dragExclude.size){ const bx=groupBoxes(m,state.dragExclude); for(const [gid,hb] of state.dragHome||[]) if(!bx.has(gid)) bx.set(gid,hb); state.boxes=bx; }
  else state.boxes=groupBoxes(m);
  lGroups.innerHTML=groupsMarkup(m,state.boxes,PAL_LIVE,true);
  renderImages(m);
  lInk.innerHTML=arrowsMarkup(m,PAL_LIVE,true)+inkMarkup(m,PAL_LIVE,true);
  lEdges.innerHTML=edgesMarkup(m,state.boxes,PAL_LIVE,true,'L');
  const seen=new Set();
  for(const id of m.nodeOrder){
    const n=m.nodes.get(id); seen.add(id);
    let el=R.nodeEls.get(id);
    if(!el){ el=document.createElementNS(SVGNS,'g'); el.setAttribute('class','node'); el.dataset.kind='node'; el.dataset.id=id; lNodes.appendChild(el); R.nodeEls.set(id,el); }
    const st=m.styles.get(id);
    const sig=[n.shape,n.label,n.icon,n.w,n.h,n.fs,n.fsSet,st?[st.bold,st.italic,st.bg].join(','):'',(n.lines||[]).join('\n'),st?(st.fill+'|'+st.stroke+'|'+st.color):'',Icons.ready,Icons.failed].join('\u0001');
    if(R.sig.get(id)!==sig){ el.innerHTML=nodeInner(n,m,PAL_LIVE,true); R.sig.set(id,sig); }
    el.setAttribute('transform','translate('+n.x+','+n.y+')');
    el.classList.toggle('editing',!!(state.editing&&state.editing.kind==='node'&&state.editing.id===id));
  }
  for(const [id,el] of R.nodeEls) if(!seen.has(id)){ el.remove(); R.nodeEls.delete(id); R.sig.delete(id); }
  renderOverlay(); applyView(); updCtx();
}
function selNodes(){ const m=state.model; const out=[]; if(!m) return out; for(const k of state.sel) if(k[0]==='n'){ const n=m.nodes.get(k.slice(2)); if(n) out.push(n);} return out; }
function renderOverlay(){
  const m=state.model; if(!m){lOver.innerHTML='';return;}
  const z=state.view.z,u=1/z; let h='';
  const d=state.drag;
  for(const k of state.sel){
    if(k[0]==='n'){ const n=m.nodes.get(k.slice(2)); if(n) h+='<rect x="'+(n.x-4*u)+'" y="'+(n.y-4*u)+'" width="'+(n.w+8*u)+'" height="'+(n.h+8*u)+'" rx="'+(6*u)+'" style="fill:none;stroke:var(--accent);stroke-width:'+(1.5*u)+';pointer-events:none"/>'; }
  }
  const sn=selNodes();
  if(sn.length===1&&state.sel.size===1&&!state.editing&&(!d||d.mode==='resize')&&state.tool==='select'){
    const n=sn[0]; const hs=8*u;
    const hl=[['nw',n.x-4*u,n.y-4*u],['ne',n.x+n.w+4*u,n.y-4*u],['sw',n.x-4*u,n.y+n.h+4*u],['se',n.x+n.w+4*u,n.y+n.h+4*u]];
    if(n.shape==='text') hl.push(['e',n.x+n.w+4*u,n.y+n.h/2],['w',n.x-4*u,n.y+n.h/2]);
    for(const [c,x,y] of hl)
      h+='<rect class="handle '+c+'" data-kind="handle" data-corner="'+c+'" data-id="'+esc(n.id)+'" x="'+(x-hs/2)+'" y="'+(y-hs/2)+'" width="'+hs+'" height="'+hs+'" rx="'+(2*u)+'" style="fill:var(--panel);stroke:var(--accent);stroke-width:'+(1.5*u)+'"/>';
  }
  const sg=[...state.sel].filter(k=>k[0]==='g');
  if(sg.length===1&&state.sel.size===1&&!state.editing&&(!d||d.mode==='gresize')&&state.tool==='select'){
    const gid=sg[0].slice(2); const b=state.boxes.get(gid);
    if(b){ const hs=9*u;
      for(const [c,x,y] of [['nw',b.x,b.y],['n',b.x+b.w/2,b.y],['ne',b.x+b.w,b.y],['e',b.x+b.w,b.y+b.h/2],['se',b.x+b.w,b.y+b.h],['s',b.x+b.w/2,b.y+b.h],['sw',b.x,b.y+b.h],['w',b.x,b.y+b.h/2]])
        h+='<rect class="handle '+c+'" data-kind="handle" data-corner="'+c+'" data-gid="'+esc(gid)+'" x="'+(x-hs/2)+'" y="'+(y-hs/2)+'" width="'+hs+'" height="'+hs+'" rx="'+(2*u)+'" style="fill:var(--panel);stroke:var(--accent);stroke-width:'+(1.5*u)+'"/>';
    }
  }
  let pid=null;
  if(!d||d.mode==='connect'){ pid=state.hover; if(!pid&&sn.length===1&&state.sel.size===1) pid=sn[0].id; }
  if(d&&d.mode==='connect') pid=null;
  if(pid&&!state.editing&&(state.tool==='select'||state.tool==='connector')){
    const n=m.nodes.get(pid);
    if(n){ const o=14*u,r=5*u;
      for(const [s,x,y] of [['t',n.x+n.w/2,n.y-o],['r',n.x+n.w+o,n.y+n.h/2],['b',n.x+n.w/2,n.y+n.h+o],['l',n.x-o,n.y+n.h/2]])
        h+='<g class="port" data-kind="port" data-id="'+esc(n.id)+'" data-side="'+s+'"><circle cx="'+x+'" cy="'+y+'" r="'+(11*u)+'" style="fill:transparent"/><circle cx="'+x+'" cy="'+y+'" r="'+r+'" style="fill:var(--panel);stroke:var(--accent);stroke-width:'+(1.5*u)+'"/></g>';
    }
  }
  if(d&&d.mode==='draw'&&d.pts.length){
    const col=d.color.toLowerCase()==='#1a1a1a'?'var(--ink-black)':d.color;
    h+='<path d="'+inkPath(d.pts)+'" style="fill:none;stroke:'+col+';stroke-width:'+d.w+';stroke-linecap:round;stroke-linejoin:round;opacity:'+(d.tool==='hl'?0.55:1)+';pointer-events:none"/>';
  }
  if(d&&d.mode==='erase'&&d.cur) h+='<circle cx="'+d.cur.x+'" cy="'+d.cur.y+'" r="'+(10*u)+'" style="fill:color-mix(in srgb,var(--fg) 8%,transparent);stroke:var(--muted);stroke-width:'+u+';pointer-events:none"/>';
  const sa=[...state.sel].filter(k=>k[0]==='a');
  if(sa.length===1&&state.sel.size===1&&(!d||d.mode==='aend')){
    const a0=m.arrows.find(x=>x.id===sa[0].slice(2)); const a=a0&&resolveArrow(m,a0);
    if(a) for(const [end,x,y] of [[0,a.x1,a.y1],[1,a.x2,a.y2]]) h+='<circle class="handle" data-kind="ahandle" data-id="'+esc(a.id)+'" data-end="'+end+'" cx="'+x+'" cy="'+y+'" r="'+(6*u)+'" style="fill:var(--panel);stroke:var(--accent);stroke-width:'+(2*u)+';cursor:move"/>';
  }
  for(const k of state.sel){ if(k[0]!=='p') continue; const im=m.images.find(x=>x.id===k.slice(2)); if(im) h+='<rect x="'+(im.x-2*u)+'" y="'+(im.y-2*u)+'" width="'+(im.w+4*u)+'" height="'+(im.h+4*u)+'" style="fill:none;stroke:var(--accent);stroke-width:'+(1.5*u)+';pointer-events:none"/>'; }
  const sp=[...state.sel].filter(k=>k[0]==='p');
  if(sp.length===1&&state.sel.size===1&&(!d||d.mode==='presize')){ const im=m.images.find(x=>x.id===sp[0].slice(2)); if(im){ const hs=9*u;
    for(const [c,x,y] of [['nw',im.x,im.y],['ne',im.x+im.w,im.y],['sw',im.x,im.y+im.h],['se',im.x+im.w,im.y+im.h]]) h+='<rect class="handle '+c+'" data-kind="phandle" data-corner="'+c+'" data-id="'+esc(im.id)+'" x="'+(x-hs/2)+'" y="'+(y-hs/2)+'" width="'+hs+'" height="'+hs+'" rx="'+(2*u)+'" style="fill:var(--panel);stroke:var(--accent);stroke-width:'+(1.5*u)+'"/>'; } }
  const se=[...state.sel].filter(k=>k[0]==='e');
  if(se.length===1&&state.sel.size===1&&!d&&state.tool==='select'){
    const i=+se[0].slice(2); const e=m.edges[i]; const a=e&&nodeRect(m,e.from,state.boxes),b=e&&nodeRect(m,e.to,state.boxes);
    if(a&&b&&a.x!=null&&b.x!=null){ const g=edgeGeom(a,b,0,e.route);
      for(const [end,pt] of [[0,g.p0],[1,g.p3]]) h+='<circle class="handle" data-kind="ehandle" data-idx="'+i+'" data-end="'+end+'" cx="'+pt.x+'" cy="'+pt.y+'" r="'+(6*u)+'" style="fill:var(--panel);stroke:var(--accent);stroke-width:'+(2*u)+';cursor:move"/>'; }
  }
  if(d&&d.mode==='eend'){
    const e=m.edges[d.idx]; const fixedId=d.end?e.from:e.to; const fr=nodeRect(m,fixedId,state.boxes); const t=d.target?m.nodes.get(d.target):null;
    if(fr){ const tr=t||{x:d.cur.x-1,y:d.cur.y-1,w:2,h:2}; const g=d.end?edgeGeom(fr,tr,0,e.route):edgeGeom(tr,fr,0,e.route);
      h+='<path d="'+g.d+'" style="fill:none;stroke:var(--accent);stroke-width:1.8;stroke-dasharray:6 4;pointer-events:none"/>'; }
  }
  if(d&&state.snapTarget&&(d.mode==='eend'||d.mode==='aend'||d.mode==='farrow')){ const t=m.nodes.get(state.snapTarget); if(t) h+='<rect x="'+(t.x-5*u)+'" y="'+(t.y-5*u)+'" width="'+(t.w+10*u)+'" height="'+(t.h+10*u)+'" rx="'+(8*u)+'" style="fill:color-mix(in srgb,var(--accent) 6%,transparent);stroke:var(--accent);stroke-width:'+(2*u)+';pointer-events:none"/>'; }
  if(d&&d.mode==='farrow'&&Math.hypot(d.cur.x-d.start.x,d.cur.y-d.start.y)>2) h+=arrowsMarkup(m,PAL_LIVE,false,[{kind:state.arrowKind,x1:d.start.x,y1:d.start.y,x2:(state.snapTarget&&m.nodes.get(state.snapTarget)?clipToRect(m.nodes.get(state.snapTarget),d.start).x:d.cur.x),y2:(state.snapTarget&&m.nodes.get(state.snapTarget)?clipToRect(m.nodes.get(state.snapTarget),d.start).y:d.cur.y),w:state.arrowW,color:ARROW_COLORS[state.arrowColor]||'#1a1a1a'}]).replace('<g class="farrow"','<g class="farrow" style="pointer-events:none;opacity:.8"');
  if(state.frameOffer&&!d){ const r=state.frameOffer; h+='<rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'" rx="'+(PAL_LIVE.frameOut?2:12)+'" style="fill:color-mix(in srgb,var(--accent) 5%,transparent);stroke:var(--accent);stroke-width:'+(1.5*u)+';stroke-dasharray:'+(6*u)+' '+(4*u)+';pointer-events:none"/>'; }
  if(d&&d.mode==='marquee'){ const r=normRect(d.start,d.cur); h+='<rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'" style="fill:color-mix(in srgb,var(--accent) 8%,transparent);stroke:var(--accent);stroke-width:'+u+';pointer-events:none"/>'; }
  if(d&&d.mode==='create'){
    const r=normRect(d.start,d.cur);
    if(r.w>4||r.h>4) h+='<rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'" rx="'+(d.shape==='frame'?12:4)+'" style="fill:none;stroke:var(--accent);stroke-width:'+(1.5*u)+';stroke-dasharray:'+(5*u)+' '+(4*u)+';pointer-events:none"/>';
  }
  if(!d&&state.pendingFrom&&state.pendPt){
    const a=m.nodes.get(state.pendingFrom); const t=state.hover&&state.hover!==state.pendingFrom?m.nodes.get(state.hover):null;
    if(a){
      const g=edgeGeom(a,t||{x:state.pendPt.x-1,y:state.pendPt.y-1,w:2,h:2},0);
      h+='<rect x="'+(a.x-5*u)+'" y="'+(a.y-5*u)+'" width="'+(a.w+10*u)+'" height="'+(a.h+10*u)+'" rx="'+(8*u)+'" style="fill:none;stroke:var(--accent);stroke-width:'+(2*u)+';stroke-dasharray:'+(5*u)+' '+(4*u)+';pointer-events:none"/>';
      h+='<path d="'+g.d+'" marker-end="url(#La-s)" style="fill:none;stroke:var(--accent);stroke-width:1.6;stroke-dasharray:6 4;pointer-events:none"/>';
      if(t) h+='<rect x="'+(t.x-5*u)+'" y="'+(t.y-5*u)+'" width="'+(t.w+10*u)+'" height="'+(t.h+10*u)+'" rx="'+(8*u)+'" style="fill:none;stroke:var(--accent);stroke-width:'+(2*u)+';pointer-events:none"/>';
    }
  }
  if(d&&d.mode==='connect'){
    const a=m.nodes.get(d.from); const t=d.target?m.nodes.get(d.target):null;
    if(a){
      const bR=t||{x:d.cur.x-1,y:d.cur.y-1,w:2,h:2};
      const g=edgeGeom(a,bR,0);
      h+='<path d="'+g.d+'" marker-end="url(#La-s)" style="fill:none;stroke:var(--accent);stroke-width:'+(1.6)+';stroke-dasharray:6 4;pointer-events:none"/>';
      if(t) h+='<rect x="'+(t.x-5*u)+'" y="'+(t.y-5*u)+'" width="'+(t.w+10*u)+'" height="'+(t.h+10*u)+'" rx="'+(8*u)+'" style="fill:none;stroke:var(--accent);stroke-width:'+(2*u)+';pointer-events:none"/>';
    }
  }
  lOver.innerHTML=h;
}
function normRect(a,b){return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)};}
function isDark(){ const t=document.documentElement.getAttribute('data-theme'); if(t==='dark') return true; if(t==='light') return false; return matchMedia('(prefers-color-scheme: dark)').matches; }
function themeChanged(){ const dk=isDark(); PAL_LIVE.frameOut=!dk; PAL_LIVE.edgeSw=dk?1.5:2; PAL_LIVE.edgeThick=dk?3:4; R.sig.clear(); render();  if(typeof Boards!=='undefined'&&Boards.isHome()) Boards.iconsReady(); }
function applyView(){
  const v=state.view;
  world.setAttribute('transform','translate('+v.x+','+v.y+') scale('+v.z+')');
  const light=PAL_LIVE.frameOut; const gs=(light?24:20)*v.z; const show=gs>=(light?9:7);
  boardPane.style.backgroundImage=!show?'none':light?'linear-gradient(to right,var(--grid) 1px,transparent 1px),linear-gradient(to bottom,var(--grid) 1px,transparent 1px)':'radial-gradient(circle,var(--dot) 1px,transparent 1.4px)';
  boardPane.style.backgroundSize=show?gs+'px '+gs+'px':'0 0';
  boardPane.style.backgroundPosition=v.x+'px '+v.y+'px';
  $('#zoomPct').textContent=Math.round(v.z*100)+'%';
  if(state.editing) placeEditor();
  if(!ctxEl.hidden) placeCtx();
  if(state.frameOffer) placeFrameOffer();
}
