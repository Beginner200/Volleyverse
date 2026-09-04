(()=>{
  const VERSION='20260904-4';
  const loadTheme=()=>{
    if(!document.getElementById('volleyballTheme')){const css=document.createElement('link');css.id='volleyballTheme';css.rel='stylesheet';css.href=`volleyball-theme.css?v=${VERSION}`;document.head.appendChild(css)}
    if(!document.getElementById('mainMenuTheme')){const css=document.createElement('link');css.id='mainMenuTheme';css.rel='stylesheet';css.href=`main-menu.css?v=${VERSION}`;document.head.appendChild(css)}
    /* index.html owns controls.css; only update an existing dynamically-created copy. */
    const controlsCss=document.getElementById('volleyverseControls');
    if(controlsCss) controlsCss.href=`controls.css?v=${VERSION}`;
  };
  const hide=()=>document.body.classList.remove('portrait-blocked');
  const lockLandscape=async()=>{
    try{if(document.documentElement.requestFullscreen&&!document.fullscreenElement)await document.documentElement.requestFullscreen({navigationUI:'hide'}).catch(()=>{})}catch(e){}
    try{if(screen.orientation?.lock)await screen.orientation.lock('landscape')}catch(e){}
    hide();
  };
  loadTheme();hide();lockLandscape();
  window.addEventListener('resize',hide);screen.orientation?.addEventListener?.('change',hide);
  const retry=()=>lockLandscape();document.addEventListener('pointerdown',retry,{once:true,passive:true});document.addEventListener('touchstart',retry,{once:true,passive:true});
})();
