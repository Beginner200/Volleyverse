(()=>{
const KEY='volleyverseMissions';
const defaults={weekKey:'',daily:{},weekly:{}};
const defs={daily:[
{id:'d_play',name:'COURT TIME',desc:'Complete 1 match.',goal:1,reward:100,xp:50,metric:'matches'},
{id:'d_serve',name:'SERVE PRACTICE',desc:'Record 10 serves.',goal:10,reward:150,xp:75,metric:'serves'},
{id:'d_rally',name:'KEEP IT ALIVE',desc:'Reach 20 rally actions.',goal:20,reward:200,xp:100,metric:'rallies'}],weekly:[
{id:'w_wins',name:'WEEKLY CHALLENGER',desc:'Win 5 matches.',goal:5,reward:600,xp:300,metric:'wins'},
{id:'w_sets',name:'SET MASTER',desc:'Win 12 sets.',goal:12,reward:750,xp:400,metric:'sets'},
{id:'w_matches',name:'DEDICATED ATHLETE',desc:'Complete 10 matches.',goal:10,reward:1000,xp:500,metric:'matches'}]};
const weekKey=()=>{const d=new Date();const y=d.getFullYear(),one=new Date(y,0,1),n=Math.ceil((((d-one)/86400000)+one.getDay()+1)/7);return y+'-W'+n};
const load=()=>{try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}};
const fresh=()=>{const s=load(),w=weekKey();if(s.weekKey!==w){s.weekKey=w;s.daily={};s.weekly={};save(s)}return s};
const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
const state=(type,id)=>{const s=fresh();return s[type]?.[id]||{progress:0,claimed:false}};
const add=(metric,n=1)=>{const s=fresh();[...defs.daily.map(x=>['daily',x]),...defs.weekly.map(x=>['weekly',x])].forEach(([type,d])=>{if(d.metric!==metric)return;const v=s[type][d.id]||{progress:0,claimed:false};v.progress=Math.min(d.goal,v.progress+Math.max(0,Number(n)||0));if(v.progress>=d.goal&&!v.claimed){v.claimed=true;if(window.VVEconomy?.addCoins)window.VVEconomy.addCoins(d.reward);if(window.VVSeason?.addXP)window.VVSeason.addXP(d.xp);if(window.VVBattlePass?.addXP)window.VVBattlePass.addXP(d.xp)}s[type][d.id]=v});save(s);render();return s};
const completeMatch=(won,sets=0)=>{add('matches',1);if(won)add('wins',1);if(sets)add('sets',sets)};
const renderList=(type,listId)=>{const l=document.getElementById(listId);if(!l)return;const s=fresh();l.innerHTML=defs[type].map(d=>{const v=s[type][d.id]||{progress:0,claimed:false};return '<div class="mission-row '+(v.claimed?'complete':'')+'"><div><b>'+(v.claimed?'✓ ':'')+d.name+'</b><span>'+d.desc+'</span></div><strong>'+v.progress+' / '+d.goal+'<small>+'+d.reward+' COINS • +'+d.xp+' XP</small></strong></div>'}).join('')};
const render=()=>{renderList('daily','dailyMissionList');renderList('weekly','weeklyMissionList');document.getElementById('missionWeek')?.replaceChildren(document.createTextNode('WEEK '+weekKey()))};
const open=()=>{let m=document.getElementById('missionsModal');if(!m){m=document.createElement('div');m.id='missionsModal';m.className='modal';m.innerHTML='<div class="modal-panel missions-panel"><button class="modal-close" id="missionsClose">×</button><span class="eyebrow">DAILY & WEEKLY MISSIONS</span><h2>MISSION HUB</h2><p id="missionWeek">WEEK</p><h3>DAILY</h3><div id="dailyMissionList" class="mission-list"></div><h3>WEEKLY</h3><div id="weeklyMissionList" class="mission-list"></div><p class="mission-note">Missions refresh automatically by time period. Rewards connect to the economy, season and Battle Pass systems.</p></div></div>';document.body.appendChild(m);document.getElementById('missionsClose').onclick=()=>m.classList.add('hidden')}render();m.classList.remove('hidden')};
window.VVMissions={defs,load,save,state,add,completeMatch,render,open};
})();