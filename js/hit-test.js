/* orim · hit-test.js
 * Finds the node or frame under a point.
 */
'use strict';
function nodeAt(p,pad=0,exclude){
  const m=state.model; if(!m) return null;
  for(let k=m.nodeOrder.length-1;k>=0;k--){ const n=m.nodes.get(m.nodeOrder[k]); if(!n||(exclude&&exclude.has(n.id))) continue; if(p.x>=n.x-pad&&p.x<=n.x+n.w+pad&&p.y>=n.y-pad&&p.y<=n.y+n.h+pad) return n.id; }
  return null;
}
function isDesc(m,gid,anc){ let p=m.groups.get(gid); let k=0; while(p&&k++<60){ if(p.id===anc) return true; p=p.parent?m.groups.get(p.parent):null; } return false; }
function groupAt(p,excludeNodes,excludeGroup){
  const m=state.model; if(!m) return null;
  const boxes=groupBoxes(m,excludeNodes&&excludeNodes.size?excludeNodes:null);
  let best=null,ba=Infinity;
  for(const [gid,b] of boxes){
    if(excludeGroup&&(gid===excludeGroup||isDesc(m,gid,excludeGroup))) continue;
    if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){ const a=b.w*b.h; if(a<ba){ba=a;best=gid;} }
  }
  return best;
}
