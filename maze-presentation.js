(function(e){
 'use strict';const node=typeof module==='object',D=node?require('./maze-flow-data.js'):MAZE_FLOW_DATA,T=node?require('./screen.js'):AmazonScreen;
 const scripts={help:[['help',0]],mechanism:[['mechanism',16000]],quit:[['return',9000]],starvation:[['starvation',16000],['return',9000]],fatalTrap:[['fatalTrap',14000],['return',9000]]};
 class Presentation{
  constructor(kind,state){
   if(!scripts[kind])throw new Error('Invalid maze presentation');
   this.kind=kind;this.state=JSON.parse(JSON.stringify(state));this.index=0;this.elapsed=0;this.done=false;this.keyboardCleared=false;this.load();
  }
  load(){
   const step=scripts[this.kind][this.index];this.screen=new T.TextScreen();this.raw=new Uint8Array(960).fill(160);for(const line of D.lines[step[0]]){this.screen.write(line.row,line.col,line.text);for(let i=0;i<line.text.length;i++)this.raw[(line.row-1)*40+line.col-1+i]=line.text.charCodeAt(i)|160;}
   this.text=this.kind!=='mechanism';this.mixed=this.kind==='mechanism';this.wait={type:step[1]?'iterations':'key',iterations:step[1]};this.elapsed=0;if(step[1])this.state.scriptLow=1;
  }
  advanceIterations(count){
   if(!Number.isSafeInteger(count)||count<0)throw new Error('Invalid maze wait advance');
   if(this.done||this.wait.type!=='iterations')return count;
   const used=Math.min(count,this.wait.iterations-this.elapsed);this.elapsed+=used;this.state.scriptLow=this.elapsed+1;
   if(this.elapsed===this.wait.iterations){if(++this.index<scripts[this.kind].length)this.load();else this.finish();}
   return count-used;
  }
  key(raw){
   if(!Number.isInteger(raw)||raw<0||raw>255)throw new Error('Invalid maze key');
   if(this.done||this.wait.type!=='key'||raw<127)return false;
   this.state.scriptLow=0;this.keyboardCleared=true;this.finish();return true;
  }
  finish(){this.done=true;this.text=this.kind!=='help'&&this.kind!=='mechanism';this.mixed=this.kind==='mechanism';this.wait=null;this.effect=this.kind==='help'?'resume':'handoff';this.command=this.kind==='help'?null:this.kind==='mechanism'?'RUN KA':'RUN AZ';if(this.command)this.returnBytes=[99,this.state.victim,this.state.slotCode,this.state.health];}
  textBytes(){return this.raw.slice();}
  page(){const s=new T.TextScreen();s.cells=this.screen.cells.slice();s.styles=this.screen.styles.slice();return s;}
 }
 Object.assign(e,{Presentation});
})(typeof module==='object'?module.exports:(globalThis.AmazonMazePresentation={}));
