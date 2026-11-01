(function(){
  'use strict';
  const canvas=document.querySelector('#game-screen'),context=canvas.getContext('2d');
  const transcript=document.querySelector('#game-transcript'),entry=document.querySelector('#name-entry');
  const help=document.querySelector('#help'),touch=document.querySelector('#touch');
  const unbase64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  let storage=null;
  try {storage=localStorage;}catch(error){/* The game remains usable without storage. */}
  const nativePreview=typeof globalThis.URLSearchParams==='function'&&new globalThis.URLSearchParams(globalThis.location?.search||'').get('maze')==='native';
  if(nativePreview&&storage){const original=storage;storage={getItem:key=>original.getItem(key+'.native-preview'),setItem:(key,value)=>original.setItem(key+'.native-preview',value)};}
  const game=new AmazonGame.Game({assets:AMAZON_DATA.assets,flintData:FLINT_DATA,pedroData:PEDRO_DATA,gameData:GAME_DATA,fieldData:FIELD_DATA,titleData:TITLE_DATA,storage,now:performance.now()});
  const mazeAudio=globalThis.AmazonMazeAudio?new AmazonMazeAudio.Player():null;
  const font=unbase64(GAME_DATA.font);
  let lastRevision=-1,lastPhase=null,lastScene='',lastTranscript='',pausedAt=0;
  function draw(force=false){
    const phase=Math.floor(performance.now()/500)%2===0;
    if(!force&&game.revision===lastRevision&&phase===lastPhase)return;
    const view=game.visual();
    if(force||game.revision!==lastRevision||(view.kind==='text'&&phase!==lastPhase)){
      const rgba=view.kind==='text'?view.screen.pixels(font,phase):AmazonGraphics.pixels(view.page,view.mono);
      if(view.kind==='mixed'){const text=view.screen.pixels(font,phase);rgba.set(text.subarray(160*280*4),160*280*4);}
      context.clearRect(0,0,280,192);
      context.putImageData(new ImageData(rgba,280,192),0,0);
    }
    lastRevision=game.revision;lastPhase=phase;
    canvas.dataset.scene=game.scene;
    const text=game.transcript();
    if(text!==lastTranscript){transcript.textContent=text;lastTranscript=text;}
    entry.disabled=game.scene!=='applications';
    entry.setAttribute('aria-hidden',game.scene==='applications'?'false':'true');
    if(game.scene==='applications'){
      entry.setAttribute('aria-label',AmazonFlint.roles[game.member]+' name, 1 to 10 characters');
      if(entry.value!==game.input)entry.value=game.input;
      if(lastScene!=='applications'&&!help.open&&!touch.open)entry.focus({preventScroll:true});
    } else if(lastScene==='applications'||document.activeElement===entry){entry.blur();canvas.focus({preventScroll:true});}
    canvas.setAttribute('aria-label',game.scene==='applications'?'Expedition Amazon: type '+AmazonFlint.roles[game.member]+' name and press Return.':'Expedition Amazon: '+game.scene.replaceAll('-',' ')+'. Use the keys printed on the display.');
    document.querySelector('#save-notice').textContent=game.warning;
    lastScene=game.scene;
  }
  function send(key){if(help.open)return;mazeAudio?.unlock().catch(()=>{});game.key(key);draw(true);}
  canvas.addEventListener('click',()=>{if(game.scene==='cover')send('Enter');if(game.scene==='applications')entry.focus({preventScroll:true});else canvas.focus({preventScroll:true});});
  entry.addEventListener('input',()=>{game.setName(entry.value);draw(true);});
  entry.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.stopPropagation();send('Enter');entry.value=game.input;}});
  document.addEventListener('keydown',event=>{
    if(event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return;
    if(event.key==='F1'){event.preventDefault();help.open=!help.open;return;}
    if(event.key==='Escape'&&(help.open||touch.open)){event.preventDefault();help.open=false;touch.open=false;canvas.focus({preventScroll:true});return;}
    if(help.open||event.repeat&&game.scene!=='applications')return;
    if(event.target===entry||event.target.closest('button,summary,a,input'))return;
    const movement={ArrowUp:'I',ArrowDown:'M',ArrowLeft:'J',ArrowRight:'K'};
    if(game.scene==='field'&&movement[event.key]){event.preventDefault();send(movement[event.key]);return;}
    if(event.key.length===1||['Enter','Backspace'].includes(event.key)){event.preventDefault();send(event.key);}
  });
  document.querySelector('#type-name').onclick=()=>{
    touch.open=false;if(game.scene==='applications')entry.focus({preventScroll:true});else canvas.focus({preventScroll:true});
  };
  const keys=['1','2','3','4','5','6','7','8','9','0',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ','Space','Backspace','Return'];
  for(const key of keys){
    const button=document.createElement('button');button.textContent=key;button.type='button';button.setAttribute('aria-label','Game key '+key);
    button.onclick=()=>{send(key==='Return'?'Enter':key==='Space'?' ':key);};
    document.querySelector('#touch-keys').append(button);
  }
  help.addEventListener('toggle',()=>{
    if(help.open){pausedAt=performance.now();mazeAudio?.reset();}
    else if(pausedAt){const elapsed=performance.now()-pausedAt;game.coverStart+=elapsed;if(game.trapPlayback)game.trapPlayback.start+=elapsed;if(game.trapClock)game.trapClock+=elapsed;game.mazeClock=performance.now();game.doorClock=performance.now();game.clock=performance.now();if(game.deadline)game.deadline+=elapsed;pausedAt=0;draw(true);}
  });
  function tick(now){if(!help.open){game.tick(now);if(game.mazeEngine?.drainAudio)mazeAudio?.play(game.mazeEngine.drainAudio(),{cycle:game.mazeEngine.cycles,stream:game.mazeEngine});draw();}requestAnimationFrame(tick);}
  draw(true);requestAnimationFrame(tick);
  // Only the opening excerpt is pre-recorded. Native Flint and Pedro are live.
  (async()=>{
    const frames=[];let previous=new Uint8Array(8192);
    for(const record of AMAZON_DATA.animation.frames_data){
      const stream=new Blob([unbase64(record.xor_zlib_base64)]).stream().pipeThrough(new DecompressionStream('deflate'));
      const patch=new Uint8Array(await new Response(stream).arrayBuffer());
      if(patch.length!==8192)throw new Error('Invalid cover frame');
      const page=previous.map((v,i)=>v^patch[i]);frames.push({cycle:record.cycle,page});previous=page;
    }
    game.setCoverFrames(frames);draw(true);
  })().catch(error=>{console.warn('Opening animation unavailable; the recovered cover and native game remain playable.',error);});
})();
