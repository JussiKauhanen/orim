/* orim · core/geometry.js
 * Pure geometry: text wrap, node sizing, auto layout, frames, connector and arrow shapes.
 */
'use strict';
function wrapText(text,maxW,size){
  const out=[];
  for(const para of String(text).split('\n')){
    const words=para.split(/\s+/).filter(Boolean);
    if(!words.length){out.push('');continue;}
    let line=words[0];
    for(let k=1;k<words.length;k++){
      const t=line+' '+words[k];
      if(Core.measure(t,size)>maxW){ out.push(line); line=words[k]; } else line=t;
    }
    out.push(line);
  }
  return out;
}
function labelSize(n){ if(n.fsSet) return n.fsSet; return n.shape==='icon'?12:n.shape==='sticky'?(n.fs||15):13; }
function lineH(n){ const f=labelSize(n); return n.shape==='icon'&&!n.fsSet?15:Math.round(f*1.3); }
function iconSize(n){
  if(!n.sized) return ICON;
  const th=(n.lines||[]).filter(Boolean).length*lineH(n);
  return Math.max(20,Math.min(n.w,n.h-th-8));
}
function sizeNode(n){
  if(n.shape==='sticky'){
    if(!n.sized){ n.w=160; n.h=160; }
    if(n.fsSet){ n.fs=n.fsSet; n.lines=wrapText(n.label,Math.max(20,n.w-28),n.fsSet); return; }
    let fs=15,lines;
    for(;fs>=8;fs--){ lines=wrapText(n.label,Math.max(20,n.w-28),fs); if(lines.length*Math.round(fs*1.3)<=n.h-28) break; }
    n.fs=Math.max(8,fs); n.lines=lines; return;
  }
  const fs=labelSize(n); const k=fs/13;
  const maxW=n.sized?Math.max(20,n.shape==='icon'?n.w-6:n.shape==='diamond'?n.w*0.6:n.shape==='text'?n.w-12:n.w-24):(n.shape==='icon'?150*k:n.shape==='text'?320*k:200*k);
  const lines=wrapText(n.label,maxW/(n.bold?1.07:1),fs); n.lines=lines;
  if(n.sized){
    const th=lines.length*lineH(n);
    if(n.shape==='text') n.h=Math.max(Math.round(fs*1.3)+10,th+12);
    else if(n.shape!=='icon'){ const need=n.shape==='diamond'?th*1.7+40:n.shape==='circle'?th+32:n.shape==='cyl'?th+44:th+24; if(need>n.h) n.h=Math.ceil(need/GRID)*GRID; }
    return; }
  const tw=Math.max(0,...lines.map(l=>measureN(n,l,fs)));
  const th=lines.length*lineH(n);
  switch(n.shape){
    case 'icon':{ const has=lines.some(Boolean); n.w=Math.max(88,Math.ceil(tw)+12); n.h=ICON+(has?8+lines.filter(Boolean).length*15:0); break; }
    case 'text': n.w=Math.max(40,tw+16); n.h=Math.max(28,th+12); break;
    case 'circle':{ const d=Math.max(72,tw+32,th+32); n.w=n.h=d; break; }
    case 'diamond': n.w=Math.max(120,tw*1.6+40); n.h=Math.max(80,th*1.7+40); break;
    default:
      n.w=Math.max(120,tw+(n.shape==='hex'||n.shape==='para'?56:36)); n.h=Math.max(52,th+28);
      if(n.shape==='cyl') n.h=Math.max(68,th+44);
      if(n.shape==='stadium') n.w+=12;
      if(n.shape==='sub') n.w+=16;
  }
  n.w=Math.ceil(n.w/GRID)*GRID; n.h=Math.ceil(n.h/GRID)*GRID;
}
function overlaps(a,b,gap){return a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;}
function placeNear(n,m,placed){
  let anchor=null;
  for(const e of m.edges){
    if(e.to===n.id&&placed.has(e.from)){anchor=m.nodes.get(e.from);break;}
  }
  if(!anchor) for(const e of m.edges){ if(e.from===n.id&&placed.has(e.to)){anchor=m.nodes.get(e.to);break;} }
  if(!anchor&&n.group) for(const id of placed){ const o=m.nodes.get(id); if(o&&o.group===n.group){anchor=o;} }
  const dir=m.dir==='TD'?'TB':m.dir; const horiz=dir==='LR'||dir==='RL';
  let x,y;
  if(anchor){
    if(dir==='LR'){x=anchor.x+anchor.w+88;y=anchor.y+(anchor.h-n.h)/2;}
    else if(dir==='RL'){x=anchor.x-88-n.w;y=anchor.y+(anchor.h-n.h)/2;}
    else if(dir==='BT'){x=anchor.x+(anchor.w-n.w)/2;y=anchor.y-72-n.h;}
    else {x=anchor.x+(anchor.w-n.w)/2;y=anchor.y+anchor.h+72;}
  } else if(placed.size){
    let minX=Infinity,maxY=-Infinity;
    for(const id of placed){const o=m.nodes.get(id); if(!o) continue; minX=Math.min(minX,o.x); maxY=Math.max(maxY,o.y+o.h);}
    x=minX; y=maxY+72;
  } else {x=0;y=0;}
  const r={x:SNAP(x),y:SNAP(y),w:n.w,h:n.h};
  for(let k=0;k<80;k++){
    let hit=false;
    for(const id of placed){const o=m.nodes.get(id); if(o&&overlaps(r,o,24)){hit=true;break;}}
    if(!hit) break;
    if(horiz) r.y+=SNAP(n.h+32); else r.x+=SNAP(n.w+40);
  }
  n.x=r.x; n.y=r.y;
}
function autoLayout(m){
  const nodes=[...m.nodes.values()];
  if(!nodes.length) return;
  if(typeof dagre==='undefined'){ gridLayout(m); return; }
  try{
    const g=new dagre.graphlib.Graph({compound:true,multigraph:true});
    const dir=m.dir==='TD'?'TB':m.dir;
    g.setGraph({rankdir:dir,nodesep:40,ranksep:72,edgesep:20,marginx:40,marginy:40});
    g.setDefaultEdgeLabel(()=>({}));
    const used=new Set();
    for(const n of nodes){ let p=n.group; while(p){used.add(p); p=m.groups.get(p)&&m.groups.get(p).parent;} }
    for(const gid of m.groupOrder) if(used.has(gid)) g.setNode('g:'+gid,{label:gid,paddingTop:PAD_TOP,paddingLeft:PAD,paddingRight:PAD,paddingBottom:PAD});
    for(const gid of m.groupOrder){ const gr=m.groups.get(gid); if(used.has(gid)&&gr.parent&&used.has(gr.parent)) g.setParent('g:'+gid,'g:'+gr.parent); }
    for(const n of nodes){ g.setNode('n:'+n.id,{width:n.w,height:n.h+(n.group?16:0)}); if(n.group&&used.has(n.group)) g.setParent('n:'+n.id,'g:'+n.group); }
    m.edges.forEach((e,i)=>{
      if(m.nodes.has(e.from)&&m.nodes.has(e.to)&&e.from!==e.to){
        const lw=e.label?Core.measure(e.label,12)+16:0;
        g.setEdge('n:'+e.from,'n:'+e.to,{width:lw,height:e.label?22:0,labelpos:'c',minlen:1},'e'+i);
      }
    });
    dagre.layout(g);
    for(const n of nodes){ const p=g.node('n:'+n.id); if(p){ n.x=SNAP(p.x-n.w/2); n.y=SNAP(p.y-n.h/2+(n.group?8:0)); } }
  }catch(err){ gridLayout(m); }
}
function gridLayout(m){
  let k=0; const cols=Math.ceil(Math.sqrt(m.nodes.size));
  for(const n of m.nodes.values()){ n.x=(k%cols)*200; n.y=Math.floor(k/cols)*140; k++; }
}
function resolveGeometry(m,cache){
  const placed=new Set(),unplaced=[];
  for(const id of m.nodeOrder){
    const n=m.nodes.get(id); const p=m.pos.get(id); const c=cache&&cache.get(id);
    const st=m.styles.get(id); n.fsSet=st&&st.fontSize?st.fontSize:null; n.bold=!!(st&&st.bold);
    if(p&&p.w&&p.h){ n.w=p.w; n.h=p.h; n.sized=true; } else n.sized=false;
    sizeNode(n);
    const src=p||c;
    if(src){ n.x=src.x; n.y=src.y; placed.add(id); } else { n.x=null; n.y=null; unplaced.push(n); }
  }
  if(unplaced.length&&!placed.size) autoLayout(m);
  else for(const n of unplaced){ placeNear(n,m,placed); placed.add(n.id); }
  if(cache) for(const n of m.nodes.values()) cache.set(n.id,{x:n.x,y:n.y});
}
function groupDepth(m,gid){let d=0,p=m.groups.get(gid);while(p&&p.parent){d++;p=m.groups.get(p.parent);if(d>50)break;}return d;}
function unionRect(a,b){const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);return {x,y,w:Math.max(a.x+a.w,b.x+b.w)-x,h:Math.max(a.y+a.h,b.y+b.h)-y};}
function groupBoxes(m,exclude){
  const boxes=new Map(),contentBoxes=new Map(); boxes.content=contentBoxes;
  const order=[...m.groupOrder].sort((a,b)=>groupDepth(m,b)-groupDepth(m,a));
  for(const gid of order){
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity,any=false,had=false;
    for(const n of m.nodes.values()){
      if(n.group!==gid||n.x==null) continue; had=true;
      if(exclude&&exclude.has(n.id)) continue;
      any=true; x0=Math.min(x0,n.x); y0=Math.min(y0,n.y); x1=Math.max(x1,n.x+n.w); y1=Math.max(y1,n.y+n.h);
    }
    for(const g of m.groups.values()){
      if(g.parent!==gid) continue; had=true;
      const b=boxes.get(g.id); if(!b) continue;
      any=true; x0=Math.min(x0,b.x); y0=Math.min(y0,b.y); x1=Math.max(x1,b.x+b.w); y1=Math.max(y1,b.y+b.h);
    }
    const cb=any?{x:x0-PAD,y:y0-PAD_TOP,w:x1-x0+PAD*2,h:y1-y0+PAD_TOP+PAD}:null;
    const p=m.pos.get(gid); const fixed=p&&p.w?{x:p.x,y:p.y,w:p.w,h:p.h}:null;
    if(cb&&fixed) boxes.set(gid,unionRect(cb,fixed));
    else if(cb) boxes.set(gid,cb);
    else if(fixed) boxes.set(gid,fixed);
    else if(!had||!exclude) boxes.set(gid,{x:0,y:0,w:280,h:180});
    if(cb) contentBoxes.set(gid,cb);
  }
  return boxes;
}
function cubic(p0,p1,p2,p3,t){const u=1-t;return{x:u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x,y:u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y};}
function sidePt(r,s){return s==='r'?{x:r.x+r.w,y:r.y+r.h/2}:s==='l'?{x:r.x,y:r.y+r.h/2}:s==='t'?{x:r.x+r.w/2,y:r.y}:{x:r.x+r.w/2,y:r.y+r.h};}
const NORM={r:{x:1,y:0},l:{x:-1,y:0},t:{x:0,y:-1},b:{x:0,y:1}};
function unitV(dx,dy){const L=Math.hypot(dx,dy)||1;return {x:dx/L,y:dy/L};}
function clipToRect(r,to){
  const cx=r.x+r.w/2,cy=r.y+r.h/2,dx=to.x-cx,dy=to.y-cy; if(!dx&&!dy) return {x:cx,y:cy};
  const s=Math.min(dx?(r.w/2)/Math.abs(dx):Infinity,dy?(r.h/2)/Math.abs(dy):Infinity);
  return s>=1?{x:to.x,y:to.y}:{x:cx+dx*s,y:cy+dy*s};
}
// sides (optional): {a,b} with t|r|b|l for where the connector leaves a and enters b; missing = automatic.
function edgeShape(a,b,off,route,sides){
  route=route||'curved'; const fa=sides&&sides.a, fb=sides&&sides.b;
  if(a===b||(a.x===b.x&&a.y===b.y&&a.w===b.w)){
    const p0={x:a.x+a.w*0.72,y:a.y},p3={x:a.x+a.w,y:a.y+a.h*0.3};
    return {type:'bez',p0,c1:{x:p0.x,y:p0.y-56},c2:{x:p3.x+56,y:p3.y},p3};
  }
  const ac={x:a.x+a.w/2,y:a.y+a.h/2},bc={x:b.x+b.w/2,y:b.y+b.h/2};
  if(route==='straight'){
    let p0=fa?sidePt(a,fa):clipToRect(a,fb?sidePt(b,fb):bc),p3=fb?sidePt(b,fb):clipToRect(b,fa?sidePt(a,fa):ac);
    if(off){ const u=unitV(p3.x-p0.x,p3.y-p0.y); p0={x:p0.x-u.y*off*0.5,y:p0.y+u.x*off*0.5}; p3={x:p3.x-u.y*off*0.5,y:p3.y+u.x*off*0.5}; }
    return {type:'poly',pts:[p0,p3]};
  }
  const dx=bc.x-ac.x,dy=bc.y-ac.y; let sa,sb;
  if(Math.abs(dx)/((a.w+b.w)/2+1)>=Math.abs(dy)/((a.h+b.h)/2+1)){sa=dx>0?'r':'l';sb=dx>0?'l':'r';}
  else {sa=dy>0?'b':'t';sb=dy>0?'t':'b';}
  if(fa) sa=fa; if(fb) sb=fb;
  const p0=sidePt(a,sa),p3=sidePt(b,sb);
  if(route==='elbow'&&(fa||fb)){
    // Leave and enter straight out of the chosen sides, with a short stub, then join at right angles.
    const S=20, q0={x:p0.x+NORM[sa].x*S,y:p0.y+NORM[sa].y*S}, q3={x:p3.x+NORM[sb].x*S,y:p3.y+NORM[sb].y*S};
    const ha=sa==='r'||sa==='l', hb=sb==='r'||sb==='l'; let mid;
    if(ha&&hb){ const mx=(q0.x+q3.x)/2+(off||0); mid=[{x:mx,y:q0.y},{x:mx,y:q3.y}]; }
    else if(!ha&&!hb){ const my=(q0.y+q3.y)/2+(off||0); mid=[{x:q0.x,y:my},{x:q3.x,y:my}]; }
    else if(ha) mid=[{x:q3.x,y:q0.y}]; else mid=[{x:q0.x,y:q3.y}];
    const pts=[p0,q0,...mid,q3,p3].filter((pt,i,arr)=>i===0||Math.hypot(pt.x-arr[i-1].x,pt.y-arr[i-1].y)>0.5);
    return {type:'poly',pts};
  }
  if(route==='elbow'){
    if(sa==='r'||sa==='l'){ const mx=(p0.x+p3.x)/2+(off||0); return {type:'poly',pts:[p0,{x:mx,y:p0.y},{x:mx,y:p3.y},p3]}; }
    const my=(p0.y+p3.y)/2+(off||0); return {type:'poly',pts:[p0,{x:p0.x,y:my},{x:p3.x,y:my},p3]};
  }
  const dist=Math.hypot(p3.x-p0.x,p3.y-p0.y);
  const k=Math.max(24,Math.min(140,dist*0.45));
  const c1={x:p0.x+NORM[sa].x*k,y:p0.y+NORM[sa].y*k},c2={x:p3.x+NORM[sb].x*k,y:p3.y+NORM[sb].y*k};
  if(off){ const len=dist||1; const px=-(p3.y-p0.y)/len*off,py=(p3.x-p0.x)/len*off; c1.x+=px;c1.y+=py;c2.x+=px;c2.y+=py; }
  return {type:'bez',p0,c1,c2,p3};
}
function roundPoly(pts,r){
  let d='M'+pts[0].x+' '+pts[0].y;
  for(let i=1;i<pts.length-1;i++){
    const a=pts[i-1],b=pts[i],c=pts[i+1]; const l1=Math.hypot(b.x-a.x,b.y-a.y),l2=Math.hypot(c.x-b.x,c.y-b.y);
    const rr=Math.min(r,l1/2,l2/2); const u1=unitV(b.x-a.x,b.y-a.y),u2=unitV(c.x-b.x,c.y-b.y);
    d+='L'+(b.x-u1.x*rr)+' '+(b.y-u1.y*rr)+'Q'+b.x+' '+b.y+' '+(b.x+u2.x*rr)+' '+(b.y+u2.y*rr);
  }
  const l=pts[pts.length-1]; return d+'L'+l.x+' '+l.y;
}
function geomPath(g,s0,s3){
  s0=s0||0; s3=s3||0;
  if(g.type==='bez'){
    const {p0,c1,c2,p3}=g; const t0=unitV(p0.x-c1.x,p0.y-c1.y),t3=unitV(p3.x-c2.x,p3.y-c2.y);
    const d='M'+(p0.x-t0.x*s0)+' '+(p0.y-t0.y*s0)+'C'+(c1.x-t0.x*s0)+' '+(c1.y-t0.y*s0)+' '+(c2.x-t3.x*s3)+' '+(c2.y-t3.y*s3)+' '+(p3.x-t3.x*s3)+' '+(p3.y-t3.y*s3);
    return {d,mid:cubic(p0,c1,c2,p3,.5),t0,t3,p0,p3};
  }
  const pts=[]; for(const q of g.pts){ const l=pts[pts.length-1]; if(!l||Math.hypot(q.x-l.x,q.y-l.y)>0.5) pts.push({x:q.x,y:q.y}); }
  if(pts.length<2) pts.push({x:pts[0].x+0.01,y:pts[0].y});
  const n=pts.length; const t0=unitV(pts[0].x-pts[1].x,pts[0].y-pts[1].y),t3=unitV(pts[n-1].x-pts[n-2].x,pts[n-1].y-pts[n-2].y);
  const p0={...pts[0]},p3={...pts[n-1]};
  pts[0]={x:p0.x-t0.x*s0,y:p0.y-t0.y*s0}; pts[n-1]={x:p3.x-t3.x*s3,y:p3.y-t3.y*s3};
  let total=0; const seg=[]; for(let i=1;i<n;i++){ const L=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y); seg.push(L); total+=L; }
  let half=total/2,mid=pts[0]; for(let i=1;i<n;i++){ if(half<=seg[i-1]){ const t=seg[i-1]?half/seg[i-1]:0; mid={x:pts[i-1].x+(pts[i].x-pts[i-1].x)*t,y:pts[i-1].y+(pts[i].y-pts[i-1].y)*t}; break; } half-=seg[i-1]; }
  return {d:roundPoly(pts,8),mid,t0,t3,p0,p3};
}
function edgeGeom(a,b,off,route,sides){ return geomPath(edgeShape(a,b,off,route,sides),0,0); }
// The side of r nearest to p, or null when p is in the middle (then the connector picks its side itself).
function sideNear(r,p){ if(!r||!p) return null; const fx=(p.x-r.x)/(r.w||1), fy=(p.y-r.y)/(r.h||1); if(fx>0.3&&fx<0.7&&fy>0.3&&fy<0.7) return null; const d={l:Math.abs(p.x-r.x)/(r.w||1),r:Math.abs(r.x+r.w-p.x)/(r.w||1),t:Math.abs(p.y-r.y)/(r.h||1),b:Math.abs(r.y+r.h-p.y)/(r.h||1)}; return Object.keys(d).sort((x,y)=>d[x]-d[y])[0]; }
const edgeSides=e=>e&&(e.sa||e.sb)?{a:e.sa||null,b:e.sb||null}:null;
function headSize(w){ return {hl:7+w*2.4,hw:3.8+w*1.5}; }
function headMarkup(type,tip,t,w,col,bg,cls){
  if(!type||type==='none') return '';
  const n={x:-t.y,y:t.x}; const c=cls?' class="'+cls+'"':'';
  if(type==='arrow'){ const {hl,hw}=headSize(w); const bx=tip.x-t.x*hl,by=tip.y-t.y*hl;
    return '<path'+c+' d="M'+tip.x+' '+tip.y+'L'+(bx+n.x*hw)+' '+(by+n.y*hw)+'L'+(bx-n.x*hw)+' '+(by-n.y*hw)+'Z" style="fill:'+col+';stroke:'+col+';stroke-width:1;stroke-linejoin:round"/>'; }
  if(type==='circle'){ const r=3+w*0.9; return '<circle'+c+' cx="'+(tip.x-t.x*r)+'" cy="'+(tip.y-t.y*r)+'" r="'+r+'" style="fill:'+bg+';stroke:'+col+';stroke-width:'+(1+w*0.6)+'"/>'; }
  if(type==='cross'){ const r=3.5+w, cx=tip.x-t.x*r, cy=tip.y-t.y*r; return '<path'+c+' d="M'+(cx-r*0.7)+' '+(cy-r*0.7)+'L'+(cx+r*0.7)+' '+(cy+r*0.7)+'M'+(cx+r*0.7)+' '+(cy-r*0.7)+'L'+(cx-r*0.7)+' '+(cy+r*0.7)+'" style="fill:none;stroke:'+col+';stroke-width:'+(1.2+w*0.5)+'"/>'; }
  return '';
}
function headInset(type,w){ if(type==='arrow') return headSize(w).hl*0.8; if(type==='circle') return (3+w*0.9)*2; return 0; }
function freeArrowShape(a){
  const p0={x:a.x1,y:a.y1},p1={x:a.x2,y:a.y2};
  if(a.kind==='elbow'){ const dx=p1.x-p0.x,dy=p1.y-p0.y; if(Math.abs(dx)>=Math.abs(dy)){ const mx=p0.x+dx/2; return {type:'poly',pts:[p0,{x:mx,y:p0.y},{x:mx,y:p1.y},p1]}; } const my=p0.y+dy/2; return {type:'poly',pts:[p0,{x:p0.x,y:my},{x:p1.x,y:my},p1]}; }
  if(a.kind==='curved'){ const dx=p1.x-p0.x,dy=p1.y-p0.y; const L=Math.hypot(dx,dy); const n={x:-dy/(L||1),y:dx/(L||1)}; const b=L*0.18; return {type:'bez',p0,c1:{x:p0.x+dx*0.3+n.x*b,y:p0.y+dy*0.3+n.y*b},c2:{x:p0.x+dx*0.7+n.x*b,y:p0.y+dy*0.7+n.y*b},p3:p1}; }
  return {type:'poly',pts:[p0,p1]};
}
function blockArrowPts(a){
  const dx=a.x2-a.x1,dy=a.y2-a.y1,L=Math.hypot(dx,dy)||1,u={x:dx/L,y:dy/L},n={x:-u.y,y:u.x};
  const sw=a.w*2.2+3, hw=a.w*4.4+9, hl=Math.min(L*0.5,a.w*4.5+18);
  const bx=a.x2-u.x*hl,by=a.y2-u.y*hl;
  return [[a.x1+n.x*sw,a.y1+n.y*sw],[bx+n.x*sw,by+n.y*sw],[bx+n.x*hw,by+n.y*hw],[a.x2,a.y2],[bx-n.x*hw,by-n.y*hw],[bx-n.x*sw,by-n.y*sw],[a.x1-n.x*sw,a.y1-n.y*sw]].map(q=>q.map(r10).join(' ')).join(' ');
}
function resolveArrow(m,a){
  let gb=null; const rectOf=id=>{ if(!id) return null; const n=m.nodes.get(id); if(n) return n; if(!m.groups.has(id)) return null; gb=gb||groupBoxes(m); return gb.get(id)||null; };
  const nf=rectOf(a.from), nt=rectOf(a.to);
  const okf=nf&&nf.x!=null, okt=nt&&nt.x!=null;
  if(!okf&&!okt) return a;
  const cf=okf?{x:nf.x+nf.w/2,y:nf.y+nf.h/2}:{x:a.x1,y:a.y1}, ct=okt?{x:nt.x+nt.w/2,y:nt.y+nt.h/2}:{x:a.x2,y:a.y2};
  const p0=okf?clipToRect(nf,ct):cf, p1=okt?clipToRect(nt,cf):ct;
  return {...a,x1:p0.x,y1:p0.y,x2:p1.x,y2:p1.y};
}
function arrowBox(a){ const pad=a.kind==='block'?a.w*4.4+9:a.w*3+8; const x0=Math.min(a.x1,a.x2),y0=Math.min(a.y1,a.y2); return {x:x0-pad,y:y0-pad,w:Math.abs(a.x2-a.x1)+pad*2,h:Math.abs(a.y2-a.y1)+pad*2}; }
