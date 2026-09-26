(()=>{
  const boot=()=>{
    const css=document.createElement('link');css.rel='stylesheet';css.href='achievements.css';document.head.appendChild(css);
    const customCss=document.createElement('link');customCss.rel='stylesheet';customCss.href='customization.css';document.head.appendChild(customCss);
    const seasonCss=document.createElement('link');seasonCss.rel='stylesheet';seasonCss.href='season.css';document.head.appendChild(seasonCss);
    const modal=document.createElement('div');modal.id='achievementModal';modal.className='modal hidden';modal.innerHTML='<div class="modal-panel achievement-panel"><button class="modal-close" id="closeAchievements">×</button><span class="eyebrow">HALL OF FAME</span><h2>ACHIEVEMENTS</h2><p>Milestones earned across your VOLLEYVERSE career.</p><div id="achievementList" class="achievement-list"></div><button class="primary" id="closeAchievementsBtn">BACK</button></div>';
    document.body.appendChild(modal);
    const btn=document.createElement('button');btn.className='menu-btn';btn.dataset.action='achievements';btn.innerHTML='<strong>HALL OF FAME</strong><span>Milestones & rewards</span>';document.querySelector('.menu-grid')?.appendChild(btn);
    const seasonBtn=document.createElement('button');seasonBtn.className='menu-btn';seasonBtn.dataset.action='season';seasonBtn.innerHTML='<strong>SEASON 01</strong><span>Rewards & progression</span>';document.querySelector('.menu-grid')?.appendChild(seasonBtn);
    document.getElementById('closeAchievements')?.addEventListener('click',()=>modal.classList.add('hidden'));
    document.getElementById('closeAchievementsBtn')?.addEventListener('click',()=>modal.classList.add('hidden'));
    btn.addEventListener('click',()=>window.VVAchievements?.open());
    seasonBtn.addEventListener('click',()=>window.VVSeason?.open());
    const a=document.createElement('script');a.src='achievements.js';document.body.appendChild(a);
    const c=document.createElement('script');c.src='customization.js';document.body.appendChild(c);
    const s=document.createElement('script');s.src='season.js';document.body.appendChild(s);
    const recoverCss=['account.css','arena.css','camera.css','party.css'];recoverCss.forEach(h=>{const l=document.createElement('link');l.rel='stylesheet';l.href=h;document.head.appendChild(l)});
    const recoverScripts=['account.js','arena.js','camera.js','party.js'];recoverScripts.forEach(src=>{const s=document.createElement('script');s.src=src;document.body.appendChild(s)});
    const recover=[['account','ACCOUNT','Identity & save'],['arena','ARENAS','Choose your match venue'],['camera','CAMERA','Gameplay view'],['party','PARTY','Online team lobby']];recover.forEach(([action,title,sub])=>{if(document.querySelector('[data-action="'+action+'"]'))return;const b=document.createElement('button');b.className='menu-btn';b.dataset.action=action;b.innerHTML='<strong>'+title+'</strong><span>'+sub+'</span>';document.querySelector('.menu-grid')?.appendChild(b);b.addEventListener('click',()=>window[{account:'VVAccount',arena:'VVArena',camera:'VVCamera',party:'VVParty'}[action]]?.open())});

  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();