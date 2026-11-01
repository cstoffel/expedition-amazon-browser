(function(exports){
 'use strict';const node=typeof module==='object',W=node?require('./maze-walking.js'):AmazonMazeWalking,D=node?require('./maze-event-data.js'):MAZE_EVENT_DATA;
 const extra={loops:0x660f,hunger:0x6613,victim:0x6619,slotCode:0x661b};
 function validate(state){
  W.validate(state);
  if(!['loops','hunger'].every(k=>Number.isInteger(state[k])&&state[k]>=0&&state[k]<=32767)||!Number.isInteger(state.victim)||state.victim<1||state.victim>4||![25,55].includes(state.slotCode)||state.health>32767||(state.cheatMode!==undefined&&typeof state.cheatMode!=='boolean'))throw new Error('Invalid native maze event state.');
  return state;
 }
 function copy(state){validate(state);return {...state,flags:state.flags.slice(),positions:state.positions.slice(),velocities:state.velocities.slice()};}
 function tick(state){
  const next=copy(state);
  // Original signed addition errors before either overflowing word is stored.
  if(next.loops===32767)return {state:next,effect:'overflow',errorCode:69};
  next.loops++;
  if(next.loops%14)return {state:next,effect:'animation'};
  if(next.hunger===32767)return {state:next,effect:'overflow',errorCode:69};
  next.hunger++;
  if(next.hunger%200)return {state:next,effect:'pulse'};
  if(!next.cheatMode)next.health=Math.max(0,next.health-1);
  return {state:next,effect:'health-display'};
 }
 function afterHealthRefresh(state){const next=copy(state);return {state:next,effect:next.health?'pulse':'starvation'};}
 function resetAfterTrap(state){
  const next=copy(state);next.x=1;next.y=1;next.direction=3;next.view=1;next.flags=[0,130];
  // Do not prematurely reset the channel, pending-entry or mechanism words:
  // those belong to later original phases, not this pre-redraw reset.
  return {state:next,effect:'redraw'};
 }
 function finishTrap(state){
  const next=copy(state);next.eventFlag=0;if(!next.cheatMode)next.health=Math.max(0,next.health-1);
  return {state:next,effect:next.health?'health-display':'fatal-trap'};
 }
 function prepareReturn(state){
  const next=copy(state);if(next.health>255)throw new Error('Invalid original maze return energy.');
  return {state:next,effect:'return-to-expedition',returnBytes:[99,next.victim,next.slotCode,next.health]};
 }
 function exit(state,kind){
  if(!['quit','starvation','fatal-trap'].includes(kind))throw new Error('Invalid maze exit kind.');
  validate(state);if(kind!=='quit'&&state.health)throw new Error('Fatal maze exit requires zero health.');
  const pages=kind==='quit'?[]:[D.messages[kind==='starvation'?'starvation':'fatalTrap'].slice()];pages.push(D.messages.return.slice());
  return {...prepareReturn(state),command:'RUN AZ',pages};
 }
 function writeReturn(state,memory){const r=prepareReturn(state);for(const [i,a]of [768,770,771,772].entries())memory[a]=r.returnBytes[i];return memory;}
 function fromMemory(memory){
  const state=W.fromMemory(memory);for(const [k,a]of Object.entries(extra))state[k]=memory[a]*256+memory[a+1];return validate(state);
 }
 function toMemory(state,memory){validate(state);W.toMemory(state,memory);for(const [k,a]of Object.entries(extra)){memory[a]=state[k]>>8;memory[a+1]=state[k]&255;}return memory;}
 Object.assign(exports,{validate,tick,afterHealthRefresh,resetAfterTrap,finishTrap,prepareReturn,exit,writeReturn,fromMemory,toMemory});
})(typeof module==='object'?module.exports:(globalThis.AmazonMazeEvents={}));
