(()=>{
  // VOLLEYVERSE is designed for landscape. Try to enter fullscreen and lock
  // orientation immediately when the browser allows it. Mobile browsers may
  // require a user gesture, so retry on the first interaction as a fallback.
  const loadTheme=()=>{
    if(!document.getElementById('volleyballTheme')){
      const css=document.createElement('link');css.id='volleyballTheme';css.rel='stylesheet';css.href='volleyball-theme.css';document.head.appendChild(css);
    }
    if(!document.getElementById('mainMenuTheme')){
      const menuCss=document.createElement('link');menuCss.id='mainMenuTheme';menuCss.rel='stylesheet';menuCss.href='main-menu.css';document.head.appendChild(menuCss);
    }
    if(!document.getElementById('volleyverseControls')){
      const controlsCss=document.createElement('link');controlsCss.id='volleyverseControls';controlsCss.rel='stylesheet';controlsCss.href='controls.css';document.head.appendChild(controlsCss);
    }
  };
  const hideOrientationNotice=()=>document.body.classList.remove('portrait-blocked');
  const lockLandscape=async()=>{
    try{
      if(document.documentElement.requestFullscreen && !document.fullscreenElement){
        await document.documentElement.requestFullscreen({navigationUI:'hide'}).catch(()=>{});
      }
    }catch(e){}
    try{
      if(screen.orientation?.lock) await screen.orientation.lock('landscape');
    }catch(e){}
    hideOrientationNotice();
  };
  const start=()=>{loadTheme();hideOrientationNotice();lockLandscape();};
  loadTheme();
  hideOrientationNotice();
  start();
  window.addEventListener('resize',hideOrientationNotice);
  screen.orientation?.addEventListener?.('change',hideOrientationNotice);
  const retry=()=>lockLandscape();
  document.addEventListener('pointerdown',retry,{once:true,passive:true});
  document.addEventListener('touchstart',retry,{once:true,passive:true});
})();
