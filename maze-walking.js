(function(exports){
 'use strict';
 const node=typeof module==='object',C=node?require('./maze-controls.js'):AmazonMazeControls,R=node?require('./maze-rules.js'):AmazonMazeRules;
 function validate(state){
  C.validate(state);R.validate(state);
  if(![0,1].includes(state.eventFlag)||!Number.isInteger(state.health)||state.health<0||state.health>65535)throw new Error('Invalid native maze walking state.');
  return state;
 }
 function copy(state){validate(state);return {...state,flags:state.flags.slice(),positions:state.positions.slice(),velocities:state.velocities.slice()};}
 function sample(state){
  const next=copy(state);next.progress=next.positions[next.channel-1];
  const gate=next.viewChannel===1?29:5;
  return {state:next,effect:next.eventFlag&&next.progress===gate?'event':'advance'};
 }
 function advance(state){
  let next=copy(state);next.progress=next.positions[next.channel-1];
  const crosses=next.channel===1?next.progress>38&&next.progress<130:next.progress>130&&next.progress<253;
  if(!crosses)return {state:next,effect:'post-walk'};
  next.positions[next.channel-1]=next.channel===1?253:38;
  next.velocities[next.channel-1]=Number(next.channel===1);
  next=R.move(next);
  return {state:next,effect:'redraw'};
 }
 function postWalk(state){
  let next=copy(state);
  if(next.mechanism)return {state:next,effect:'mechanism'};
  if(!next.enterQueued)return {state:next,effect:'input'};
  // Automatic pending-entry processing uses E's handler without a keyboard
  // read or strobe clear. Only its state/effect are reused here.
  const result=C.dispatch(next,197);
  return {state:result.state,effect:result.effect==='enter-hall'?'enter-hall':'input'};
 }
 function enterHall(state){
  let next=copy(state);const odd=next.direction%2===1;
  // The view selects the absolute side of the hall. A fixed left/right
  // rotation would be wrong for the reverse-facing cases.
  const direction=odd?(next.view===1?2:4):(next.view===1?1:3);
  next.flags[next.channel-1]=130;
  next=R.move({...next,direction});
  next.channel=odd?1:2;next.flags[next.channel-1]=next.channel-1;
  next.positions[next.channel-1]=odd?0:39;
  // Original display preparation and redraw are still required. Entry stays
  // queued until the redraw continuation returns and finishHall is called.
  return {state:next,effect:'redraw'};
 }
 function finishHall(state){const next=copy(state);next.enterQueued=0;return {state:next,effect:'return'};}
 function fromMemory(memory){return validate({...C.fromMemory(memory),...R.fromMemory(memory),eventFlag:memory[0x6623]*256+memory[0x6624],health:memory[0x6621]*256+memory[0x6622]});}
 function toMemory(state,memory){
  validate(state);C.toMemory(state,memory);R.toMemory(state,memory);
  memory[0x6623]=state.eventFlag>>8;memory[0x6624]=state.eventFlag&255;
  memory[0x6621]=state.health>>8;memory[0x6622]=state.health&255;return memory;
 }
 Object.assign(exports,{validate,sample,advance,postWalk,enterHall,finishHall,fromMemory,toMemory});
})(typeof module==='object'?module.exports:(globalThis.AmazonMazeWalking={}));
