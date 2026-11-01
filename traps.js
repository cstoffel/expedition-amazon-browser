(function(exports){
 'use strict';const node=typeof module==='object',G=node?require('./graphics.js'):AmazonGraphics,T=node?require('./trap-timing-data.js'):TRAP_TIMING,H=node?require('./hgr-lines.js'):AmazonHgrLines;
 const decode=s=>Uint8Array.from(node?Buffer.from(s,'base64'):atob(s),v=>typeof v==='number'?v:v.charCodeAt(0));
 const encode=b=>node?Buffer.from(b).toString('base64'):btoa(Array.from(b,v=>String.fromCharCode(v)).join(''));
 function draw(page,tiles,op){
  if(op.kind==='tile'){for(let i=0;i<24;i++){const at=G.address(op.y-Math.floor(i/2),op.x+i%2);if(op.xor)page[at]^=tiles[op.tile*24+i];else page[at]=tiles[op.tile*24+i];}}
  else H.line(page,op.from,op.to,op.color);
  return page;
 }
 function operations(f,r){
  const ops=[],tile=(t,x,y)=>ops.push({kind:'tile',tile:t,x,y});
  const line=(x,y,x1,y1,color)=>{const from=[Math.trunc(x),Math.trunc(y)],to=[Math.trunc(x1),Math.trunc(y1)];if([...from,...to].some((v,i)=>!Number.isFinite(v)||v<0||v>=(i%2?192:280)))throw new Error('ORIGINAL TRAP HPLOT COORDINATE OUT OF RANGE.');ops.push({kind:'line',from,to,color});};
  if(f.system===2&&(f.trapTick||0)+1>=3){
   const row=y=>{tile(25,14,y);tile(25,18,y);tile(29,18,y);tile(29,14,y);};
   for(let a=5;a<=7;a++)row(a*12);tile(5,14,84);tile(5,18,84);for(let a=8;a<=10;a++)row(a*12);
  }else if(f.system===3){line(14,f.flood,266,f.flood,213);line(14,f.flood-1,266,f.flood-1,213);}
  else if(f.system===4){const vx=f.lavaX||6.95,vy=f.lavaY||3.9;for(let z=1;z<=5;z++){let s=r(vx),y=r(vy);if(z===5){s=vx;y=vy;}for(const [dx,dy] of [[s,y],[-s,y],[s,-y],[-s,-y],[s-10,y-10],[-s+10,y-10],[s-5,-y+5],[-s+5,-y+5]])line(140,78,140+dx,78+dy,170);}}
  else if(f.system===5&&f.x===19){const base=60+Number(f.y>84)*24+Number(f.y>108)*24,rows={1:[base],2:[base+24],3:[base,base],4:[base+24,base+24],5:[base,base+24],6:[base,base,base]};for(const y of rows[f.hammer||1]){tile(39,16,y);tile(39,18,y);tile(39,20,y);tile(6,20,y);tile(29,18,y);}}
  return ops;
 }
 function layer(saved){return saved?{ink:decode(saved.ink),other:decode(saved.other)}:{ink:new Uint8Array(8192),other:new Uint8Array(8192).fill(255)};}
 function apply(page,saved){if(!saved)return page;const p=layer(saved);for(let i=0;i<8192;i++)page[i]=p.ink[i]^(page[i]&(p.ink[i]^p.other[i]));return page;}
 function animate(base,saved,tiles,ops){
  const p=layer(saved),frames=[],initial=base.slice();for(const op of ops){draw(base,tiles,op);draw(p.ink,tiles,op);draw(p.other,tiles,op);frames.push(base.slice());}
  return {frames,initial,layer:{ink:encode(p.ink),other:encode(p.other)}};
 }
 function validate(saved){if(saved&&(typeof saved.ink!=='string'||typeof saved.other!=='string'||decode(saved.ink).length!==8192||decode(saved.other).length!==8192))throw new Error('Invalid trap drawing save');}
 const ms=cycles=>cycles/T.hz*1000;
 function profile(f,camp=false){if(f.system===6)return {times:[],duration:250+(camp?ms(T.campWait):0),name:'unprofiled-system-6'};const name=f.system===2?((f.trapTick||0)<2?'stones-wait-'+(f.trapTick||0):'stones-'+f.trapTick):f.system===3?'water':f.system===4?'lava-1':f.system===5?(f.x===19?'hammer-'+(f.hammer||1):'hammer-outside'):'stones-wait-0',p=T.profiles[name]||T.profiles['stones-2'];return {times:p.times.map(ms),duration:ms(p.duration+(camp?T.campWait:0)),name};}
 function prefix(){return {times:T.prefix.times.map(ms),duration:ms(T.prefix.duration)};}
 Object.assign(exports,{profile,prefix,draw,operations,apply,animate,validate});
})(typeof module==='object'?module.exports:(globalThis.AmazonTraps={}));
