(function(exports){
 'use strict';
 const D=typeof module==='object'?require('./random-data.js'):RANDOM_DATA;
 class RandomError extends Error {}
 function seedValid(seed){return Array.isArray(seed)&&seed.length===5&&seed.every(v=>Number.isInteger(v)&&v>=0&&v<=255);}
 const HIDDEN=1n<<39n,LIMIT=1n<<40n;
 const zero=()=>({m:0n,e:0,s:0});
 // FAC is a 32-bit mantissa plus an eight-bit guard; exponent is biased by 128.
 // Normalize as $E82E does, including the four-zero-mantissa-byte stop.
 function normalize(f){
  if(!(f.m>>8n)||f.e<=0)return zero();
  while(f.m<HIDDEN){f.m<<=1n;if(--f.e<=0)return zero();}
  while(f.m>=LIMIT){f.m>>=1n;f.e++;}
  if(f.e>255)throw new RandomError('ORIGINAL RANDOM ARITHMETIC OVERFLOW.');
  return f;
 }
 function multiplyMantissa(seed){
  let product=0n,carry=true;
  for(const byte of [seed[4],seed[3],seed[2],seed[1]|128]){
   if(!byte){
    // $E9B0/$E8DA zero-byte shortcut: its incoming carry determines an extra
    // shift. $E911 clears carry, so consecutive zero bytes must preserve this.
    product>>=8n;if(!carry)product>>=1n;carry=false;
   }else{
    for(let bit=0;bit<8;bit++){if(byte&(1<<bit))product+=0xb5447a68n<<8n;product>>=1n;}
    carry=true;
   }
  }
  return product;
 }
 function step(seed){
  if(!seedValid(seed))throw new RandomError('INVALID RANDOM SEED.');
  // ROM $EFA6 multiplier: 98 35 44 7A 68; $EFAA addend: 68 28 B1 46 20.
  // They overlap; the addend's last byte is the first opcode at entry $EFAE.
  let f=zero();
  if(seed[0]){
   const e=seed[0]+24;
   // The ROM checks exponent overflow before normalizing the product.
   if(e>255)throw new RandomError('ORIGINAL RANDOM ARITHMETIC OVERFLOW.');
   f=normalize({e,s:seed[1]>>7,m:multiplyMantissa(seed)});
  }
  const addend={e:104,s:0,m:0xa8b14620n<<8n};
  if(!f.e)f=addend;
  else{
   const e=Math.max(f.e,addend.e),a=f.m>>BigInt(e-f.e),b=addend.m>>BigInt(e-addend.e);
   const sum=(f.s?-a:a)+b;
   f=normalize({e,m:sum<0n?-sum:sum,s:Number(sum<0n)});
  }
  // $EFCC swaps the outer mantissa bytes, clears sign, sets exponent $80,
  // and uses the previous exponent as the guard before normalizing/storing.
  let mantissa=f.m>>8n;
  mantissa=(mantissa&0x00ffff00n)|((mantissa&255n)<<24n)|((mantissa>>24n)&255n);
  f=normalize({e:128,s:0,m:(mantissa<<8n)|BigInt(f.e)});
  if(f.m&128n){f.m=(f.m+256n)&~255n;if(f.m>=LIMIT){f.m>>=1n;f.e++;}}
  const mant=Number(f.m>>8n);
  return {value:f.e?mant*2**(f.e-160):0,seed:[f.e,(mant>>>24)&127,(mant>>>16)&255,(mant>>>8)&255,mant&255]};
 }
 function validate(state){
  if(!state||!Number.isSafeInteger(state.rng)||state.rng<0)throw new Error('Invalid random cursor');
  const e=state.randomEngine;
  if(e!==undefined&&(!e||e.version!==1||e.index!==state.rng||e.index<=D.prefixLength||!seedValid(e.seed)))throw new Error('Invalid random engine state');
  if(state.rng>D.prefixLength&&!e)throw new Error('Missing random engine state');
  return state;
 }
 function production(data){return data?.rom_sha256===D.rom_sha256&&data.random?.length===D.prefixLength&&data.seed?.every((v,i)=>v===D.initialSeed[i])&&data.seed.length===5&&data.random[0]===D.prefixFirst&&data.random[D.prefixLength-1]===D.prefixLast;}
 function fraction(state,data){
  if(!Number.isSafeInteger(state.rng)||state.rng<0||state.rng===Number.MAX_SAFE_INTEGER)throw new RandomError('INVALID RANDOM CURSOR.');
  // Scripted short traces remain finite test inputs, rather than silently switching generators.
  if(state.rng<data.random.length){if(state.randomEngine)throw new RandomError('RANDOM SEED/CURSOR MISMATCH.');return data.random[state.rng++];}
  if(!production(data))throw new RandomError('CONTROLLED RANDOM TRACE EXHAUSTED.');
  validate(state);const seed=state.randomEngine?.seed||D.prefixSeed,result=step(seed);state.rng++;state.randomEngine={version:1,index:state.rng,seed:result.seed};return result.value;
 }
 function copyState(state){return state?.randomEngine?{randomEngine:{...state.randomEngine,seed:state.randomEngine.seed.slice()}}:{};}
 Object.assign(exports,{step,fraction,validate,copyState,RandomError});
})(typeof module==='object'?module.exports:(globalThis.AmazonRandom={}));
