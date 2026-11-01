(function(exports){
  'use strict';
  function trade(expedition,stock,index,quantity,mode){
    if(!Number.isInteger(index)||index<0||index>=13||!Number.isInteger(quantity)||quantity<1||quantity>9||!['buy','sell'].includes(mode))throw new Error('Invalid trade input.');
    const item=stock[index],units=quantity*item.unit,current=expedition.inventory[index];
    if(mode==='buy'){
      const cost=units*item.price;
      if(cost>expedition.cash)return {ok:false,reason:'money'};
      if(current+units>item.limit)return {ok:false,reason:'overloaded'};
      expedition.inventory[index]+=units;expedition.cash-=cost;
      return {ok:true,units,cash:-cost};
    }
    if(units>current)return {ok:false,reason:'stock'};
    const proceeds=units*item.price/2;if(!expedition.cheatMode)expedition.inventory[index]-=units;expedition.cash+=proceeds;
    return {ok:true,units,cash:proceeds};
  }
  function needsAid(member){return member.energy>0&&(member.injury>0||member.energy<6||(member.energy<40&&member.energy<2*member.level));}
  function aid(expedition,index){
    if(!expedition.team[1].energy)return {ok:false,reason:'medic'};
    if(!expedition.inventory[0])return {ok:false,reason:'kits'};
    const member=expedition.team[index];if(!member.energy)return {ok:false,reason:'dead'};if(!needsAid(member))return {ok:false,reason:'healthy'};
    member.injury=0;member.energy=Math.max(member.energy,Math.min(40,Math.max(6,2*member.level)));if(!expedition.cheatMode)expedition.inventory[0]--;
    return {ok:true};
  }
  Object.assign(exports,{trade,aid,needsAid});
})(typeof module==='object'?module.exports:(globalThis.AmazonShop={}));
