(function(exports){
 'use strict';
 const Encounters=typeof module==='object'?require('./encounters.js'):AmazonEncounters;
 const Outdoor=typeof module==='object'?require('./outdoor.js'):AmazonOutdoor;
 const Random=typeof module==='object'?require('./random.js'):AmazonRandom;
 const World=typeof module==='object'?require('./world.js'):AmazonWorld;
 const Traps=typeof module==='object'?require('./traps.js'):AmazonTraps;
 const G=typeof module==='object'?require('./graphics.js'):AmazonGraphics;
 const bytes=s=>Uint8Array.from(typeof Buffer==='function'?Buffer.from(s,'base64'):atob(s),v=>typeof v==='number'?v:v.charCodeAt(0));
 class Boundary extends Error {}
 function fraction(f,data){try{return Random.fraction(f,data);}catch(error){if(error instanceof Random.RandomError)throw new Boundary(error.message);throw error;}}
 function random(f,data,n){return Math.floor(fraction(f,data)*n)+1;}
 function validate(f){
  if(!f||f.version!==1||(!Number.isInteger(f.sector)||f.sector<1||f.sector>255)||!['camp','jungle'].includes(f.mode)||!Array.isArray(f.map)||f.map.length!==235||f.map.some(v=>!Number.isInteger(v)||v<0||v>255))throw new Error('Invalid field save');
  if(!Number.isInteger(f.x)||f.x<1||f.x>35||f.x%2!==1||!Number.isInteger(f.y)||f.y<12||f.y>156||f.y%12)throw new Error('Invalid field position');
  for(const k of ['ticks','hours','days','meters','sectorMeters','moves','rng','maps'])if(!Number.isSafeInteger(f[k])||f[k]<0)throw new Error('Invalid field counters');
  if(f.map.slice(0,234).some(v=>terrain(v)>42)||f.ticks>40||f.hours>23||typeof f.mapped!=='boolean')throw new Error('Invalid field clock');
  if(f.battles!==undefined&&(!Number.isInteger(f.battles)||f.battles<0||f.battles>4))throw new Error('Invalid battle counter');
  if(f.defended!==undefined&&(!Array.isArray(f.defended)||f.defended.length!==4||f.defended.some(v=>typeof v!=='boolean')))throw new Error('Invalid defense flags');
  if(f.stairs!==undefined&&![3,4].includes(f.stairs))throw new Error('Invalid stairs save');
  if(f.combat){const c=f.combat;if(!Number.isInteger(c.foes)||c.foes<1||c.foes>22||!Number.isInteger(c.stage)||c.stage<0||c.stage>3||!Number.isInteger(c.member)||c.member<0||c.member>3||!['action','quantity'].includes(c.phase)||!Array.isArray(c.defended)||c.defended.length!==4||c.defended.some(v=>typeof v!=='boolean')||typeof c.ambush!=='boolean'||c.phase==='quantity'&&!['P','A'].includes(c.action))throw new Error('Invalid combat save');}
  if(f.mappedSectors!==undefined&&(!Array.isArray(f.mappedSectors)||f.mappedSectors.some(v=>!Number.isInteger(v)||v<1||v>255)))throw new Error('Invalid mapped sectors');
  if(f.maze){const z=f.maze;if(!['intro','running'].includes(z.stage)||!Number.isInteger(z.victim)||z.victim<0||z.victim>3||!Number.isInteger(z.energy)||z.energy<1||z.energy>255||!Number.isInteger(z.ammo)||z.ammo<0||z.ammo>255||!['A','B'].includes(z.slot))throw new Error('Invalid maze state');if(z.snapshot){const NativeSave=typeof module==='object'?require('./maze-native-save.js'):globalThis.AmazonNativeMazeSave;if(!NativeSave)throw new Error('Native maze save support unavailable');NativeSave.validate(z.snapshot);}}
  if(f.crypt!==undefined&&f.crypt!==true)throw new Error('Invalid crypt');
  Traps.validate(f.trapDrawing);
  if(f.trapRaster!==undefined&&(typeof f.trapRaster!=='string'||bytes(f.trapRaster).length!==8192||typeof f.trapRasterKey!=='string'))throw new Error('Invalid trap raster');
  Random.validate(f);
  return f;
 }
 const square=f=>Math.floor(f.x/2)+18*(f.y/12-1); // zero-based BASIC B-1
 const terrain=v=>v>100?v-100:v;
 function damage(e,i,amount){if(!e.cheatMode&&e.team[i].energy)e.team[i].energy=Math.max(0,e.team[i].energy-amount);}
 function clock(e,data){
  const f=e.field,notes=[];f.ticks++;
  if(f.ticks>40){f.ticks=0;f.hours++;
   if(f.hours>23){if(f.sector>10&&e.inventory[3]&&!e.cheatMode)e.inventory[3]--;if(f.sector>10&&!e.inventory[3])notes.push('OUT OF BATTERIES');f.hours=0;f.days++;
    for(let i=0;i<4;i++)damage(e,i,e.team[i].injury);
    if(e.inventory[11]&&!e.cheatMode)e.inventory[11]--;
    if(!e.inventory[11]){for(let i=0;i<4;i++)damage(e,i,random(f,data,5));notes.push("A DAY HAS PASSED, AND","YOU'RE OUT OF FOOD.",'EVERYONE GROWS WEAKER!');}
    else notes.push('A DAY HAS PASSED');
   }
  }
  return notes;
 }
 function visit(f){const i=square(f),v=f.map[i];if(v<43){f.sectorMeters++;f.meters++;f.map[i]=v+100;}}
 function begin(e,data){
  const prior=e.field||e.randomState;
  const f={version:1,sector:6,x:19,y:108,map:data.sector.slice(),ticks:prior?.ticks||0,hours:prior?.hours||0,days:prior?.days||0,meters:prior?.meters||0,sectorMeters:0,moves:0,rng:prior?.rng||0,maps:prior?.maps||0,mapped:(prior?.mappedSectors||[...(prior?.mapped?[6]:[])]).includes(6),battles:prior?.battles||0,defended:(prior?.defended||[false,false,false,false]).slice(),mode:'jungle',...Random.copyState(prior),mappedSectors:(prior?.mappedSectors||[...(prior?.mapped?[6]:[])]).slice()};
  const copy=JSON.parse(JSON.stringify(e));copy.field=f;delete copy.randomState;
  const count=random(f,data,5)+1;
  for(let i=0;i<count;i++){let at;do {at=random(f,data,234)-1;}while(f.map[at]!==2);f.map[at]=42;}
  if(f.mapped)for(let i=0;i<234;i++)f.map[i]+=100;
  visit(f);const notes=clock(copy,data);Object.assign(e,copy);delete e.randomState;return {ok:true,notes};
 }
 function move(e,data,key){
  const copy=JSON.parse(JSON.stringify(e)),f=copy.field;validate(f);
  if(e.team.every(m=>!m.energy))return {ok:true,dead:true,notes:[]};
  const shifts={I:[0,-12],M:[0,12],J:[-2,0],K:[2,0]};let notes=[],messages=[],blocked=false;
  try{
   if('IJKLM'.includes(key)&&key.length===1){
    f.moves++;
    if(shifts[key]){
     const [dx,dy]=shifts[key],x=f.x+dx,y=f.y+dy;
     if(x<1||x>35||y<12||y>156){
      const edge=World.edge(f,key);if(!edge){notes=clock(copy,data);Object.assign(e,copy);return {ok:true,blocked:true,notes};}
      messages.push(...World.leave(copy,n=>random(f,data,n)));World.load(copy,edge.sector,n=>random(f,data,n));f.x=edge.x;f.y=edge.y;
      const result=arrive(copy,data,messages,key);Object.assign(e,copy);return result;
     }
     if(!World.connected(f,key)){notes=clock(copy,data);Object.assign(e,copy);return {ok:true,blocked:true,notes};}
     const i=Math.floor(x/2)+18*(y/12-1),tile=terrain(f.map[i]);
     if(tile>=34&&tile!==42){if(f.map[i]<100)f.map[i]+=100;blocked=true;}
     else {
      const oldX=f.x,oldY=f.y;f.x=x;f.y=y;
      const result=arrive(copy,data,[],key,false);
      if(tile===19&&key==='I'){f.x=oldX;f.y=oldY;}
      Object.assign(e,copy);return result;
     }
    }
   }
   if(copy.team.every(m=>!m.energy))delete f.combat;
   else if(!f.combat&&!f.stairs&&!f.crypt&&!f.fountain&&!f.maze)notes=clock(copy,data);Object.assign(e,copy);
   return {ok:true,blocked,notes,messages,dead:e.team.every(m=>m.energy===0)};
  }catch(error){if(error instanceof Boundary)return {ok:false,boundary:error.message};throw error;}
 }
 function leaveStairs(e,data){
  const copy=JSON.parse(JSON.stringify(e));delete copy.field.stairs;
  try{const notes=clock(copy,data);Object.assign(e,copy);return {ok:true,notes,dead:e.team.every(m=>!m.energy)};}catch(error){if(error instanceof Boundary)return {ok:false,boundary:error.message};throw error;}
 }
 function fight(e,data,k){
  const copy=JSON.parse(JSON.stringify(e));validate(copy.field);
  try{
   if(k==='R'&&copy.field.combat.phase==='action'){const result=retreat(copy,data);Object.assign(e,copy);return result;}
   const result=Outdoor.key(copy,data,k,n=>random(copy.field,data,n),reason=>{throw new Boundary(reason);});
   let notes=[];
   if(copy.team.every(m=>!m.energy))delete copy.field.combat;
   else if(!copy.field.combat)notes=clock(copy,data);
   Object.assign(e,copy);return {ok:true,messages:result.messages||[],notes,dead:e.team.every(m=>!m.energy)};
  }catch(error){if(error instanceof Boundary)return {ok:false,boundary:error.message};throw error;}
 }
 function camp(e,data){
  const copy=JSON.parse(JSON.stringify(e)),f=copy.field;
  if(f.sector!==6||square(f)!==153)throw new Error('Not at base camp');
  try{const messages=World.leave(copy,n=>random(f,data,n));f.mapped=(f.mappedSectors||[]).includes(6);f.mode='camp';Object.assign(e,copy);return {ok:true,notes:messages.flat()};}catch(error){if(error instanceof Boundary)return {ok:false,boundary:error.message};throw error;}
 }
 function passage(e,data){
  const f=e.field,r=n=>random(f,data,n),messages=[],i=r(30);if(i<9||f.sector<11||f.sector>30||f.moves<26)return {messages};f.moves=0;
  if(i<12){if(e.inventory[2]&&e.inventory[3]){if(!e.cheatMode)e.inventory[2]--;messages.push(['SOMETHING LEAPS FROM THE DARK, AND','DASHES YOUR LAMP TO THE FLOOR!',e.inventory[2]?'LUCKILY YOU HAVE A SPARE!':"THERE'S NO SPARE!!"]);}return {messages};}
  messages.push([f.sector>20?'CROCODILE CULT PRIESTS!':'JAGUAR CULT PRIESTS!']);return {messages,combat:true};
 }
 function lava(e,data){const f=e.field,messages=[['HOT LAVA!']];if(f.y>108){for(let i=0;i<4;i++)damage(e,i,8);}else {const p=Outdoor.victim?Outdoor.victim(e,n=>random(f,data,n)):(()=>{let p;do{p=random(f,data,4)-1;}while(!e.team[p].energy);return p;})();if(e.cheatMode)return [];messages.push([e.team[p].name+' HAS SLIPPED IN!']);damage(e,p,e.team[p].energy);}return messages;}
 function illusion(e,data,key,skipFountain=false){
  const f=e.field,messages=[];
  if(!skipFountain&&f.sector===36&&square(f)===159){f.fountain=true;return messages;}
  if(square(f)===184){if(e.inventory[1])f.stairs=4;else messages.push(["YOU'VE FOUND THE BOTTOM OF",'SOME STAIRS UP, BUT YOU HAVE','NO TOOLS TO DIG WITH']);return messages;}
  const choices={I:[6,7,8,9,11,14,15],M:[6,7,8,9,10,12,13],J:[5,7,9,10,11,13,15],K:[5,7,8,10,11,12,14]};f.map[square(f)]=(choices[key]||choices.I)[random(f,data,7)-1];return messages;
 }
 function arrive(e,data,messages=[],key='I',entered=true){
  const f=e.field,tile=terrain(f.map[square(f)]),r=n=>random(f,data,n);visit(f);
  if(f.sector>30&&f.sector!==43){if(entered)messages.push(['THE HEAT AT THIS DEPTH MAY CAUSE','HALLUCINATIONS']);messages.push(...illusion(e,data,key));}
  else if(f.system>1&&tile>=5&&tile<=15||[3,4].includes(f.system)&&tile===27){}
  else if(tile===2){const result=Encounters.jungle(e,data,r,why=>{throw new Boundary(why);});messages.push(...result.messages);if(result.combat)messages.push(...Outdoor.start(e,data,r).messages);}
  else if(tile>=5&&tile<=15){const result=passage(e,data);messages.push(...result.messages);if(result.combat)messages.push(...Outdoor.start(e,data,r).messages);}
  else if(tile===3||tile===4){if(e.inventory[1])f.stairs=tile;else messages.push([tile===3?"YOU'VE DISCOVERED THE TOP OF":"YOU'VE FOUND THE BOTTOM OF",'SOME STAIRS, BUT YOU HAVE NO','TOOLS FOR EXCAVATION']);}
  else if([1,21,22,23,24].includes(tile))messages.push(...(f.sector<11?Outdoor.river(e,data,r).messages:lava(e,data)));
  else if([18,20,26].includes(tile))messages.push(...Outdoor.hazard(e,tile,r).messages);
  else if(tile===16){messages.push(["YOU'VE TRIPPED A MECHANISM!",'THE STONE DROPS FROM BENEATH YOUR','FEET, AND YOU FALL INTO DARKNESS!']);messages.push(...World.leave(e,r));World.load(e,f.sector+10,r);return arrive(e,data,messages,key);}
  else if(tile===17&&!e.cheatMode){f.system=3;f.flood=156;delete f.trapDrawing;delete f.trapRaster;delete f.trapRasterKey;messages.push(['THE FLOOR MOVES BENEATH YOUR FEET!',"YOU'VE TRIPPED A MECHANISM,",'AND YOU HEAR THE ROAR OF WATER!']);}
  else if(tile===19&&key==='I')messages.push(['THE HALL IS BLOCKED']);
  else if(tile===27){if(e.inventory[1])f.crypt=true;else messages.push(['A CRYPT!','YOU NEED TOOLS TO OPEN IT.']);}
  else if(tile===28){f.system=4;delete f.trapDrawing;delete f.trapRaster;delete f.trapRasterKey;f.lavaX=6.95;f.lavaY=3.9;messages.push(['VOLCANIC ERUPTION!!']);}
  else if(tile===29&&!f.mosaic){f.mosaic=true;messages.push(['A MOSAIC ON THE FLOOR READS',"'II I'"]);}
  else if(tile===42)messages.push(...Outdoor.find(e,data,r).messages);
  if(e.team.every(m=>!m.energy)){delete f.combat;delete f.stairs;}
  const notes=e.team.every(m=>!m.energy)||f.combat||f.stairs||f.crypt||f.fountain||f.maze?[]:clock(e,data);return {ok:true,messages,notes,dead:e.team.every(m=>!m.energy)};
 }
 function retreat(e,data){
  const f=e.field,messages=World.leave(e,n=>random(f,data,n)),sector=random(f,data,30),src=World.data.sectors[sector];
  // Original 13260 is malformed. A solid landing raises SYNTAX ERROR; do not invent a replacement scan.
  if(src[square(f)]>=30)throw new Boundary('ORIGINAL RETREAT HITS SYNTAX ERROR AT 13260.');
  delete f.combat;World.load(e,sector,n=>random(f,data,n));return arrive(e,data,messages);
 }
 function stairs(e,data,key){
  const copy=JSON.parse(JSON.stringify(e)),f=copy.field;
  try{
   if(key==='L')return leaveStairs(e,data);
   if(key!==(f.stairs===3?'D':'U'))return {ok:true};
   let sector=f.stairs===3?f.sector+10:f.sector-10-10*Number(f.sector===33);
   const messages=World.leave(copy,n=>random(f,data,n));delete f.stairs;
   if(f.sector===23&&key==='D'){
    sector=43;messages.push(["HEY! IT'S A SLIDE!",'WHEEE---']);World.load(copy,43,n=>random(f,data,n));if(!copy.cheatMode)for(const i of [4,5,6,8,10,11,12])copy.inventory[i]=0;messages.push(['DANGER!! EXTREME TEMPERATURE!!','YOUR EQUIPMENT IS BURNING!!']);f.mapped=false;f.map=World.data.sectors[43].slice();f.map.push(0);const notes=clock(copy,data);Object.assign(e,copy);return {ok:true,messages,notes,dead:e.team.every(m=>!m.energy)};
   }else World.load(copy,sector,n=>random(f,data,n));
   const result=arrive(copy,data,messages);Object.assign(e,copy);return result;
  }catch(error){if(error instanceof Boundary)return {ok:false,boundary:error.message};throw error;}
 }
 function crypt(e,data,key){
  if(key==='L'){delete e.field.crypt;return leaveStairs(e,data);}if(key!=='O')return {ok:true};
  const copy=JSON.parse(JSON.stringify(e)),f=copy.field,r=n=>random(f,data,n),messages=[];delete f.crypt;
  try{
   let roll=r(9);if(roll===3&&r(4)<3)roll=1;
   if(roll===1||roll===4){messages.push(['A THICK GREEN GAS FILLS THE CRYPT!','THE CREW FALLS ASLEEP,','AWAKENING MUCH WEAKENED.']);for(let i=0;i<4;i++)damage(copy,i,3);}
   else if(roll===2){messages.push(['A THIN YELLOW GAS FILLS THE CRYPT.','THE CREW HALLUCINATES, AND','STUMBLES BLINDLY THRU THE HALLS!']);const result=retreat(copy,data);messages.push(...result.messages);Object.assign(e,copy);return {...result,messages};}
   else if(roll===3){let p;do{p=r(4)-1;}while(!copy.team[p].energy);if(copy.cheatMode){const notes=clock(copy,data);Object.assign(e,copy);return {ok:true,messages:[],notes};}messages.push(['A FLOURESCENT RED GAS','FILLS THE ROOM!','MADNESS ERUPTS!'],[copy.team[p].name+' RUNS TO A WELL','AND LEAPS IN!']);damage(copy,p,copy.team[p].energy);}
   else {
    copy.crypts||=World.data.initialCrypts.slice();copy.clues||=Array(18).fill(true);if(copy.incan===undefined)copy.incan=false;
    const index=2*f.sector-22+Number(f.x>15),g=copy.crypts[index];if(g===2)copy.crypts[index]=1;
    if(g>3&&!copy.incan)messages.push(['THERE ARE CRYPTOGRAPHS ON THE','WALL, BUT YOU CAN\'T READ THEM.']);
    else if(g===1)messages.push(['THIS CRYPT HAS BEEN ROBBED','BY VANDALS.  THERE IS NOTHING HERE.']);
    else if(g===2){const type=data.encounters.data[r(31)+3],material=r(2)===2?'DIAMOND':'GOLD',item=type==='CRUDE CRYSTAL'?type:material+' '+type;copy.artifacts||=Array(10).fill('');const slot=copy.artifacts.findIndex(v=>!v);if(slot>=0)copy.artifacts[slot]=item;messages.push(["YOU'VE DISCOVERED",'A '+item]);}
    else if(g===3){copy.incan=true;messages.push(['THE MUMMY HOLDS A CLAY TABLET','TRANSLATING INCAN CRYPTOGRAPHS INTO','SPANISH. YOU CAN NOW READ INCAN.']);}
    else {const texts=["SUCCESS BEGINS WHEN ONE AND ONE HALF","ALL STAIRS BEGIN THE SAME","ALL WALLS HAVE PORTALS","BEWARE THE SECOND TEMPTATION!","THE OLD ONES ARE FOUND WHEN","SEEK THE FOUNTAIN BEFORE THE DOOR","TRAVEL FROM 4 TO 5 BUT RETURN TO KA"],second=['EQUALS ONE AND ONE HALF MORE','WHEN THE JOURNEY IS TRUE','FOR THOSE WITH PATIENCE','','TEN EIGHTHS FOLLOWS 1','',''];if(g>=4&&g<=10)messages.push(['CRYPTOGRAPHS ON THE WALLS READ',texts[g-4],second[g-4]].filter(Boolean));}
   }
   const notes=clock(copy,data);Object.assign(e,copy);return {ok:true,messages,notes,dead:e.team.every(m=>!m.energy)};
  }catch(error){if(error instanceof Boundary)return {ok:false,boundary:error.message};throw error;}
 }
 function fountain(e,data,k){
  if(!['Y','N'].includes(k))return {ok:true};const copy=JSON.parse(JSON.stringify(e));delete copy.field.fountain;
  if(k==='Y'){if(copy.field.bathed)for(let i=0;i<4;i++)damage(copy,i,30);else{copy.field.bathed=true;copy.team.forEach(m=>m.energy=copy.cheatMode?Math.max(40,m.energy):40);}}
  const messages=illusion(copy,data,'I',true);const notes=clock(copy,data);Object.assign(e,copy);return {ok:true,messages,notes,dead:e.team.every(m=>!m.energy)};
 }
 function appraise(e,data){const copy=JSON.parse(JSON.stringify(e)),f=copy.field||(copy.randomState||={rng:0});try{const quote=World.offers(copy,()=>fraction(f,data));Object.assign(e,copy);return {ok:true,...quote};}catch(error){if(error instanceof Boundary)return {ok:false,boundary:error.message};throw error;}}

 function mazeReturn(e,data,memory){
  const copy=JSON.parse(JSON.stringify(e)),f=copy.field,p=memory[770]-1;
  if(p<0||p>3)return {ok:false,boundary:'INVALID ORIGINAL MAZE RETURN.'};
  try{copy.team[p].energy=copy.cheatMode?Math.max(copy.team[p].energy,memory[772]):memory[772];delete f.maze;f.x=21;f.y=144;f.ticks=0;f.moves=0;f.battles=0;World.load(copy,23,n=>random(f,data,n));const result=arrive(copy,data,[['WE NOW REJOIN THE REMAINDER','OF THE EXPEDITION','(IF THERE IS ANY)']]);Object.assign(e,copy);return result;}catch(error){if(error instanceof Boundary)return {ok:false,boundary:error.message};throw error;}
 }
 function radio(e,data){
  const copy=JSON.parse(JSON.stringify(e)),f=copy.field;
  try{const messages=World.leave(copy,n=>random(f,data,n));copy.cash-=2000;f.x=19;f.y=108;World.load(copy,6,n=>random(f,data,n));const result=arrive(copy,data,[['COPTER FLIGHT TO BASE CAMP'],...messages]);Object.assign(e,copy);return result;}catch(error){if(error instanceof Boundary)return {ok:false,boundary:error.message};throw error;}
 }
 function pulse(e,data){
  const copy=JSON.parse(JSON.stringify(e)),f=copy.field,messages=[];if(!f.system||f.system===1)return {ok:true};
  try{
   // Generate visual commands before advancing trap state; lava draws consume the original ten rolls.
   const trapTiming=Traps.profile(f);
   let ops;try{ops=f.system===3&&copy.cheatMode?[]:Traps.operations(f,n=>random(f,data,n));}catch(error){if(error instanceof Boundary)throw error;throw new Boundary(error.message);}
   const visual=ops.length?Traps.animate(page(e,data,false),f.trapDrawing,bytes(data.tiles),ops):null;
   if(visual)f.trapDrawing=visual.layer;
   f.trapTick=(f.trapTick||0)+1;
   if(f.system===2&&f.trapTick>=3){if(f.trapTick>3)f.trapTick=0;if(f.x===13||f.x===17){f.trapTick=0;messages.push(['THE ROLLING STONES','HAVE CRUSHED YOUR BONES']);for(let i=0;i<4;i++)damage(copy,i,8);}}
   else if(f.system===3){if(copy.cheatMode){f.system=1;delete f.flood;delete f.trapDrawing;delete f.trapRaster;delete f.trapRasterKey;Object.assign(e,copy);return {ok:true,messages:[]};}f.flood-=2;if(f.flood<=f.y-12){messages.push(['THE HALLS ARE FLOODED!']);for(let i=0;i<4;i++)damage(copy,i,copy.team[i].energy);}}
   else if(f.system===4){
    let vx=f.lavaX||6.95,vy=f.lavaY||3.9;vx+=6.95;vy+=3.9;if(140+vx>=279||140-vx<0)vx-=7;f.lavaX=vx;f.lavaY=vy;
    if(78+vy>=f.y&&140+vx>=f.x*7){messages.push(['HOT LAVA!']);for(let i=0;i<4;i++)damage(copy,i,8);}
   }else if(f.system===5&&f.x===19){
    const base=60+Number(f.y>84)*24+Number(f.y>108)*24,d=f.hammer||1,rows={1:[base],2:[base+24],3:[base,base],4:[base+24,base+24],5:[base,base+24],6:[base,base,base]};
    f.hammer=d===6?1:d+1;for(const y of rows[d])if(y===f.y){messages.push(["YOU'VE BEEN CRUSHED BY IMATU'S HAMMER!"]);for(let i=0;i<4;i++)damage(copy,i,4);}
   }else if(f.system===6){
    const b=square(f)+1;if(b===208)f.stairs=4;
    else if(b===212){let victim;do{victim=random(f,data,4)-1;}while(!copy.team[victim].energy);f.maze={stage:'intro',victim,ammo:Math.floor(copy.inventory[9]/4),energy:copy.team[victim].energy,slot:copy.slot};f.system=1;messages.push(['GAS!!'],['A CHUTE!']);}
    else for(let i=0;i<4;i++)damage(copy,i,1);
   }
   if(visual){f.trapRaster=encode(visual.frames.at(-1));f.trapRasterKey=rasterKey(copy);}
   Object.assign(e,copy);return {ok:true,messages,trapFrames:visual?.frames,trapBase:visual?.initial,trapTiming,dead:e.team.every(m=>!m.energy)};
  }catch(error){if(error instanceof Boundary)return {ok:false,boundary:error.message};throw error;}
 }

 const encode=b=>typeof Buffer==='function'?Buffer.from(b).toString('base64'):btoa(Array.from(b,v=>String.fromCharCode(v)).join(''));
 const rasterKey=e=>JSON.stringify([e.field.sector,e.field.x,e.field.y,e.field.mapped,!!e.inventory[2],!!e.inventory[3],e.field.map]);
 function explorerFrames(e,data){
  const f=e.field,tiles=bytes(data.tiles);let tile=terrain(f.map[square(f)]);if(tile>41)tile=2;if(f.sector>10&&!(e.inventory[2]&&e.inventory[3])&&tile<30)tile=29;
  const at={x:f.x+Number(f.sector>10),y:f.y},actor=33-e.team.filter(m=>!m.energy).length;
  const visual=Traps.animate(page(e,data,false),f.trapDrawing,tiles,[{kind:'tile',tile,...at},{kind:'tile',tile:actor,...at,xor:true},{kind:'tile',tile:actor,...at,xor:true}]);
  f.trapDrawing=visual.layer;f.trapRaster=encode(visual.frames.at(-1));f.trapRasterKey=rasterKey(e);return {ok:true,trapFrames:visual.frames,trapBase:visual.initial,trapTiming:Traps.prefix()};
 }
 function trapTiming(e,camp=false){return Traps.profile(e.field,camp);}
 function drawTile(page,tiles,tile,x,y,xor=false){for(let i=0;i<24;i++){const at=G.address(y-Math.floor(i/2),x+i%2);if(xor)page[at]^=tiles[tile*24+i];else page[at]=tiles[tile*24+i];}return page;}
 function page(e,data,flash=true){
  const f=e.field;if(f.system>1&&f.trapRaster&&f.trapRasterKey===rasterKey(e))return bytes(f.trapRaster);
  const tiles=bytes(data.tiles),p=new Uint8Array(8192);
  for(let y=0;y<=156;y++)for(const x of (f.sector>10?[7,261]:[6,260]))p[G.address(y,Math.floor(x/7))]|=1<<(x%7);
  for(let i=0;i<234;i++)if((f.mapped&&(f.sector<11||e.inventory[2]&&e.inventory[3]))||f.map[i]>100){let t=terrain(f.map[i]);if(f.sector>10&&!(e.inventory[2]&&e.inventory[3])&&t<30)t=29;if(t===29)continue;if(t>41)t=2;drawTile(p,tiles,t,1+i%18*2+Number(f.sector>10),12+Math.floor(i/18)*12);}
  Traps.apply(p,f.trapDrawing);
  if(flash)drawTile(p,tiles,33-e.team.filter(m=>!m.energy).length,f.x+Number(f.sector>10),f.y,true);
  return p;
 }
 Object.assign(exports,{begin,move,fight,leaveStairs,stairs,crypt,fountain,appraise,radio,pulse,mazeReturn,camp,clock,retreat,explorerFrames,trapTiming,validate,validateRandomState:Random.validate,square,terrain,page,drawTile});
})(typeof module==='object'?module.exports:(globalThis.AmazonField={}));
