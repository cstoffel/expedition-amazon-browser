(function(e){
 'use strict';const node=typeof module==='object',D=node?require('./maze-phase-data.js'):MAZE_PHASE_DATA;
 const actorKey=(actors,pulse=false)=>JSON.stringify(actors.map((a,i)=>{const type=pulse&&i===2?3:a.type;return [type,a.sequence,...(type<128&&a.sequence<128?[a.pointer,a.x,a.phase,a.y]:[])];}));
 const hallKey=s=>JSON.stringify([...['channel','view','direction','target','x','y','prior','mechanism','enterQueued'].map(k=>s[k]),actorKey(s.actors)]);
 function frames(initial,pages,profile,{tail=0,sounds=[]}={}){
  if(!profile||profile.times.length!==pages.length)return null;
  const points=[{at:0,page:initial}];for(let i=0;i<pages.length;i++)points.push({at:profile.times[i],page:pages[i]});
  for(const at of sounds){let page=initial;for(let i=0;i<profile.times.length&&profile.times[i]<=at;i++)page=pages[i];points.push({at,page,sound:true});}
  points.sort((a,b)=>a.at-b.at||Number(!!a.sound)-Number(!!b.sound));const out=[];
  for(let i=0;i<points.length;i++){const p=points[i],until=i+1<points.length?points[i+1].at:profile.total+tail;if(until>p.at)out.push({page:p.page,cycles:until-p.at,sound:!!p.sound});}
  return out;
 }
 function animation(s,initial,pages,pulse){const p=D.animations[(pulse?'p:':'a:')+actorKey(s.actors,pulse)];const kind=pulse?'pulse':'ordinary',bits=s.loops?Math.floor(Math.log2(s.loops))+1:0;return frames(initial,pages,p,{tail:D.overheadClasses[kind+':'+s.channel+':'+bits]??D.overhead[kind]});}
 function hall(s,initial,pages){return frames(initial,pages,D.halls[hallKey(s)]);}
 function collision(s,initial,pages,wait){const a=s.actors[2],p=D.collisions[s.viewChannel+':'+a.x+':'+a.phase];return frames(initial,pages,p,{tail:wait,sounds:p?.sounds.filter((v,i)=>i%2===0)||[]});}
 function scene(s){const target=s.x+s.y,ch=(s.direction%2===1)===(s.view===1)?1:2;return D.scenes[ch+':'+(target===13?'event':target%2===0?'even':'odd')]||0;}
 function health(s,initial,pages){return frames(initial,pages,D.hud.health[s.health]);}
 function coordinates(s,initial,pages){return frames(initial,pages,D.hud.coordinates[[s.x,s.y,s.target,s.viewChannel].join(':')]);}
 const lead=p=>D.messages?.[p.kind]?.[p.index]?.lead||0,wait=p=>D.messages?.[p.kind]?.[p.index]?.waitCycles||0;
 Object.assign(e,{lead,wait,actorKey,hallKey,frames,animation,hall,collision,health,coordinates,scene});
})(typeof module==='object'?module.exports:(globalThis.AmazonMazePacing={}));
