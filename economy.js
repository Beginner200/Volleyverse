(()=>{
  const KEY='volleyverseWallet';
  const defaultState={coins:2500,gems:50,lastDaily:0,streak:0};
  const load=()=>{try{return {...defaultState,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaultState}}};
  const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`};
  const render=()=>{
    const s=load();
    let hud=document.getElementById('vvEconomy');
    if(!hud){
      hud=document.createElement('div');hud.id='vvEconomy';hud.className='vv-economy';
      const menu=document.getElementById('mainMenu');
      if(menu)menu.prepend(hud);
    }
    if(!hud)return;
    const claimed=s.lastDaily===today();
    hud.innerHTML=`<div><span>COINS</span><b>◈ ${s.coins.toLocaleString()}</b></div><div><span>GEMS</span><b>◆ ${s.gems}</b></div><button id="vvDaily" ${claimed?'disabled':''}>${claimed?'DAILY CLAIMED':'DAILY REWARD +100 COINS'}</button>`;
    document.getElementById('vvDaily')?.addEventListener('click',()=>{
      const n=load();if(n.lastDaily===today())return;n.coins+=100;n.lastDaily=today();n.streak+=1;save(n);render();
    });
  };
  window.VVEconomy={load,save,render,addCoins(n){const s=load();s.coins=Math.max(0,s.coins+n);save(s);render();return s},addGems(n){const s=load();s.gems=Math.max(0,s.gems+n);save(s);render();return s}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
