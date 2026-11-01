(function(exports){
 'use strict';const node=typeof module==='object',D=node?require('./maze-sprite-data.js'):MAZE_SPRITE_DATA,G=node?require('./graphics.js'):AmazonGraphics;
 const bytes=s=>Uint8Array.from(node?Buffer.from(s,'base64'):atob(s),v=>typeof v==='number'?v:v.charCodeAt(0));
 const actorCopy=a=>{if(!a||!['type','sequence','x','phase','y'].every(k=>Number.isInteger(a[k])&&a[k]>=0&&a[k]<=255)||!Number.isInteger(a.pointer)||a.pointer<0||a.pointer>65535)throw new Error('Invalid maze sprite actor.');return {...a};};
 class MazeSprites {
  constructor({page=new Uint8Array(8192),actors=D.actors}={}){
   if(page.length!==8192||!Array.isArray(actors)||actors.length>3)throw new Error('Invalid maze sprite scene.');
   this._page=Uint8Array.from(page);this.data=bytes(D.data);this.actors=actors.map(actorCopy);this.sequences=D.sequences.map(x=>x.slice());
  }
  read(pointer){const i=pointer-D.base;if(!Number.isInteger(i)||i<0||i>=this.data.length)throw new Error('Maze motion pointer outside recovered data.');return this.data[i];}
  draw(actor,clear=false){
   const shape=D.shapes[actor.type];if(!shape||(!clear&&(!Number.isInteger(actor.phase)||actor.phase<0||actor.phase>6)))throw new Error('Unsupported maze sprite type or phase.');
   const source=clear?0:shape.frames[actor.phase];let index=0;
   for(let row=0;row<shape.height;row++)for(let column=0;column<shape.width;column++,index++){
    const y=(actor.y+row)&255,x=(actor.x+column)&255;
    if(y<192&&x<40)this._page[G.address(y,x)]=clear?0:this.data[source+(index&255)];
   }
  }
  advanceActor(slot){
   const a=this.actors[slot];if(a.type>=128||a.sequence>=128)return;
   let command;
   for(let changes=0;changes<64;changes++){
    command=this.read(a.pointer);a.pointer=(a.pointer+1)&65535;
    if(command)break;
    a.sequence=(a.sequence+1)&255;
    let flag=this.sequences[slot][a.sequence];
    if(flag===255){a.sequence=0;flag=this.sequences[slot][0];}
    if(flag===255)throw new Error('Maze sequence has no playable path.');
    if(flag===undefined)throw new Error('Maze motion sequence outside recovered table.');
    if(flag>=128){a.sequence=flag;if(flag===254)this.draw(a);else this.draw(a,true);return;}
    if(D.paths[flag]===undefined)throw new Error('Maze motion path index unavailable.');
    a.pointer=D.paths[flag];
   }
   if(!command)throw new Error('Maze motion path did not advance.');
   a.y=(a.y+D.movement[(command&15)*8+7])&255;
   const step=D.movement[((command&240)>>1)|a.phase];
   if(step===undefined)throw new Error('Maze motion phase outside recovered lookup.');
   a.phase=step&7;if(step&192)a.x=(a.x+(step&128?-1:1))&255;
   this.draw(a);
  }
  step(onActor){
   for(let slot=0;slot<this.actors.length;slot++){
    if(this.actors[slot].type===255)break;
    this.advanceActor(slot);if(onActor)onActor(slot,this);
   }
  }
  page(){return this._page.slice();}
 }
 function actorsFromMemory(memory){
  const actors=[];for(let i=0;i<3;i++){const type=memory[0x9400+i];if(type===255)break;actors.push({type,sequence:memory[0x9440+i],pointer:memory[0x9460+i]+256*memory[0x9480+i],x:memory[0x94a0+i],phase:memory[0x94c0+i],y:memory[0x94e0+i]});}return actors;
 }
 Object.assign(exports,{MazeSprites,actorsFromMemory});
})(typeof module==='object'?module.exports:(globalThis.AmazonMazeSprites={}));
