(function (exports) {
  'use strict';
  const addr = (y, x=0) => (y&7)*1024 + ((y>>3)&7)*128 + (y>>6)*40 + x;
  const bytes = s => Uint8Array.from(typeof Buffer === 'function' ? Buffer.from(s,'base64') : atob(s), v => typeof v==='number' ? v : v.charCodeAt(0));
  class Flint {
    constructor(data, background) {
      this.data=data; this.background=Uint8Array.from(background,v=>v===128?0:v); this.page=this.background.slice();
      this.state=data.initial.slice(); this.seed=data.seed; this.clip=130; this.delay=10; this.lastDelay=10; this.exited=false;
      this.sprites=data.sprites.map(s=>({...s,bytes:bytes(s.bytes),mask:bytes(s.mask)}));
    }
    get(a) { return this.state[a-0x8003]; }
    set(a,v) { this.state[a-0x8003]=v&255; }
    random(low,high) { this.seed=(this.seed*8192)%0x03ffdb9b; return low+Math.floor(this.seed/0x03ffdb9b*(high-low+1)); }
    reset() {
      for(const [a,v] of [[0x8009,1],[0x800a,128],[0x800b,40],[0x800c,15],[0x800d,165],[0x800e,67],[0x8007,0],[0x8008,0]])this.set(a,v);
      this.delay=10;this.clip=130;
    }
    draw() {
      for(let slot=1;slot>=0;slot--) {
        const frame=this.get(0x8009+slot);if(frame&128)continue;
        const s=this.sprites[frame],x=this.get(0x800b+slot),y=this.get(0x800d+slot);let n=0;
        for(let dy=0;dy<s.height;dy++) {
          const yy=(y+dy)&255;if(yy>=192)continue;
          const max=yy<this.clip?21:40;
          for(let dx=0;dx<s.width;dx++,n++) {
            const xx=(x+dx)&255;if(xx>=max)continue;
            const at=addr(yy,xx);this.page[at]=(this.background[at]&s.mask[n])|s.bytes[n];
          }
        }
      }
    }
    step(key='') {
      if(this.exited)return;
      if(key){this.exited=true;return;}
      if(this.get(0x8007)) {
        const x=this.get(0x800b);
        if(x>=200||x<40){this.set(0x800b,x+1);this.set(0x800d,this.get(0x800d)-3);}
        else {this.reset();this.lastDelay=200;return;}
      } else if(this.get(0x8008)) {
        this.set(0x8008,this.get(0x8008)-1);
        if(this.get(0x8008)===1){this.set(0x800b,this.get(0x800b)-1);this.set(0x8008,this.get(0x8008)-1);}
      } else if(this.get(0x800b)===253) {
        this.set(0x8009,128);this.set(0x8006,128);this.set(0x800a,0);
      } else if(this.get(0x8009)===1)this.set(0x8009,2);
      else {
        this.set(0x8009,1);this.set(0x800b,this.get(0x800b)-1);
        if(this.get(0x800b)===6)this.set(0x8008,this.random(5,40));
      }
      if(this.get(0x8006)) {
        if(!this.get(0x8007)&&this.get(0x800e)>=151){this.clip=0;this.set(0x8009,3);this.set(0x8007,3);}
        this.set(0x800e,this.get(0x800e)+7);
        if(this.get(0x800e)>=191){this.set(0x800a,128);this.set(0x8006,0);}
        else this.set(0x800c,this.get(0x800c)-2);
        this.delay=1;
      }
      this.lastDelay=this.delay;this.draw();
    }
    get tickMs(){return this.lastDelay*this.data.delay_loop_ms;}
  }
  const roles=['FIELD ASSISTANT','MEDIC','RADIO OPERATOR','GUARD'];
  function namesValid(names) {
    const clean=names.map(n=>n.trim().toUpperCase());
    if(clean.length!==4||clean.some(n=>!n||n.length>10||!/^[\x20-\x7e]+$/.test(n)))throw new Error('Enter four names, each 1–10 printable characters.');
    if(new Set(clean).size!==4)throw new Error('Each team member needs a different name.');
    return clean;
  }
  // Browser-only cheat loadout; quantities match the user-supplied trading-post screenshot.
  const cheatInventory=[8,2,4,4,2,4,0,0,0,200,8,8,0];
  function createExpedition(slot,difficulty,names) {
    if(!['A','B'].includes(slot))throw new Error('Invalid expedition slot.');
    if(!Number.isInteger(difficulty)||difficulty<1||difficulty>9)throw new Error('Choose a difficulty from 1 to 9.');
    const clean=namesValid(names);
    const cheatMode=clean.every((n,i)=>n===['UU','DD','LRLR','BA'][i]);
    return {...(cheatMode?{cheatMode:true}:{}),slot,difficulty,cash:cheatMode?1760:Math.floor(6000/difficulty),team:clean.map((name,i)=>({name,role:roles[i],injury:0,level:0,energy:10})),inventory:cheatMode?cheatInventory.slice():Array(13).fill(0),location:'flint'};
  }
  function validateSave(value) {
    if(!value||value.version!==1||!value.slots||typeof value.slots!=='object')throw new Error('Unsupported expedition save.');
    for(const slot of ['A','B']) {
      const e=value.slots[slot];if(e===null)continue;
      if(!e||e.slot!==slot)throw new Error('Invalid expedition save.');
      const named=createExpedition(slot,e.difficulty,e.team?.map(t=>t.name)||[]);
      if(e.cheatMode!==undefined&&typeof e.cheatMode!=='boolean')throw new Error('Invalid expedition mode.');
      if(named.cheatMode)e.cheatMode=true;
      if(!Number.isFinite(e.cash)||e.cash<0||!Array.isArray(e.inventory)||e.inventory.length!==13||e.inventory.some(n=>!Number.isInteger(n)||n<0)||!['flint','iquitos','base-camp'].includes(e.location))throw new Error('Invalid expedition save.');
      if(e.team.some((t,i)=>t.role!==roles[i]||![t.injury,t.level,t.energy].every(n=>Number.isFinite(n)&&n>=0)))throw new Error('Invalid expedition team.');
    }
    return value;
  }
  Object.assign(exports,{Flint,roles,namesValid,createExpedition,validateSave});
})(typeof module==='object'?module.exports:(globalThis.AmazonFlint={}));
