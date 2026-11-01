(function(e){
'use strict';
const G=typeof require==='function'?require('./graphics.js'):globalThis.AmazonGraphics;
const D=typeof require==='function'?require('./maze-vector-data.js'):globalThis.MAZE_VECTOR_DATA;
const byte=n=>n&255;
class MazeVectors{
 constructor({page=new Uint8Array(8192)}={}){
  if(page.length!==8192)throw new Error('Invalid vector page');
  this.buffer=Uint8Array.from(page);this.cursor=[140,6];this.color=4;this.activeColor=4;this.pattern=0;
 }
 page(){return this.buffer.slice();}
 position(x,y){if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>279||y<0||y>191)throw new Error('Unsupported MP coordinate '+x+','+y);this.cursor=[x,y];this.activeColor=this.color;}
 pixel(x,y){
  const col=Math.floor(x/7),a=G.address(y,col),mask=128|(1<<(x%7));let c=D.colors[this.activeColor];
  if((col&1)&&[42,85].includes(c&127))c^=127;
  this.buffer[a]=(this.buffer[a]&~mask)|(c&mask);
 }
 line(x,y){
  const [sx,sy]=this.cursor,active=this.activeColor;this.position(x,y);this.activeColor=active;
  let xx=sx,yy=sy,dx=Math.abs(x-sx),dy=Math.abs(y-sy),err=dx-dy;
  for(let n=dx+dy+1;n>0;n--){this.pixel(xx,yy);if(err>=0){xx+=x>=sx?1:-1;err-=dy;}else{yy+=y>=sy?1:-1;err+=dx;}}
 }
 fill(x,y){
  const cursor=this.cursor.slice(),active=this.activeColor;this.position(x,y);this.cursor=cursor;this.activeColor=active;
  let col=Math.floor(x/7),phase=x%7;
  const probe=()=>{const a=G.address(y,col);return (this.buffer[a]&D.probeMasks[phase])===D.probeMasks[phase];};
  while(probe()&&y!==0)y--;
  if(!probe())y++;
  if(y>=192)throw new Error('Unsupported MP offscreen fill seed');
  const pair=D.fillPairs[(this.pattern*2)&255],pair2=D.fillPairs[((this.pattern*2)&255)+1];
  const paint=(column,mask)=>{
   const a=G.address(y,column),old=this.buffer[a],rowPattern=(y&1)?pair2:pair;
   const pattern=D.patterns[((rowPattern<<2)&255)|(column&3)];
   this.buffer[a]=((old^mask)&127)|(pattern&mask);
  };
  // The original scans spans of set bits, with two-bit seed probes. Bound work
  // rather than silently treating malformed/offscreen fills as ordinary scenes.
  for(let rows=0;rows<192;rows++){
   if(y>=192)break;
   let left=col,right=col,fd=255,fe=7,fc=this.buffer[G.address(y,col)];
   const leftPart=v=>{v&=127;if(v===127)return 255;for(let bit=6;bit>=0;bit--)if(!(v&(1<<bit))){fd=bit;return D.leftMasks[bit];}};
   const rightPart=v=>{v&=127;if(v===127)return 255;for(let bit=0;bit<7;bit++)if(!(v&(1<<bit))){fe=bit;return D.rightMasks[bit];}};
   const l=leftPart(fc|D.leftMasks[phase]),r=rightPart(fc|D.rightMasks[phase]);paint(col,l&r);
   while(fd===255){left--;if(left<0){left=0;fd=0;break;}paint(left,leftPart(this.buffer[G.address(y,left)]));}
   while(fe===7){right++;if(right===40){right=39;fe=6;break;}paint(right,rightPart(this.buffer[G.address(y,right)]));}
   x=Math.floor(((left+right)*7+fd+fe)/2);col=Math.floor(x/7);phase=x%7;y++;
   if(y===192||!probe())break;
  }
 }
 draw(raw,{clear=false,origin=null,stop=false,onCommand=null}={}){
  const stream=Uint8Array.from(raw);let p=0;
  if(clear)this.buffer.fill(255);
  this.color=4;this.activeColor=4;this.pattern=0;this.position(140,6);
  const read=()=>{if(p>=stream.length)throw new Error('Truncated MP command');return stream[p++];};
  let relative=null;if(origin){if(origin.length!==3||origin.some(n=>!Number.isInteger(n)||n<0||n>255))throw new Error('Invalid MP origin');relative=[((read()&1)<<8)|read(),read()];if(stop)return {consumed:p,cursor:this.cursor.slice()};}
  for(let count=0;count<8192;count++){
   const at=p,command=read(),op=command&240,lo=command&15;
   if(onCommand)onCommand({relative:at,opcode:command,page:this.page()});
   if(op===0)return {consumed:p,cursor:this.cursor.slice()};
   if(op===32){if(lo>7)throw new Error('Unsupported MP color');this.color=lo;}
   else if(op===96)this.pattern=read();
   else if([128,160,224].includes(op)){
    let x=(lo<<8)|read(),y=read();
    if(relative){x=(x-relative[0]+origin[0]+256*origin[1])&65535;y=byte(y-relative[1]+origin[2]);}
    if(op===128)this.position(x,y);else if(op===160)this.line(x,y);else this.fill(x,y);
   }else throw new Error('Unsupported MP opcode '+op.toString(16));
   if(stop)return {consumed:p,cursor:this.cursor.slice()};
  }
  throw new Error('MP command budget exceeded');
 }
}
function streamAt(address){
 if(!Number.isInteger(address)||address<D.streamBase)throw new Error('Invalid MP stream address');
 const data=typeof Buffer==='function'?Uint8Array.from(Buffer.from(D.streams,'base64')):Uint8Array.from(atob(D.streams),c=>c.charCodeAt(0));
 const offset=address-D.streamBase;if(offset>=data.length)throw new Error('Invalid MP stream address');return data.slice(offset);
}
Object.assign(e,{MazeVectors,streamAt});
})(typeof module==='object'?module.exports:(globalThis.AmazonMazeVectors={}));
