(function(e){
 'use strict';const G=typeof module==='object'?require('./graphics.js'):AmazonGraphics;
 const validPoint=p=>Array.isArray(p)&&p.length===2&&Number.isInteger(p[0])&&p[0]>=0&&p[0]<280&&Number.isInteger(p[1])&&p[1]>=0&&p[1]<192;
 function pixel(page,x,y,color){
  const column=Math.floor(x/7),mask=128|(1<<(x%7)),at=G.address(y,column);
  // Original ASL/CMP #$C0/BPL tests the signed subtraction result. For an
  // arbitrary color byte, odd-byte inversion applies to low seven bits 32..95.
  if((column&1)&&(((color<<1)-192)&128))color^=127;
  page[at]=((page[at]&~mask)|(color&mask))&255;
 }
 function line(page,from,to,color){
  if(!page||page.length!==8192||!validPoint(from)||!validPoint(to)||!Number.isInteger(color)||color<0||color>255)throw new Error('Invalid native HGR line');
  const [sx,sy]=from,[x,y]=to;let xx=sx,yy=sy,dx=Math.abs(x-sx),dy=Math.abs(y-sy),error=dx-dy;
  // The ROM takes one axis step per iteration; ties step x first. Retain every
  // intermediate plotted point rather than substituting a conventional line.
  for(let remaining=dx+dy+1;remaining>0;remaining--){pixel(page,xx,yy,color);if(error>=0){xx+=x>=sx?1:-1;error-=dy;}else{yy+=y>=sy?1:-1;error+=dx;}}
  return page;
 }
 Object.assign(e,{line});
})(typeof module==='object'?module.exports:(globalThis.AmazonHgrLines={}));
