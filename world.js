(function(exports){
 'use strict';
 const W=typeof module==='object'?require('./world-data.js'):AMAZON_WORLD;
 const square=f=>Math.floor(f.x/2)+18*(f.y/12-1);
 function mapped(f){if(f.sector>30&&f.sector!==43)return true;return (f.mappedSectors||[...(f.mapped?[6]:[])]).includes(f.sector);}
 function leave(e,r){
  const f=e.field,messages=[];f.mappedSectors||=(f.mapped?[6]:[]);
  if(!mapped(f)){
   if(f.sectorMeters>f.map[234]-2){f.maps++;f.mappedSectors.push(f.sector);e.team.forEach(m=>m.level++);}
   else if(f.sector>10)messages.push(['SOMETHING LEAPS FROM THE DARK, AND','SNATCHES YOUR MAP!']);
   else {const choices=[['A MONKEY GRABS THE MAP OF THIS','SECTOR, AND ESCAPES IN THE TREES!'],['THE SECTOR MAP IS RUINED IN A','SUDDEN RAIN STORM!'],['A SUDDEN WIND BLOWS THE MAP','OF THIS SECTOR INTO THE CAMPFIRE!'],['AN OVERRIPE MANGO FALLS ON THE','MAP OF THIS SECTOR AND RUINS IT!']];messages.push(choices[r(4)-1]);}
   f.sectorMeters=0;
  }
  return messages;
 }
 function load(e,sector,r){
  const f=e.field,src=W.sectors[sector===43?43:Math.min(sector,31)];if(!src)throw new Error('Missing sector '+sector);
  const count=f.map[234]||0;f.sector=sector;f.map=src.slice(0,235);if(f.map.length===234)f.map.push(count);f.mapped=mapped(f);f.system=sector===23||sector===14?5:sector===19||sector===28?2:sector===43?6:1;f.trapTick=0;f.hammer=1;delete f.trapDrawing;delete f.trapRaster;delete f.trapRasterKey;
  if(sector<11){const n=r(5)+1;for(let i=0;i<n;i++){let at;do{at=r(234)-1;}while(f.map[at]!==2);f.map[at]=42;}}
  if(sector>30)f.mapped=true;
  if(f.mapped&&(sector<11||e.inventory[2]&&e.inventory[3]))for(let i=0;i<234;i++)f.map[i]+=100;
 }
 function edge(f,key){
  const h=f.sector,b=square(f)+1;let allowed=false,sector=h,x=f.x,y=f.y;
  if(key==='I'){allowed=h%2!==0&&(h<11||b===10);sector++;y+=144;}
  if(key==='M'){allowed=h<11?h%2===0:b===226;sector--;y-=144;}
  if(key==='J'){allowed=h>=3&&(h<11||b===109);sector-=2;x+=34;}
  if(key==='K'){allowed=h<11?h<=8:b===126;sector+=2;x-=34;}
  return allowed?{sector,x,y}:null;
 }
 function connected(f,key){
  if(f.sector<11)return true;const v=f.map[square(f)],t=v>100?v-100:v,d={I:1,M:2,J:3,K:4}[key];
  return !!W.connections[d-1+4*(t-3-4*Number(t>20))];
 }
 function offers(e,rnd){
  const items=e.artifacts||(e.artifacts=Array(10).fill(''));let b=rnd()*1000+1000,total=0;const rows=[];
  for(let i=0;i<10;i++){
   const item=items[i];if(!item)continue;
   if(item[0]==='C')b=10;
   if(item[0]==='S')b=rnd()*100+100;
   if(item[0]==='G')b=rnd()*500+500;
   b=Math.floor(rnd()*100+1+b*10/e.difficulty);const display=b;
   if(item.charCodeAt(0)+item.charCodeAt(1)===149){b=Math.floor(rnd()*5+1);if(b===1){items[i]='RAW DIAMOND';b=Math.floor(rnd()*10000+500);}}
   total+=b;rows.push({item:items[i],price:items[i]==='RAW DIAMOND'&&item!=='RAW DIAMOND'?b:display});
  }
  return {rows,total};
 }
 Object.assign(exports,{data:W,square,leave,load,edge,connected,offers});
})(typeof module==='object'?module.exports:(globalThis.AmazonWorld={}));
