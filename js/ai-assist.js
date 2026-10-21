/* orim · ai-assist.js
 * The AI tab: type what you want, Claude changes the board live.
 *
 * Works where orim runs inside Claude (the copy shared from Claude), using the
 * viewer's own Claude account through the `sample` capability. Elsewhere, such
 * as GitHub Pages, it uses an Anthropic API key the person saves in this browser (ai-key.js).
 *
 * Claude replies with one small JSON command per line (add, connect, update,
 * frame, …). Each line is applied the moment it arrives, so the board changes
 * while Claude is still writing. The whole request is one undo step.
 */
'use strict';
/* While Claude works: the board stays sharp in the middle and goes soft around it, and in that soft
 * ring a sketch of a board drifts slowly while a "Claude" cursor moves from piece to piece. */
const Ghost=(()=>{
  let el=null, pill=null, hideT=0;
  // Pieces sit around the edge of the view (x, y in % of the board), never in the clear middle.
  const CARDS=[[6,10,170,'#4262ff'],[72,8,190,'#0ca789'],[80,44,150,'#9510ac'],[70,76,200,'#f24726'],[8,70,180,'#fac710'],[34,84,140,'#4262ff']];
  const DOTS=[[22,22,'#4262ff'],[90,24,'#9510ac'],[92,66,'#0ca789'],[18,48,'#f24726'],[52,92,'#fac710'],[48,6,'#0ca789']];
  function build(){
    el=document.createElement('div'); el.className='ai-ghost'; el.setAttribute('aria-hidden','true');
    let h='<div class="gh-veil"></div><svg class="gh-wires" viewBox="0 0 100 100" preserveAspectRatio="none">'+
      '<path d="M14 18 C 30 10, 50 4, 76 14"/><path d="M84 20 C 96 34, 92 52, 86 58" style="animation-delay:-1s"/><path d="M84 62 C 88 76, 80 84, 74 86" style="animation-delay:-2s"/><path d="M14 30 C 6 46, 8 62, 14 74" style="animation-delay:-.5s"/><path d="M20 80 C 30 92, 44 92, 50 90" style="animation-delay:-1.5s"/></svg>';
    CARDS.forEach(([x,y,w,c],k)=>{ h+='<div class="gh gh-card" style="left:'+x+'%;top:'+y+'%;width:'+w+'px;--dx:'+[4,-5,3,-4,5,-3][k]+'px;--dy:'+[-3,4,-4,3,2,-4][k]+'px;animation-delay:'+(-k*0.9)+'s"><i style="background:'+c+'"></i><b></b><b></b></div>'; });
    DOTS.forEach(([x,y,c],k)=>{ h+='<div class="gh gh-dot" style="left:'+x+'%;top:'+y+'%;--dx:'+[3,-3,2,-2,3,-3][k]+'px;--dy:'+[2,-3,3,-2,-3,2][k]+'px;animation-delay:'+(-k*1.3)+'s"><span style="background:'+c+'"></span><b></b></div>'; });
    h+='<div class="gh-cursor"><svg viewBox="0 0 16 16"><path d="M1 1l13 5-5.5 1.8L6.6 13z"/></svg><span>Claude</span></div>';
    el.innerHTML=h;
    pill=document.createElement('div'); pill.className='gh-pill'; pill.setAttribute('role','status'); pill.innerHTML='<span class="gh-spark">'+aiSpark()+'</span><span class="gh-text">Claude is thinking</span>';
    boardPane.appendChild(el); boardPane.appendChild(pill);
  }
  return {
    start(){ if(!el) build(); clearTimeout(hideT); pill.querySelector('.gh-text').textContent='Claude is thinking'; el.hidden=pill.hidden=false; boardPane.classList.add('ai-busy'); requestAnimationFrame(()=>{ el.classList.add('on'); pill.classList.add('on'); }); },
    phase(p){ if(pill&&p) pill.querySelector('.gh-text').textContent='Claude is changing the board'; },
    stop(){ if(!el) return; el.classList.remove('on'); pill.classList.remove('on'); boardPane.classList.remove('ai-busy'); hideT=setTimeout(()=>{ if(el){ el.hidden=true; pill.hidden=true; } },500); }
  };
})();
const AI=(()=>{
  const log=$('#aiLog'), inp=$('#aiIn'), sendBtn=$('#aiSend'), stopBtn=$('#aiStop'), deep=$('#aiDeep'), selEl=$('#aiSel');
  const chats=new Map();            // board id -> [{role:'user'|'assistant', content, view}]
  let sample=null, known=false, busy=false, ctl=null, keyMode=false, showKeys=false;
  try{ deep.checked=!!LS.get('orim.aiDeep',false); }catch(_){}
  deep.addEventListener('change',()=>LS.set('orim.aiDeep',deep.checked));
  const chat=()=>{ const id=(typeof Boards!=='undefined'&&Boards.current())||'_'; if(!chats.has(id)) chats.set(id,[]); return chats.get(id); };

  const ready=(window.claude&&typeof window.claude.use==='function')?window.claude.use('sample').catch(()=>null):Promise.resolve(null);
  // Inside Claude the viewer's own account answers. Elsewhere, an Anthropic API key saved in this browser.
  ready.then(s=>{ keyMode=!s; sample=s||(AIKey.get()?AIKey.sample:null); known=true; updKeyBtn(); paint(); });
  const keyBtn=document.createElement('button'); keyBtn.type='button'; keyBtn.className='ai-keybtn'; keyBtn.id='aiKeyBtn'; keyBtn.hidden=true; keyBtn.title='API key and model'; keyBtn.setAttribute('aria-label','API key and model');
  keyBtn.innerHTML='<svg class="i" viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2.5 2.5M14 9l2 2"/></svg>';
  selEl.before(keyBtn);
  function updKeyBtn(){ keyBtn.hidden=!(keyMode&&sample); }
  keyBtn.addEventListener('click',()=>{ showKeys=!showKeys; paint(); });
  // The key form: a link to the Console to make a key, the key, the model, and where it is kept.
  function keyPanel(){
    const has=!!AIKey.get(), m=AIKey.model();
    return '<div class="ai-empty ai-keyset"><span class="ai-hi">'+aiSpark()+'</span><b>'+(has?'Your Claude API key':'Use Claude with your API key')+'</b>'+
      '<p>'+(has?'orim calls Claude directly from this browser with your key. Usage is billed to your Claude API account.':'Inside Claude this tab uses your Claude account with no setup. Here, add an API key from the Claude Console and orim calls Claude directly from this browser. Usage is billed to your Claude API account.')+'</p>'+
      '<a class="ai-keylink" href="'+AIKey.KEYS_URL+'" target="_blank" rel="noopener noreferrer">'+ico('link')+'Create a key in the Claude Console</a>'+
      '<label class="ai-field"><span>API key</span><input type="password" id="aiKeyIn" placeholder="'+(has?'Saved. Paste a new key to replace it':'sk-ant-…')+'" autocomplete="off" spellcheck="false"></label>'+
      '<label class="ai-field"><span>Model</span><select id="aiModel">'+AIKey.MODELS.map(([id,nm,d])=>'<option value="'+id+'"'+(id===m?' selected':'')+'>'+nm+', '+d+'</option>').join('')+'</select></label>'+
      '<label class="toggle"><input type="checkbox" id="aiKeyRemember" checked><span>Remember on this device</span></label>'+
      '<div class="ai-keyrow"><button type="button" class="btn primary" id="aiKeySave">'+(has?'Save':'Use this key')+'</button>'+(has?'<button type="button" class="btn" id="aiKeyForget">Forget key</button><button type="button" class="btn ghost" id="aiKeyDone">Done</button>':'')+'</div>'+
      '<p class="ai-keynote">The key stays in this browser and is only sent to api.anthropic.com. Avoid saving it on a shared computer. Think harder uses Opus 5.5. No key? Export, then Ask an AI, copies a prompt for any AI chat.</p></div>';
  }

  /* ---------- what Claude is told ---------- */
  const RULES=`You edit a whiteboard diagram in orim (Mermaid flowchart underneath). Reply ONLY with lines of JSON, exactly one object per line, no code fences, no other text. Each line is applied to the board the moment it arrives, in order.

Commands:
{"op":"add","id":"cache","label":"Redis cache","shape":"rect","icon":"azure:cache-redis","in":"frameId","near":"api","fill":"#hex"}
  shape: rect, round, stadium, cyl (database), circle, diamond (decision), hex, para, sub, sticky (sticky note), text (no box). An icon replaces the shape.
  "near": an existing id the new shape relates to, so it appears next to it. "in": the frame to put it in. Both optional.
{"op":"update","id":"api","label":"…","shape":"…","icon":"…","in":"frameId or null","fill":"#hex","color":"#hex"}   only the fields to change
{"op":"delete","id":"api"}   a shape, or a frame together with everything in it
{"op":"connect","from":"api","to":"cache","label":"reads","line":"solid|dotted|thick","ends":"one|both|none","fromRow":2,"toRow":"Pricing"}   from/to can be shapes, frames or tables; fromRow/toRow attach the line to one table row (number, 0 is the header, or the row's first cell text)
{"op":"screen","id":"login","device":"mobile|tablet|desktop","preset":"blank|login|main","label":"Login","near":"id"}   a UI mockup screen: a device frame filled with grey wireframe pieces (blank has only a top bar)
{"op":"add","id":"loginCta","shape":"uiButton","label":"Sign up","in":"login","at":[24,500],"size":[252,44]}   a piece on a screen; at is x,y from the screen's top left, size is w,h; both optional
  pieces: uiHeading, uiText (label = the text; empty shows grey lines), uiButton, uiInput (label = placeholder), uiImage, uiTopbar (label = title), uiTabbar (bottom menu), uiSidebar (side menu) and uiTable (a data table; label = column names): one item per line in the label, e.g. "Home\\nSearch\\nProfile"
  {"op":"update","id":"loginCta","at":[24,560],"size":[252,44],"fill":"#4262ff"} moves, resizes or colours a piece; colours: ${UI_COLORS.slice(1).map(c=>c[0]+' '+c[1].toLowerCase()).join(', ')}; grey when none
{"op":"table","id":"cmp","title":"Crystallize vs Optimizely","rows":[["","Crystallize","Optimizely"],["Pricing","Usage based","Per seat"]],"colors":{"1,1":"g","1,2":"a"},"near":"id","in":"frameId"}   create or replace a table; row 0 is the header row, column 0 the row names; colors "row,col": g good, a partly, r weak
{"op":"cell","id":"cmp","row":1,"col":2,"text":"…","color":"g|a|r|none"}   change one cell; row may be a row name; a row or column one past the end is added
{"op":"doc","id":"notes","title":"Summary","markdown":"# Heading\\n- point with **bold**","near":"cmp","in":"frameId"}   create or replace a document card: # ## ### headings, - and 1. lists, **bold**, *italic*
{"op":"doc","id":"loginStory","type":"story","title":"Sign in with Entra ID","fields":{"points":3,"priority":2,"tags":"auth; web"},"markdown":"## Description\\nAs a shopper, I want to sign in with my work account, so that …\\n## Acceptance criteria\\n- …","near":"login"}   a ticket: a doc with a work item type
  type: epic, feature, story (user story), bug or task; leave it out for a plain document. fields by type: epic and feature: priority (1-4), tags; story: points, priority, tags; bug: severity ("1 - Critical" … "4 - Low"), priority, tags; task: remaining (hours), activity (Development, Design, Testing, Documentation, Deployment, Requirements), tags. Tags are separated by ;
  markdown links: [text](https://…). Updating a doc: send only what changes; fields are merged.
{"op":"disconnect","from":"api","to":"cache"}
{"op":"frame","id":"sec","label":"Security","items":["kv","mi"],"in":"parentFrame"}   create or rename a frame and move items into it
{"op":"unframe","id":"sec"}   remove a frame but keep what is in it
{"op":"layout"}   rearrange the whole board; only when asked, or after a big restructure
{"op":"direction","dir":"TB"}   flow direction: TB (top to bottom, vertical), LR (left to right, horizontal), BT or RL; rearranges the board to match. Add "in":"frameId" to change one frame only
{"op":"say","text":"…"}   a short message to the person

Rules:
- Reuse existing ids exactly. New ids: camelCase letters and digits, not used yet.
- Do only what was asked. Keep labels short; use \\n for a line break.
- Use an icon for a cloud or Microsoft service when one fits (ids listed below); otherwise a plain shape.
- Mockups: keep them simple and grey, a few pieces per screen. New screens: phone ${DEVICES.mobile.w*MOCK}x${DEVICES.mobile.h*MOCK} (content from y ${DEVICES.mobile.top*MOCK}), iPad ${DEVICES.tablet.w*MOCK}x${DEVICES.tablet.h*MOCK} (from y ${DEVICES.tablet.top*MOCK}), desktop ${DEVICES.desktop.w*MOCK}x${DEVICES.desktop.h*MOCK} (from y ${DEVICES.desktop.top*MOCK}); the board lists each screen's real size. Start from a preset, then add, update or delete pieces. Connect screens to each other for a flow, or pieces to the screen they open.
- Database tables: a table titled with the table name, header row Column | Type | Key | Notes and one row per column; link foreign keys row to row with fromRow and toRow.
- Comparisons: one table, with a row per criterion and a column per option; colour cells to show which option is stronger. To link a diagram to a comparison, connect shapes to the table rows they relate to.
- Longer explanations, notes or summaries: a doc, not a sticky note.
- Tickets (work items to paste into Azure DevOps, Jira or similar): one doc per item with a type. Stories: Description as "As a …, I want …, so that …" and an Acceptance criteria list; bugs: Repro steps, Expected result, Actual result; tasks: a short Description. Titles short and specific. Connect each parent to its children (epic to feature to story or bug to task) and each ticket to the shapes or screens it changes. Put a set of tickets in a frame (for example the epic or sprint name); they are placed clear of the rest of the board.
- Sticky note colours: ${STICKY_COLORS.slice(0,8).join(' ')}.
- A question about the board: answer with say lines only, no changes.
- Something unclear or impossible: one say line asking or explaining, no changes.
- Always end with one say line of at most 15 words saying what you did.`;
  function brief(){
    const m=state.model; if(!m) return 'The board is empty.';
    const L=['Direction: '+(m.dir||'LR')+(m.title?'\nTitle: '+m.title:'')];
    if(m.groups.size){ L.push('Frames (id | label | inside):'); for(const id of m.groupOrder){ const g=m.groups.get(id); L.push('- '+id+' | '+g.label.replace(/\n/g,' ')+(g.parent?' | '+g.parent:'')); } }
    if(m.nodes.size){ L.push('Shapes (id | label | shape or icon | frame):');
      for(const id of m.nodeOrder){ const n=m.nodes.get(id); if(!n||n.shape==='table'||n.shape==='doc'||(n.group&&m.groups.get(n.group)&&m.groups.get(n.group).dev)) continue; L.push('- '+id+' | '+String(n.label).replace(/\n/g,' ').slice(0,80)+' | '+(n.shape==='icon'?n.icon:n.shape)+(n.group?' | '+n.group:'')); } }
    const tabs=[...m.nodes.values()].filter(n=>n.shape==='table'); if(tabs.length){ L.push('Tables (id | title | frame), then rows as row number: cells, with [g]/[a]/[r] colours:');
      for(const n of tabs){ L.push('- '+n.id+' | '+(n.label||'')+(n.group?' | '+n.group:'')); n.table.rows.forEach((r,ri)=>L.push('  '+ri+': '+r.map((c,ci)=>String(c).replace(/\n/g,' ').slice(0,60)+(n.table.colors[ri+','+ci]?' ['+n.table.colors[ri+','+ci]+']':'')).join(' | '))); } }
    const scr=[...m.groups.values()].filter(g=>g.dev); if(scr.length){ L.push('Screens (id | label | device | size), then their pieces as id | kind | label | x,y,w,h from the screen corner:');
      for(const g of scr){ const b=state.boxes&&state.boxes.get(g.id); L.push('- '+g.id+' | '+g.label+' | '+g.dev+(b?' | '+Math.round(b.w)+'x'+Math.round(b.h):'')); for(const n of m.nodes.values()) if(n.group===g.id&&b) L.push('  '+n.id+' | '+n.shape+' | '+String(n.label).replace(/\n/g,'\\n').slice(0,60)+' | '+[n.x-b.x,n.y-b.y,n.w,n.h].map(Math.round).join(',')); } }
    const docs=[...m.nodes.values()].filter(n=>n.shape==='doc'); if(docs.length){ L.push('Documents and tickets (id | type | title | fields | frame), then their text as markdown:');
      for(const n of docs){ L.push('- '+n.id+' | '+(TICKET_TYPES[n.doc.kind]?n.doc.kind:'note')+' | '+(n.label||'')+(n.doc.fields?' | '+JSON.stringify(n.doc.fields):'')+(n.group?' | '+n.group:'')); L.push(docToMd(n.doc).split('\n').map(l=>'  '+l).join('\n').slice(0,1500)); } }
    if(m.edges.length){ L.push('Connections:'); for(const e of m.edges) L.push('- '+e.from+(e.ra!=null?' (row '+e.ra+')':'')+(e.line==='dotted'?' -.-> ':e.line==='thick'?' ==> ':e.head==='none'?' --- ':' --> ')+e.to+(e.rb!=null?' (row '+e.rb+')':'')+(e.label?' | '+e.label.replace(/\n/g,' '):'')); }
    const sel=[...state.sel].filter(k=>k[0]==='n'||k[0]==='g').map(k=>k.slice(2)); if(sel.length) L.push('Selected now: '+sel.join(', ')+' ("these", "this" and "selected" mean these).');
    const cm=(m.threads||[]).filter(c=>!c.done&&c.msgs.length); if(cm.length){ L.push('Open comments:'); for(const c of cm) L.push('- on '+(c.on||'the board')+': '+c.msgs.map(q=>(q.a?q.a+': ':'')+q.t.replace(/\n/g,' ')).join(' / ').slice(0,300)); }
    if(!m.nodes.size&&!m.groups.size) L.push('The board is empty.');
    return L.join('\n');
  }
  function input(text){
    // Earlier turns, leaving out requests that failed (and the question that went with them).
    const all=chat(); const ok=all.filter((t,i)=>!t.failed&&!(t.role==='user'&&all[i+1]&&all[i+1].failed));
    const past=ok.filter(t=>!t.pending).slice(-6).map(t=>({role:t.role,content:t.role==='assistant'?t.summary||t.content||'(no reply)':t.content}));
    const head={role:'user',content:RULES+'\n\nIcons ('+'pack:id'+'):\n'+aiIconList(false)};
    const now={role:'user',content:'The board now:\n'+brief()+'\n\nRequest: '+text};
    return past.length?[head,{role:'assistant',content:'{"op":"say","text":"Ready."}'},...past,now]:[{role:'user',content:head.content+'\n\n'+now.content}];
  }

  /* ---------- applying commands ---------- */
  const SHAPES=new Set(['rect','round','stadium','cyl','circle','diamond','hex','para','sub','sticky','text']);
  const taken=id=>state.model.nodes.has(id)||state.model.groups.has(id);
  const cleanId=(raw,label)=>{ let id=String(raw||'').replace(/[^\p{L}\p{N}_]/gu,''); if(!id||/^\d/.test(id)||RESERVED.has(id)) id=idFrom(label||'node',taken); return id; };
  const hex=v=>typeof v==='string'&&/^#[0-9a-fA-F]{3,8}$/.test(v.trim())?v.trim():null;
  const label=v=>String(v==null?'':v).replace(/\\n/g,'\n').slice(0,200);
  function setStyle(m,id,patch){ const st=m.styles.get(id)||{fill:null,stroke:null,color:null,fontSize:null,bold:false,italic:false,bg:null,extra:[]}; Object.assign(st,patch); m.styles.set(id,st); }
  function free(m,r,skip){ const hit=o=>r.x<o.x+o.w+28&&r.x+r.w+28>o.x&&r.y<o.y+o.h+28&&r.y+r.h+28>o.y;
    for(const n of m.nodes.values()){ if(n===skip||n.x==null) continue; if(hit(n)) return false; }
    // Do not drop a shape into a frame it does not belong to.
    let bx=null; try{ bx=groupBoxes(m); }catch(_){}
    if(bx) for(const [gid,b] of bx){ if(typeof gid!=='string'||!b||b.x==null) continue; if(skip&&skip.group&&(gid===skip.group||isDesc(m,skip.group,gid))) continue; if(hit({x:b.x,y:b.y-30,w:b.w,h:b.h+30})) return false; }
    return true; }
  // Put a new shape next to the one it relates to, along the board's direction, in the first free spot.
  function place(m,n,nearId){
    const near=nearId&&m.nodes.get(nearId); const vert=m.dir==='TB'||m.dir==='TD'||m.dir==='BT';
    let x,y;
    if(near&&near.x!=null){ x=vert?near.x+(near.w-n.w)/2:near.x+near.w+88; y=vert?near.y+near.h+80:near.y+(near.h-n.h)/2; }
    else { const sib=n.group&&[...m.nodes.values()].filter(o=>o!==n&&o.group===n.group&&o.x!=null).pop();
      if(sib){ x=vert?sib.x+sib.w+48:sib.x; y=vert?sib.y:sib.y+sib.h+48; }
      else { const b=contentBounds(m); x=b?b.x+b.w+96:0; y=b?b.y:0; } }
    for(let k=0;k<40&&!free(m,{x,y,w:n.w,h:n.h},n);k++){ if(vert) x+=n.w+48; else y+=n.h+40; }
    n.x=SNAP(x); n.y=SNAP(y);
  }
  // A table row given as a number or as the text of its first cell.
  function rowOf(n,v){ if(!n||n.shape!=='table'||v==null||v==='') return null; const rows=n.table.rows;
    if(typeof v==='number'||/^\d+$/.test(String(v))){ const i=+v; return i>=0&&i<rows.length?i:null; }
    const s=String(v).trim().toLowerCase(); let i=rows.findIndex(r=>String(r[0]).trim().toLowerCase()===s); if(i<0) i=rows.findIndex(r=>String(r[0]).toLowerCase().includes(s)||s.includes(String(r[0]).toLowerCase())&&r[0]); return i<0?null:i; }
  // A piece on a screen: at and size are relative to the screen; without them it goes below the last piece.
  function placePiece(m,n,op,keep){
    const g=n.group&&m.groups.get(n.group); const p=g&&m.pos.get(g.id); if(!g||!g.dev||!p){ if(!keep) place(m,n,null); return; }
    const D=DEVICES[g.dev], sc=devScale(m,g.id), k=UI_KINDS[n.shape]; const num=v=>typeof v==='number'&&isFinite(v)?v:null;
    if(Array.isArray(op.size)&&num(op.size[0])&&num(op.size[1])){ n.w=Math.max(8,Math.min(p.w,op.size[0])); n.h=Math.max(6,Math.min(p.h,op.size[1])); n.sized=true; }
    else if(!keep){ if(k){ n.w=k.w*sc; n.h=k.h*sc; } n.w=Math.min(n.w,p.w-40*sc); n.sized=true; }
    if(Array.isArray(op.at)&&num(op.at[0])!=null&&num(op.at[1])!=null){ n.x=p.x+Math.max(0,Math.min(p.w-n.w,op.at[0])); n.y=p.y+Math.max(0,Math.min(p.h-n.h,op.at[1])); return; }
    if(keep) return;
    let bottom=p.y+D.top*sc+8*sc, last=null, left=p.x+20*sc;
    for(const o of m.nodes.values()){ if(o===n||o.group!==g.id||o.x==null) continue;
      if(o.shape==='uiTopbar') bottom=Math.max(bottom,o.y+o.h+8*sc);
      if(o.shape==='uiSidebar') left=Math.max(left,o.x+o.w+20*sc); }
    for(const o of m.nodes.values()) if(o!==n&&o.group===g.id&&o.x!=null&&o.shape!=='uiTabbar'&&o.shape!=='uiSidebar'&&o.shape!=='uiTopbar'&&o.y+o.h>=bottom){ bottom=o.y+o.h; last=o; }
    // Below the lowest piece, lined up with it.
    if(last&&!(Array.isArray(op.size))){ n.w=Math.min(p.w,Math.max(n.w,last.w)); }
    n.w=Math.min(n.w,p.x+p.w-left-20*sc>8?Math.max(n.w>=p.w-1?p.w:0,p.x+p.w-left-20*sc):n.w);
    n.x=n.w>=p.w-1?p.x:last?last.x:left; n.y=Math.min(p.y+p.h-n.h-D.bottom*sc,bottom+16*sc);
  }
  // A free spot for something w x h: beside the shape it relates to, or right of the board.
  function freeSpot(m,w,h,nearId){
    const near=nearId&&(m.nodes.get(nearId)||(state.boxes&&state.boxes.get(nearId))); const b=contentBounds(m);
    let x=near&&near.x!=null?near.x+near.w+96:b?b.x+b.w+120:0, y=near&&near.y!=null?near.y:b?b.y+30:0;
    let bx=null; try{ bx=groupBoxes(m); }catch(_){}
    const hit=r=>{ for(const n of m.nodes.values()) if(n.x!=null&&r.x<n.x+n.w+40&&r.x+r.w+40>n.x&&r.y<n.y+n.h+40&&r.y+r.h+40>n.y) return true; if(bx) for(const [gid,o] of bx){ if(typeof gid!=='string') continue; if(r.x<o.x+o.w+40&&r.x+r.w+40>o.x&&r.y<o.y+o.h+70&&r.y+r.h+40>o.y-30) return true; } return false; };
    for(let k=0;k<30&&hit({x,y,w,h});k++) x+=Math.max(120,w/2);
    return {x:SNAP(x),y:SNAP(y)};
  }
  function removeNode(m,id){
    m.nodes.delete(id); m.nodeOrder=m.nodeOrder.filter(x=>x!==id); m.styles.delete(id); m.pos.delete(id);
    m.edges=m.edges.filter(e=>e.from!==id&&e.to!==id);
    for(const a of m.arrows){ if(a.from===id) a.from=null; if(a.to===id) a.to=null; }
  }
  function apply(op,done){
    const m=state.model; if(!m||!op||typeof op!=='object') return;
    const k=String(op.op||'').toLowerCase();
    if(k==='say'){ if(op.text) done.say.push(String(op.text)); return; }
    if(k==='add'){
      const lb=label(op.label||op.id||'New');
      let id=cleanId(op.id,lb); if(taken(id)){ if(m.nodes.has(id)) return apply({...op,op:'update'},done); id=idFrom(lb,taken); }
      let icon=op.icon&&iconFor(op.icon)?String(op.icon).trim():null;
      let shape=icon?'icon':SHAPES.has(op.shape)||UI_KINDS[op.shape]?op.shape:guessShape(lb);
      const group=op.in&&m.groups.has(op.in)?op.in:null;
      const n={id,label:UI_KINDS[shape]&&op.label==null?UI_KINDS[shape].def:lb,shape,icon,group,cls:null}; sizeNode(n);
      m.nodes.set(id,n); m.nodeOrder.push(id);
      if(group&&m.groups.get(group).dev) placePiece(m,n,op); else place(m,n,op.near);
      if(shape==='sticky') setStyle(m,id,{fill:hex(op.fill)||STICKY_COLORS[0]}); else if(hex(op.fill)) setStyle(m,id,{fill:hex(op.fill)});
      done.added++; done.fresh.push(id); return;
    }
    if(k==='update'){
      const n=m.nodes.get(op.id), g=m.groups.get(op.id);
      if(g){ if(op.label!=null) g.label=label(op.label); if('in' in op) g.parent=op.in&&m.groups.has(op.in)&&op.in!==g.id?op.in:null; if(hex(op.fill)) setStyle(m,g.id,{fill:hex(op.fill)}); done.changed++; return; }
      if(!n) return;
      if(op.label!=null) n.label=label(op.label);
      if(op.icon!==undefined){ if(op.icon&&iconFor(op.icon)){ n.icon=String(op.icon).trim(); n.shape='icon'; } else if(!op.icon&&n.shape==='icon'){ n.icon=null; n.shape='round'; } }
      if(op.shape&&SHAPES.has(op.shape)&&!(op.icon&&n.shape==='icon')){ n.shape=op.shape; n.icon=null; }
      if('in' in op){ const ng=op.in&&m.groups.has(op.in)?op.in:null; if(ng!==n.group){ n.group=ng; if(ng){ const sib=[...m.nodes.values()].find(o=>o!==n&&o.group===ng&&o.x!=null); if(sib) place(m,n,null); } } }
      const patch={}; if(hex(op.fill)) patch.fill=hex(op.fill); if(hex(op.color)) patch.color=hex(op.color); if(Object.keys(patch).length) setStyle(m,n.id,patch);
      if(op.at||op.size) placePiece(m,n,op,true);
      sizeNode(n); done.changed++; done.fresh.push(n.id); return;
    }
    if(k==='screen'){
      const D=DEVICES[op.device]||DEVICES.mobile; const r=freeSpot(m,D.w*MOCK,D.h*MOCK,op.near);
      const res=addScreen(m,{dev:DEVICES[op.device]?op.device:'mobile',preset:['blank','login','main'].includes(op.preset)?op.preset:'blank',label:op.label?label(op.label):'',id:op.id?cleanId(op.id,op.label):null,x:r.x,y:r.y,parent:op.in&&m.groups.has(op.in)?op.in:null});
      done.added++; done.fresh.push(...res.ids); return;
    }
    if(k==='delete'){
      if(m.nodes.has(op.id)){ removeNode(m,op.id); done.removed++; return; }
      if(m.groups.has(op.id)){ const kill=new Set([op.id]); for(const g of m.groups.values()) if(isDesc(m,g.id,op.id)) kill.add(g.id);
        for(const n of [...m.nodes.values()]) if(n.group&&kill.has(n.group)){ removeNode(m,n.id); done.removed++; }
        for(const gid of kill){ m.groups.delete(gid); m.pos.delete(gid); m.styles.delete(gid); } m.groupOrder=m.groupOrder.filter(x=>!kill.has(x));
        m.edges=m.edges.filter(e=>!kill.has(e.from)&&!kill.has(e.to)); done.removed++; }
      return;
    }
    if(k==='connect'){
      const ok=id=>m.nodes.has(id)||m.groups.has(id); if(!ok(op.from)||!ok(op.to)) return;
      const line=op.line==='dotted'||op.line==='thick'?op.line:'solid'; const ends=op.ends==='both'||op.ends==='none'?op.ends:'one';
      const lb=op.label?label(op.label).replace(/\n/g,' '):'';
      const ra=rowOf(m.nodes.get(op.from),op.fromRow), rb=rowOf(m.nodes.get(op.to),op.toRow);
      const ex=m.edges.find(e=>e.from===op.from&&e.to===op.to&&(e.ra==null?null:e.ra)===ra&&(e.rb==null?null:e.rb)===rb);
      if(ex){ ex.line=line; ex.head=ends==='none'?'none':'arrow'; ex.tail=ends==='both'?'arrow':'none'; if(op.label!=null) ex.label=lb; done.changed++; return; }
      const ne={from:op.from,to:op.to,line,head:ends==='none'?'none':'arrow',tail:ends==='both'?'arrow':'none',label:lb}; if(ra!=null) ne.ra=ra; if(rb!=null) ne.rb=rb; m.edges.push(ne); done.linked++; return;
    }
    if(k==='table'||k==='doc'){
      const lb=label(op.title!=null?op.title:op.label||'').replace(/\n/g,' ');
      let n=m.nodes.get(op.id); if(n&&n.shape!==k) n=null;
      const fresh=!n;
      if(!n){ let id=cleanId(op.id,lb||k); if(taken(id)) id=idFrom(lb||k,taken); n={id,label:lb,shape:k,icon:null,group:op.in&&m.groups.has(op.in)?op.in:null,cls:null}; m.nodes.set(id,n); m.nodeOrder.push(id); }
      else { if(op.title!=null||op.label!=null) n.label=lb; if('in' in op) n.group=op.in&&m.groups.has(op.in)?op.in:null; }
      if(k==='table'){ if(Array.isArray(op.rows)||!n.table) n.table=cleanTable({rows:op.rows,colors:op.colors||(n.table&&!Array.isArray(op.rows)?n.table.colors:{})}); else if(op.colors) n.table=cleanTable({rows:n.table.rows,colors:op.colors}); }
      else {
        const ty=op.type===undefined?undefined:(String(op.type||'').toLowerCase().replace(/^user\s*/,'').replace(/^product backlog item$/,'story').replace(/^pbi$/,'story'));
        const kind=ty===undefined?(n.doc&&n.doc.kind):(TICKET_TYPES[ty]?ty:null);
        let blocks=n.doc&&n.doc.blocks;
        if(op.markdown!=null||op.text!=null) blocks=mdToDoc(String(op.markdown!=null?op.markdown:op.text||'').replace(/\\n/g,'\n')).blocks;
        else if(!blocks||fresh) blocks=kind?ticketTemplate(kind):[{t:'p',r:[]}];
        const fields={...((n.doc&&n.doc.fields)||{}),...(op.fields&&typeof op.fields==='object'?op.fields:{})};
        n.doc=cleanDoc({blocks,kind,fields});
      }
      const cx=n.x; sizeNode(n); if(fresh||cx==null) place(m,n,op.near);
      if(hex(op.fill)) setStyle(m,n.id,{fill:hex(op.fill)});
      if(fresh) done.added++; else done.changed++; done.fresh.push(n.id); return;
    }
    if(k==='cell'){
      const n=m.nodes.get(op.id); if(!n||n.shape!=='table') return; const t=n.table;
      let r=rowOf(n,op.row); if(r==null&&typeof op.row==='number'&&op.row===t.rows.length) r=op.row; let c=+op.col; if(!Number.isInteger(c)||c<0||c>t.rows[0].length) return; if(r==null||r<0||r>t.rows.length) return;
      if(r===t.rows.length) t.rows.push(Array(t.rows[0].length).fill('')); if(c===t.rows[0].length) t.rows.forEach(x=>x.push(''));
      if(op.text!=null) t.rows[r][c]=String(op.text).replace(/\\n/g,'\n').slice(0,500);
      if(op.color!==undefined){ if(/^[gar]$/.test(op.color)) t.colors[r+','+c]=op.color; else delete t.colors[r+','+c]; }
      sizeNode(n); done.changed++; done.fresh.push(n.id); return;
    }
    if(k==='disconnect'){ const before=m.edges.length; m.edges=m.edges.filter(e=>!((e.from===op.from&&e.to===op.to)||(e.from===op.to&&e.to===op.from))); if(m.edges.length<before) done.removed++; return; }
    if(k==='frame'){
      let id=op.id&&m.groups.has(op.id)?op.id:null;
      if(!id){ const lb=label(op.label||'Frame'); id=cleanId(op.id,lb); if(taken(id)) id=idFrom(lb,taken); m.groups.set(id,{id,label:lb.replace(/\n/g,' '),parent:op.in&&m.groups.has(op.in)?op.in:null,dir:null}); m.groupOrder.push(id); done.added++; done.fresh.push(id); }
      else if(op.label) m.groups.get(id).label=label(op.label).replace(/\n/g,' ');
      for(const it of Array.isArray(op.items)?op.items:[]){ const n=m.nodes.get(it), g=m.groups.get(it); if(n) n.group=id; else if(g&&g.id!==id&&!isDesc(m,id,g.id)) g.parent=id; }
      done.changed++; return;
    }
    if(k==='unframe'){ const g=m.groups.get(op.id); if(!g) return; for(const n of m.nodes.values()) if(n.group===g.id) n.group=g.parent||null; for(const o of m.groups.values()) if(o.parent===g.id) o.parent=g.parent||null;
      m.groups.delete(g.id); m.groupOrder=m.groupOrder.filter(x=>x!==g.id); m.pos.delete(g.id); m.edges=m.edges.filter(e=>e.from!==g.id&&e.to!==g.id); done.changed++; return; }
    if(k==='direction'){
      const raw=String(op.dir||op.direction||'').toUpperCase(); const dir={VERTICAL:'TB',DOWN:'TB',TD:'TB',TB:'TB',UP:'BT',BT:'BT',HORIZONTAL:'LR',RIGHT:'LR',LR:'LR',LEFT:'RL',RL:'RL'}[raw];
      if(!dir) return;
      if(op.in&&m.groups.has(op.in)) m.groups.get(op.in).dir=dir;
      else { const was=m.dir||'TB', vert=d=>d==='TB'||d==='TD'||d==='BT';
        // Pinned connection points turn with the board, so lines still leave the side they flow out of.
        if(vert(was)!==vert(dir)){ const T=vert(dir)?{r:'b',l:'t',t:'l',b:'r'}:{b:'r',t:'l',r:'b',l:'t'}; for(const e of m.edges){ if(e.sa&&e.ra==null) e.sa=T[e.sa]; if(e.sb&&e.rb==null) e.sb=T[e.sb]; } }
        m.dir=dir; for(const g of m.groups.values()) if(!g.dev) g.dir=null; }
      for(const gid of m.groupOrder) if(groupHasMembers(m,gid)&&!m.groups.get(gid).dev) m.pos.delete(gid); autoLayout(m); done.layout=true; done.changed++; return; }
    if(k==='layout'){ for(const gid of m.groupOrder) if(groupHasMembers(m,gid)&&!m.groups.get(gid).dev) m.pos.delete(gid); autoLayout(m); done.layout=true; return; }
  }
  // Show the change on the board without adding an undo step yet.
  function live(){ state.code=serializeMermaid(state.model); reparse(); render(); }

  /* ---------- the conversation ---------- */
  function paint(){
    const list=chat(); let h='';
    if(!list.length){
      if(known&&!sample&&keyMode) h=keyPanel();
      else if(known&&!sample) h='<div class="ai-empty"><b>Claude is not available here</b>Use Export, then Ask an AI, to copy a prompt for any AI chat.</div>';
      else { const blank=!state.model||(!state.model.nodes.size&&!state.model.groups.size);
        // Starters, like Miro's: a short label, a coloured icon, and the full request it fills in.
        const T=blank?[['shapes','#4262ff','Draw a web shop on Azure','Create a simple web shop on Azure: front end, API, database and sign-in'],['phone','#9510ac','Mock up mobile screens','Mock up a login, a product list and a profile screen for mobile'],['table','#0ca789','Compare two products','Compare Crystallize and Optimizely in a table, and link the parts to a diagram'],['ticket','#f24726','Plan a project with tickets','Plan a customer portal: a short spec doc, the database tables and the first tickets']]
          :[['shapes','#4262ff','Expand this board','Expand this with the services it is missing, like monitoring and secrets'],['ticket','#f24726','Plan it out with docs and tickets','Plan this out with a spec doc, the database tables and tickets for the work'],['phone','#9510ac','Mock up the screens','Mock up the screens a user would see, and connect them to the services'],['doc','#0ca789','Explain this board','Explain what this board shows, in a document card']];
        h='<div class="ai-empty"><span class="ai-hi">'+aiSpark()+'</span><b>'+(blank?'What are we building today?':'What should we do with this board?')+'</b><p>Claude builds on the board as it answers. Each request is one undo step.</p><div class="ai-try">'+
          T.map(([ic,c,l,t])=>'<button type="button" data-try="'+esc(t)+'" title="'+esc(t)+'"><span class="ai-ico" style="color:'+c+'">'+ico(ic)+'</span><span>'+esc(l)+'</span></button>').join('')+'</div></div>'; }
    }
    for(const t of list){
      if(t.role==='user') h+='<div class="ai-msg me">'+esc(t.content)+'</div>';
      else if(t.failed) h+='<div class="ai-msg err">'+esc(t.view||'Something went wrong.')+'</div>';
      else { const w=t.work||{}; const chips=[]; if(w.added) chips.push('<i>'+w.added+' added</i>'); if(w.linked) chips.push('<i>'+w.linked+' connected</i>'); if(w.changed) chips.push('<i>'+w.changed+' changed</i>'); if(w.removed) chips.push('<i>'+w.removed+' removed</i>'); if(w.layout) chips.push('<i>laid out</i>');
        h+='<div class="ai-msg bot"><div class="ai-text">'+(t.pending&&!t.view?'<span class="ai-dots"><b></b><b></b><b></b>&nbsp;'+(t.phase||'Thinking')+'</span>':esc(t.view||''))+'</div>'+
          (chips.length||t.undoAt!=null?'<div class="ai-work">'+chips.join('')+(t.undoAt!=null&&!t.pending&&(w.added||w.linked||w.changed||w.removed||w.layout)?'<button type="button" class="ai-undo" data-undo="'+t.undoAt+'">Undo</button>':'')+'</div>':'')+'</div>'; }
    }
    if(showKeys&&keyMode&&sample) h=keyPanel()+h;
    log.innerHTML=h; if(!showKeys) log.scrollTop=log.scrollHeight;
    inp.placeholder=!state.model||(!state.model.nodes.size&&!state.model.groups.size)?'Where shall we start?':'What should change?';
    sendBtn.disabled=busy||(known&&!sample); sendBtn.hidden=busy; inp.disabled=known&&!sample; stopBtn.hidden=!busy;
    const sel=[...state.sel].filter(k=>k[0]==='n'||k[0]==='g').length; selEl.textContent=sel?sel+' selected':'';
  }
  async function send(text){
    text=String(text||'').trim(); if(!text||busy) return;
    if(!sample){ toast(known?'Open orim inside Claude to use this':'Connecting to Claude…'); return; }
    if(!state.model||state.fatal){ toast('Fix the code errors first'); return; }
    flushEditorHist(); histPush(state.code);
    const list=chat(); const turn={role:'assistant',content:'',view:'',pending:true,phase:'Thinking',work:{added:0,linked:0,changed:0,removed:0,layout:false},undoAt:null};
    const req=input(text); list.push({role:'user',content:text}); list.push(turn); inp.value=''; busy=true; paint(); Ghost.start();
    const before=state.code, prevIds=nodeIds(); const done={say:[],added:0,linked:0,changed:0,removed:0,layout:false,fresh:[]};
    let pending='', applied=0;
    const eat=line=>{ line=line.trim().replace(/^```\w*$/,''); if(!line) return; let op; try{ op=JSON.parse(line); }catch(_){ return; }
      try{ apply(op,done); applied++; if(op.op!=='say') live(); }catch(err){ console.error(err); }
      turn.work={added:done.added,linked:done.linked,changed:done.changed,removed:done.removed,layout:done.layout}; turn.view=done.say.join('\n'); turn.phase='Changing the board'; Ghost.phase(op&&op.op==='say'?null:'Changing the board'); paint(); };
    ctl=new AbortController();
    try{
      await sample(req,{ cache:false, signal:ctl.signal, modelTier:deep.checked?'default':'quick',
        onText:({delta})=>{ const parts=(pending+delta).split('\n'); pending=parts.pop(); for(const p of parts) eat(p); } });
      if(pending) eat(pending);
      if(!applied){ turn.view='Claude did not send any changes. Try saying it another way.'; }
    }catch(e){
      if(pending) eat(pending);
      const c=e&&e.code; const msg={cancelled:'Stopped.',not_granted:'Claude is not allowed for this page. You can allow it from the page’s permissions.',rate_limited:'Claude is busy or your usage limit is reached. Try again in a moment.',sampling_disabled:'Claude is not available for this account.',bad_key:'The API key was not accepted. Check it with the key button below.',no_key:'Add an API key first.',overloaded:'Claude is overloaded right now. Try again in a moment.',network:'Could not reach the Claude API. Check your connection.',api_error:'The Claude API returned an error'+(e&&e.message&&e.message!=='api_error'?': '+e.message:'.'),prompt_too_large:'The board is too large to send in one go.',refused:'Claude declined this request.'}[c]||'Claude could not finish. Try again.';
      turn.view=(done.say.join('\n')?done.say.join('\n')+'\n':'')+msg; if(!applied&&c!=='cancelled') turn.failed=true;
      if(c==='not_granted'||c==='sampling_disabled'){ sample=null; }
      if(c==='bad_key'){ showKeys=true; }
    }
    // One undo step for the whole request.
    turn.pending=false; busy=false; ctl=null; Ghost.stop();
    // Whatever Claude added or moved is pushed clear of everything else, so nothing ends up on top of something.
    if(state.code!==before&&state.model&&done.fresh.length&&!done.layout){ const m=state.model; const top=id=>{ let cur=m.nodes.get(id)?m.nodes.get(id).group:id, last=id, k=0; while(cur&&m.groups.has(cur)&&k++<60){ last=cur; cur=m.groups.get(cur).parent; } return last; };
      const mov=new Set(done.fresh.filter(id=>m.nodes.has(id)||m.groups.has(id)).map(top)); try{ if(mov.size&&separateBlocks(m,mov)) live(); }catch(err){ console.error(err); } }
    if(state.code!==before){ histPush(state.code); turn.undoAt=H.i-1; setEditorFromCode(); syncTitle(); saveLocal(); revealNew(prevIds);
      setTimeout(()=>{ for(const id of done.fresh.filter(id=>prevIds.has(id)).slice(-12)){ const el=R.nodeEls.get(id); if(!el) continue; el.classList.remove('flash'); void el.getBoundingClientRect(); el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),1700); } },60); }
    turn.content=turn.view; turn.summary=(turn.view||'')+(done.added||done.linked||done.changed||done.removed?' ['+[done.added&&done.added+' added',done.linked&&done.linked+' connected',done.changed&&done.changed+' changed',done.removed&&done.removed+' removed'].filter(Boolean).join(', ')+']':'');
    paint();
  }
  $('#aiForm').addEventListener('submit',e=>{ e.preventDefault(); send(inp.value); });
  log.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Enter'&&e.target.id==='aiKeyIn'){ e.preventDefault(); $('#aiKeySave').click(); } });
  inp.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(inp.value); } });
  stopBtn.addEventListener('click',()=>{ if(ctl) ctl.abort(); });
  log.addEventListener('click',e=>{
    if(e.target.closest('#aiKeySave')){ const v=$('#aiKeyIn').value.trim(), md=$('#aiModel').value; AIKey.setModel(md);
      if(v){ if(!AIKey.looksValid(v)){ toast('That does not look like a Claude API key (sk-ant-…)'); $('#aiKeyIn').focus(); return; } AIKey.set(v,$('#aiKeyRemember').checked); }
      else if(!AIKey.get()){ toast('Paste your API key first'); $('#aiKeyIn').focus(); return; }
      sample=AIKey.sample; showKeys=false; updKeyBtn(); paint(); toast(v?'Key saved. Claude is ready':'Saved'); setTimeout(()=>inp.focus(),0); return; }
    if(e.target.closest('#aiKeyForget')){ AIKey.clear(); sample=null; showKeys=false; updKeyBtn(); paint(); toast('Key removed from this browser'); return; }
    if(e.target.closest('#aiKeyDone')){ const md=$('#aiModel'); if(md) AIKey.setModel(md.value); showKeys=false; paint(); return; }
    const t=e.target.closest('[data-try]'); if(t){ inp.value=t.dataset.try; inp.focus(); return; }
    const u=e.target.closest('[data-undo]'); if(u&&!busy){ const at=+u.dataset.undo;
      if(H.i===at+1){ undo(); toast('Undone'); for(const t of chat()) if(t.undoAt===at) t.undoAt=null; paint(); }
      else toast('Other changes came after this. Use Ctrl+Z to step back.'); }
  });
  return {
    show(){ paint(); setTimeout(()=>inp.focus(),0); },
    onBoard(){ if(ctl) ctl.abort(); if(state.emode==='ai') paint(); },
    onSel(){ if(state.emode==='ai'&&!busy) paint(); }
  };
})();
