const VVProgression=(()=>{
const key='volleyverseProgression';
const load=()=>JSON.parse(localStorage.getItem(key)||'{}');
const save=x=>localStorage.setItem(key,JSON.stringify(x));
const get=(id)=>{const all=load();return all[id]||{level:1,xp:0,points:3,upgrades:{}}};
const xpNeed=level=>100+(level-1)*50;
const gain=(id,amount)=>{const s=get(id);s.xp+=amount;while(s.xp>=xpNeed(s.level)&&s.level<50){s.xp-=xpNeed(s.level);s.level++;s.points++;}const all=load();all[id]=s;save(all);return s};
function statLabel(k){return ({serve:'SERVE',receive:'RECEIVE',set:'SET',spike:'SPIKE',block:'BLOCK',speed:'SPEED',jump:'JUMP',stamina:'STAMINA',reaction:'REACTION'})[k]||k.toUpperCase()}
function open(id){const c=window.VVCharacters?.roster?.find(x=>x.id===id);if(!c)return;const state=get(id),detail=document.getElementById('detailContent'),modal=document.getElementById('characterDetailModal');if(!detail||!modal)return;
const stats=Object.entries(c.stats);detail.innerHTML=`<div class="detail-head"><div class="detail-avatar" style="--accent:#${c.color.toString(16).padStart(6,'0')}"><span>${c.name.slice(0,1)}</span></div><div><h2 class="detail-name">${c.name}</h2><div class="detail-meta">${c.rarity.toUpperCase()} • ${c.position} • OVR ${c.ovr}</div><div class="detail-style">${c.style}</div></div></div><div class="detail-level"><div class="level-row"><b>LEVEL ${state.level}</b><span>${state.points} UPGRADE POINT${state.points===1?'':'S'}</span></div><div class="xp-track"><div class="xp-fill" style="width:${Math.min(100,state.xp/xpNeed(state.level)*100)}%"></div></div><div class="level-row"><span>${state.xp} XP</span><span>${xpNeed(state.level)} XP</span></div></div><div class="detail-section"><h3>PLAYER ATTRIBUTES</h3>${stats.map(([k,v])=>`<div class="stat-row"><label>${statLabel(k)}</label><div class="stat-track"><div class="stat-fill" style="width:${v}%"></div></div><b class="stat-value">${v}</b></div>`).join('')}</div><div class="detail-section"><h3>TRAINING UPGRADES</h3><div class="upgrade-grid">${['serve','receive','set','spike','block','speed','jump','stamina','reaction'].map(k=>`<button class="upgrade-btn" data-upgrade="${k}"><b>+ ${statLabel(k)}</b><span>Spend 1 point • ${state.points>0?'AVAILABLE':'NO POINTS'}</span></button>`).join('')}</div></div><div class="detail-actions"><button class="primary" id="gainXpBtn">TRAIN +25 XP</button><button class="glass" id="closeDetailAction">CLOSE</button></div><div class="detail-foot">Progress is saved locally on this device for the prototype.</div>`;
modal.classList.remove('hidden');
detail.querySelectorAll('[data-upgrade]').forEach(btn=>btn.addEventListener('click',()=>{const stat=btn.dataset.upgrade;const now=get(id);if(now.points<=0){btn.querySelector('span').textContent='NO UPGRADE POINTS';return}now.points--;now.upgrades[stat]=(now.upgrades[stat]||0)+1;const all=load();all[id]=now;save(all);renderCardProgress(id);open(id)}));
document.getElementById('gainXpBtn').addEventListener('click',()=>{gain(id,25);open(id);renderCardProgress(id)});document.getElementById('closeDetailAction').addEventListener('click',close);
}
function close(){document.getElementById('characterDetailModal')?.classList.add('hidden')}
function renderCardProgress(id){const card=document.querySelector(`.char-card[data-char="${id}"]`);if(!card)return;const s=get(id);const top=card.querySelector('.char-top strong');if(top){const base=window.VVCharacters.roster.find(c=>c.id===id)?.ovr||0;top.textContent=base+s.level-1}}
function init(){const grid=document.getElementById('characterGrid');if(!grid)return;grid.addEventListener('click',e=>{const card=e.target.closest('.char-card');if(card)open(card.dataset.char)});document.getElementById('closeCharacterDetail')?.addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
return {get,gain,open};
})();
window.VVProgression=VVProgression;
