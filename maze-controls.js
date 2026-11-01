(function(exports){
 'use strict';
 const fields={channel:0x6601,origin:0x6603,direction:0x6605,drawX:0x6607,viewChannel:0x6609,progress:0x65fd,target:0x6617,enterQueued:0x6625,view:0x6627,quitRequested:0x65fb};
 const arrays={flags:0x9400,positions:0x94a0,velocities:0x94c0};
 function validate(state){
  if(!state||!['channel','view','viewChannel'].every(k=>state[k]===1||state[k]===2)||!Number.isInteger(state.direction)||state.direction<1||state.direction>4||!['origin','drawX','progress','target'].every(k=>Number.isInteger(state[k])&&state[k]>=0&&state[k]<=255)||!['enterQueued','quitRequested'].every(k=>state[k]===0||state[k]===1)||!Object.keys(arrays).every(k=>Array.isArray(state[k])&&state[k].length===2&&state[k].every(v=>Number.isInteger(v)&&v>=0&&v<=255)))throw new Error('Invalid native maze control state.');
  return state;
 }
 function dispatch(state,raw){
  validate(state);if(!Number.isInteger(raw)||raw<0||raw>255)throw new Error('Invalid maze keyboard latch.');
  const next={...state};for(const k of Object.keys(arrays))next[k]=state[k].slice();
  // The original comparison is <127, not a test of the keyboard's high bit.
  if(raw<127)return {state:next,effect:'return',key:raw};
  let effect='resume',selected=next.channel-1;
  if(raw===215)next.flags[selected]=selected; // W enables the selected channel.
  else if(raw===211)next.flags[selected]=130; // S pauses only that channel.
  else if(raw===210){ // R reverses travel; it also resumes on the other channel.
   next.flags[selected]=130;next.channel=3-next.channel;selected=next.channel-1;
   next.flags[selected]=selected;next.positions[selected]=next.progress;
   next.velocities[selected]=Number(next.channel===1);
   next.direction=(next.direction+1)%4+1;
  }else if(raw===214){ // V reverses the view, retaining travel direction.
   if(next.progress>39)next.progress=0;
   next.view=3-next.view;next.flags[selected]=130;next.channel=3-next.channel;selected=next.channel-1;
   next.flags[selected]=selected;next.positions[selected]=40-next.progress;effect='redraw';
  }else if(raw===197){ // E queues entry, or dispatches it at the exact gate.
   next.enterQueued=1;next.target=next.viewChannel===1?29:5;
   effect=next.positions[selected]===next.target?'enter-hall':'return';
  }else if(raw===200)effect='help';
  else if(raw===209){next.quitRequested=1;effect='quit';}
  return {state:next,effect,key:0};
 }
 function keyCode(key){
  if(typeof key!=='string')return 0;
  const code=key==='Enter'?13:key==='Escape'?27:key.length===1?key.toUpperCase().charCodeAt(0):0;
  return code?(code|128)&255:0;
 }
 function fromMemory(memory){
  const state={};for(const [k,a]of Object.entries(fields))state[k]=memory[a]*256+memory[a+1];
  for(const [k,a]of Object.entries(arrays))state[k]=Array.from(memory.slice(a,a+2));return validate(state);
 }
 function toMemory(state,memory){
  validate(state);for(const [k,a]of Object.entries(fields)){memory[a]=state[k]>>8;memory[a+1]=state[k]&255;}
  for(const [k,a]of Object.entries(arrays))memory.set(state[k],a);return memory;
 }
 Object.assign(exports,{dispatch,keyCode,validate,fromMemory,toMemory});
})(typeof module==='object'?module.exports:(globalThis.AmazonMazeControls={}));
