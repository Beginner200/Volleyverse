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
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{"owned":["neon"],"equipped":{}}')}catch{return {owned:['neon'],equipped:{}}}};
const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
const open=()=>{let m=document.getElementById('customModal');if(!m){m=document.createElement('div');m.id='customModal';m.className='modal';m.innerHTML='<div class="modal-panel"><button class="modal-close" id="customClose">×</button><span class="eyebrow">CUSTOMIZATION</span><h2>MAKE IT YOURS</h2><p>Cosmetics change style, not competitive power.</p><div id="customList" class="achievement-list"></div><button class="primary" id="customBack">BACK</button></div>';document.body.appendChild(m);customClose.onclick=()=>m.classList.add('hidden');customBack.onclick=()=>m.classList.add('hidden')}
const render=()=>{const s=load();customList.innerHTML=items.map(x=>{const owned=s.owned.includes(x.id),eq=s.equipped[x.type]===x.id;return `<button class="achievement-row ${eq?'unlocked':''}" data-custom="${x.id}"><div><b>${x.name}</b><span>${x.type} • ${eq?'EQUIPPED':owned?'OWNED':x.cost+' '+x.unit.toUpperCase()}</span></div><strong>${eq?'✓':owned?'EQUIP':'GET'}</strong></button>`}).join('')};
customList.onclick=e=>{const b=e.target.closest('[data-custom]');if(!b)return;const id=b.dataset.custom,s=load(),x=items.find(i=>i.id===id);if(!x)return;if(s.owned.includes(id)){s.equipped[x.type]=id;save(s);render()}};render();m.classList.remove('hidden')};
window.VVCustomization={items,load,save,open};
const boot=()=>document.addEventListener('click',e=>{const b=e.target.closest('[data-action="customize"]');if(b){e.preventDefault();e.stopImmediatePropagation();open()}});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();