(function(exports){
 'use strict';
 class FatalEvent extends Error {}
 function victim(e,r){let p;do{p=r(4)-1;}while(!e.team[p].energy);return p;}
 function hurt(e,p,loss,wound,pages,fatal=false){if(e.cheatMode&&fatal)throw new FatalEvent();if(wound)e.team[p].injury++;if(!e.cheatMode&&e.team[p].energy&&loss){e.team[p].energy=Math.max(0,e.team[p].energy-loss);if(!e.team[p].energy)pages.push([e.team[p].name+' IS DEAD!']);}}
 function resolveRiver(e,data,r){
  const messages=[],d=i=>data.encounters.data[i-1],say=(...s)=>messages.push(s.filter(Boolean));
  if(r(3)<3)return {messages};let i=3;
  if(e.inventory[12]){
   i=r(50);if(i===40){e.inventory[12]--;say("YOU'VE HIT A ROCK,",'AND YOUR BOAT HAS SUNK!',e.inventory[12]?'LUCKY YOU HAVE A SPARE':'');}
   if(e.inventory[12])return {messages};
  }
  i=r(5);const p=victim(e,r),name=e.team[p].name;say(d(i+53));
  if(i<=2){const how=d(58+r(6)),body=d(64+r(21));say(name+' HAS BEEN '+how,'AND HAS SUFFERED',body+' INJURIES!');hurt(e,p,2,true,messages);}
  else if(i===3){say(name+' HAS LOST','A PINT OF BLOOD!');hurt(e,p,1,false,messages);}
  else if(i===4){
   if(r(3)===3){say(name,'HAS '+d(85+r(4)),'AND IS LOST!');hurt(e,p,e.team[p].energy,false,messages,true);}
   else {say(name+' HAS',d(118+r(3)));hurt(e,p,1,true,messages);}
  }else {if(r(4)===4){say(name+' HAS BEEN SUCKED UNDER,',"AND CAN'T BE SAVED.");hurt(e,p,e.team[p].energy,false,messages,true);}else say('NO CASUALTIES');}
  return {messages};
 }
 function resolveHazard(e,tile,r){
  const messages=[],p=victim(e,r),name=e.team[p].name;
  if(tile===20){messages.push(['A PIT OF VIPERS!',name+' IS POISONED!']);hurt(e,p,1,true,messages);}
  else if(tile===18){messages.push(['A VOLCANIC BORE HOLE!!',name+' HAS FALLEN IN,','AND IS BURNED TO A CRISP!']);hurt(e,p,e.team[p].energy,false,messages,true);}
  else {
   const lines=['A DEEP SACRIFICIAL WELL!',name+' HAS SLIPPED IN'];
   if(!e.inventory[4]){lines.push('AND YOU HAVE NO ROPE!');messages.push(lines);hurt(e,p,e.team[p].energy,false,messages,true);}
   else if(r(3)===3){e.inventory[4]--;lines.push('AND YOUR ROPE BREAKS!');messages.push(lines);hurt(e,p,e.team[p].energy,false,messages,true);}
   else {messages.push(lines,[name+' IS SAVED!']);}
  }
  return {messages};
 }
 function find(e,data,r){
  const items=e.artifacts||(e.artifacts=Array(10).fill('')),how=r(4);if(how>2&&!e.inventory[1]||!items.some(s=>!s))return {messages:[]};
  const type=data.encounters.data[r(23)+3],silver=r(2)===2,material=type==='CRUDE CRYSTAL'?'':silver?'SILVER':'CLAY',item=material+' '+type;
  items[items.findIndex(s=>!s)]=item;e.field.map[Math.floor(e.field.x/2)+18*(e.field.y/12-1)]=102;
  return {messages:[['A FIND!!'],["YOU'VE "+data.encounters.data[how-1],'A '+item]]};
 }
 function hits(e,shots,r){const c=e.field.combat,minimum=Math.min(shots,Math.floor(e.team[c.member].level*.05*shots+2/e.difficulty));return Math.min(c.foes,Math.max(r(shots),minimum));}
 function enemy(e,data,r){
  const c=e.field.combat,messages=[];c.stage=Math.min(3,c.stage+1);
  messages.push(['NATIVES: '+(c.ambush&&c.stage<3?'?':c.foes),'ACTION: '+['','SHOOTING ARROWS','THROWING SPEARS','KNIFE ATTACK'][c.stage]]);
  const count=Math.min(4,c.foes);
  if(c.stage<3){
   let injuries=0;let limit=Math.trunc(4/count-c.foes/20);limit=Number(limit+limit<0); // Original F%=F%+F%<0 evaluates to a boolean.
   for(let i=0;i<count;i++){
    if(r(limit)!==1)continue;const p=victim(e,r);if(c.defended[p])continue;
    injuries++;messages.push([e.team[p].name+' HAS BEEN HIT!']);hurt(e,p,2,e.team[p].energy>2,messages);
    if(e.team.every(m=>!m.energy))break;
   }
   if(!injuries)messages.push(['NO INJURIES']);
  }else for(let i=0;i<count;i++){
   const p=victim(e,r),text=data.encounters.data[89+r(16)-1];messages.push([e.team[p].name+' HAS BEEN',text+(e.team[p].energy>1?'   EL:'+(e.team[p].energy-1):'')]);hurt(e,p,1,false,messages);if(e.team.every(m=>!m.energy))break;
  }
  c.defended.fill(false);c.member=0;c.phase='action';while(c.member<4&&!e.team[c.member].energy)c.member++;
  return {messages};
 }
 function win(e,data,r){
  const c=e.field.combat,messages=[['THE NATIVES ARE DEFEATED!']];e.field.battles=(e.field.battles||0)+1;if(e.field.battles===(e.field.sector>10?5:3)){e.field.battles=0;e.team.forEach(m=>m.level++);}
  let item;do{item=r(11);}while(item===8);const reward=r(6);let text=data.encounters.equipment[item-1];if(text==='BULLETS')text='CLIP OF BULLETS';if(text==='TOOLS')text='SET OF TOOLS';
  if(reward>2&&e.field.sector>10){
   e.clues||=Array(18).fill(true);const index=e.clues.slice(0,17).findIndex(Boolean);
   if(index>=0){const scraps=['1 IS 3','YANKEE GO HOME','2 IS 4','3 IS 2','LEFT IS MORE FROM 4 OVER 4','5 OVER 4 EVERY VERSE WILL WIN','A BATH IS NICE, BUT TWICE?',"CHE' NO MORE",'SUCCESS BEGINS AT THE BOTTOM','4 IS 4','SHE RECOMMENDS THE WATER','13 IS A MOVING NUMBER','5 IS 2',"LEAVE ALIVE-DON'T CLIMB FROM 35",'6 IS 3','SEQUENCE IN PAIRS TO FIND THE PATH','HAMMER? STEP LIGHT-AT END STEP RIGHT'];
    messages.push(['THE NATIVES ARE CARRYING A SCRAP','OF PARCHMENT. IT READS',e.incan?scraps[index]:'>!!<?* #**<<! FRNK-FRNK --..//?']);if(e.incan)e.clues[index]=false;e.field.defended=c.defended.slice();delete e.field.combat;return {messages};}
  }
  if(r(2)===1)text=data.encounters.data[145+r(38)-1];else e.inventory[item-1]+=item===10?20:1;
  messages.push(['THE NATIVES WERE CARRYING','A '+text]);e.field.defended=c.defended.slice();delete e.field.combat;return {messages};
 }
 function start(e,data,r){
  e.field.combat={foes:r(20)+2,stage:0,member:0,ambush:false,defended:(e.field.defended||[false,false,false,false]).slice(),phase:'action'};
  if(r(3)===3){e.field.combat.ambush=true;return {messages:[["IT'S AN AMBUSH!"],...enemy(e,data,r).messages]};}
  while(e.field.combat.member<4&&!e.team[e.field.combat.member].energy)e.field.combat.member++;
  return {messages:[]};
 }
 function turn(e,data,key,quantity,r,stop){
  const c=e.field.combat,messages=[],say=(...s)=>messages.push(s),member=e.team[c.member];
  if(key==='R'){stop('RETREAT TO ANOTHER SECTOR IS NOT YET PORTED.');return;}
  if(!['P','A','K','G','D'].includes(key))return {messages,consumed:false};
  if(key==='D'){c.defended[c.member]=true;return {messages,consumed:true};}
  if(key==='P'||key==='A'){
   if(key==='A'&&(!e.inventory[8]||c.member!==3)){say("YOU DON'T HAVE ONE");return {messages,consumed:true};}
   if(!e.inventory[9]){say('OUT OF AMMUNITION');return {messages,consumed:true};}
   if(quantity===undefined)return {messages,quantity:true,consumed:false};
   if(!Number.isInteger(quantity)||quantity<1||quantity>9)return {messages,consumed:true};
   const shots=Math.min(e.inventory[9],key==='P'?Math.min(quantity,6):quantity*20);if(!e.cheatMode)e.inventory[9]-=shots;const killed=hits(e,shots,r);c.foes-=killed;say('SHOTS:'+shots+'    HITS:'+killed);
  }else if(key==='K'){
   const killed=c.stage===3?hits(e,2,r):0;c.foes-=killed;say(killed+' KILLED');
  }else if(key==='G'){
   if(!e.inventory[10]){say("YOU DON'T HAVE ONE");return {messages,consumed:true};}
   if(!e.cheatMode)e.inventory[10]--;const killed=hits(e,10,r);c.foes-=killed;
   if(c.stage>2){const p=victim(e,r);if(e.cheatMode)say(killed+' KILLED');else{say(killed+' KILLED '+e.team[p].name+' ALSO KILLED!');hurt(e,p,e.team[p].energy,false,messages,true);}}else say(killed+' KILLED');
  }
  return {messages,consumed:true};
 }
 function key(e,data,k,r,stop){
  const c=e.field.combat;let result;
  if(c.phase==='quantity'){
   const action=c.action;c.phase='action';delete c.action;result=turn(e,data,action,/^[1-9]$/.test(k)?Number(k):0,r,stop);
  }else result=turn(e,data,k,undefined,r,stop);
  if(result.quantity){c.phase='quantity';c.action=k;return result;}
  if(!result.consumed)return result;
  if(e.team.every(m=>!m.energy))return result;
  if(!c.foes){result.messages.push(...win(e,data,r).messages);return result;}
  c.member++;while(c.member<4&&!e.team[c.member].energy)c.member++;
  if(c.member===4){
   if(!c.foes)result.messages.push(...win(e,data,r).messages);
   else result.messages.push(...enemy(e,data,r).messages);
  }
  return result;
 }
 function event(e,fn){if(!e.cheatMode)return fn();const team=structuredClone(e.team),inventory=e.inventory.slice();try{const result=fn();e.inventory=e.inventory.map((value,i)=>Math.max(value,inventory[i]));return result;}catch(error){if(!(error instanceof FatalEvent))throw error;e.team=team;e.inventory=inventory;return {messages:[],skippedFatal:true};}}
 function river(e,data,r){return event(e,()=>resolveRiver(e,data,r));}
 function hazard(e,tile,r){return event(e,()=>resolveHazard(e,tile,r));}
 Object.assign(exports,{river,hazard,find,hits,enemy,win,start,turn,key});
})(typeof module==='object'?module.exports:(globalThis.AmazonOutdoor={}));
