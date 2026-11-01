(function(e){
 'use strict';const node=typeof module==='object',V=node?require('./maze-vectors.js'):AmazonMazeVectors,D=node?require('./maze-hud-data.js'):MAZE_HUD_DATA;
 const copy=s=>({...s,...(s.actors?{actors:s.actors.map(a=>({...a}))}:{})});
 function glyph(renderer,{shape,x,y,rotation=0,scale=2,color=0}){
  if(!Number.isInteger(shape)||shape<0||shape>9||![0,32].includes(rotation)||![2,3].includes(scale)||![0,7].includes(color))throw new Error('Unsupported TG drawing parameters');
  renderer.color=color;renderer.position(x,y);const turn=rotation>>4;
  for(const packed of D.shapes[shape]){
   let command=packed;
   do{
    const direction=((command&3)+turn)&3;
    for(let step=0;step<scale;step++){
     if(command&4)renderer.pixel(x,y);
     x+=[0,1,0,-1][direction];y+=[-1,0,1,0][direction];
     if(x<0||x>279||y<0||y>191)throw new Error('Unsupported TG offscreen movement');
    }
    command>>=3;
   }while(command);
  }
  return {x,y};
 }
 function plotter(page,onGlyph){
  const renderer=new V.MazeVectors({page});
  return {renderer,draw:parameters=>{glyph(renderer,parameters);if(onGlyph)onGlyph(parameters,renderer.page());}};
 }
 function health(state,{page=new Uint8Array(8192),onGlyph=null}={}){
  if(!state||!Number.isInteger(state.health)||state.health<0||state.health>32767)throw new Error('Invalid maze display health');
  const next=copy(state),p=plotter(page,onGlyph),draw=(shape,x,y,rotation,color)=>p.draw({shape,x,y,rotation,scale:3,color});
  draw(3,7,188,32,7);draw(7,13,188,32,7);
  const count=state.health>9?2:1,digits=String(state.health);
  for(let i=0;i<Math.max(1,count);i++){draw(8,21+6*i,182,0,0);draw(Number(digits[i]),21+6*i,182,0,7);}
  next.scriptLow=count;next.sceneCounter=count+1;next.origin=21+count*6;
  return {state:next,page:p.renderer.page()};
 }
 function coordinates(state,{page=new Uint8Array(8192),onGlyph=null,startup=false}={}){
  if(!state||![1,2].includes(state.viewChannel)||![state.x,state.y].every(n=>Number.isInteger(n)&&n>=(startup?0:1)&&n<=10)||!Number.isInteger(state.target)||state.target<0||state.target>20)throw new Error('Invalid maze coordinate display');
  const next=copy(state),p=plotter(page,onGlyph),base=state.viewChannel===1?175:7;
  for(const [count,y]of [[state.x,4],[state.y,12]])for(let i=0;i<Math.max(1,count);i++)for(let repeat=0;repeat<Math.max(1,state.target);repeat++)p.draw({shape:1,x:base+4*i,y,rotation:0,scale:2,color:0});
  next.scriptLow=0;next.origin=Math.max(1,state.y)+1;next.sceneCounter=Math.max(1,state.target)+1;next.scriptHigh=12;next.drawX=base;next.labelRotation=0;next.labelScale=2;
  return {state:next,page:p.renderer.page(),keyboardCleared:true};
 }
 function display(state,options={}){
  const h=health(state,options);if(options.onStage)options.onStage('health',h);
  const c=coordinates(h.state,{...options,page:h.page});if(options.onStage)options.onStage('coordinates',c);
  return {...c,effect:'return'};
 }
 Object.assign(e,{glyph,health,coordinates,display});
})(typeof module==='object'?module.exports:(globalThis.AmazonMazeHud={}));
