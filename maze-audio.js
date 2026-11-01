(function(e){
 'use strict';const node=typeof module==='object',F=node?require('./maze-effects.js'):AmazonMazeEffects;
 class Player{
  constructor({AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,clockHz=1020484,lookAhead=0.03}={}){this.Context=AudioContextClass;this.clockHz=clockHz;this.lookAhead=lookAhead;this.context=null;this.scheduled=0;this.dropped=0;this.sources=new Set();this.anchor=null;this.stream=null;this.lastCycle=0;}
  async unlock(){if(!this.Context)return false;this.context||=new this.Context();await this.context.resume();return this.context.state==='running';}
  reset(){for(const source of this.sources){try{source.stop();}catch(error){/* Already ended. */}}this.sources.clear();this.anchor=null;this.lastCycle=0;}
  play(events,{cycle=events.at(-1)?.cycle??this.lastCycle,stream=this.stream}={}){
   if(!this.context||this.context.state!=='running')return 0;
   if(!Number.isFinite(cycle)||cycle<0||events.some((v,i)=>!Number.isFinite(v.cycle)||v.cycle<0||!Number.isFinite(v.gap)||v.gap<0||i&&v.cycle<events[i-1].cycle))throw new Error('Invalid native audio timeline');
   const now=this.context.currentTime,target=now+this.lookAhead;
   if(stream!==this.stream||cycle<this.lastCycle){this.reset();this.stream=stream;}
   if(this.anchor&&Math.abs(this.anchor.time+(cycle-this.anchor.cycle)/this.clockHz-target)>0.1)this.reset();
   this.anchor||={cycle,time:target};this.lastCycle=cycle;let count=0;
   for(const event of events){const time=this.anchor.time+(event.cycle-this.anchor.cycle)/this.clockHz;if(time<now-0.005){this.dropped++;continue;}
    const samples=F.speakerSamples([0,event.gap],{sampleRate:this.context.sampleRate,clockHz:this.clockHz}),buffer=this.context.createBuffer(1,samples.length,this.context.sampleRate);buffer.copyToChannel(samples,0);const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.context.destination);source.onended=()=>this.sources.delete(source);this.sources.add(source);source.start(Math.max(now,time));this.scheduled++;count++;
   }
   return count;
  }
 }
 e.Player=Player;
})(typeof module==='object'?module.exports:(globalThis.AmazonMazeAudio={}));
