(()=>{
  const KEY='volleyverseAchievements';
  const defs=[
    {id:'first_win',name:'FIRST VICTORY',desc:'Record your first career win.',reward:100},
    {id:'five_wins',name:'ON A ROLL',desc:'Reach 5 career wins.',reward:250},
    {id:'ten_wins',name:'RISING STAR',desc:'Reach 10 career wins.',reward:500},
    {id:'training_5',name:'WORK THE FUNDAMENTALS',desc:'Complete 5 training sessions.',reward:150},
    {id:'champion',name:'WORLD CHAMPION',desc:'Reach Career Level 50.',reward:1000},
    {id:'balanced_six',name:'PERFECT SIX',desc:'Build the recommended six-player role balance.',reward:300},
    {id:'chem_90',name:'LOCKED IN',desc:'Reach 90+ team chemistry.',reward:300}
  ];
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}};
  const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
  const claim=id=>{const s=load();if(s[id])return false;const d=defs.find(x=>x.id===id);if(!d)return false;s[id]={at:Date.now(),reward:d.reward};save(s);if(window.VVEconomy?.addCoins)window.VVEconomy.addCoins(d.reward);return true};
  const evaluate=()=>{
    const c=window.VVCareer?.load?.();
    if(c){if(c.wins>=1)claim('first_win');if(c.wins>=5)claim('five_wins');if(c.wins>=10)claim('ten_wins');if(c.training>=5)claim('training_5');if(c.level>=50)claim('champion')}
    const ids=JSON.parse(localStorage.getItem('volleyverseRoster')||'null')||[];const r=window.VVCharacters?.roster||[];const p=ids.map(id=>r.find(x=>x.id===id)).filter(Boolean);
    if(p.length===6){const pos=p.map(x=>x.position);if(pos.filter(x=>x==='S').length===1&&pos.filter(x=>x==='MB').length===2&&pos.filter(x=>x==='L').length===1&&pos.filter(x=>x==='OH'||x==='OPP').length===2)claim('balanced_six');const ch=window.VVChemistry?.calculate?.(ids,r);if(ch?.score>=90)claim('chem_90')}
  };
  const open=()=>{evaluate();const modal=document.getElementById('achievementModal'),list=document.getElementById('achievementList');if(!modal||!list)return;const s=load();list.innerHTML=defs.map(d=>'<div class="achievement-row '+(s[d.id]?'unlocked':'')+'"><div><b>'+(s[d.id]?'✓':'○')+' '+d.name+'</b><span>'+d.desc+'</span></div><strong>+'+d.reward+' COINS</strong></div>').join('');modal.classList.remove('hidden')};
  window.VVAchievements={defs,load,save,claim,evaluate,open};
})();