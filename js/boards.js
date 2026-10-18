/* orim · boards.js
 * Several boards per browser, the home page and #b-<id> links.
 * Storage: orim.boards (list), orim.b.<id> (Mermaid code), orim.i.<id> (images).
 */
'use strict';
const Boards=(()=>{
  const LIST='orim.boards', CODE='orim.b.', IMGS='orim.i.';
  let list=[], current=null, lastSaved=new Map(), thumbs=new Map(), view=LS.get('orim.homeView','list');
  const now=()=>Date.now();
  const newId=()=>Math.random().toString(36).slice(2,8)+now().toString(36).slice(-4);
  const meta=id=>list.find(b=>b.id===id);
  const titleOf=code=>{ try{ const r=parseMermaid(code); return (r.model&&r.model.title)||''; }catch(_){ return ''; } };
  const saveList=()=>LS.set(LIST,list);

  function init(){
    list=LS.get(LIST,null);
    if(!Array.isArray(list)){
      list=[];
      const old=LS.get('mab.code',null);
      if(typeof old==='string'&&old.trim()){ const id=newId(); const t=now(); LS.set(CODE+id,old); LS.set(IMGS+id,LS.get('mab.images',{})||{}); list.push({id,title:titleOf(old)||'Untitled board',created:t,updated:t,opened:t}); }
      saveList();
    }
    window.addEventListener('hashchange',route);
    renderStatic(); route();
  }
  function route(){
    const sh=/^#([mt]=[A-Za-z0-9_-]+)$/.exec(location.hash||'');
    if(sh){
      // A shared board link: drop the data from the address first, so reloading or going back does not import it twice.
      try{ history.replaceState(null,'',location.pathname+location.search); }catch(_){}
      importShared(sh[1]).then(code=>{ if(code){ openNew(code); toast('Board opened from the shared link'); } else showHome(); });
      return;
    }
    const m=/^#b-([A-Za-z0-9]+)$/.exec(location.hash||'');
    if(m&&meta(m[1])){ if(current!==m[1]||!$('#home').hidden) open(m[1]); }
    else showHome();
  }
  function setHash(h){
    const want=h?'#'+h:'';
    if((location.hash||'')===want) return;
    if(h){ location.hash=h; return; }
    try{ history.pushState(null,'',location.pathname+location.search); }catch(_){ location.hash=''; }
  }
  function persist(){
    if(!current||!state.model&&!state.code) return;
    const m=meta(current); if(!m) return;
    const imgs=usedImages();
    if(lastSaved.get(current)!==state.code){
      LS.set(CODE+current,state.code); lastSaved.set(current,state.code);
      m.updated=now(); m.title=(state.model&&state.model.title)||'Untitled board'; saveList(); thumbs.delete(current);
    }
    if(!LS.set(IMGS+current,imgs)&&!imgWarned&&Object.keys(imgs).length){ imgWarned=true; toast('Images are too large to autosave in this browser. Export a board file (.json) to keep them.'); }
  }
  function create(code,title){
    const id=newId(); const t=now();
    let c=code||'flowchart LR\n'; if(title) c=setTitleInCode(c,title);
    LS.set(CODE+id,c); LS.set(IMGS+id,{});
    list.unshift({id,title:titleOf(c)||'Untitled board',created:t,updated:t,opened:t}); saveList();
    return id;
  }
  function open(id){
    const m=meta(id); if(!m){ showHome(); return; }
    if(current&&current!==id){ flushEditorHist(); saveNow(); }
    current=id; m.opened=now(); saveList();
    for(const k of Object.keys(IMG)) delete IMG[k];
    Object.assign(IMG,LS.get(IMGS+id,{})||{});
    const code=LS.get(CODE+id,'flowchart LR\n');
    lastSaved.set(id,code);
    state.sel.clear(); state.cache.clear(); H.stack=[]; H.i=-1; closeModal(); closeMenus(); cmClose();
    $('#home').hidden=true; app.hidden=false;
    loadCode(typeof code==='string'?code:'flowchart LR\n',{clearCache:true}); updUndo();
    requestAnimationFrame(()=>{ applyView(); render(); fit(); });
    setHash('b-'+id); document.title=(m.title||'Untitled board')+' · orim';
  }
  function openNew(code,title){ const id=create(code,title); open(id); return id; }
  function showHome(){
    if(current){ flushEditorHist(); saveNow(); }
    closeModal(); closeMenus(); cmClose(); hideTip&&hideTip();
    app.hidden=true; $('#home').hidden=false; setHash(''); document.title='orim';
    renderRecents();
  }
  const isHome=()=>!$('#home').hidden;

  /* ---- thumbnails ---- */
  const PACK_TINT={azure:'#0078d4',pp:'#742774',d365:'#0b53ce'};
  function thumbSVG(code,opt){
    opt=opt||{}; const aspect=opt.aspect||1.6;
    let m; try{ const r=parseMermaid(code); if(r.fatal) return emptyThumb(); m=r.model; resolveGeometry(m,new Map()); }catch(_){ return emptyThumb(); }
    const b=contentBounds(m); if(!b) return emptyThumb();
    const pad=Math.max(b.w,b.h)*0.05+24; const vw=b.w+pad*2, vh=b.h+pad*2; const ca=vw/vh;
    const slice=ca>aspect*1.9;
    const vb=[b.x-pad,b.y-pad,vw,vh].map(v=>Math.round(v)).join(' ');
    const ns=' vector-effect="non-scaling-stroke"';
    const bar=(x,y,w,h,fill,op)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(4,w).toFixed(1)+'" height="'+h.toFixed(1)+'" rx="'+(h/2).toFixed(1)+'" style="fill:'+fill+';opacity:'+op+'"/>';
    const lines=(n,cx,cy,maxW,lh,fill,op)=>{ const ls=(n.lines&&n.lines.filter(Boolean))||[]; const k=Math.min(3,Math.max(1,ls.length)); let o=''; const th=k*lh*1.7; for(let i=0;i<k;i++){ const lw=ls[i]?Math.min(maxW,Core.measure(ls[i],labelSize(n))):maxW*0.6; o+=bar(cx-lw/2,cy-th/2+i*lh*1.7+lh*0.35,lw,lh,fill,op); } return o; };
    let o='';
    const boxes=groupBoxes(m);
    for(const gid of [...m.groupOrder].sort((a,c)=>groupDepth(m,a)-groupDepth(m,c))){ const g=boxes.get(gid); if(!g) continue; const st=m.styles.get(gid);
      o+='<rect x="'+g.x+'" y="'+g.y+'" width="'+g.w+'" height="'+g.h+'" rx="8" style="fill:'+((st&&st.fill)||'var(--th-frame)')+';stroke:var(--th-line);stroke-width:1"'+ns+'/>';
      o+=bar(g.x+16,g.y+14,Math.min(g.w*0.4,Core.measure(m.groups.get(gid).label,13)),9,'var(--th-edge)',.55); }
    for(const im of m.images) o+='<rect x="'+im.x+'" y="'+im.y+'" width="'+im.w+'" height="'+im.h+'" rx="4" style="fill:var(--th-image)"/>';
    for(const e of m.edges){ const a=m.nodes.get(e.from)||boxes.get(e.from),c=m.nodes.get(e.to)||boxes.get(e.to); if(!a||!c||a.x==null||c.x==null||e.line==='invis') continue;
      const g=edgeGeom(a,c,0,e.route); o+='<path d="'+g.d+'" style="fill:none;stroke:'+(e.color||'var(--th-edge)')+';stroke-width:'+(e.line==='thick'?2.4:1.4)+(e.line==='dotted'?';stroke-dasharray:3 3':'')+'"'+ns+'/>'; }
    for(const id of m.nodeOrder){ const n=m.nodes.get(id); if(!n||n.x==null) continue; const st=m.styles.get(id)||{};
      if(n.shape==='sticky'){ o+='<rect x="'+n.x+'" y="'+n.y+'" width="'+n.w+'" height="'+n.h+'" rx="2" style="fill:'+(st.fill||'#fff9b1')+'"/>'+lines(n,n.x+n.w/2,n.y+n.h/2,n.w*0.66,n.h*0.06,'#1a1a1a',.28); }
      else if(n.shape==='icon'){ const s=iconSize(n); const ic=iconFor(n.icon); const x=n.x+(n.w-s)/2;
        o+=ic?'<image href="'+ic.uri+'" x="'+x+'" y="'+n.y+'" width="'+s+'" height="'+s+'"/>':'<rect x="'+x+'" y="'+n.y+'" width="'+s+'" height="'+s+'" rx="'+(s*0.22)+'" style="fill:'+(PACK_TINT[String(n.icon||'').split(':')[0]]||'#808080')+'"/>';
        o+=bar(n.x+n.w/2-Math.min(n.w*0.8,Core.measure(n.label,12))/2,n.y+s+9,Math.min(n.w*0.8,Core.measure(n.label,12)),7,'var(--th-edge)',.6); }
      else if(n.shape==='text') o+=lines(n,n.x+n.w/2,n.y+n.h/2,n.w*0.8,Math.max(6,labelSize(n)*0.55),'var(--th-stroke)',.55);
      else { const fill=st.fill||'var(--th-node)'; const sty='fill:'+fill+';stroke:'+(st.stroke||'var(--th-stroke)')+';stroke-width:1.4';
        if(n.shape==='circle') o+='<ellipse cx="'+(n.x+n.w/2)+'" cy="'+(n.y+n.h/2)+'" rx="'+(n.w/2)+'" ry="'+(n.h/2)+'" style="'+sty+'"'+ns+'/>';
        else if(n.shape==='diamond') o+='<path d="M'+(n.x+n.w/2)+' '+n.y+'L'+(n.x+n.w)+' '+(n.y+n.h/2)+'L'+(n.x+n.w/2)+' '+(n.y+n.h)+'L'+n.x+' '+(n.y+n.h/2)+'Z" style="'+sty+'"'+ns+'/>';
        else if(n.shape==='cyl'){ const ry=Math.min(9,n.h/6); o+='<path d="M'+n.x+' '+(n.y+ry)+'A'+(n.w/2)+' '+ry+' 0 0 1 '+(n.x+n.w)+' '+(n.y+ry)+'V'+(n.y+n.h-ry)+'A'+(n.w/2)+' '+ry+' 0 0 1 '+n.x+' '+(n.y+n.h-ry)+'Z" style="'+sty+'"'+ns+'/><path d="M'+n.x+' '+(n.y+ry)+'A'+(n.w/2)+' '+ry+' 0 0 0 '+(n.x+n.w)+' '+(n.y+ry)+'" style="fill:none;stroke:var(--th-stroke);stroke-width:1.4"'+ns+'/>'; }
        else o+='<rect x="'+n.x+'" y="'+n.y+'" width="'+n.w+'" height="'+n.h+'" rx="'+(n.shape==='round'||n.shape==='stadium'?Math.min(n.h/2,14):4)+'" style="'+sty+'"'+ns+'/>';
        const dark=/^#?(1a1a1a|000|000000|21|2)/i.test(String(st.fill||''))||st.color==='#ffffff';
        o+=lines(n,n.x+n.w/2,n.y+n.h/2+(n.shape==='cyl'?4:0),n.w*(n.shape==='diamond'?0.45:0.62),Math.max(6,labelSize(n)*0.5),dark?'#ffffff':'var(--th-stroke)',dark?.85:.45); } }
    for(const k of m.inks) o+='<polyline points="'+k.pts.map(q=>q.join(',')).join(' ')+'" style="fill:none;stroke:'+(k.color==='#1a1a1a'?'var(--th-stroke)':k.color)+';stroke-width:'+(k.tool==='hl'?4:1.6)+';stroke-linecap:round;stroke-linejoin:round;opacity:'+(k.tool==='hl'?.55:1)+'"'+ns+'/>';
    for(const a0 of m.arrows){ const a=resolveArrow(m,a0); o+='<line x1="'+a.x1+'" y1="'+a.y1+'" x2="'+a.x2+'" y2="'+a.y2+'" style="stroke:'+(a.color==='#1a1a1a'?'var(--th-stroke)':a.color)+';stroke-width:'+(a.kind==='block'?5:1.6)+';stroke-linecap:round"'+ns+'/>'; }
    return '<svg viewBox="'+vb+'" preserveAspectRatio="xMidYMid '+(slice?'slice':'meet')+'" aria-hidden="true">'+o+'</svg>';
  }
  const emptyThumb=()=>'<svg viewBox="0 0 160 100" aria-hidden="true"><rect x="58" y="38" width="44" height="24" rx="5" style="fill:none;stroke:var(--th-line);stroke-dasharray:4 3"/></svg>';
  function thumbFor(id){ const m=meta(id); const key=id+':'+(m&&m.updated); if(!thumbs.has(key)){ const code=LS.get(CODE+id,''); thumbs.set(key,thumbSVG(code)); } return thumbs.get(key); }

  /* ---- home page ---- */
  const TPL_CARDS=()=>[{id:'blank',name:'Blank board',desc:'Start from nothing',plus:true},{id:'text',name:'From text',desc:'Type A -> B, get a diagram',text:true},...TEMPLATES.filter(t=>t.id!=='blank').map(t=>({id:t.id,name:t.name,desc:t.desc,code:t.code,tint:t.tint}))];
  const tplThumb=t=>t.plus?'<svg class="i" viewBox="0 0 24 24" style="width:30px;height:30px"><path d="M12 5v14M5 12h14"/></svg>':t.text?'<span class="th-text"><span>A</span><i>→</i><span>B</span></span>':thumbSVG(t.code);
  function renderStatic(){
    $('#homeTpl').innerHTML=TPL_CARDS().map(t=>'<button type="button" class="tpl" data-tpl-id="'+t.id+'"'+(t.tint?' style="--tint:'+t.tint+'"':'')+'><span class="th">'+tplThumb(t)+'</span><b>'+esc(t.name)+'</b><small>'+esc(t.desc||'')+'</small></button>').join('');
    const cards=$('#homeTpl').children.length; $('#homeTpl').style.setProperty('--n',Math.ceil(cards/2)); requestAnimationFrame(updTplNav);
    for(const b of document.querySelectorAll('#homeView [data-view]')) b.setAttribute('aria-pressed',String(b.dataset.view===view));
    const hero=$('#heroBoard'); if(hero){ const t=TEMPLATES.find(x=>x.id==='pp')||TEMPLATES[0]; hero.innerHTML=heroSVG(t.code); }
    const hc=$('#heroCode'); if(hc&&!hc.dataset.done){ hc.dataset.done='1'; hc.innerHTML=hlQuick(HERO_TEXT); }
    const ri=$('#heroIcons'); if(ri&&Icons.ready) ri.innerHTML=['pp:power-apps','pp:dataverse','pp:power-automate','pp:copilot-studio','azure:function-apps','azure:key-vaults'].map(k=>{ const ic=iconFor(k); return ic?'<img src="'+ic.uri+'" alt="'+esc(ic.title)+'" title="'+esc(ic.title)+'">':''; }).join('')+'<span>+'+(Icons.byKey.size-6)+' more</span>';
  }
  const HERO_TEXT='Power Platform environment {\n  Canvas app\n  Partner portal\n  Help agent\n  Dataverse\n  Cloud flows\n  Reports\n}\n\nEmployees -> Canvas app\nEmployees -> Help agent\nEmployees -> Entra ID: sign in\nCanvas app -> Dataverse\nHelp agent -> Dataverse\nDataverse -> Cloud flows: row changed\nCloud flows -> Data gateway\nData gateway -> On-prem ERP\nDataverse => Reports';
  function heroSVG(code){
    let m; try{ const r=parseMermaid(code); m=r.model; resolveGeometry(m,new Map()); }catch(_){ return ''; }
    const b=contentBounds(m); if(!b) return ''; const pad=36; const boxes=groupBoxes(m);
    let o=groupsMarkup(m,boxes,PAL_LIVE,false)+edgesMarkup(m,boxes,PAL_LIVE,false,'H');
    for(const id of m.nodeOrder){ const n=m.nodes.get(id); o+='<g transform="translate('+n.x+','+n.y+')">'+nodeInner(n,m,PAL_LIVE,false)+'</g>'; }
    return '<svg viewBox="'+[b.x-pad,b.y-pad-24,b.w+pad*2,b.h+pad*2+24].map(Math.round).join(' ')+'" preserveAspectRatio="xMidYMid meet">'+o+'</svg>';
  }
  function iconsReady(){ thumbs.clear(); renderStatic(); if(isHome()) renderRecents(); }
  function when(t){
    if(!t) return ''; const d=new Date(t),n=new Date(); const day=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();
    const diff=Math.round((day(n)-day(d))/864e5); const hm=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    if(diff===0) return 'Today, '+hm; if(diff===1) return 'Yesterday, '+hm;
    return d.toLocaleDateString([],{day:'numeric',month:'short',year:d.getFullYear()===n.getFullYear()?undefined:'numeric'});
  }
  function renderRecents(){
    const el=$('#homeRecents'); const items=[...list].sort((a,b)=>(b.opened||0)-(a.opened||0));
    $('#home').classList.toggle('landing',!items.length); $('#recentsSec').hidden=!items.length;
    if(!items.length){ el.innerHTML=''; return; }
    el.className='recents '+view;
    if(view==='grid') el.innerHTML=items.map(b=>'<div class="rc" data-board="'+b.id+'"><button type="button" class="rc-open" data-open="'+b.id+'"><span class="th">'+thumbFor(b.id)+'</span><b>'+esc(b.title||'Untitled board')+'</b><small>Edited '+esc(when(b.updated))+'</small></button><button type="button" class="ibtn rc-more" data-more="'+b.id+'" title="More" aria-label="More actions"><svg class="i" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg></button></div>').join('');
    else el.innerHTML='<div class="rl-head"><span>Name</span><span>Last opened</span><span>Edited</span><span></span></div>'+items.map(b=>'<div class="rl" data-board="'+b.id+'"><button type="button" class="rl-open" data-open="'+b.id+'"><span class="th">'+thumbFor(b.id)+'</span><span class="nm"><b>'+esc(b.title||'Untitled board')+'</b><small>Created '+esc(when(b.created))+'</small></span></button><span class="cell">'+esc(when(b.opened))+'</span><span class="cell">'+esc(when(b.updated))+'</span><button type="button" class="ibtn rc-more" data-more="'+b.id+'" title="More" aria-label="More actions"><svg class="i" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg></button></div>').join('');
  }
  function boardMenu(id,anchor){
    const mn=$('#homeMenu'); mn.dataset.id=id; mn.hidden=false;
    const r=anchor.getBoundingClientRect(); const w=200;
    const h=mn.offsetHeight; let top=r.bottom+6; if(top+h>window.innerHeight-8) top=Math.max(8,r.top-h-6);
    mn.style.left=Math.max(8,Math.min(window.innerWidth-w-8,r.right-w))+'px'; mn.style.top=top+'px';
  }
  function rename(id){
    const m=meta(id); if(!m) return;
    openModal('Rename board','<input id="renameIn" class="modal-input" value="'+esc(m.title||'')+'" aria-label="Board name" spellcheck="false">',[{label:'Rename',primary:true,run:()=>{ const v=$('#renameIn').value.trim()||'Untitled board'; const code=LS.get(CODE+id,'flowchart LR\n'); const nc=setTitleInCode(code,v); LS.set(CODE+id,nc); m.title=v; m.updated=now(); saveList(); if(current===id){ lastSaved.set(id,nc); } closeModal(); renderRecents(); }}]);
    setTimeout(()=>{ const i=$('#renameIn'); if(i){ i.focus(); i.select(); i.addEventListener('keydown',e=>{ if(e.key==='Enter') $('#modalFoot [data-mb="0"]').click(); }); } },30);
  }
  function duplicate(id){
    const m=meta(id); if(!m) return; const code=LS.get(CODE+id,'flowchart LR\n'); const nid=create(code,(m.title||'Untitled board')+' copy');
    LS.set(IMGS+nid,LS.get(IMGS+id,{})||{}); renderRecents(); toast('Duplicated');
  }
  function remove(id){
    const m=meta(id); if(!m) return;
    openModal('Delete board','<p>Delete "'+esc(m.title||'Untitled board')+'"? This removes it from this browser and can\'t be undone. Export a board file first if you want to keep a copy.</p>',[{label:'Delete board',primary:true,run:()=>{ try{ localStorage.removeItem(CODE+id); localStorage.removeItem(IMGS+id); }catch(_){} list=list.filter(b=>b.id!==id); saveList(); if(current===id) current=null; closeModal(); renderRecents(); toast('Board deleted'); }}]);
  }
  function exportFile(id){ open(id); setTimeout(()=>{ const b=document.querySelector('#exportMenu [data-export=json]'); if(b) b.click(); },120); }

  // wiring
  // Templates: two rows that scroll sideways, with arrow buttons for mouse users.
  function updTplNav(){
    const r=$('#homeTpl'), nav=$('#tplNav'); if(!r||!nav) return;
    const over=r.scrollWidth>r.clientWidth+4; nav.hidden=!over; if(!over) return;
    nav.querySelector('[data-tpl-dir="-1"]').disabled=r.scrollLeft<=4;
    nav.querySelector('[data-tpl-dir="1"]').disabled=r.scrollLeft+r.clientWidth>=r.scrollWidth-4;
  }
  $('#tplNav').addEventListener('click',e=>{ const b=e.target.closest('[data-tpl-dir]'); if(!b) return; const r=$('#homeTpl'); r.scrollBy({left:+b.dataset.tplDir*r.clientWidth*0.8,behavior:'smooth'}); });
  $('#homeTpl').addEventListener('scroll',updTplNav,{passive:true});
  window.addEventListener('resize',updTplNav);
  $('#homeTpl').addEventListener('click',e=>{
    const b=e.target.closest('[data-tpl-id]'); if(!b) return; const id=b.dataset.tplId;
    if(id==='blank'){ openNew('flowchart LR\n','Untitled board'); return; }
    if(id==='text'){ openQuickText(true); return; }
    const t=TEMPLATES.find(x=>x.id===id); if(t) openNew(t.code);
  });
  $('#homeRecents').addEventListener('click',e=>{
    const mo=e.target.closest('[data-more]'); if(mo){ e.stopPropagation(); boardMenu(mo.dataset.more,mo); return; }
    const op=e.target.closest('[data-open]'); if(op) open(op.dataset.open);
  });
  $('#homeMenu').addEventListener('click',e=>{ const b=e.target.closest('[data-hm]'); if(!b) return; const id=$('#homeMenu').dataset.id; $('#homeMenu').hidden=true;
    ({open,rename,duplicate,remove,export:exportFile})[b.dataset.hm](id); });
  document.addEventListener('click',e=>{ if(!e.target.closest('#homeMenu')&&!e.target.closest('[data-more]')) $('#homeMenu').hidden=true; });
  $('#homeView').addEventListener('click',e=>{ const b=e.target.closest('[data-view]'); if(!b) return; view=b.dataset.view; LS.set('orim.homeView',view); renderStatic(); renderRecents(); });
  $('#homeNew').addEventListener('click',()=>openNew('flowchart LR\n','Untitled board'));
  $('#heroStart').addEventListener('click',()=>openNew('flowchart LR\n','Untitled board'));
  $('#heroText').addEventListener('click',()=>openQuickText(true));
  $('#heroTry').addEventListener('click',()=>{ const t=TEMPLATES.find(x=>x.id==='pp'); if(t) openNew(t.code); });
  $('#homeImport').addEventListener('click',()=>$('#fileIn').click());
  $('#homeTheme').addEventListener('click',()=>$('#themeBtn').click());
  $('#homeBtn').addEventListener('click',showHome);

  return {init,open,openNew,create,showHome,persist,isHome,iconsReady,current:()=>current,thumbSVG};
})();
