/* orim · icons.js
 * Loads the Azure, Power Platform and Dynamics 365 icon packs, plus the
 * recolourable Generic outline pack (Lucide, ISC).
 */
'use strict';
const Icons={byKey:new Map(),packs:[],ready:false,failed:false};
const PACK_ALIAS={azure:'azure',az:'azure',pp:'pp',power:'pp',powerplatform:'pp','power-platform':'pp',d365:'d365',dynamics:'d365',dynamics365:'d365',gen:'gen',generic:'gen'};
const GEN_INK='#5b6475';
const tintCache=new Map();
/* A Generic icon drawn inline, so a CSS colour such as var(--node-text) follows the theme. */
function iconSvg(ic,x,y,size,color){ const k=size/24, inner=ic.svg.slice(ic.svg.indexOf('>')+1,ic.svg.lastIndexOf('</svg>')).replace(/fill="currentColor"/g,'style="fill:'+color+'"');
  return '<g transform="translate('+(+x).toFixed(1)+','+(+y).toFixed(1)+') scale('+k.toFixed(4)+')" style="fill:none;stroke:'+color+';stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">'+inner+'</g>'; }
/* Picture for an icon in a given colour. Only the Generic pack takes a colour. */
function iconUri(ic,color){
  if(!ic) return '';
  if(!ic.svg||!color) return ic.uri;
  const k=ic.key+'|'+color; let u=tintCache.get(k);
  if(!u){ u='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(ic.svg.replace(/currentColor/g,color)); tintCache.set(k,u); }
  return u;
}
function iconFor(key){
  if(!key) return null;
  let k=String(key).trim().toLowerCase(); const c=k.indexOf(':');
  if(c>0){ const p=PACK_ALIAS[k.slice(0,c)]; if(p) k=p+':'+k.slice(c+1); }
  return Icons.byKey.get(k)||null;
}
async function loadIcons(){
  try{
    let d; const inl=document.getElementById('iconData');
    if(inl) d=JSON.parse(inl.textContent);
    else { const r=await fetch('assets/icons.json'); if(!r.ok) throw new Error('HTTP '+r.status); d=await r.json(); }
    for(const p of d.packs){
      const list=[];
      for(const it of p.icons){
        let title=it.t; if(p.id==='d365'&&title==='Dynamics 365') title='Dynamics 365';
        const icon={key:p.id+':'+it.id,pack:p.id,packTitle:p.title,id:it.id,title,cat:it.c,svg:p.tint?it.s:null};
        icon.uri='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(p.tint?it.s.replace(/currentColor/g,GEN_INK):it.s);
        Icons.byKey.set(icon.key,icon); list.push(icon);
      }
      Icons.packs.push({id:p.id,title:p.title,icons:list});
    }
    Icons.ready=true;
  }catch(err){ Icons.failed=true; }
  renderLibrary(); R.sig.clear(); render();
  if(typeof Boards!=='undefined') Boards.iconsReady();
}
