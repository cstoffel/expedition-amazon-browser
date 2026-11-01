(function(e){
 'use strict';const node=typeof module==='object',get=(file,name)=>node?require('./'+file+'.js'):globalThis[name],C=get('maze-controls','AmazonMazeControls'),W=get('maze-walking','AmazonMazeWalking'),E=get('maze-events','AmazonMazeEvents'),F=get('maze-effects','AmazonMazeEffects'),L=get('maze-lifecycle','AmazonMazeLifecycle'),S=get('maze-scenes','AmazonMazeScenes'),H=get('maze-hud','AmazonMazeHud'),P=get('maze-presentation','AmazonMazePresentation'),V=get('maze-vectors','AmazonMazeVectors'),T=get('maze-timing-data','MAZE_TIMING_DATA'),Save=get('maze-native-save','AmazonNativeMazeSave'),Pacing=node?require('./maze-pacing.js'):globalThis.AmazonMazePacing;
 const clone=x=>JSON.parse(JSON.stringify(x));
 class NativeMaze{
  constructor(options={}){
   this.backend='native';this.audioEvents=[];
   if(options.snapshot){const saved=Save.decode(options.snapshot);Object.assign(this,saved);this.state=clone(saved.state);if(typeof options.cheatMode==='boolean')this.state.cheatMode=options.cheatMode;this.presentation=null;if(saved.presentation){const p=new P.Presentation(saved.presentation.kind,this.state);p.index=saved.presentation.index;p.load();p.advanceIterations(saved.presentation.elapsed);this.presentation=p;this.state=p.state;if(options.snapshot.version===1&&p.wait?.type==='iterations'){const total=Pacing?.wait(p)||T.waits[p.wait.iterations],lo=Math.ceil(p.elapsed*total/p.wait.iterations),hi=Math.ceil((p.elapsed+1)*total/p.wait.iterations)-1;this.presentationCycles=Math.max(lo,Math.min(hi,Math.round(saved.presentationCycles*total/T.waits[p.wait.iterations])));}}this.memory=new Uint8Array(65536);this.page=0x2000;this.output=this.stopped;this.project();return;}
   const initial=L.initialize({energy:options.energy??10,victim:(options.victim??0)+1,slotCode:options.slot==='B'?25:55});
   this.state=initial.state;this.state.cheatMode=!!options.cheatMode;this.frame=initial.page;this.phase='tick';this.key=0;this.cycles=0;this.loopSerial=0;this.stopped='';this.text=false;this.mixed=false;this.page=0x2000;this.queue=[];this.remaining=0;this.after='tick';this.clearOnExit=false;this.presentation=null;this.presentationCycles=0;this.memory=new Uint8Array(65536);this.output='';
   this.project();
  }
  arrays(next){this.state=next;for(let i=0;i<2;i++){this.state.actors[i]={...this.state.actors[i],type:next.flags[i],x:next.positions[i],phase:next.velocities[i]};}return this.state;}
  enqueue(pages,after,clear=false,cycles=1000){
   this.after=after;this.clearOnExit=clear;this.queue=[];
   for(const p of pages){const f=p.page?{page:Uint8Array.from(p.page),cycles:Math.max(1,Math.round(p.cycles)),sound:!!p.sound}:{page:Uint8Array.from(p),cycles:Math.max(1,Math.round(cycles/pages.length)),sound:false},last=this.queue.at(-1);if(last&&!last.sound&&!f.sound&&last.page.every((v,i)=>v===f.page[i]))last.cycles+=f.cycles;else this.queue.push(f);}
   if(this.queue.length){const f=this.queue.shift();this.applyFrame(f);this.phase='frames';}else this.completeQueue();
  }
  applyFrame(f){this.frame=f.page;this.remaining=f.cycles;if(f.sound){this.audioEvents.push({cycle:this.cycles,gap:858});if(this.audioEvents.length>128)this.audioEvents.shift();}}
  drainAudio(){const events=this.audioEvents;this.audioEvents=[];return events;}
  completeQueue(){if(this.clearOnExit)this.key=0;this.clearOnExit=false;this.phase=this.after;this.remaining=0;}
  scene(after){
   const result=S.prepare(this.state),renderer=new V.MazeVectors({page:this.frame}),pages=[];if(Pacing?.scene(this.state))pages.push({page:this.frame,cycles:Pacing.scene(this.state)});this.state=result.state;
   for(const call of result.calls){const profile=T.vectors[this.state.viewChannel+':'+call.address];if(!profile)throw new Error('Native vector timing profile unavailable');pages.push({page:renderer.page(),cycles:profile[0]});let i=1;renderer.draw(V.streamAt(call.address),{clear:call.clear,onCommand:p=>pages.push({page:p.page,cycles:profile[i++]??1})});}
   let initial=renderer.page(),glyphs=[],hud=H.health(this.state,{page:initial,onGlyph:(parameters,page)=>glyphs.push(page)});pages.push(...(Pacing?.health(this.state,initial,glyphs)||glyphs.map(page=>({page,cycles:T.hudGlyph}))));this.state=hud.state;
   initial=hud.page;glyphs=[];hud=H.coordinates(this.state,{page:initial,onGlyph:(parameters,page)=>glyphs.push(page)});pages.push(...(Pacing?.coordinates(this.state,initial,glyphs)||glyphs.map(page=>({page,cycles:T.hudGlyph}))));this.state=hud.state;F.sync(this.state);this.enqueue(pages,after,true);
  }
  show(kind){this.presentation=new P.Presentation(kind,this.state);this.state=this.presentation.state;this.text=this.presentation.text;this.mixed=this.presentation.mixed;this.phase='presentation';this.presentationCycles=0;this.lead();}
  lead(){const duration=Pacing?.lead(this.presentation)||0;if(duration){this.phase='presentLead';this.remaining=duration;}}
  presentationWaitCycles(){return Pacing?.wait(this.presentation)||T.waits[this.presentation.wait.iterations];}
  finishPresentation(){
   const p=this.presentation;this.state=p.state;this.text=p.text;this.mixed=p.mixed;
   if(p.command){this.stopped=p.command;this.output=p.command;for(const [i,a]of [768,770,771,772].entries())this.memory[a]=p.returnBytes[i];}
   else{this.key=0;this.phase='tick';}
   this.presentation=null;
  }
  transition(){
   let r,frames=[],before;
   switch(this.phase){
    case 'tick':
     this.loopSerial++;r=E.tick(this.state);this.state=r.state;
     if(r.effect==='overflow'){this.stopped='ERROR 69';break;}
     if(r.effect==='health-display'){r=H.health(this.state,{page:this.frame});this.state=r.state;this.frame=r.page;if(!this.state.health){this.show('starvation');break;}}
     before=this.state;r=(this.state.loops%14===0?F.pulse:F.animate)(this.state,{page:this.frame,onFrame:p=>frames.push(p)});this.state=r.state;this.enqueue(Pacing?.animation(before,this.frame,frames,this.state.loops%14===0)|| (frames.length?frames:[r.page]),'sample',false,this.state.loops%14===0?T.pulse:T.ordinary);break;
    case 'sample':
     r=W.sample(this.state);this.state=r.state;
     if(r.effect==='event'){before=this.state;r=F.collision(this.state,{page:this.frame,onFrame:p=>frames.push(p)});this.state=r.state;const start=this.state.sceneCounter,profile=T.collision.filter(p=>p.channel===this.state.viewChannel).reduce((a,b)=>Math.abs(b.startX-start)<Math.abs(a.startX-start)?b:a);this.enqueue(Pacing?.collision(before,this.frame,frames,T.waits['6000'])||frames.map((page,i)=>({page,sound:i<20&&i%2===0,cycles:i===frames.length-1?T.waits['6000']:i%2?profile.black:profile.white})),'collisionReset',false);}else this.phase='advance';break;
    case 'collisionReset':
     r=E.resetAfterTrap(this.state);this.state=r.state;this.state.actors[0].type=0;this.state.actors[1].type=130;F.sync(this.state);this.scene('collisionDamage');break;
    case 'collisionDamage':
     r=E.finishTrap(this.state);this.state=r.state;if(r.effect==='fatal-trap'){this.show('fatalTrap');break;}r=H.health(this.state,{page:this.frame});this.state=r.state;this.frame=r.page;this.phase='tick';break;
    case 'advance':
     before=this.state;r=W.advance(this.state);
     if(r.effect==='redraw'){const cleared=F.clear(before,{page:this.frame});this.arrays(r.state);this.frame=cleared.page;this.scene('postWalk');}else{this.state=r.state;this.phase='postWalk';}break;
    case 'postWalk':
     r=W.postWalk(this.state);this.arrays(r.state);
     if(r.effect==='mechanism')this.show('mechanism');else if(r.effect==='enter-hall')this.enterHall('input');else this.phase='input';break;
    case 'hallRedraw':this.scene('hallFinish');break;
    case 'hallFinish':
     r=W.finishHall(this.state);this.arrays(r.state);this.phase=this.hallReturn;break;
    case 'input':{
     const raw=this.key;if(raw>=127){const oldChannel=this.state.channel;this.state.scriptLow=raw;this.state.scriptHigh=0;r=C.dispatch(this.state,raw);this.key=r.key;this.arrays(r.state);
      if(raw===210)this.state.scriptLow=oldChannel;
      if(r.effect==='redraw')this.scene('tick');else if(r.effect==='enter-hall')this.enterHall('tick');else if(r.effect==='help')this.show('help');else if(r.effect==='quit')this.show('quit');else this.phase='tick';
     }else this.phase='tick';break;}
    default:throw new Error('Unsupported native maze phase '+this.phase);
   }
  }
  enterHall(after){const before=this.state,frames=[],r=F.hall(this.state,{page:this.frame,onFrame:p=>frames.push(p)});this.state=r.state;this.hallReturn=after;this.enqueue(Pacing?.hall(before,this.frame,frames)||frames,'hallRedraw',false,T.waits['400']+30000);}
  runCycles(budget){
   if(!Number.isFinite(budget)||budget<0)throw new Error('Invalid native maze budget');const requested=Math.ceil(budget);let left=requested,guard=0;
   while(left>0&&!this.stopped){if(++guard>10000)throw new Error('Native maze transition budget');
    if(this.phase==='presentLead'){const used=Math.min(left,this.remaining);left-=used;this.cycles+=used;this.remaining-=used;if(!this.remaining)this.phase='presentation';}
    else if(this.phase==='frames'){
     const used=Math.min(left,this.remaining);left-=used;this.cycles+=used;this.remaining-=used;
     if(!this.remaining){if(this.queue.length){const f=this.queue.shift();this.applyFrame(f);}else this.completeQueue();}
    }else if(this.phase==='presentation'){
     const p=this.presentation;if(p.wait.type==='key'){if(p.key(this.key)){this.finishPresentation();continue;}this.cycles+=left;left=0;}
     else{const total=this.presentationWaitCycles(),oldIndex=p.index,used=Math.min(left,total-this.presentationCycles);left-=used;this.cycles+=used;this.presentationCycles+=used;const desired=Math.min(p.wait.iterations,Math.floor(this.presentationCycles*p.wait.iterations/total));p.advanceIterations(desired-p.elapsed);this.state=p.state;this.text=p.text;this.mixed=p.mixed;if(p.done)this.finishPresentation();else if(p.index!==oldIndex){this.presentationCycles=0;this.lead();}}
    }else this.transition();
   }
   const used=requested-left;this.project();return used;
  }
  stepLoop(){const start=this.loopSerial,fromTick=this.phase==='tick';let guard=0;do{if(++guard>10000)throw new Error('Native logical loop budget');if(this.phase==='presentLead')this.runCycles(this.remaining||1);else if(this.phase==='frames')this.runCycles(this.remaining||1);else if(this.phase==='presentation'){if(this.presentation.wait.type==='key'){if(!this.presentation.key(this.key))return false;this.finishPresentation();}else this.runCycles(this.presentationWaitCycles()-this.presentationCycles);}else this.transition();}while(!this.stopped&&(this.phase!=='tick'||fromTick&&this.loopSerial===start));this.project();return true;}
  press(key){this.key=C.keyCode(key);}
  hgr(){return this.frame.slice();}
  snapshot(){return Save.encode(this);}
  project(){E.toMemory(this.state,this.memory);for(const [key,a]of Object.entries({scriptLow:0x65f7,scriptHigh:0x65f9,sceneCounter:0x65ff,labelRotation:0x6611,labelScale:0x6615,collisionX:0x65eb})){this.memory[a]=this.state[key]>>8;this.memory[a+1]=this.state[key]&255;}for(let i=0;i<3;i++){const a=this.state.actors[i];for(const [k,base]of Object.entries({type:0x9400,sequence:0x9440,x:0x94a0,phase:0x94c0,y:0x94e0}))this.memory[base+i]=a[k];this.memory[0x9460+i]=a.pointer&255;this.memory[0x9480+i]=a.pointer>>8;}this.memory[0x9403]=255;this.memory.set(this.frame,0x2000);let screen=this.presentation;if(!screen&&['RUN KA','RUN AZ'].includes(this.stopped)){screen=new P.Presentation(this.stopped==='RUN KA'?'mechanism':'quit',clone(this.state));for(const [i,a]of [768,770,771,772].entries())this.memory[a]=[99,this.state.victim,this.state.slotCode,this.state.health][i];}if(screen){const cells=screen.textBytes();for(let y=0;y<24;y++)for(let x=0;x<40;x++)this.memory[0x400+(y&7)*128+(y>>3)*40+x]=cells[y*40+x];}}
 }
 Object.assign(e,{NativeMaze});
})(typeof module==='object'?module.exports:(globalThis.AmazonNativeMaze={}));
