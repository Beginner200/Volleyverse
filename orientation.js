(()=>{
  const loadTheme=()=>{if(document.getElementById('volleyballTheme')){if(!document.getElementById('mainMenuTheme')){const menuCss=document.createElement('link');menuCss.id='mainMenuTheme';menuCss.rel='stylesheet';menuCss.href='main-menu.css';document.head.appendChild(menuCss)}return}const css=document.createElement('link');css.id='volleyballTheme';css.rel='stylesheet';css.href='volleyball-theme.css';document.head.appendChild(css);const menuCss=document.createElement('link');menuCss.id='mainMenuTheme';menuCss.rel='stylesheet';menuCss.href='main-menu.css';document.head.appendChild(menuCss)};
  const update=()=>document.body.classList.toggle('portrait-blocked',innerHeight>innerWidth);
  const lock=async()=>{try{if(screen.orientation?.lock)await screen.orientation.lock('landscape')}catch(e){}update()};
  loadTheme();
  window.addEventListener('resize',update);
  screen.orientation?.addEventListener?.('change',update);
  document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement)lock()});
  document.addEventListener('pointerdown',()=>{if(innerHeight<=innerWidth)return;const el=document.documentElement;if(el.requestFullscreen)el.requestFullscreen().then(lock).catch(update);else lock()},{once:true});
  update();
})();
