/* orim · export-drawio.js
 * draw.io (mxGraph XML) export.
 */
'use strict';
function xa(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'&#10;'); }
function b64utf8(str){ return btoa(unescape(encodeURIComponent(str))); }
function dioImg(uri){ const m=/^data:([^;,]+)((?:;[^;,=]+=[^;,]+)*)(;base64)?,(.*)$/.exec(uri||''); if(!m) return uri; return 'data:'+m[1]+','+(m[3]?m[4]:b64utf8(decodeURIComponent(m[4]))); }
function dioLabel(t){ return xa(esc(t||'').replace(/\n/g,'<br>')); }
function buildDrawio(){
  const m=state.model; const boxes=groupBoxes(m); const cells=[]; const ids=new Map(); let seq=2;
  const cid=k=>{ if(!ids.has(k)) ids.set(k,'c'+(seq++)); return ids.get(k); };
  const g2=v=>Math.round(v*10)/10;
  const geo=(x,y,w,h,par)=>{ const pb=par?boxes.get(par):null; return '<mxGeometry x="'+g2(x-(pb?pb.x:0))+'" y="'+g2(y-(pb?pb.y:0))+'" width="'+g2(w)+'" height="'+g2(h)+'" as="geometry"/>'; };
  const imgCell=(im,par)=>{ const src=IMG[im.id]; if(!src) return; cells.push('<mxCell id="'+cid('p:'+im.id)+'" value="" style="'+xa('shape=image;html=1;imageAspect=0;aspect=fixed;image='+dioImg(src)+';')+'" vertex="1" parent="'+(par?cid('g:'+par):'1')+'">'+geo(im.x,im.y,im.w,im.h,par)+'</mxCell>'); };
  const imgHome=im=>{ const cx=im.x+im.w/2,cy=im.y+im.h/2; let best=null,ba=Infinity; for(const [gid,b] of boxes){ if(cx>=b.x&&cx<=b.x+b.w&&cy>=b.y&&cy<=b.y+b.h&&b.w*b.h<ba){ ba=b.w*b.h; best=gid; } } return best; };
  const backByFrame=new Map(); for(const im of m.images){ if(im.front) continue; const h=imgHome(im); if(!backByFrame.has(h)) backByFrame.set(h,[]); backByFrame.get(h).push(im); }
  for(const im of backByFrame.get(null)||[]) imgCell(im,null);

  for(const gid of order){ const g=m.groups.get(gid),b=boxes.get(gid); if(!b) continue; const st=m.styles.get(gid)||{};
    const fill=st.fill||'#ffffff';
    const style='swimlane;html=1;startSize=30;horizontal=1;align=left;spacingLeft=10;fontStyle=0;fontSize=14;fontColor='+(st.color||'#5f5f5f')+';fillColor='+fill+';swimlaneFillColor='+fill+';strokeColor='+(st.stroke||'#d5d7db')+';swimlaneLine=0;container=1;collapsible=0;rounded=0;';
    cells.push('<mxCell id="'+cid('g:'+gid)+'" value="'+dioLabel(g.label)+'" style="'+xa(style)+'" vertex="1" parent="'+(g.parent&&boxes.has(g.parent)?cid('g:'+g.parent):'1')+'">'+geo(b.x,b.y,b.w,b.h,g.parent&&boxes.has(g.parent)?g.parent:null)+'</mxCell>'); for(const im of backByFrame.get(gid)||[]) imgCell(im,gid); }
  const SH={rect:'rounded=0;',round:'rounded=1;arcSize=20;',stadium:'rounded=1;arcSize=50;',circle:'ellipse;',diamond:'rhombus;',hex:'shape=hexagon;perimeter=hexagonPerimeter2;size=0.15;fixedSize=0;',cyl:'shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=9;',para:'shape=parallelogram;perimeter=parallelogramPerimeter;fixedSize=1;size=16;',sub:'shape=process;backgroundOutline=1;size=0.06;'};
  for(const id of m.nodeOrder){ const n=m.nodes.get(id); if(!n||n.x==null) continue; const st=m.styles.get(id)||{}; const par=n.group&&boxes.has(n.group)?n.group:null;
    let style='whiteSpace=wrap;html=1;'; const fs=st.fontSize||labelSize(n); const fst=(st.bold?1:0)+(st.italic?2:0);
    const txt=';fontSize='+Math.round(fs)+(fst?';fontStyle='+fst:'')+(st.bg?';labelBackgroundColor='+st.bg:'')+';fontColor='+(st.color||'#1a1a1a')+';';
    let x=n.x,y=n.y,w=n.w,h=n.h;
    if(n.shape==='icon'){ const ic=iconFor(n.icon); const is=iconSize(n); x=n.x+(n.w-is)/2; w=is; h=is; style='image;html=1;aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;labelPosition=center;align=center;image='+(ic?dioImg(ic.uri):'')+txt; }
    else if(n.shape==='text') style='text;html=1;whiteSpace=wrap;align=center;verticalAlign=middle;strokeColor=none;fillColor='+(st.fill||'none')+txt;
    else if(n.shape==='sticky') style='rounded=0;whiteSpace=wrap;html=1;strokeColor=none;shadow=1;fillColor='+(st.fill||'#fff9b1')+txt;
    else style+=(SH[n.shape]||SH.rect)+'fillColor='+(st.fill||'#ffffff')+';strokeColor='+(st.stroke||'#1a1a1a')+';strokeWidth=2'+txt;
    cells.push('<mxCell id="'+cid('n:'+id)+'" value="'+dioLabel(n.label)+'" style="'+xa(style)+'" vertex="1" parent="'+(par?cid('g:'+par):'1')+'">'+geo(x,y,w,h,par)+'</mxCell>'); }
  const HD={arrow:'classic',none:'none',circle:'oval',cross:'cross'};
  m.edges.forEach((e,i)=>{ const sk=m.nodes.has(e.from)?'n:'+e.from:'g:'+e.from, tk=m.nodes.has(e.to)?'n:'+e.to:'g:'+e.to; if(!ids.has(sk)||!ids.has(tk)) return;
    const rt=e.route||'curved'; let style='html=1;rounded=1;endArrow='+HD[e.head]+';startArrow='+HD[e.tail]+';endFill='+(e.head==='circle'?0:1)+';startFill='+(e.tail==='circle'?0:1)+';strokeWidth='+(e.width||(e.line==='thick'?4:2))+';strokeColor='+(e.line==='invis'?'none':(e.color||'#1a1a1a'))+';fontSize=12;fontColor=#5f5f5f;labelBackgroundColor=#ffffff;';
    style+=rt==='elbow'?'edgeStyle=orthogonalEdgeStyle;':rt==='straight'?'edgeStyle=none;':'edgeStyle=orthogonalEdgeStyle;curved=1;';
    if(e.line==='dotted') style+='dashed=1;';
    cells.push('<mxCell id="'+cid('e:'+i)+'" value="'+dioLabel(e.label)+'" style="'+xa(style)+'" edge="1" parent="1" source="'+ids.get(sk)+'" target="'+ids.get(tk)+'"><mxGeometry relative="1" as="geometry"/></mxCell>'); });
  for(const a0 of m.arrows){ const a=resolveArrow(m,a0); const col=a.color||'#1a1a1a';
    if(a.kind==='block'){ const dx=a.x2-a.x1,dy=a.y2-a.y1,L=Math.hypot(dx,dy)||1,hh=(a.w*4.4+9)*2; const cx=(a.x1+a.x2)/2,cy=(a.y1+a.y2)/2;
      cells.push('<mxCell id="'+cid('a:'+a.id)+'" value="" style="'+xa('shape=singleArrow;html=1;arrowWidth=0.5;arrowSize=0.25;fillColor='+col+';strokeColor='+col+';rotation='+(Math.atan2(dy,dx)*180/Math.PI).toFixed(1)+';')+'" vertex="1" parent="1">'+geo(cx-L/2,cy-hh/2,L,hh,null)+'</mxCell>'); continue; }
    let style='html=1;rounded=1;endArrow='+(a.kind==='line'?'none':'classic')+';endFill=1;startArrow=none;strokeWidth='+a.w+';strokeColor='+col+';';
    style+=a.kind==='elbow'?'edgeStyle=orthogonalEdgeStyle;':a.kind==='curved'?'edgeStyle=orthogonalEdgeStyle;curved=1;':'edgeStyle=none;';
    const src=a0.from&&ids.get('n:'+a0.from), tgt=a0.to&&ids.get('n:'+a0.to);
    cells.push('<mxCell id="'+cid('a:'+a.id)+'" value="" style="'+xa(style)+'" edge="1" parent="1"'+(src?' source="'+src+'"':'')+(tgt?' target="'+tgt+'"':'')+'><mxGeometry relative="1" as="geometry"><mxPoint x="'+g2(a.x1)+'" y="'+g2(a.y1)+'" as="sourcePoint"/><mxPoint x="'+g2(a.x2)+'" y="'+g2(a.y2)+'" as="targetPoint"/></mxGeometry></mxCell>'); }
  for(const k of m.inks){ const b=inkBox(k); const pts=k.pts.map(([x,y])=>[r10(x-b.x),r10(y-b.y)]);
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+Math.ceil(b.w)+'" height="'+Math.ceil(b.h)+'" viewBox="0 0 '+Math.ceil(b.w)+' '+Math.ceil(b.h)+'"><path d="'+inkPath(pts)+'" fill="none" stroke="'+k.color+'" stroke-width="'+k.w+'" stroke-linecap="round" stroke-linejoin="round" opacity="'+(k.tool==='hl'?0.55:1)+'"/></svg>';
    cells.push('<mxCell id="'+cid('k:'+k.id)+'" value="" style="'+xa('shape=image;html=1;imageAspect=0;image=data:image/svg+xml,'+b64utf8(svg)+';')+'" vertex="1" parent="1">'+geo(b.x,b.y,b.w,b.h,null)+'</mxCell>'); }
  for(const im of m.images) if(im.front) imgCell(im,null);
  const name=xa((m.title||'Board').slice(0,80));
  return '<mxfile host="orim" type="device"><diagram id="board" name="'+name+'"><mxGraphModel grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+cells.join('')+'</root></mxGraphModel></diagram></mxfile>';
}
function buildDrawioSvg(){ const xml=buildDrawio(); const o=buildSVG(); if(!o) return null; return o.svg.replace('<svg ','<svg content="'+xa(xml)+'" '); }
