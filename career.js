const VVCareer=(()=>{
const key='volleyverseCareer';
const defaults={level:1,xp:0,wins:0,sets:0,points:0,training:0};
const load=()=>({...defaults,...JSON.parse(localStorage.getItem(key)||'{}')});
const save=s=>localStorage.setItem(key,JSON.stringify(s));
const need=l=>100+(l-1)*75;
function addXP(amount){const s=load();s.xp+=amount;while(s.xp>=need(s.level)&&s.level<100){s.xp-=need(s.level);s.level++}save(s);render();return s}
function rank(level){return level>=50?'WORLD CHAMPION':level>=30?'ELITE':level>=15?'PRO':'ROOKIE'}
function render(){const s=load(),rankName=rank(s.level),required=need(s.level);const level=document.getElementById('careerLevel'),rankEl=document.getElementById('careerRank'),fill=document.getElementById('careerFill'),xp=document.getElementById('careerXP'),xpNeed=document.getElementById('careerXPNeed');if(!level)return;level.textContent='LEVEL '+s.level;rankEl.textContent=rankName;fill.style.width=Math.min(100,s.xp/required*100)+'%';xp.textContent=s.xp+' XP';xpNeed.textContent=required+' XP';document.getElementById('careerWins').textContent=s.wins;document.getElementById('careerSets').textContent=s.sets;document.getElementById('careerPoints').textContent=s.points;document.querySelectorAll('.career-stage').forEach(el=>{const min=Number(el.dataset.level);el.classList.toggle('active',s.level>=min&&s.level<(Number(el.dataset.next)||999));el.classList.toggle('done',s.level>=Number(el.dataset.next||999))})}
function open(){render();document.getElementById('careerModal')?.classList.remove('hidden')}
function close(){document.getElementById('careerModal')?.classList.add('hidden')}
function init(){document.getElementById('careerClose')?.addEventListener('click',close);document.getElementById('careerTrain')?.addEventListener('click',()=>{const s=load();s.training++;save(s);addXP(25)});document.getElementById('careerDemoWin')?.addEventListener('click',()=>{const s=load();s.wins++;s.sets+=3;s.points+=1;save(s);addXP(100)});render()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
return {load,save,addXP,open,close,rank};
})();
window.VVCareer=VVCareer;