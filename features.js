(()=>{
  const boot=()=>{
    const css=document.createElement('link');css.rel='stylesheet';css.href='achievements.css';document.head.appendChild(css);
    const modal=document.createElement('div');modal.id='achievementModal';modal.className='modal hidden';modal.innerHTML='<div class="modal-panel achievement-panel"><button class="modal-close" id="closeAchievements">×</button><span class="eyebrow">HALL OF FAME</span><h2>ACHIEVEMENTS</h2><p>Milestones earned across your VOLLEYVERSE career.</p><div id="achievementList" class="achievement-list"></div><button class="primary" id="closeAchievementsBtn">BACK</button></div>';
    document.body.appendChild(modal);
    const btn=document.createElement('button');btn.className='menu-btn';btn.dataset-action='achievements';btn.innerHTML='<strong>HALL OF FAME</strong><span>Milestones & rewards</span>';document.querySelector('.menu-grid')?.appendChild(btn);
    document.getElementById('closeAchievements')?.addEventListener('click',()=>modal.classList.add('hidden'));
    document.getElementById('closeAchievementsBtn')?.addEventListener('click',()=>modal.classList.add('hidden'));
    btn.addEventListener('click',()=>window.VVAchievements?.open());
    const s=document.createElement('script');s.src='achievements.js';document.body.appendChild(s);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();