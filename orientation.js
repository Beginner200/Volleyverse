(()=>{
  const VERSION='20260926-landscape-1';
  const loadTheme=()=>{
    if(!document.getElementById('volleyballTheme')){const css=document.createElement('link');css.id='volleyballTheme';css.rel='stylesheet';css.href=`volleyball-theme.css?v=${VERSION}`;document.head.appendChild(css)}
    if(!document.getElementById('mainMenuTheme')){const css=document.createElement('link');css.id='mainMenuTheme';css.rel='stylesheet';css.href=`main-menu.css?v=${VERSION}`;document.head.appendChild(css)}
    const wide=document.getElementById('wideGameplayInterface');
    if(!wide){const css=document.createElement('link');css.id='wideGameplayInterface';css.rel='stylesheet';css.href=`wide-interface.css?v=${VERSION}`;document.head.appendChild(css)}
    const controlsCss=document.getElementById('volleyverseControls');
    if(controlsCss) controlsCss.href=`controls.css?v=${VERSION}`;
  };
  const isPortrait=()=>window.matchMedia?.('(orientation: portrait)').matches ?? (window.innerHeight>window.innerWidth);
  const syncNotice=()=>document.body.classList.toggle('portrait-blocked',isPortrait());
  const lockLandscape=async()=>{
    let fullscreen=false;
    try{
      if(document.documentElement.requestFullscreen&&!document.fullscreenElement){
        await document.documentElement.requestFullscreen({navigationUI:'hide'});
        fullscreen=true;
      }
    }catch(e){}
    try{
      if(screen.orientation?.lock) await screen.orientation.lock('landscape');
    }catch(e){}
    syncNotice();
    return fullscreen;
  };
  const enterLandscape=async()=>{
    await lockLandscape();
    setTimeout(syncNotice,120);
  };
  loadTheme();
  syncNotice();
  window.VVOrientation={lockLandscape:enterLandscape,sync:syncNotice};
  document.getElementById('enterLandscape')?.addEventListener('click',enterLandscape);
  document.addEventListener('pointerdown',enterLandscape,{once:true,passive:true});
  window.addEventListener('resize',syncNotice);
  window.addEventListener('orientationchange',syncNotice);
  screen.orientation?.addEventListener?.('change',syncNotice);
  document.addEventListener('fullscreenchange',syncNotice);
})();
