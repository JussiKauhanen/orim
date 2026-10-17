/* orim · templates.js
 * Templates menu and file import.
 */
'use strict';
$('#tplMenu').innerHTML='<button type="button" data-quick="1"><b>Paste text to board</b><small>Arrows, lists and basic D2 become a board</small></button><hr>'+TEMPLATES.map((t,i)=>(t.id==='blank'?'<hr>':'')+'<button type="button" data-tpl="'+i+'"><b>'+esc(t.name)+'</b><small>'+esc(t.desc)+'</small></button>').join('');
$('#tplMenu').addEventListener('click',e=>{ if(e.target.closest('[data-quick]')){ closeMenus(); openQuickText(); return; } const b=e.target.closest('[data-tpl]'); if(!b) return; closeMenus(); flushEditorHist(); state.sel.clear(); loadCode(TEMPLATES[+b.dataset.tpl].code,{clearCache:true}); requestAnimationFrame(fit); toast('Loaded "'+TEMPLATES[+b.dataset.tpl].name+'". Undo brings back your previous board.'); });
$('#importBtn').addEventListener('click',()=>$('#fileIn').click());
$('#imgIn').addEventListener('change',e=>{ const f=e.target.files; if(f&&f.length) addImageFiles([...f],null); e.target.value=''; });
$('#fileIn').addEventListener('change',async e=>{
  const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return;
  const text=await f.text();
  if(Boards.isHome()) Boards.openNew('flowchart LR\n','Untitled board');
  if(/\.json$/i.test(f.name)){ try{ const j=JSON.parse(text); if(typeof j.code==='string'){ if(j.images&&typeof j.images==='object') for(const [k,v] of Object.entries(j.images)) if(typeof v==='string'&&v.startsWith('data:image/')) IMG[k]=v; importText(j.code,f.name); return; } }catch(_){} toast('That JSON file is not a board file from this editor'); return; }
  importText(text,f.name);
});
function importText(text,name){
  let code=text; const fence=/```mermaid\s*\n([\s\S]*?)```/.exec(text); if(fence) code=fence[1];
  if(!/(^|\n)\s*(flowchart|graph)\b/.test(code)){ toast('No flowchart found in '+name); return; }
  flushEditorHist(); state.sel.clear(); loadCode(code.replace(/\s+$/,'')+'\n',{clearCache:true}); requestAnimationFrame(fit); toast('Imported '+name);
}
