/* orim · ai-key.js
 * Claude with your own Anthropic API key, for copies of orim outside Claude (GitHub Pages, a local file).
 * The key is kept in this browser only and sent only to api.anthropic.com. Answers stream in the same
 * way as inside Claude, so the AI tab works the same: sample(input, {onText, signal, modelTier}).
 */
'use strict';
const AIKey=(()=>{
  const LSK='orim.anthropicKey', LSM='orim.anthropicModel', LSW='orim.anthropicWorkspace', API='https://api.anthropic.com/v1/messages';
  const KEYS_URL='https://platform.claude.com/settings/keys', WS_URL='https://platform.claude.com/settings/workspaces';
  const MODELS=[['claude-sonnet-5-5','Sonnet 5.5','recommended'],['claude-haiku-5-5','Haiku 5.5','fastest, lowest cost'],['claude-opus-5-5','Opus 5.5','most capable']];
  const store=()=>{ try{ return localStorage; }catch(_){ return null; } }, sess=()=>{ try{ return sessionStorage; }catch(_){ return null; } };
  function get(){ try{ return (store()&&store().getItem(LSK))||(sess()&&sess().getItem(LSK))||''; }catch(_){ return ''; } }
  function set(key,remember){ clear(); try{ (remember?store():sess()).setItem(LSK,key); }catch(_){ mem=key; } mem=key; }
  let mem='';
  function key(){ return get()||mem; }
  function clear(){ mem=''; for(const s of [store(),sess()]) try{ if(s){ s.removeItem(LSK); s.removeItem(LSW); } }catch(_){} }
  // Keys that work across workspaces (or are linked to your account) need the workspace to use on each request.
  function workspace(){ try{ return (store()&&store().getItem(LSW))||(sess()&&sess().getItem(LSW))||''; }catch(_){ return ''; } }
  function setWorkspace(id,remember){ for(const s of [store(),sess()]) try{ s&&s.removeItem(LSW); }catch(_){} if(id) try{ (remember?store():sess()).setItem(LSW,id); }catch(_){} }
  const looksWorkspace=w=>/^wrkspc_[A-Za-z0-9]{6,}$/.test(String(w||'').trim());
  function model(){ try{ const m=store()&&store().getItem(LSM); if(MODELS.some(x=>x[0]===m)) return m; }catch(_){} return MODELS[0][0]; }
  function setModel(m){ try{ store()&&store().setItem(LSM,m); }catch(_){} }
  const looksValid=k=>/^sk-ant-[\w-]{20,}$/.test(String(k||'').trim());
  const fail=(code,message)=>Object.assign(new Error(message||code),{code});
  // Stream a Messages API answer, handing each piece of text to onText as it arrives.
  async function sample(input,opt){
    opt=opt||{}; const k=key(); if(!k) throw fail('no_key','Add an API key first');
    const messages=typeof input==='string'?[{role:'user',content:input}]:input;
    const m=opt.modelTier==='default'?'claude-opus-5-5':model();
    const headers={'content-type':'application/json','x-api-key':k,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'}; const ws=workspace(); if(ws) headers['anthropic-workspace-id']=ws;
    let res;
    try{
      res=await fetch(API,{method:'POST',signal:opt.signal,headers,
        body:JSON.stringify({model:m,max_tokens:16000,stream:true,messages})});
    }catch(e){ if(e&&e.name==='AbortError') throw fail('cancelled'); throw fail('network','Could not reach the Claude API'); }
    if(!res.ok){ let j=null; try{ j=await res.json(); }catch(_){} const t=j&&j.error&&j.error.type, msg=j&&j.error&&j.error.message;
      if(/workspace/i.test(msg||'')&&/anthropic-workspace-id|not scoped|workspace id/i.test(msg||'')) throw fail('needs_workspace',msg);
      throw fail(res.status===401||res.status===403?'bad_key':res.status===429?'rate_limited':res.status===529||t==='overloaded_error'?'overloaded':res.status===413||/too long|too large/i.test(msg||'')?'prompt_too_large':'api_error',msg); }
    const reader=res.body.getReader(), dec=new TextDecoder(); let buf='', text='', stop=null;
    try{
      for(;;){ const {value,done}=await reader.read(); if(done) break; buf+=dec.decode(value,{stream:true});
        let i; while((i=buf.indexOf('\n\n'))>=0){ const ev=buf.slice(0,i); buf=buf.slice(i+2);
          const data=ev.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join(''); if(!data) continue;
          let o; try{ o=JSON.parse(data); }catch(_){ continue; }
          if(o.type==='content_block_delta'&&o.delta&&o.delta.type==='text_delta'){ text+=o.delta.text; if(opt.onText) opt.onText({delta:o.delta.text,text}); }
          else if(o.type==='message_delta'&&o.delta) stop=o.delta.stop_reason||stop;
          else if(o.type==='error') throw fail(o.error&&o.error.type==='overloaded_error'?'overloaded':'api_error',o.error&&o.error.message); } }
    }catch(e){ if(e&&e.name==='AbortError') throw fail('cancelled'); throw e.code?e:fail('network','The answer was cut off'); }
    return {text,truncated:stop==='max_tokens'};
  }
  function modelName(){ const x=MODELS.find(q=>q[0]===model()); return x?x[1]:model(); }
  return {get:key,set,clear,model,setModel,modelName,workspace,setWorkspace,looksWorkspace,sample,looksValid,MODELS,KEYS_URL,WS_URL};
})();
