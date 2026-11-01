(function(exports){
 'use strict';const node=typeof module==='object',G=node?require('./graphics.js'):AmazonGraphics,{TextScreen}=node?require('./screen.js'):AmazonScreen;
 const on=(p,x,y)=>Boolean(p[G.address(y,Math.floor(x/7))]&(1<<(x%7)));
 function set(p,x,y){p[G.address(y,Math.floor(x/7))]|=1<<(x%7);}
 function render(kind,originalFlint,font){
  const page=new Uint8Array(8192),screen=new TextScreen();
  // MENU1's 270x180 border is copied at 1:1 scale into a centered 280x192 frame.
  for(let y=0;y<180;y++)for(let x=0;x<270;x++)if((x<15||x>=255||y<15||y>=165)&&on(originalFlint,x,y))set(page,x+5,y+6);
  const header=text=>' '.repeat(Math.floor((30-text.length)/2))+text+' '.repeat(Math.ceil((30-text.length)/2));
  const title=kind==='title';
  // Shared title/option positions keep both menus aligned through the transition.
  screen.center(5,header(title?'EXPEDITION':'WELCOME TO'),1).center(6,header(title?'AMAZON':'FLINT UNIVERSITY'),1);
  if(title)screen.center(8,'COPYRIGHT 1984 PENGUIN SOFTWARE').center(9,'DESIGNED BY WILLARD PHILLIPS');
  screen.center(12,title?"PLAYER'S OPTIONS":'YOU MAY:');
  const options=title?['V) VIEW TITLE ILLUSTRATIONS','R) REVIEW INSTRUCTIONS','S) START THE GAME','X) XIT THE GAME']:['1) START A NEW EXPEDITION','2) RESUME AN EXPEDITION','3) VIEW ILLUSTRATION','4) XIT THE GAME'];
  options.forEach((text,i)=>{const row=14+i*2,col=Math.floor((40-text.length)/2)+1;screen.write(row,col,text).write(row,col,text[0],1);});
  const rgba=screen.pixels(font,false);for(let y=0;y<192;y++)for(let x=0;x<280;x++)if(rgba[(y*280+x)*4])set(page,x,y);
  return {page,screen};
 }
 exports.render=render;
})(typeof module==='object'?module.exports:(globalThis.AmazonMenus={}));
