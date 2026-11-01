(function(e){
 'use strict';const node=typeof module==='object',D=node?require('./maze-sprite-data.js'):MAZE_SPRITE_DATA,S=node?require('./maze-scenes.js'):AmazonMazeScenes,H=node?require('./maze-hud.js'):AmazonMazeHud,F=node?require('./maze-effects.js'):AmazonMazeEffects,E=node?require('./maze-events.js'):AmazonMazeEvents;
 function initialize({energy=10,victim=1,slotCode=55}={},options={}){
  if(!Number.isInteger(energy)||energy<0||energy>255||![1,2,3,4].includes(victim)||![25,55].includes(slotCode))throw new Error('Invalid maze initialization');
  let state={channel:1,origin:0,direction:0,drawX:0,viewChannel:0,progress:0,target:0,enterQueued:0,view:0,quitRequested:0,x:0,y:0,mechanism:0,prior:0,eventFlag:0,health:energy,loops:0,hunger:0,victim,slotCode,scriptLow:0,scriptHigh:0,sceneCounter:0,labelRotation:0,labelScale:0,collisionX:0,actors:D.actors.map(a=>({...a}))};F.sync(state);
  const scene=S.renderComplete(state,{...options,startup:true}),health=H.health(scene.state,{...options,page:scene.page});state=health.state;
  state.actors[1].type=130;state.view=1;state.direction=3;state.x=1;state.y=1;state.actors[0].phase=1;F.sync(state);
  return {state,page:health.page,effect:'loop',keyboardCleared:true,text:false,mixed:false};
 }
 function recoverCollision(state,options={}){
  const flash=F.collision(state,options),reset=E.resetAfterTrap(flash.state);// Mirror the original reset flags into full actor records.
  reset.state.actors[0].type=0;reset.state.actors[1].type=130;F.sync(reset.state);
  const scene=S.renderComplete(reset.state,{...options,page:flash.page}),finish=E.finishTrap(scene.state);F.sync(finish.state);
  if(finish.effect==='fatal-trap')return {...finish,page:scene.page,speaker:flash.speaker,keyboardCleared:true};
  const health=H.health(finish.state,{...options,page:scene.page});return {...health,effect:'loop',speaker:flash.speaker,keyboardCleared:true};
 }
 Object.assign(e,{initialize,recoverCollision});
})(typeof module==='object'?module.exports:(globalThis.AmazonMazeLifecycle={}));
