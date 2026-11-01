(function(e){
 'use strict';const node=typeof module==='object',V=node?require('./maze-vectors.js'):AmazonMazeVectors,S=node?require('./maze-sprites.js'):AmazonMazeSprites;
 function prepare(state,{startup=false}={}){
  if(!state||!(startup?(state.x===0&&state.y===0&&state.direction===0&&state.view===0):([state.x,state.y].every(n=>Number.isInteger(n)&&n>=1&&n<=10)&&[1,2,3,4].includes(state.direction)&&[1,2].includes(state.view)))||![0,1].includes(state.eventFlag)||!Array.isArray(state.actors)||state.actors.length!==3)throw new Error('Invalid maze scene state');
  // Reuse the sprite contract and clone every actor, including dormant paths.
  const actors=new S.MazeSprites({actors:state.actors}).actors;
  const viewChannel=startup?1:(state.direction%2===1)===(state.view===1)?1:2;
  const next={...state,actors,viewChannel,target:state.x+state.y,origin:0,sceneCounter:0,scriptLow:180,scriptHigh:18};
  actors[2].x=viewChannel===1?29:5;if(viewChannel===1)actors[2].y=56;
  const calls=[{address:viewChannel===1?0x1101:0x12d0,clear:true},{address:0x12b4,clear:false}];
  if(next.target===13)next.eventFlag=1;
  else if(next.target%2===0){next.scriptLow=viewChannel===1?27:235;next.scriptHigh=viewChannel===1?20:19;calls.push({address:next.scriptLow+256*next.scriptHigh,clear:false});}
  return {state:next,calls,effect:'health-display'};
 }
 function render(state,{page=new Uint8Array(8192),onLayer=null,startup=false}={}){
  const result=prepare(state,{startup}),renderer=new V.MazeVectors({page});
  for(const call of result.calls){renderer.draw(V.streamAt(call.address),{clear:call.clear});if(onLayer)onLayer(call,renderer.page());}
  return {...result,page:renderer.page()};
 }
 function renderComplete(state,options={}){
  const result=render(state,options),HUD=node?require('./maze-hud.js'):globalThis.AmazonMazeHud;
  if(!HUD)throw new Error('Maze display continuation unavailable');
  const complete=HUD.display(result.state,{...options,page:result.page});return {...complete,calls:result.calls};
 }
 Object.assign(e,{prepare,render,renderComplete});
})(typeof module==='object'?module.exports:(globalThis.AmazonMazeScenes={}));
