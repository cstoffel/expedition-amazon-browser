(function(exports){
 'use strict';
 const node=typeof module==='object',D=node?require('./ending-data.js'):ENDING_DATA,G=node?require('./graphics.js'):AmazonGraphics,T=node?require('./ending-timing-data.js'):globalThis.ENDING_TIMING_DATA;
 const bytes=s=>Uint8Array.from(node?Buffer.from(s,'base64'):atob(s),v=>typeof v==='number'?v:v.charCodeAt(0));
 function decodeDoor(packed,background=new Uint8Array(8192)){
  const page=Uint8Array.from(background);if(page.length!==8192)throw new Error('Invalid ending graphics page.');
  let source=0,remaining=0,value=0;
  const read=()=>{if(source>=packed.length)throw new Error('Truncated ending image.');return packed[source++];};
  // EX has no rectangle header: full 40-column HGR, odd rows then even rows.
  for(const parity of [1,0])for(let x=0;x<40;x++)for(let y=parity;y<192;y+=2){
   if(!remaining){value=read();if(!value){remaining=read()||256;value=read();}else remaining=1;}
   page[G.address(y,x)]=value;remaining--;
  }
  return page;
 }
 class Ending {
  constructor(){
   this.cycles=0;this._phase='draw';this._remaining=0;this._profile=null;this._page=decodeDoor(bytes(D.picture));this.data=bytes(D.animation.data);
   this.actors=D.animation.actors.map(a=>({...a,paths:a.paths.slice()}));
  }
  read(address){const i=address-D.animation.base;if(i<0||i>=this.data.length)throw new Error('Ending motion pointer outside recovered data.');return this.data[i];}
  draw(actor){
   const frame=D.animation.frames[actor.phase];if(!frame)throw new Error('Invalid ending sprite phase.');
   // IC's width/height scratch is in HGR screen holes; retain those bytes too.
   this._page[0xf9]=frame.width;this._page[0xfa]=0;
   let source=frame.offset;
   for(let row=0;row<frame.height;row++){
    const y=(actor.y+row)&255;
    for(let column=0;column<frame.width;column++,source++){
     const x=(actor.x+column)&255;
     if(y<192&&x<40)this._page[G.address(y,x)]=this.data[source];
    }
   }
  }
  step(){
   for(const actor of this.actors){
    let command;
    // A zero ends a path segment; $FF in the sequence table restarts its loop.
    for(let changes=0;changes<16;changes++){
     command=this.read(actor.pointer++);
     if(command)break;
     actor.sequence=(actor.sequence+1)%actor.paths.length;actor.pointer=actor.paths[actor.sequence];
    }
    if(!command)throw new Error('Ending motion path did not advance.');
    // The four low bits move +/-1 or +/-2 pixels, represented as byte+phase.
    for(const [bit,delta] of [[1,1],[2,2],[4,-1],[8,-2]])if(command&bit){
     const next=actor.phase+delta,carry=Math.floor(next/7);actor.phase=(next+7)%7;actor.x=(actor.x+carry)&255;
    }
    actor.y=(actor.y+Number(!!(command&16))+2*Number(!!(command&32))-Number(!!(command&64))-2*Number(!!(command&128)))&255;
    this.draw(actor);
   }
  }
  timingKey(){return JSON.stringify(this.actors.map(a=>['x','phase','y','sequence','pointer'].map(k=>a[k])));}
  runCycles(budget){
   if(!Number.isFinite(budget)||budget<0)throw new Error('Invalid ending cycle budget');const requested=Math.ceil(budget);let left=requested,guard=0;
   while(left>0){if(++guard>10000)throw new Error('Ending transition budget');if(!this._remaining){if(this._phase==='draw')this._profile=T?.profiles[this.timingKey()]||T?.fallback||{draw:15000,gap:87048};this._remaining=this._profile[this._phase];}
    const used=Math.min(left,this._remaining);left-=used;this.cycles+=used;this._remaining-=used;
    if(!this._remaining){if(this._phase==='draw'){this.step();this._phase='gap';}else this._phase='draw';}
   }return requested;
  }
  page(){return this._page.slice();}
 }
 Object.assign(exports,{Ending,decodeDoor});
})(typeof module==='object'?module.exports:(globalThis.AmazonEnding={}));
