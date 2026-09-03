(()=>{
  const update=()=>document.body.classList.toggle('portrait-blocked',innerHeight>innerWidth);
  const lock=async()=>{
    try{if(screen.orientation?.lock)await screen.orientation.lock('landscape')}catch(e){}
    update();
  };
  window.addEventListener('resize',update);
  screen.orientation?.addEventListener?.('change',update);
  document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement)lock()});
  document.addEventListener('pointerdown',()=>{
    if(innerHeight<=innerWidth)return;
    const el=document.documentElement;
    if(el.requestFullscreen)el.requestFullscreen().then(lock).catch(update);
    else lock();
  },{once:true});
  update();
})();
