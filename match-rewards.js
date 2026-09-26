(()=>{
const KEY='volleyverseMatchRewards';
const defaults={matches:0,wins:0,losses:0,coins:0,gems:0,careerXP:0,seasonXP:0,battlePassXP:0,history:[]};
const load=()=>{try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}};
const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
const grant=(won)=>{
  const coins=won?500:200;
  const gems=won?25:5;
  const careerXP=won?100:40;
  const seasonXP=won?150:75;
  const battlePassXP=won?200:100;
  if(window.VVOnlineClient?.isConnected?.()){window.VVOnlineClient.grantReward?.('match_'+Date.now(),coins,gems).catch(()=>{});}else if(window.VVEconomy?.addCoins)window.VVEconomy.addCoins(coins);
  if(!window.VVOnlineClient?.isConnected?.()&&window.VVEconomy?.addGems)window.VVEconomy.addGems(gems);
  if(window.VVCareer?.addXP)window.VVCareer.addXP(careerXP);
  if(window.VVSeason?.addXP)window.VVSeason.addXP(seasonXP);
  if(window.VVBattlePass?.addXP)window.VVBattlePass.addXP(battlePassXP);
  if(window.VVAchievements?.evaluate)window.VVAchievements.evaluate();
  const s=load();s.matches++;won?s.wins++:s.losses++;s.coins+=coins;s.gems+=gems;s.careerXP+=careerXP;s.seasonXP+=seasonXP;s.battlePassXP+=battlePassXP;s.history.unshift({won,coins,gems,careerXP,seasonXP,battlePassXP,mode:localStorage.getItem('volleyverseMatchMode')||'real',at:Date.now()});s.history=s.history.slice(0,20);save(s);
  if(won&&window.VVRanked&&localStorage.getItem('volleyverseMatchMode')==='ranked')window.VVRanked.record(true);
  if(!won&&window.VVRanked&&localStorage.getItem('volleyverseMatchMode')==='ranked')window.VVRanked.record(false);
  return {won,coins,gems,careerXP,seasonXP,battlePassXP};
};
const openSummary=(reward)=>{const old=document.getElementById('rewardSummary');if(old)old.remove();const m=document.createElement('div');m.id='rewardSummary';m.className='modal';m.innerHTML='<div class="modal-panel"><span class="eyebrow">MATCH REWARDS</span><h2>'+ (reward.won?'VICTORY REWARDS':'MATCH REWARDS') +'</h2><div class="career-grid"><div class="career-stat"><b>◈ '+reward.coins+'</b><span>COINS</span></div><div class="career-stat"><b>◆ '+reward.gems+'</b><span>GEMS</span></div><div class="career-stat"><b>+'+reward.careerXP+'</b><span>CAREER XP</span></div><div class="career-stat"><b>+'+reward.seasonXP+'</b><span>SEASON XP</span></div><div class="career-stat"><b>+'+reward.battlePassXP+'</b><span>BATTLE PASS XP</span></div></div><button class="primary" id="rewardClose">CONTINUE</button></div></div>';document.body.appendChild(m);document.getElementById('rewardClose').onclick=()=>m.remove()};
window.VVMatchRewards={load,save,grant,openSummary};
})();
