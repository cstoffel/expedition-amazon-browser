(function(exports){
 'use strict';
 class FatalEvent extends Error {}
 function resolveJungle(e,data,r,stop){
  const f=e.field,messages=[],table=data.encounters.data,stock=data.encounters.equipment;
  const d=i=>table[i-1],say=(...lines)=>messages.push(lines.filter(Boolean));
  const alive=()=>{let p;do{p=r(4)-1;}while(!e.team[p].energy);return p;};
  const hurt=(p,amount,wound=false,fatal=false)=>{
   if(e.cheatMode&&fatal)throw new FatalEvent();
   // 30100 tests L1 for truth, then adds ONE to G(P), not the L1 disease code.
   if(wound)e.team[p].injury++;
   if(!e.cheatMode&&amount&&e.team[p].energy){e.team[p].energy=Math.max(0,e.team[p].energy-amount);if(!e.team[p].energy)say(e.team[p].name+' IS DEAD!');}
  };
  if(f.moves<6)return {messages};
  f.moves=0;if(r(7)<6)return {messages};
  let kind=0;
  if(r(5)===5){kind=r(5);if(kind>4)kind=0;}
  if(kind){
   if(kind===4&&!e.inventory[12]||kind===2&&!e.inventory[10])return {messages};
   say(d(119+kind*3),d(120+kind*3),d(121+kind*3));
   if(kind===1){
    let previous=0,last=0;const count=r(2)+1;
    for(let n=0;n<count;n++){
     let group,t,item;do{group=r(2);t=r(13);item=20*group+t;}while(item===previous||item===last);
     previous=last;last=item;
     if(group===1&&e.inventory[t-1]<4){e.inventory[t-1]++;say(stock[t-1]);}
     else say(d(145+r(38)));
    }
   } else if(kind===2)e.inventory[10]=0;
   else if(kind===3){
    // Original priority chain: one LORAN, all rope, all kits, one radio, then one boat.
    if(e.inventory[7])e.inventory[7]--;
    else if(e.inventory[4])e.inventory[4]=0;
    else if(e.inventory[0])e.inventory[0]=0;
    else if(e.inventory[6])e.inventory[6]--;
    else if(e.inventory[12])e.inventory[12]--;
   } else e.inventory[12]--;
   return {messages};
  }
  let i=r(20);if(i>18)i=2;say(d(35+i));
  const guard=e.team[3];
  if(guard.energy&&guard.level>=5&&i>7&&i<10){say('YOUR GUARD SAW IT,','JUST IN TIME!','NO INJURIES');return {messages};}
  if(guard.energy&&guard.level>6&&i>15&&i<18){say('YOUR GUARD SAW IT,','AND SHOT IT BEFORE ANYONE','COULD BE INJURED');return {messages};}
  const p=alive(),name=e.team[p].name;
  if(i<=2)return {messages,combat:true};
  switch(i){
   case 3:case 6:say(name+' HAS BEEN BITTEN,','AND IS POISONED!');hurt(p,2,true);break;
   case 4:
    if(e.inventory[5]>=p+1){say('NOBODY BITTEN!');break;}
    say(name+' HAS NO MOSQUITO NET, AND','HAS BEEN BITTEN!');
    say(name+' HAS '+(r(2)===2?'YELLOW FEVER':'MALARIA'));hurt(p,1,true);break;
   case 5:
    if(r(25)===5){say(name+' HAS BEEN','CRUSHED AND SWALLOWED!');hurt(p,e.team[p].energy,false,true);}
    else {say(name+' HAS BEEN SQUEEZED','A LITTLE');hurt(p,1);}break;
   case 7:say(name+' HAS LOST','A PINT OF BLOOD!');hurt(p,1);break;
   case 8:case 10:{
    const body=d(64+r(21));say(name+' HAS A','PUNCTURED '+body);hurt(p,2,true);
    // 10860 never assigns the body roll back to I. I remains 8/10, so its I=6 test cannot fire.
    break;
   }
   case 9:
    do{i=r(18);}while(i===5||i===17);
    say(name+' HAS BEEN CAUGHT,','AND HAS A DAMAGED '+d(64+i));hurt(p,i===6?e.team[p].energy:0,true,i===6);break;
   case 11:if(e.inventory[11]){say("A DAY'S SUPPLY OF YOUR FOOD",'HAS BEEN CONTAMINATED!');e.inventory[11]--;}break;
   case 12:say(name+' HAS YELLOW FEVER');hurt(p,1,true);break;
   case 13:say(name+' HAS PLAGUE!');hurt(p,1,true);break;
   case 14:case 15:{const multiple=r(2)===2;say(name+' HAS',multiple?'MULTIPLE STINGS':'MINOR STINGS');hurt(p,multiple?2:1);break;}
   case 16:case 17:say(name+' HAS BEEN BITTEN,','AND HAS RABIES!');hurt(p,1,true);break;
   case 18:{const gored=r(2)===2;say(name+' HAS BEEN',gored?'BADLY GORED!':'BADLY BITTEN!');hurt(p,gored?2:1,true);break;}
  }
  return {messages};
 }
 function jungle(e,data,r,stop){if(!e.cheatMode)return resolveJungle(e,data,r,stop);const team=structuredClone(e.team),inventory=e.inventory.slice();try{const result=resolveJungle(e,data,r,stop);e.inventory=e.inventory.map((value,i)=>Math.max(value,inventory[i]));return result;}catch(error){if(!(error instanceof FatalEvent))throw error;e.team=team;e.inventory=inventory;return {messages:[],skippedFatal:true};}}
 Object.assign(exports,{jungle});
})(typeof module==='object'?module.exports:(globalThis.AmazonEncounters={}));
