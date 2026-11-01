(async()=>{
 'use strict';
 const message=document.querySelector('#access-error'),transcript=document.querySelector('#access-error-text');
 const canvas=document.querySelector('#access-error-screen'),context=canvas.getContext('2d');
 // Standalone gateway glyphs: do not load game-data.js or screen.js while locked.
 const font=Uint8Array.from(atob('ABwiKi4sIB4ACBQiIj4iIgA8IiI8IiI8ABwiICAgIhwAPCIiIiIiPAA+ICA8ICA+AD4gIDwgICAAHiAgICYiHgAiIiI+IiIiABwICAgICBwAAgICAgIiHAAiJCgwKCQiACAgICAgID4AIjYqKiIiIgAiIjIqJiIiABwiIiIiIhwAPCIiPCAgIAAcIiIiKiQaADwiIjwoJCIAHCIgHAIiHAA+CAgICAgIACIiIiIiIhwAIiIiIiIUCAAiIiIqKjYiACIiFAgUIiIAIiIUCAgICAA+AgQIECA+AD4wMDAwMD4AACAQCAQCAAA+BgYGBgY+AAAACBQiAAAAAAAAAAAAPgAAAAAAAAAAAAgICAgIAAgAFBQUAAAAAAAUFD4UPhQUAAgeKBwKPAgAMDIECBAmBgAQKCgQKiQaAAgICAAAAAAACBAgICAQCAAIBAICAgQIAAgqHAgcKggAAAgIPggIAAAAAAAACAgQAAAAAD4AAAAAAAAAAAAACAAAAgQIECAAABwiJioyIhwACBgICAgIHAAcIgIMECA+AD4CBAwCIhwABAwUJD4EBAA+IDwCAiIcAA4QIDwiIhwAPgIECBAQEAAcIiIcIiIcABwiIh4CBDgAAAAIAAgAAAAAAAgACAgQAAQIECAQCAQAAAA+AD4AAAAQCAQCBAgQABwiBAgIAAg='),c=>c.charCodeAt(0));
 let lines=['PASSWORD REQUIRED'],last='';
 function draw(){
  if(message.hidden)return;
  const phase=Math.floor(performance.now()/500)%2===0,signature=lines.join('|')+'|'+phase;
  if(signature!==last){
   const pixels=new Uint8ClampedArray(280*192*4);for(let i=3;i<pixels.length;i+=4)pixels[i]=255;
   function text(row,value){const left=Math.floor((280-value.length*7)/2);for(const [i,char]of [...value].entries())for(let y=0;y<8;y++)for(let x=0;x<7;x++)if(font[(char.charCodeAt(0)&63)*8+y]&(1<<(6-x))){const at=((row*8+y)*280+left+i*7+x)*4;pixels[at]=pixels[at+1]=pixels[at+2]=255;}}
   lines.forEach((line,i)=>text(9+i,line));text(13,'PRESS A KEY FOR PASSWORD SCREEN');
   if(phase)for(let y=0;y<8;y++)for(let x=0;x<7;x++){const at=((17*8+y)*280+136+x)*4;pixels[at]=pixels[at+1]=pixels[at+2]=255;}
   context.putImageData(new ImageData(pixels,280,192),0,0);last=signature;
  }
  requestAnimationFrame(draw);
 }
 document.addEventListener('keydown',event=>{if(!message.hidden){event.preventDefault();location.assign('index.html'+location.search);}});
 draw();
 try{
  if(sessionStorage.getItem('expedition-amazon.unlocked.v1')!=='1')return;
  for(const entry of document.querySelectorAll('script[data-game-src]')){
   await new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=entry.dataset.gameSrc;
    script.onload=resolve;script.onerror=()=>reject(Error('GAME COULD NOT LOAD. RELOAD TO TRY AGAIN.'));
    document.head.append(script);
   });
  }
  message.hidden=true;document.querySelector('main').hidden=false;
  document.querySelector('#game-screen').focus();
 }catch(error){
  lines=error.message==='GAME COULD NOT LOAD. RELOAD TO TRY AGAIN.'?['GAME COULD NOT LOAD','RELOAD TO TRY AGAIN']:['SESSION STORAGE UNAVAILABLE'];
  transcript.textContent=lines.join('. ')+'. Press a key for password screen.';
 }
})();
