(function(e){
 'use strict';const node=typeof module==='object',S=node?require('./maze-sprites.js'):AmazonMazeSprites,V=node?require('./maze-vectors.js'):AmazonMazeVectors,W=node?require('./maze-walking.js'):AmazonMazeWalking;
 const copy=s=>JSON.parse(JSON.stringify(s));
 function sync(s){s.flags=s.actors.slice(0,2).map(a=>a.type);s.positions=s.actors.slice(0,2).map(a=>a.x);s.velocities=s.actors.slice(0,2).map(a=>a.phase);return s;}
 function clear(state,{page,onFrame=null}={}){
  const next=copy(state),m=new S.MazeSprites({page,actors:next.actors}),a=m.actors[next.channel-1];if(!a)throw new Error('Invalid maze actor channel');m.draw({...a,type:next.channel-1},true);if(onFrame)onFrame(m.page());return {state:sync(next),page:m.page(),effect:'return'};
 }
 function animate(state,{page,onFrame=null,pulse=false}={}){
  const next=copy(state),m=new S.MazeSprites({page,actors:next.actors});if(pulse)m.actors[2].type=3;const enabled=m.actors.map(a=>a.type<128&&a.sequence<128);m.step((slot,sprite)=>{if(onFrame&&enabled[slot])onFrame(sprite.page());});if(pulse)m.actors[2].type=130;
  next.actors=m.actors;next.scriptLow=101;
  return {state:sync(next),page:m.page(),wait:{type:'iterations',iterations:100},effect:'sample'};
 }
 function hall(state,{page,onFrame=null}={}){
  const cleared=clear(state,{page,onFrame}),m=new S.MazeSprites({page:cleared.page,actors:cleared.state.actors});m.draw({type:2,x:state.target,phase:2,y:125});if(onFrame)onFrame(m.page());
  const result=W.enterHall(sync(copy(state))),next=result.state;next.actors=copy(state).actors;for(let i=0;i<2;i++){next.actors[i].type=next.flags[i];next.actors[i].x=next.positions[i];next.actors[i].phase=next.velocities[i];}next.scriptLow=0;next.scriptHigh=401;
  return {state:next,page:m.page(),wait:{type:'iterations',iterations:400},effect:'redraw'};
 }
 function collision(state,{page,onFrame=null}={}){
  const next=copy(state),v=new V.MazeVectors({page});next.collisionX=state.actors[2].x*7;next.sceneCounter=next.collisionX+state.actors[2].phase+12;
  const from=[next.sceneCounter,80],to=[state.viewChannel===1?220:50,140];
  for(let flash=0;flash<10;flash++)for(const color of [7,0]){v.color=color;v.position(...from);v.line(...to);if(onFrame)onFrame(v.page());}
  const c=clear(next,{page:v.page(),onFrame});next.scriptLow=6001;next.scriptHigh=0;
  return {state:next,page:c.page,effect:'reset-after-trap',wait:{type:'iterations',iterations:6000},speaker:{pairs:10,instructionCycleGap:858,events:Array.from({length:20},(_,i)=>({frame:Math.floor(i/2)*2,relativeInstructionCycle:i%2?858:0}))}};
 }
 // Generate PCM for measured instruction-boundary speaker events. Host sample
 // rate/clock are explicit; this does not claim physical bus/analog fidelity.
 function speakerSamples(cycles,{sampleRate=44100,clockHz=1023000}={}){
  if(!Array.isArray(cycles)||!cycles.length||cycles.some((n,i)=>!Number.isFinite(n)||n<0||(i&&n<cycles[i-1]))||sampleRate<=0||clockHz<=0)throw new Error('Invalid speaker event profile');
  const start=cycles[0],length=Math.ceil((cycles.at(-1)-start)/clockHz*sampleRate)+2,out=new Float32Array(length);let event=0,level=-1;
  for(let i=0;i<length;i++){while(event<cycles.length&&(cycles[event]-start)*sampleRate<=i*clockHz){level=-level;event++;}out[i]=level*0.15;}
  return out;
 }
 Object.assign(e,{clear,animate,pulse:(s,o)=>animate(s,{...o,pulse:true}),hall,collision,speakerSamples,sync});
})(typeof module==='object'?module.exports:(globalThis.AmazonMazeEffects={}));
