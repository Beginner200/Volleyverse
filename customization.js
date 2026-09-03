(()=>{
const KEY='volleyverseCustomization';
const items=[
{id:'neon',name:'Neon Circuit',type:'UNIFORM',cost:350,unit:'coins'},
{id:'royal',name:'Royal Away',type:'UNIFORM',cost:500,unit:'coins'},
{id:'gold',name:'Champion Gold',type:'UNIFORM',cost:25,unit:'gems'},
{id:'midnight',name:'Midnight Court',type:'COURT',cost:700,unit:'coins'},
{id:'flux',name:'Flux Runners',type:'SHOES',cost:450,unit:'coins'},
{id:'elite',name:'Elite Jumpers',type:'SHOES',cost:12,unit:'gems'}
];
const load=()=>{try{return {...{owned:['neon'],equipped:{}},...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {owned:['neon'],equipped:{}}}};
const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
const buy=(x,s)=>{const wallet=window.VVEconomy?.load?.();if(!wallet)return false;if(x.unit==='coins'){if(wallet.coins<x.cost)return false;window.VVEconomy.addCoins(-x.cost)}else{if(wallet.gems<x.cost)return false;window.VVEconomy.addGems(-x.cost)}s.owned.push(x.id);save(s);return true};
const open=()=>{let m=document.getElementById('customModal');if(!m){m=document.createElement('div');m.id='customModal';m.className='modal';m.innerHTML='<div class="modal-panel custom-panel"><button class="modal-close" id="customClose">×</button><span class="eyebrow">CUSTOMIZATION</span><h2>MAKE IT YOURS</h2><p>Cosmetics change style, not competitive power.</p><div class="custom-wallet"><b>◈ <span id="customCoins">0</span> COINS</b><b>◆ <span id="customGems">0</span> GEMS</b></div><div id="customList" class="custom-grid"></div><p id="customNote" class="custom-note">Select a cosmetic to equip it or unlock it with your wallet.</p><button class="primary" id="customBack">BACK</button></div>';document.body.appendChild(m);document.getElementById('customClose').onclick=()=>m.classList.add('hidden');document.getElementById('customBack').onclick=()=>m.classList.add('hidden')}
const render=()=>{const s=load(),w=window.VVEconomy?.load?.()||{coins:0,gems:0};document.getElementById('customCoins').textContent=w.coins.toLocaleString();document.getElementById('customGems').textContent=w.gems;document.getElementById('customList').innerHTML=items.map(x=>{const owned=s.owned.includes(x.id),eq=s.equipped[x.type]===x.id;return `<button class="custom-item ${eq?'equipped':''}" data-custom="${x.id}" style="--a:${x.unit==='gems'?'#ffb52e':'#37d9ff'}"><div class="custom-swatch"></div><b>${x.name}</b><span>${x.type} • ${eq?'EQUIPPED':owned?'OWNED':x.cost+' '+x.unit.toUpperCase()}</span><strong>${eq?'✓ EQUIPPED':owned?'EQUIP':'UNLOCK'}</strong></button>`}).join('')};
document.getElementById('customList')?.addEventListener('click',e=>{const b=e.target.closest('[data-custom]');if(!b)return;const id=b.dataset.custom,s=load(),x=items.find(i=>i.id===id);if(!x)return;if(s.owned.includes(id)){s.equipped[x.type]=id;save(s);render();return}if(buy(x,s)){s.equipped[x.type]=id;save(s);document.getElementById('customNote').textContent=x.name.toUpperCase()+' UNLOCKED AND EQUIPPED';render()}else document.getElementById('customNote').textContent='NOT ENOUGH '+x.unit.toUpperCase()+' TO UNLOCK THIS ITEM.'});
render();m.classList.remove('hidden')};
window.VVCustomization={items,load,save,open};
const boot=()=>document.addEventListener('click',e=>{const b=e.target.closest('[data-action="customize"]');if(b){e.preventDefault();e.stopImmediatePropagation();open()}});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();