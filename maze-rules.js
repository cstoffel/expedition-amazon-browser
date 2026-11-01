(function(exports){
 'use strict';
 const fields={x:0x660b,y:0x660d,direction:0x6605,mechanism:0x661d,prior:0x661f};
 function validate(state){
  if(!state||![state.x,state.y].every(v=>Number.isInteger(v)&&v>=1&&v<=10)||!Number.isInteger(state.direction)||state.direction<1||state.direction>4||![state.prior,state.mechanism].every(v=>v===0||v===1))throw new Error('Invalid native maze grid state.');
  return state;
 }
 function move(state){
  validate(state);let {x,y,direction}=state;
  if(direction===1)x=x===1?10:x-1;
  else if(direction===2)y=y===10?1:y+1;
  else if(direction===3)x=x===10?1:x+1;
  else y=y===1?10:y-1;
  // Both flags are overwritten on every movement. The trigger consumes the OLD
  // prior-square latch; entering (5,4) creates the NEW latch for the next move.
  return {...state,x,y,mechanism:Number(x===4&&y===4&&state.prior===1),prior:Number(x===5&&y===4)};
 }
 function fromMemory(memory){
  const state={};for(const [k,a]of Object.entries(fields))state[k]=memory[a]*256+memory[a+1];return validate(state);
 }
 function toMemory(state,memory){
  validate(state);for(const [k,a]of Object.entries(fields)){memory[a]=state[k]>>8;memory[a+1]=state[k]&255;}return memory;
 }
 Object.assign(exports,{move,validate,fromMemory,toMemory});
})(typeof module==='object'?module.exports:(globalThis.AmazonMazeRules={}));
