(function(exports){
  'use strict';
  const node=typeof module==='object';
  const {TextScreen}=node?require('./screen.js'):AmazonScreen;
  const F=node?require('./flint.js'):AmazonFlint;
  const P=node?require('./pedro.js'):AmazonPedro;
  const S=node?require('./shop.js'):AmazonShop;
  const Field=node?require('./field.js'):AmazonField;
  const Maze=node?require('./maze-native.js'):globalThis.AmazonNativeMaze;
  const Ending=node?require('./ending.js'):AmazonEnding;
  const Menus=node?require('./menus.js'):AmazonMenus;
  const G=node?require('./graphics.js'):AmazonGraphics;
  const decode=s=>Uint8Array.from(node?Buffer.from(s,'base64'):atob(s),v=>typeof v==='number'?v:v.charCodeAt(0));
  const KEY='expedition-amazon.save.v1';
  class Game {
    constructor({assets,flintData,pedroData,gameData,fieldData=null,titleData=null,storage=null,now=0}){
      this.titleData=titleData;this.instructionPage=0;this.fieldData=fieldData;this.fieldPhase=true;this.assets=assets;this.flintData=flintData;this.pedroData=pedroData;this.gameData=gameData;this.storage=storage;
      this.now=now;
      this.revision=0;this.scene='cover';this.coverStart=now;this.coverFrames=[];this.coverIndex=-1;
      this.pages={};for(const [name,a] of Object.entries(assets))this.pages[name]=G.decode(decode(a.raw),a.format).page;
      this.menus={};for(const [name,m] of Object.entries(flintData.menus))this.menus[name]=decode(m.hgr);
      const menuFont=decode(gameData.font);this.menuViews={title:Menus.render('title',this.menus.MENU1,menuFont),flint:Menus.render('flint',this.menus.MENU1,menuFont)};
      this.campaign={version:1,active:null,slots:{A:null,B:null}};this.saveWritable=true;this.warning='';
      try {const raw=storage?.getItem(KEY);if(raw){const campaign=F.validateSave(JSON.parse(raw));const retired=[];for(const [slot,e] of Object.entries(campaign.slots)){const snapshot=e?.field?.maze?.snapshot;if(snapshot?.engine===undefined&&typeof snapshot?.memory==='string'&&snapshot?.cpu){campaign.slots[slot]=null;retired.push(slot);continue;}if(e?.field)Field.validate(e.field);if(e?.randomState)Field.validateRandomState(e.randomState);if(e?.artifacts&&(!Array.isArray(e.artifacts)||e.artifacts.length!==10||e.artifacts.some(v=>typeof v!=='string'||v.length>60)))throw new Error('Invalid artifacts');}if(retired.includes(campaign.active))campaign.active=['A','B'].find(slot=>campaign.slots[slot])||null;this.campaign=campaign;if(retired.length)this.warning='OLD MAZE SAVE '+retired.join('/')+' IS NO LONGER SUPPORTED. START A NEW EXPEDITION.';}}
      catch(error){this.warning='EXISTING SAVE UNREADABLE. SESSION ONLY.';this.saveWritable=false;}
      this.names=[];this.input='';this.member=0;this.slot='A';this.difficulty=1;this.error='';this.deadline=0;
    }
    get expedition(){return this.campaign.slots[this.campaign.active];}
    enter(scene){if(scene==='door'){this.doorClock=this.now;this.doorDebt=0;this.endingEngine=new Ending.Ending();}this.scene=scene;this.deadline=0;this.error='';this.revision++;}
    save(){
      if(!this.storage||!this.saveWritable)return;
      try {this.storage.setItem(KEY,JSON.stringify(this.campaign));}
      catch(error){this.warning='SAVING UNAVAILABLE. SESSION ONLY.';}
    }
    notice(lines,back){this.message=lines;this.back=back;this.enter('message');}
    cover(){this.enter('cover');this.coverStart=this.now;this.coverIndex=-1;}
    newExpedition(){
      this.slot=['A','B'].find(s=>!this.campaign.slots[s]);
      if(!this.slot){this.enter('slots-full');return;}
      this.names=[];this.member=0;this.input='';this.enter('institution');this.deadline=this.now+1200;
    }
    showFlint(){this.enter('flint-intro');this.deadline=this.now+1400;}
    animateFlint(){this.animation=new F.Flint(this.flintData,this.pages['B_FLINT.PAC']);this.clock=this.now;this.enter('flint-animation');}
    animatePedro(){this.animation=new P.Pedro(this.pedroData,this.pages['B_PEDRO.PAC']);this.clock=this.now;this.enter('pedro');}
    travel(destination,fromIquitos=false){
      if(destination==='base-camp')this.downRiver=false;this.destination=destination;this.fromIquitos=fromIquitos;this.expedition.location=destination;this.save();this.enter('journey');this.deadline=this.now+1800;
    }
    arrive(){this.enter(this.destination==='iquitos'?'iquitos':'camp');}
    beginShop(){this.enter('shop');}
    key(key){
      if(typeof key!=='string')return;
      if(this.trapPlayback&&['field','field-camp'].includes(this.scene)){this.trapKey=key;return;}
      if(this.scene==='applications'){this.nameKey(key);return;}
      const k=key.length===1?key.toUpperCase():key;
      switch(this.scene){
        case 'cover':if(k.length===1||k==='Enter')this.enter(this.titleData?'title':'flint-menu');break;
        case 'title':
          if(k==='R'){this.instructionPage=0;this.enter('instructions');}
          if(k==='S')this.enter('flint-menu');
          if(k==='V')this.cover();
          if(k==='X')this.enter('title-exit');
          break;
        case 'instructions':
          if(k.length===1||k==='Enter'){
            this.instructionPage++;this.revision++;
            if(this.instructionPage>=this.titleData.instructions.length)this.enter('title');
          }break;
        case 'title-exit':if(k.length===1||k==='Enter')this.enter('title');break;
        case 'flint-menu':
          if(k==='1')this.newExpedition();
          if(k==='2')this.enter('resume');
          if(k==='3')this.showFlint();
          if(k==='4')this.enter('exit');
          break;
        case 'exit':if(k.length===1||k==='Enter')this.cover();break;
        case 'institution':if(k.length===1||k==='Enter')this.enter('authorization');break;
        case 'authorization':if(k.length===1||k==='Enter')this.enter('difficulty');break;
        case 'difficulty':if(/^[1-9]$/.test(k)){this.difficulty=Number(k);this.names=[];this.member=0;this.input='';this.enter('applications');}break;
        case 'resume':
          if(['A','B'].includes(k)){
            if(!this.campaign.slots[k])this.notice(['NO EXPEDITION IN PROGRESS'],()=>this.enter('flint-menu'));
            else {this.campaign.active=k;this.save();this.enter(this.expedition.ending?'door':this.expedition.field?.mode==='jungle'?(this.fieldScene()):'travel');}
          }break;
        case 'slots-full':if(k==='Y')this.enter('disband-slot');else if(k==='N')this.enter('flint-menu');break;
        case 'disband-slot':if(['A','B'].includes(k)){this.slot=k;this.enter('disband-confirm');}break;
        case 'disband-confirm':
          if(k==='N')this.enter('flint-menu');
          if(k==='Y'){this.campaign.slots[this.slot]=null;if(this.campaign.active===this.slot)this.campaign.active=null;this.save();this.newExpedition();}
          break;
        case 'flint-intro':if(k.length===1||k==='Enter')this.animateFlint();break;
        case 'flint-animation':if(k.length===1||k==='Enter')this.enter('flint-menu');break;
        case 'travel':if(k==='1')this.travel('iquitos');else if(k==='2')this.travel('base-camp');break;
        case 'journey':if(k.length===1||k==='Enter')this.arrive();break;
        case 'iquitos':
          if(k==='V')this.enter('illustration-question');
          if(k==='M')this.enter('camp-confirm');
          if(k==='R'){this.reportBack='iquitos';this.enter('report');}
          if(k==='G')this.startMedical();
          if(k==='X'){this.save();this.enter('exit');}
          break;
        case 'illustration-question':if(k==='Y')this.animatePedro();else if(k==='N')this.beginShop();break;
        case 'pedro':
          if(k.length===1||k==='Enter'){
            this.animation.step(k==='Enter'?' ':k);this.revision++;
            if(this.animation.exited)this.beginShop();
          }break;
        case 'shop':
          if(k==='B'){this.tradeMode='buy';this.enter('shop-item');}
          if(k==='S'){this.tradeMode='sell';this.enter('shop-sell-kind');}
          if(k==='X'){this.save();this.enter('iquitos');}
          break;
        case 'shop-sell-kind':
          if(k==='E')this.enter('shop-item');
          if(k==='A'){const q=Field.appraise(this.expedition,this.fieldData);if(!q.ok){this.notice([q.boundary],()=>this.beginShop());break;}this.save();if(!q.rows.length)this.notice(['HEY!YOU GOTTA NOTING!!'],()=>this.beginShop());else{this.artifactOffer=q;this.enter('artifact-offer');}}
          break;
        case 'artifact-offer':
          if(k==='N')this.beginShop();
          if(k==='Y'){this.expedition.cash=Math.floor(this.expedition.cash+this.artifactOffer.total);this.expedition.findValue=Math.floor((this.expedition.findValue||0)+this.artifactOffer.total);this.expedition.artifacts.fill('');this.save();this.beginShop();}break;
        case 'shop-item':if(/^[A-M]$/.test(k)){this.item=k.charCodeAt(0)-65;this.enter('shop-quantity');}break;
        case 'shop-quantity':
          if(k==='X'){this.beginShop();break;}
          if(/^[1-9]$/.test(k)){
            const result=S.trade(this.expedition,this.gameData.shop,this.item,Number(k),this.tradeMode);
            if(result.ok){this.save();this.beginShop();}
            else if(result.reason==='money'){
              const lines=["DESPENSE' MI,AMIGO","YOU MUS' HAB MAS DINERO!"];
              if(this.item===9)lines.push('(BULLETS COME IN CLIPS OF 20 FOR $40)');
              this.notice(lines,()=>this.beginShop());
            } else this.notice([result.reason==='overloaded'?'OVERLOADED':'NO GRACIAS,BANDITO'],()=>this.beginShop());
          }break;
        case 'field-message':case 'message':if(k.length===1||k==='Enter'){const back=this.back;this.back=null;back();}break;
        case 'report':if(k==='E'){this.equipmentBack='report';this.enter('equipment');}else if(k==='X')this.enter(this.reportBack||'iquitos');break;
        case 'equipment':if(k==='X')this.enter(this.equipmentBack||'report');break;
        case 'medical':if(['Y','N'].includes(k)){
          if(k==='Y'){
            const result=S.aid(this.expedition,this.patient);
            if(!result.ok){this.notice([result.reason==='medic'?'YOUR MEDIC IS DEAD!':'OUT OF MEDICINE'],()=>this.enter(this.medicalBack));break;}
            this.save();
          }this.patient++;this.nextPatient();
        }break;
        case 'camp-confirm':if(k==='Y')this.travel('base-camp',true);else if(k==='N')this.enter('iquitos');break;
        case 'camp':
          if(k==='G')this.beginField();
          if(k==='M')this.enter('camp-to-town');
          if(k==='X'){this.save();this.enter('exit');}
          break;
        case 'camp-to-town':if(k==='N')this.enter('camp');else if(k==='Y'){this.downRiver=true;this.travel('iquitos',true);}break;
        case 'field':this.fieldKey(k);break;
        case 'stairs':case 'crypt':case 'fountain':{
          const action=this.scene==='stairs'?Field.stairs:this.scene==='crypt'?Field.crypt:Field.fountain;
          const result=action(this.expedition,this.fieldData,k);if(result.ok)this.save();this.fieldNotes(result);break;
        }
        case 'maze-intro':this.expedition.field.maze.stage='running';this.save();this.enter('maze');break;
        case 'maze':{this.ensureMaze();this.mazeEngine.press(k);this.expedition.field.maze.snapshot=this.mazeEngine.snapshot();this.save();break;}
        case 'door':this.enter('ending-text');break;
        case 'ending-text':this.cover();break;
        case 'combat':{const result=Field.fight(this.expedition,this.fieldData,k);if(result.ok)this.save();this.revision++;this.fieldNotes(result);break;}
        case 'field-camp':
          if(k==='J')this.fieldContinue();
          if(k==='E'){this.equipmentBack='field-camp';this.enter('equipment');}
          if(k==='M')this.startMedical('field-camp');
          if(k==='R')this.enter('field-radio');
          break;
        case 'field-radio':
          if(k==='N')this.enter('field-camp');
          if(k==='Y'){
            const e=this.expedition;
            const error=e.cash<2000?"YOU HAVEN'T THE PRICE":!e.inventory[6]?'NO RADIO':e.field.sector>10?'NO SERVICE UNDERGROUND':!e.team[2].energy?'NO RADIO OPERATOR':null;
            if(error)this.notice([error],()=>this.enter('field-camp'));
            else {this.returnFieldToCamp(true);}
          }break;
      }
    }
    nameKey(key){
      if(key==='Backspace'){this.input=this.input.slice(0,-1);this.error='';this.revision++;return;}
      if(key==='Enter'){
        const name=this.input.trim().toUpperCase();
        if(!name||name.length>10||this.names.includes(name)){
          const label=!name?'UNACCEPTABLE':name.length>10?'TOO LONG':'ON EXPEDITION';this.input='';this.error=label;this.revision++;return;
        }
        this.names.push(name);this.input='';this.member++;this.error='';this.revision++;
        if(this.member===4){this.campaign.slots[this.slot]=F.createExpedition(this.slot,this.difficulty,this.names);this.campaign.active=this.slot;this.save();this.enter('travel');}
        return;
      }
      if(key.length===1&&/^[\x20-\x7e]$/.test(key)&&this.input.length<40){this.input+=key.toUpperCase();this.error='';this.revision++;}
    }
    setName(text){if(this.scene==='applications'){this.input=text.toUpperCase().replace(/[^\x20-\x7e]/g,'').slice(0,40);this.error='';this.revision++;}}
    startMedical(back='iquitos'){
      this.medicalBack=back;
      if(!this.expedition.team[1].energy){this.notice(['YOUR MEDIC IS DEAD!'],()=>this.enter(this.medicalBack));return;}
      if(!this.expedition.inventory[0]){this.notice(['OUT OF MEDICINE'],()=>this.enter(this.medicalBack));return;}
      this.patient=0;this.nextPatient();
    }
    nextPatient(){
      while(this.patient<4&&!S.needsAid(this.expedition.team[this.patient]))this.patient++;
      if(this.patient>=4)this.notice(['MEDICAL AID COMPLETE'],()=>this.enter(this.medicalBack));
      else if(!this.expedition.inventory[0])this.notice(['OUT OF MEDICINE'],()=>this.enter(this.medicalBack));
      else this.enter('medical');
    }
    beginField(){
      if(!this.fieldData){this.notice(['FIELD DATA UNAVAILABLE.'],()=>this.enter('camp'));return;}
      if(this.expedition.team.every(m=>!m.energy)){this.notice(['YOUR CREW IS DEAD!','YOUR EXPEDITION IS CANCELLED!'],()=>this.enter('exit'));return;}
      try {const result=Field.begin(this.expedition,this.fieldData);this.save();this.enter('field');this.fieldNotes(result);}
      catch(error){this.notice([error.message],()=>this.enter('camp'));}
    }
    ensureMaze(){if(!Maze)throw new Error('NATIVE MAZE SUPPORT UNAVAILABLE.');if(this.mazeOwner!==this.expedition.field.maze){this.mazeOwner=this.expedition.field.maze;this.mazeEngine=new Maze.NativeMaze({...this.mazeOwner,cheatMode:!!this.expedition.cheatMode});this.mazeClock=this.now;this.mazeDebt=0;}}
    mazeText(){this.ensureMaze();const s=new TextScreen(),m=this.mazeEngine.memory;for(let r=0;r<24;r++)for(let c=0;c<40;c++){const v=m[0x400+(r&7)*128+(r>>3)*40+c],n=v&63;s.write(r+1,c+1,String.fromCharCode(v>=128?(v&127):(n<32?n+64:n)),v<64?1:v<128?2:0);}return s;}
    fieldScene(){const f=this.expedition.field;return f.combat?'combat':f.stairs?'stairs':f.crypt?'crypt':f.fountain?'fountain':f.maze?(f.maze.stage==='intro'?'maze-intro':'maze'):'field';}
    fieldNotes(result){
      if(!result.ok){this.notice([result.boundary,'ACTION HAS NOT BEEN APPLIED.'],()=>this.enter(this.fieldScene()));return;}
      const pages=(result.messages||[]).map(lines=>lines.slice());
      if(result.notes?.length)pages.push(result.notes);
      if(result.dead)pages.push(['YOUR CREW IS DEAD!','YOUR EXPEDITION IS CANCELLED!']);
      const next=()=>{
        if(!pages.length){this.enter(result.dead?'exit':this.fieldScene());return;}
        this.message=pages.shift();this.back=next;this.enter('field-message');
      };
      next();
    }
    fieldContinue(){const result=Field.move(this.expedition,this.fieldData,'');this.save();this.enter('field');this.fieldNotes(result);}
    returnFieldToCamp(radio=false){
      const original=this.expedition,copy=JSON.parse(JSON.stringify(original)),f=copy.field;
      if(radio){const r=Field.radio(original,this.fieldData);if(r.ok)this.save();this.fieldNotes(r);return;}
      f.x=19;f.y=108;
      if(radio)copy.cash-=2000;
      const result=Field.camp(copy,this.fieldData);
      if(result.ok)Object.assign(original,copy);
      if(result.ok){this.save();if(result.notes.length)this.notice(result.notes,()=>this.enter('camp'));else this.enter('camp');}
      else this.fieldNotes(result);
    }
    fieldKey(k){
      this.trapTurn=0;delete this.trapKey;
      if(this.expedition.team.every(m=>!m.energy)){this.fieldNotes({ok:true,dead:true});return;}
      if(k==='C'){
        if(this.expedition.field.sector===6&&Field.square(this.expedition.field)===153)this.returnFieldToCamp();else this.enter('field-camp');return;
      }
      if(k==='N'){
        const e=this.expedition,error=!e.inventory[7]?'NO LORAN EQUIPMENT':!e.team[2].energy||e.team[2].level<5?'NO QUALIFIED LORAN OPERATOR':null;
        this.notice(error?[error]:['MAP SEC.: '+e.field.sector+'  SQUARE: '+(Field.square(e.field)+1),Math.min(3,Math.floor((e.field.sector-1)/10))+' LEVELS BELOW JUNGLE'],()=>this.fieldContinue());return;
      }
      const result=Field.move(this.expedition,this.fieldData,k);if(result.ok)this.save();this.revision++;this.fieldNotes(result);
    }
    fieldText(){
      const s=new TextScreen(),e=this.expedition,f=e.field;
      s.write(21,2,'H  '+f.hours).write(21,30,'I   C)AMP').write(22,2,'D  '+f.days).write(22,28,'<J K>').write(23,2,'M  '+f.meters).write(23,30,'M   N)AV');
      e.team.forEach((m,i)=>s.write(21,11+i*4,String(m.energy),m.energy&&m.energy<3?2:0));
      return s;
    }
    setCoverFrames(frames){this.coverFrames=frames;this.coverStart=this.now;this.coverIndex=-1;this.revision++;}
    tickTraps(now){
      if(this.trapPlayback){
        const p=this.trapPlayback;
        if(p.owner!==this.expedition?.field||!['field','field-camp'].includes(this.scene)){delete this.trapPlayback;delete this.trapKey;this.trapTurn=0;return;}
        const elapsed=now-p.start;let index=0;while(index+1<p.times.length&&p.times[index+1]<=elapsed)index++;
        if(index!==p.index){p.index=index;this.revision++;}
        if(elapsed<p.duration)return;
        delete this.trapPlayback;this.trapTurn=p.nextTurn;this.revision++;this.save();
        if(p.result&&(!p.result.ok||p.result.dead||p.result.messages?.length||this.fieldScene()!=='field')){delete this.trapKey;this.fieldNotes(p.result);return;}
        // Original 1005 polls the keyboard after the first trap call; the second call returns to 1005.
        if(p.poll&&this.trapKey){const key=this.trapKey;delete this.trapKey;this.trapTurn=0;this.key(key);return;}
        return;
      }
      if(!['field','field-camp'].includes(this.scene)||!(this.expedition?.field?.system>1))return;
      if(this.trapOwner!==this.expedition.field){this.trapOwner=this.expedition.field;this.trapTurn=0;}
      const camp=this.scene==='field-camp',turn=camp?1:(this.trapTurn||0),screen=camp?this.text():this.fieldText();
      const timing=turn===0?null:Field.trapTiming(this.expedition,camp);
      const result=turn===0?Field.explorerFrames(this.expedition,this.fieldData):Field.pulse(this.expedition,this.fieldData);
      if(!result.ok){delete this.trapKey;this.fieldNotes(result);return;}
      this.trapOwner=this.expedition.field;
      if(!(this.expedition.field.system>1)){this.save();return;}
      const schedule=timing||result.trapTiming,base=result.trapBase||Field.page(this.expedition,this.fieldData,false);
      this.trapPlayback={owner:this.expedition.field,start:now,index:0,frames:[base,...(result.trapFrames||[])],times:[0,...schedule.times],duration:schedule.duration,screen,result:turn?result:null,poll:camp||turn===1,nextTurn:camp?1:turn===0?1:turn===1?2:0};
      this.revision++;
    }
    tick(now){
      this.now=now;
      if(this.deadline&&now>=this.deadline){
        if(this.scene==='institution')this.enter('authorization');
        else if(this.scene==='flint-intro')this.animateFlint();
        else if(this.scene==='journey')this.arrive();
      }
      if(this.scene==='flint-animation'&&now-this.clock>=this.animation.tickMs){this.animation.step();this.clock=now;this.revision++;}
      if(this.scene==='pedro'&&now-this.clock>=this.pedroData.tick_ms){this.animation.step();this.clock=now;this.revision++;}
      if(this.scene==='maze'){this.ensureMaze();try{const elapsed=Math.min(100,Math.max(0,now-this.mazeClock));this.mazeClock=now;this.mazeDebt+=elapsed*1020.484;if(this.mazeDebt>0)this.mazeDebt-=this.mazeEngine.runCycles(this.mazeDebt);this.revision++;if(this.mazeEngine.stopped){const cmd=this.mazeEngine.stopped;if(cmd==='RUN KA'){this.expedition.ending=true;delete this.expedition.field.maze;this.save();this.enter('door');}else if(cmd==='RUN AZ'){const result=Field.mazeReturn(this.expedition,this.fieldData,this.mazeEngine.memory);if(result.ok)this.save();this.fieldNotes(result);}else this.notice(['ORIGINAL MAZE REQUESTED '+cmd,'THIS DISK OPERATION IS UNSUPPORTED.'],()=>this.enter('maze'));}else if(now-(this.mazeSaved||0)>1000){this.mazeSaved=now;this.expedition.field.maze.snapshot=this.mazeEngine.snapshot();this.save();}}catch(error){this.notice([error.message],()=>this.enter('maze'));}}
      if(this.scene==='door'){const elapsed=Math.min(100,Math.max(0,now-this.doorClock));this.doorClock=now;this.doorDebt+=elapsed*1020.484;this.endingEngine||=new Ending.Ending();if(this.doorDebt>0)this.doorDebt-=this.endingEngine.runCycles(this.doorDebt);this.revision++;}
      this.tickTraps(now);
      if(this.scene==='field'){const phase=Math.floor(now/400)%2===0;if(phase!==this.fieldPhase){this.fieldPhase=phase;this.revision++;}}
      if(this.scene==='cover'&&this.coverFrames.length){
        const end=this.coverFrames[this.coverFrames.length-1].cycle/1020484;
        const elapsed=(now-this.coverStart)/1000%(end+0.1);let lo=0,hi=this.coverFrames.length-1;
        while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(this.coverFrames[mid].cycle/1020484<=elapsed)lo=mid;else hi=mid-1;}
        if(lo!==this.coverIndex){this.coverIndex=lo;this.revision++;}
      }
    }
    text(){
      const s=new TextScreen(),e=this.expedition;
      const prompt=()=>s.center(23,'PRESS ANY KEY');
      switch(this.scene){
        case 'instructions':{
          const page=this.titleData.instructions[this.instructionPage];s.cells=Array.from(page.cells);s.styles=decode(page.styles);break;
        }
        case 'authorization':
          s.write(10,6,'*****************************').write(12,7,'FLINT UNIVERSITY AUTHORIZES').write(14,12,'AMAZON EXPEDITION '+this.slot).write(16,6,'*****************************');prompt();break;
        case 'difficulty':s.write(12,7,'ENTER LEVEL OF DIFFICULTY').write(13,16,'1 THRU 9');break;
        case 'applications':
          s.write(4,4,'APPLICATIONS ARE NOW BEING TAKEN').write(5,8,'FOR AMAZON EXPEDITION '+this.slot).write(11,7,'NAME').write(11,27,'TITLE').write(12,1,'-'.repeat(39));
          F.roles.forEach((role,i)=>{s.write(13+i,22,role,i===this.member?2:0);if(this.names[i])s.write(13+i,4,this.names[i]);});
          if(this.error)s.center(20,this.error,2);
          s.write(22,9,'NAME? '+this.input).inputCursor(22,Math.min(40,15+this.input.length));break;
        case 'resume':s.write(13,11,'EXPEDITION A OR B ?').write(13,22,'A',2).write(13,27,'B',2);break;
        case 'slots-full':s.write(11,7,'THERE ARE TWO EXPEDITIONS').center(12,'IN PROGRESS').write(13,7,'DO YOU WISH TO DISBAND ONE?').center(15,'Y)ES N)O');break;
        case 'disband-slot':s.center(12,'A OR B?');break;
        case 'disband-confirm':s.center(12,'DISBAND EXPEDITION '+this.slot+' ?').center(14,'Y)ES N)O');break;
        case 'flint-intro':s.center(12,'FLINT UNIVERSITY').write(13,5,'A THRIVING CENTER OF ADVANCED').write(14,1,'STUDY, LOCATED IN TARSAND TRAILER PARK,').center(15,'NIHIL, TEXAS.');break;
        case 'journey':
          if(this.fromIquitos)s.write(12,8,'RIDING THE PADDLE WHEEL').write(13,12,this.downRiver?'DOWN THE AMAZON':'UP THE AMAZON');
          else {s.write(12,6,'JEEP AND BUS TO SAN ANTONIO').write(13,6,'AIR FLIGHT TO IQUITOS, PERU');if(this.destination==='base-camp')s.write(14,5,'PADDLE WHEEL BOAT TO BASE CAMP');}break;
        case 'illustration-question':s.write(12,6,'ILLUSTRATION?   Y)ES   N)O');break;
        case 'camp-confirm':s.write(12,5,'MOVE TO BASE CAMP?  Y)ES  N)O');break;
        case 'camp-to-town':s.write(12,6,'MOVE TO IQUITOS?  Y)ES  N)O');break;
        case 'crypt':s.center(21,'A CRYPT!').center(22,'O)PEN IT  L)EAVE IT');break;
        case 'fountain':s.center(21,'A FOUNTAIN OF BLACK').center(22,"BENEATH, A PLAQUE: TO H.RIDER'S SPIRIT").center(23,'WILL YOU BATHE? OR DO YOU FEAR IT?').center(24,'Y)ES  N)O');break;
        case 'maze-intro':s.center(6,'UPON AWAKENING, AFTER BEING GASSED,').center(7,'ONE FOOLHARDY SOUL IS FOUND').center(8,'ALONE IN A STRANGE MAZE,').center(10,'WITHOUT BULLETS,GRENADES,OR FOOD.').center(12,'REMEMBER: PRESS (H) FOR HELP').center(16,'(PRESS KEY)');break;
        case 'ending-text':s.center(12,'THIS IS NOT THE END.').center(13,'IT IS THE BEGINNING OF').center(14,'EXPEDITION:KA');break;
        case 'artifact-offer':this.artifactOffer.rows.forEach((r,i)=>s.write(8+i,5,(r.item+' $'+r.price).slice(0,36)));s.center(23,'HOKAY AMIGO?   Y)ES  N)O');break;
        case 'stairs':s.center(21,this.expedition.field.stairs===3?"YOU'VE EXCAVATED SOME STAIRS":'STAIRS').center(22,this.expedition.field.stairs===3?'D)OWN  L)EAVE':'U)P  L)EAVE');break;
        case 'combat':{
          const c=e.field.combat,m=e.team[c.member],options=['P','G','A','K','D','R'];
          
          s.write(21,1,'MEMBER       EL  OPTIONS       B  G  N');
          const shown=options.filter(k=>k==='P'?e.inventory[9]>0:k==='G'?e.inventory[10]>0:k==='A'?c.member===3&&e.inventory[8]>0&&e.inventory[9]>0:k==='K'?c.stage===3:true).join(' ');
          s.write(22,1,m.name).write(22,14,String(m.energy)).write(22,18,shown).write(22,31,String(e.inventory[9])).write(22,35,String(e.inventory[10])).write(22,38,c.ambush&&c.stage<3?'?':String(c.foes));
          if(c.phase==='quantity')s.write(23,1,c.action==='P'?'SHOTS? (1-9)':'CLIPS? (20/CLIP)');break;
        }
        case 'field-message':this.message.forEach((line,i)=>s.center(21+i,line));break;
        case 'field-camp':s.write(21,10,'M)EDICAL AID  R)ADIO').write(22,10,'E)QUIPMENT  J)UNGLE');break;
        case 'field-radio':s.write(21,5,'RADIO FOR A CHOPPER? Y)ES N)O');break;
        case 'title-exit':case 'exit':s.write(11,11,'PRESS A KEY TO PLAY,').write(13,8,'OR TURN YOUR COMPUTER OFF.');break;
        case 'message':this.message.forEach((line,i)=>s.center(11+i,line));prompt();break;
        case 'shop':case 'shop-sell-kind':case 'shop-item':case 'shop-quantity':
          this.shopText(s);
          if(this.scene==='shop')s.write(23,12,'B)UY S)ELL X)IT');
          if(this.scene==='shop-sell-kind')s.write(23,10,'E)QUIPMENTO O A)RTIFACTOS ?');
          if(this.scene==='shop-item')s.write(23,7,'?QUE NOMBRE, POR FAVOR?');
          if(this.scene==='shop-quantity')s.write(23,8,'?QUANTO, AMIGOS?     X)IT');
          break;
        case 'report':
          s.write(4,14,'EXPEDITION '+e.slot).write(6,1,'FUNDS: $'+e.cash+'  SQ.METERS EXPLORED: '+(e.field?.meters||0)).write(7,1,'TIME IN FIELD: '+(e.field?.days||0)+' DAYS AND '+(e.field?.hours||0)+' HOURS').write(9,1,'SECTORS MAPPED: '+(e.field?.maps||0)).write(9,22,'FIND VALUE $'+(e.findValue||0)).write(10,1,'MEMBERS LOST: '+e.team.filter(m=>!m.energy).length).write(10,22,'ER FACTOR: 0').write(12,1,'MEMBERS').write(12,30,'LVL  EL');
          e.team.forEach((m,i)=>s.write(13+i,1,m.name).write(13+i,13,m.role).write(13+i,32,String(m.level)).write(13+i,36,String(m.energy)));
          s.write(23,13,'E)QUIPMENT  X)IT');break;
        case 'equipment':
          s.center(2,'EQUIPMENT').center(3,'*********');this.gameData.shop.forEach((item,i)=>s.write(5+i,6,String(i+1)+' '+item.name).write(5+i,25,String(e.inventory[i])));s.write(23,17,'X)IT');break;
        case 'medical':{
          const m=e.team[this.patient];s.write(12,1,e.inventory[0]+' MEDICAL KITS IN STOCK.').center(14,m.name+'  EL: '+m.energy+(m.injury?' (D&D ('+m.injury+'))':'')).write(16,1,'GIVE AID? Y)ES N)O');break;
        }
      }
      return s;
    }
    shopText(s){
      const e=this.expedition;
      s.write(1,10,'AMAZON TRADING POST').write(2,12,'PEDRO GOMEZ,MGR.').write(3,12,'****************').write(5,3,'STOCK LIST').write(5,27,'EXPEDITION').write(6,4,'& PRICE').write(6,17,'CASH').write(6,25,'PROPERTY & QTY').center(7,'$'+e.cash).write(8,1,'.'.repeat(40));
      this.gameData.shop.forEach((item,i)=>{
        const row=i+9,selected=this.scene==='shop-quantity'&&this.item===i;
        s.write(row,1,String.fromCharCode(65+i)+') ').write(row,4,item.name,selected?2:0).write(row,14,'$'+item.price).write(row,20,'.');
        if(e.inventory[i])s.write(row,23,item.name).write(row,35,'('+e.inventory[i]+')');
        if(selected&&this.tradeMode==='sell')s.write(row,23,item.name,2).write(row,36,'$'+item.price/2);
      });
    }
    visual(){
      if(this.scene==='maze'){this.ensureMaze();const m=this.mazeEngine;return m.text?{kind:'text',screen:this.mazeText()}:m.mixed?{kind:'mixed',page:m.hgr(),screen:this.mazeText(),mono:false}:{kind:'hgr',page:m.hgr(),mono:false};}
      if(this.scene==='door'){this.endingEngine||=new Ending.Ending();return {kind:'mixed',page:this.endingEngine.page(),screen:new TextScreen().center(22,'THE DOOR TO KA!!'),mono:false};}
      if(this.scene==='title')return {kind:'hgr',page:this.menuViews.title.page,mono:true};
      if(this.scene==='flint-menu')return {kind:'hgr',page:this.menuViews.flint.page,mono:true};
      if(this.scene==='camp'&&this.fieldData)return {kind:'hgr',page:decode(this.fieldData.menu),mono:true};
      if(['field','combat','stairs','crypt','fountain','field-camp','field-radio','field-message'].includes(this.scene))return {kind:'mixed',page:this.trapPlayback?.owner===this.expedition.field?this.trapPlayback.frames[this.trapPlayback.index]:Field.page(this.expedition,this.fieldData,this.fieldPhase),screen:this.trapPlayback?.owner===this.expedition.field?this.trapPlayback.screen:this.scene==='field'?this.fieldText():this.text(),mono:false};
      if(this.scene==='cover')return {kind:'hgr',page:this.coverIndex>=0?this.coverFrames[this.coverIndex].page:this.pages['A_EA_COVER.PAC'],mono:false};
      if(['flint-menu','institution','travel','iquitos'].includes(this.scene))return {kind:'hgr',page:this.menus[{'flint-menu':'MENU1',institution:'MENU2',travel:'MENU3',iquitos:'MENU4'}[this.scene]],mono:true};
      if(['flint-animation','pedro'].includes(this.scene))return {kind:'hgr',page:this.animation.page,mono:false};
      return {kind:'text',screen:this.text()};
    }
    transcript(){
      if(this.scene==='maze')return (this.mazeEngine?.text?this.mazeText().transcript()+'\n':'')+'Original maze. H help; E enter hall, R reverse, S stop, V view reverse, W walk, Q quit.';
      if(this.scene==='door')return 'THE DOOR TO KA!!';
      if(this.scene==='field')return this.fieldText().transcript()+'\nJungle. I north, M south, J west, K east. C camp, N navigation. Jungle and underground sectors. R retreats during combat. Crypts and artifact sales are active. The final maze is available. H displays its controls.';
      if(this.scene==='camp')return 'Base camp. G go exploring. M move to Iquitos. X exit.';
      if(this.scene==='instructions')return 'Instructions '+(this.instructionPage+1)+' of '+this.titleData.instructions.length+'\n'+this.text().transcript();
      if(this.scene==='title')return 'Expedition Amazon. R Review instructions. S Start the game. V View title illustrations. X Exit. Matched browser menu retains the Penguin Software and Willard Phillips credits. Original menu images are in Development; retail layout remains unverified.';
      const labels={cover:'Expedition Amazon. Designed by Willard Phillips. Click the illustration or press any key to begin.', 'flint-menu':'Welcome to Flint University. 1 Start a new expedition. 2 Resume an expedition. 3 View illustration. 4 Exit the game.',institution:'Flint University. Est. MCMLXXXII. Nihil, Texas.',travel:'You may: 1 Fly to Iquitos. 2 Fly to jungle camp.',iquitos:'Iquitos, Peru. V Visit trading post. M Move to base camp. R Review records. G Give medical aid. X Exit the game.','flint-animation':'Flint University illustration. Press any key to return.'};
      if(this.scene==='pedro')return this.animation.message===null?'Pedro is waiting.':this.pedroData.dialogues[this.animation.message].lines.filter(Boolean).join('\n');
      return labels[this.scene]||this.text().transcript();
    }
  }
  Object.assign(exports,{Game,SAVE_KEY:KEY});
})(typeof module==='object'?module.exports:(globalThis.AmazonGame={}));
