import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const $ = id => document.getElementById(id);
const wrap = $('canvasWrap');
const state = { renderer:null, camera:null, scene:null, ready:false, running:false };
const keys = {x:0,z:0};
let homeScore=0, awayScore=0, homeSets=0, awaySets=0, setNumber=1;
let servingTeam='home', controlledIndex=0, controlled=null, paused=false, rallyLocked=false;
let homePlayers=[], awayPlayers=[], ball=null;
const ballState={v:new THREE.Vector3(),active:false,lastTouch:'home',cooldown:0};

function updateHUD(){
  $('homeScore').textContent=homeScore; $('awayScore').textContent=awayScore;
  $('setNumber').textContent=setNumber; $('setStatus').textContent=setNumber===5?'15':'25';
  if(controlled) $('controlledPlayer').textContent=controlled.userData.name.toUpperCase()+' • '+controlled.userData.position;
}
function tip(t){ $('tip').textContent=t; }
function showError(message){
  let e=$('renderError');
  if(!e){ e=document.createElement('div'); e.id='renderError'; document.body.appendChild(e); }
  e.innerHTML='<b>3D MATCH COULD NOT START</b><span>'+message+'</span><button>RELOAD MATCH</button>';
  e.querySelector('button').onclick=()=>location.reload();
}
function createScene(){
  if(state.ready) return true;
  if(!wrap) return false;
  try{
    state.scene=new THREE.Scene(); state.scene.background=new THREE.Color(0x07182a); state.scene.fog=new THREE.Fog(0x07182a,24,52);
    state.camera=new THREE.PerspectiveCamera(52,Math.max(innerWidth,1)/Math.max(innerHeight,1),.1,100); state.camera.position.set(0,8.8,14.8); state.camera.lookAt(0,0,0);
    state.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'default',alpha:false});
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35)); state.renderer.setSize(Math.max(innerWidth,1),Math.max(innerHeight,1),false); state.renderer.shadowMap.enabled=false; state.renderer.outputColorSpace=THREE.SRGBColorSpace;
    state.renderer.domElement.style.width='100%'; state.renderer.domElement.style.height='100%'; wrap.innerHTML=''; wrap.appendChild(state.renderer.domElement);
    state.scene.add(new THREE.HemisphereLight(0xdff5ff,0x16304a,2.4)); const key=new THREE.DirectionalLight(0xffffff,2.7); key.position.set(4,12,8); state.scene.add(key); const fill=new THREE.DirectionalLight(0x6ad8ff,1.5); fill.position.set(-8,6,-6); state.scene.add(fill);
    buildCourt(); buildTeams(); buildBall(); updateControlled(); updateHUD(); resetBall(); state.ready=true; resize();
    if(!state.running){state.running=true;requestAnimationFrame(loop)} return true;
  }catch(err){console.error('VOLLEYVERSE 3D initialization failed:',err);showError('Your browser could not create the 3D graphics. Try Chrome again after reloading.');return false}
}
function buildCourt(){
  const s=state.scene; const floor=new THREE.Mesh(new THREE.BoxGeometry(18,.2,10),new THREE.MeshStandardMaterial({color:0x17658f,roughness:.72})); floor.position.y=-.12;s.add(floor);
  const lineMat=new THREE.MeshBasicMaterial({color:0xffffff}); const line=(x,z,w,d)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,.035,d),lineMat);m.position.set(x,.015,z);s.add(m)};
  line(0,-5,18,.08);line(0,5,18,.08);line(-9,0,.08,10);line(9,0,.08,10);line(0,-3,18,.055);line(0,3,18,.055);line(0,0,.055,10);
  const poleMat=new THREE.MeshStandardMaterial({color:0xe8f3fa,metalness:.5,roughness:.3});[-4.65,4.65].forEach(x=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,2.7,12),poleMat);p.position.set(x,1.35,0);s.add(p)});
  const net=new THREE.Mesh(new THREE.BoxGeometry(9.3,1.05,.04),new THREE.MeshBasicMaterial({color:0xeaf4fa,transparent:true,opacity:.5,wireframe:true}));net.position.y=1.75;s.add(net);
  const back=new THREE.Mesh(new THREE.PlaneGeometry(36,16),new THREE.MeshBasicMaterial({color:0x0b2239,side:THREE.DoubleSide}));back.position.set(0,5,-8);s.add(back);
}
function createPlayer(color,name,x,z,home,position,stats={}){
  const g=new THREE.Group();g.position.set(x,0,z);const jersey=new THREE.MeshStandardMaterial({color,roughness:.48});const skin=new THREE.MeshStandardMaterial({color:0xf0ae87,roughness:.72});const dark=new THREE.MeshStandardMaterial({color:0x101827,roughness:.7});
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.32,.72,6,12),jersey);torso.position.y=1.05;g.add(torso);const head=new THREE.Mesh(new THREE.SphereGeometry(.28,16,12),skin);head.position.y=1.83;g.add(head);const shorts=new THREE.Mesh(new THREE.BoxGeometry(.5,.3,.34),dark);shorts.position.y=.58;g.add(shorts);
  const arms=[],legs=[];[-.4,.4].forEach(sx=>{const a=new THREE.Mesh(new THREE.CapsuleGeometry(.07,.5,5,8),skin);a.position.set(sx,1.1,0);a.rotation.z=sx<0?-.2:.2;g.add(a);arms.push(a)});[-.14,.14].forEach(sx=>{const l=new THREE.Mesh(new THREE.CapsuleGeometry(.078,.53,5,8),skin);l.position.set(sx,.27,0);g.add(l);legs.push(l);const sh=new THREE.Mesh(new THREE.BoxGeometry(.2,.1,.32),new THREE.MeshStandardMaterial({color:0xf5fbff,roughness:.35}));sh.position.set(sx,.055,home?-.05:.05);g.add(sh)});
  const ring=new THREE.Mesh(new THREE.RingGeometry(.48,.57,32),new THREE.MeshBasicMaterial({color:0x54e7ff,transparent:true,opacity:.9,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.025;g.add(ring);const arrow=new THREE.Mesh(new THREE.ConeGeometry(.11,.28,4),new THREE.MeshBasicMaterial({color:0x54e7ff}));arrow.rotation.x=Math.PI;arrow.position.y=2.45;g.add(arrow);
  g.userData={name,home,position,stats,baseX:x,baseZ:z,speed:3.9+(stats.speed||0)*.012,arms,legs,ring,arrow,action:0,cooldown:0,moveX:0,moveZ:0,phase:Math.random()*Math.PI*2,stance:0,aiTargetX:x,aiTargetZ:z};state.scene.add(g);return g;
}
function buildTeams(){
  const roster=window.VVCharacters?.roster||[];const defaults=['astra','kairo','nova','rex','mira','zen'];let saved=null;try{saved=JSON.parse(localStorage.getItem('volleyverseRoster')||'null')}catch(e){}const picked=(saved||defaults).map(id=>roster.find(c=>c.id===id)).filter(Boolean);const squad=picked.length===6?picked:defaults.map(id=>roster.find(c=>c.id===id)).filter(Boolean);
  const fallback=[{id:'a',name:'Astra',position:'OH',color:0x36bfff,stats:{}},{id:'b',name:'Kairo',position:'S',color:0x36bfff,stats:{}},{id:'c',name:'Nova',position:'OPP',color:0x36bfff,stats:{}},{id:'d',name:'Rex',position:'MB',color:0x36bfff,stats:{}},{id:'e',name:'Mira',position:'MB',color:0x36bfff,stats:{}},{id:'f',name:'Zen',position:'L',color:0x36bfff,stats:{}}];
  const data=squad.length===6?squad:fallback;const pos=[[-5.8,-3.45],[-2.2,-3.45],[2.2,-3.45],[-5.8,-1.15],[-2.2,-1.15],[2.2,-1.15]];
  homePlayers=data.map((c,i)=>createPlayer(c.color||0x36bfff,c.name||('Player '+(i+1)),pos[i][0],pos[i][1],true,c.position||'OH',c.stats||{}));
  const away=[['Vex','OH',0xff4f79],['Luna','S',0xff4f79],['Orion','OPP',0xff4f79],['Kai','MB',0xff8847],['Sora','MB',0xff8847],['Axel','L',0xff8847]];awayPlayers=away.map((c,i)=>createPlayer(c[2],c[0],pos[i][0],-pos[i][1],false,c[1],{}));controlled=homePlayers[0];
}
function buildBall(){ball=new THREE.Mesh(new THREE.SphereGeometry(.2,20,14),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.25}));state.scene.add(ball)}
function updateControlled(){homePlayers.forEach((p,i)=>{p.userData.ring.visible=i===controlledIndex;p.userData.arrow.visible=i===controlledIndex});controlled=homePlayers[controlledIndex]||homePlayers[0]}
function resetPlayers(){[...homePlayers,...awayPlayers].forEach(p=>{p.position.x=p.userData.baseX;p.position.z=p.userData.baseZ;p.position.y=0;p.userData.action=0;p.userData.cooldown=0;p.userData.moveX=0;p.userData.moveZ=0;p.userData.aiTargetX=p.userData.baseX;p.userData.aiTargetZ=p.userData.baseZ})}
function resetBall(){if(!ball||!controlled)return;ballState.active=false;ballState.v.set(0,0,0);ballState.lastTouch=servingTeam;ballState.cooldown=0;ball.position.set(servingTeam==='home'?controlled.position.x:0,1.95,servingTeam==='home'?-4.2:4.2);rallyLocked=false;if(servingTeam==='home')tip('TAP SERVE TO START • '+controlled.userData.name.toUpperCase());else{tip('RIVALS SERVING • RECEIVE THE BALL');setTimeout(aiServe,450)}}
function aiServe(){if(!state.ready||servingTeam!=='away'||ballState.active||rallyLocked)return;const p=awayPlayers[1];ball.position.set(p.position.x,1.95,4.15);ballState.v.set((Math.random()-.5)*.7,5.8,-8.5);ballState.active=true;ballState.lastTouch='away';p.userData.action=.55;tip('RIVALS SERVE • RECEIVE THE BALL')}
function serve(){if(!state.ready||ballState.active||rallyLocked||servingTeam!=='home')return;ball.position.set(controlled.position.x,1.95,-4.15);ballState.v.set(THREE.MathUtils.clamp(controlled.position.x*.06,-.65,.65),5.8,8.5);ballState.active=true;ballState.lastTouch='home';controlled.userData.action=.55;tip('SERVE IN PLAY • MOVE INTO POSITION')}
function action(type){if(!state.ready||rallyLocked)return;if(type==='serve'){serve();return}if(!ballState.active||ballState.cooldown>0)return;const dx=ball.position.x-controlled.position.x,dz=ball.position.z-controlled.position.z;const near=Math.hypot(dx,dz)<(type==='dive'?2.8:2.35);if(!near||ball.position.y<.2||ball.position.y>4.4)return;if(type==='pass'){ballState.v.set(dx*.18,6.3,4.8);tip('PASS • BUILD THE ATTACK')}else if(type==='set'){ballState.v.set(dx*.12,7.35,4.2);tip('SET • PREPARE THE SPIKE')}else if(type==='spike'){ballState.v.set(dx*.15,4.9,10.9);tip('SPIKE • ATTACK THE OPPONENT')}else if(type==='block'){if(ball.position.z>-.8&&ball.position.y>1.25){ballState.v.set(dx*.2,5.8,-Math.abs(ballState.v.z)*.9||-6.5);tip('BLOCK • CLOSE THE ANGLE')}else return}else if(type==='dive'){controlled.position.z=THREE.MathUtils.clamp(controlled.position.z+.7,-4.65,-.3);ballState.v.set(dx*.28,5.5,4.2);tip('DIG • KEEP THE RALLY ALIVE')}controlled.userData.action=type==='dive'?.8:.55;ballState.lastTouch='home';ballState.cooldown=.25}
function switchPlayer(){if(rallyLocked)return;controlledIndex=(controlledIndex+1)%homePlayers.length;updateControlled();updateHUD();tip('CONTROL • '+controlled.userData.name.toUpperCase());if(!ballState.active)resetBall()}
function roleTarget(p,home,targetX,targetZ){
  const baseX=p.userData.baseX,baseZ=p.userData.baseZ,role=p.userData.position;
  const side=home?-1:1;
  let tx=baseX,tz=baseZ;
  if(!ballState.active){
    tx=baseX+Math.sin(performance.now()*.001+p.userData.phase)*.18;
    tz=baseZ+Math.sin(performance.now()*.0012+p.userData.phase)*.08;
  }else{
    const towardX=THREE.MathUtils.clamp((targetX-baseX)*.34,-1.7,1.7);
    if(role==='S'||role==='SETTER'){tx=THREE.MathUtils.clamp(targetX*.28,-3.0,3.0);tz=home?-2.45:2.45}
    else if(role==='MB'){tx=THREE.MathUtils.clamp(targetX*.58,-4.5,4.5);tz=home?-1.05:1.05}
    else if(role==='L'||role==='LIBERO'){tx=THREE.MathUtils.clamp(targetX*.78,-6.8,6.8);tz=home?-3.65:3.65}
    else {tx=baseX+towardX;tz=home?-2.55:2.55}
    const danger=home?targetZ<-.9:targetZ>.9;
    if(danger){tx+=THREE.MathUtils.clamp((targetX-tx)*.25,-1.25,1.25);tz=home?Math.max(-4.45,tz-.18):Math.min(4.45,tz+.18)}
  }
  return {x:THREE.MathUtils.clamp(tx,-8.2,8.2),z:home?THREE.MathUtils.clamp(tz,-4.65,-.35):THREE.MathUtils.clamp(tz,.35,4.65),side};
}
function moveAIPlayer(p,dt,targetX,targetZ,home){
  const t=roleTarget(p,home,targetX,targetZ);p.userData.aiTargetX=t.x;p.userData.aiTargetZ=t.z;
  const dx=t.x-p.position.x,dz=t.z-p.position.z;const dist=Math.hypot(dx,dz);const max=p.userData.speed*dt*(home?.72:1.0);
  if(dist>.04){const step=Math.min(dist,max);p.position.x+=dx/dist*step;p.position.z+=dz/dist*step;p.userData.moveX=dx/dist;p.userData.moveZ=dz/dist}else{p.userData.moveX=0;p.userData.moveZ=0}
  p.position.x=THREE.MathUtils.clamp(p.position.x,-8.3,8.3);p.position.z=home?THREE.MathUtils.clamp(p.position.z,-4.7,-.25):THREE.MathUtils.clamp(p.position.z,.25,4.7);
}
function aiUpdate(dt){
  const targetX=ballState.active?ball.position.x:0,targetZ=ballState.active?ball.position.z:0;
  // The five non-controlled teammates reposition as a coordinated volleyball unit.
  homePlayers.forEach((p,i)=>{if(p===controlled){p.userData.moveX=keys.x;p.userData.moveZ=keys.z;return}moveAIPlayer(p,dt,targetX,targetZ,true);p.userData.cooldown=Math.max(0,p.userData.cooldown-dt)});
  // Opponents mirror the rally: front row closes toward the ball, back row spreads for coverage.
  awayPlayers.forEach(p=>{moveAIPlayer(p,dt,targetX,targetZ,false);p.userData.cooldown=Math.max(0,p.userData.cooldown-dt)});
  if(!ballState.active||ball.position.z<0||ballState.cooldown>0)return;
  const receiver=awayPlayers.reduce((a,p)=>Math.abs(p.position.x-ball.position.x)<Math.abs(a.position.x-ball.position.x)?p:a,awayPlayers[0]);
  if(Math.hypot(ball.position.x-receiver.position.x,ball.position.z-receiver.position.z)<2.1&&receiver.userData.cooldown<=0&&ball.position.y<3){
    ballState.v.set((Math.random()-.5)*1.2,ball.position.y>1.8?5.2:6.2,-(ball.position.y>1.8?9.8:4.6));ballState.lastTouch='away';receiver.userData.action=.5;receiver.userData.cooldown=.7;ballState.cooldown=.35;tip('OPPONENT TOUCH • DEFEND');
  }
}
function point(winner){if(rallyLocked)return;rallyLocked=true;if(winner==='home')homeScore++;else awayScore++;servingTeam=winner;updateHUD();const target=setNumber===5?15:25;if((homeScore>=target||awayScore>=target)&&Math.abs(homeScore-awayScore)>=2){if(homeScore>awayScore)homeSets++;else awaySets++;if(homeSets>=3||awaySets>=3){$('overlayTitle').textContent=homeSets>awaySets?'VICTORY':'DEFEAT';$('overlayText').textContent=`Match complete • ${homeSets}–${awaySets} sets`;$('playBtn').textContent='PLAY AGAIN';$('overlay').classList.remove('hidden');return}setNumber++;homeScore=awayScore=0;tip(`SET ${setNumber} • FIRST TO ${setNumber===5?15:25}`)}setTimeout(()=>{resetPlayers();resetBall();updateHUD()},700)}
function physics(dt){
  if(!state.ready||paused)return;
  if(controlled){controlled.position.x+=keys.x*controlled.userData.speed*dt;controlled.position.z+=keys.z*controlled.userData.speed*dt;controlled.position.x=THREE.MathUtils.clamp(controlled.position.x,-8.2,8.2);controlled.position.z=THREE.MathUtils.clamp(controlled.position.z,-4.7,-.25);controlled.userData.moveX=keys.x;controlled.userData.moveZ=keys.z}
  aiUpdate(dt);
  if(!ballState.active)return;
  ballState.cooldown=Math.max(0,ballState.cooldown-dt);ballState.v.y-=11.5*dt;ball.position.addScaledVector(ballState.v,dt);
  if(ball.position.y<.2){ball.position.y=.2;point(ballState.lastTouch==='home'?'away':'home');return}if(Math.abs(ball.position.z)>5.05){point(ball.position.z<0?'away':'home');return}if(Math.abs(ball.position.z)<.08&&ball.position.y<2.1&&ball.position.y>.7)ballState.v.z*=-.82;
}
function animatePlayers(dt){
  const now=performance.now();
  [...homePlayers,...awayPlayers].forEach(p=>{
    const u=p.userData;u.cooldown=Math.max(0,u.cooldown-dt);u.action=Math.max(0,u.action-dt);
    const moving=Math.abs(u.moveX)+Math.abs(u.moveZ)>.12;
    const speed=Math.hypot(u.moveX,u.moveZ);
    const stride=moving?Math.sin(now*.014+u.phase)*Math.min(.42,.16+speed*.18):Math.sin(now*.002+u.phase)*.025;
    const rallyReady=ballState.active&&!moving;
    const crouch=rallyReady?-.10:0;
    const swing=u.action>0?Math.sin(u.action*18)*.8:0;
    // Running feet and a low ready stance make the AI look active even when waiting.
    u.legs[0].rotation.x=stride;u.legs[1].rotation.x=-stride;
    u.arms[0].rotation.z=-.2-swing+(rallyReady?-.18:0);u.arms[1].rotation.z=.2+swing+(rallyReady?.18:0);
    u.arms[0].rotation.x=moving?-.18:0;u.arms[1].rotation.x=moving?.18:0;
    u.stance=crouch;
    p.position.y=u.action>.6?Math.max(0,Math.sin((.8-u.action)*Math.PI)*.18):0;
    p.rotation.y=Math.atan2(u.moveX,Math.max(.001,Math.abs(u.moveZ)))+(p.userData.home?Math.PI:0);
    const torso=p.children[0];if(torso)torso.rotation.x=crouch;
    if(u.action>0&&u.action<.35){u.arms[0].rotation.z-=.25;u.arms[1].rotation.z+=.25}
  });
}
function resize(){if(!state.ready)return;state.camera.aspect=Math.max(innerWidth,1)/Math.max(innerHeight,1);state.camera.updateProjectionMatrix();state.renderer.setSize(Math.max(innerWidth,1),Math.max(innerHeight,1),false)}
let last=performance.now();function loop(now){const dt=Math.min((now-last)/1000,.035);last=now;if(state.ready){physics(dt);animatePlayers(dt);state.renderer.render(state.scene,state.camera)}requestAnimationFrame(loop)}

['pass','set','spike','block','dive','serve'].forEach(t=>$(t+'Btn')?.addEventListener('pointerdown',e=>{e.preventDefault();action(t)}));$('switchBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();switchPlayer()});$('pauseBtn')?.addEventListener('pointerdown',()=>{paused=!paused;$('pauseBtn').textContent=paused?'▶':'Ⅱ';tip(paused?'MATCH PAUSED':'RALLY LIVE • MOVE AND PLAY')});
$('playBtn')?.addEventListener('pointerdown',()=>{if($('playBtn').textContent==='PLAY AGAIN'){homeScore=awayScore=homeSets=awaySets=0;setNumber=1;servingTeam='home';controlledIndex=0;resetPlayers();updateControlled();updateHUD();$('overlayTitle').textContent='READY?';$('overlayText').textContent='Move your player, receive, set, spike and defend.';$('playBtn').textContent='PLAY MATCH';resetBall()}else{$('overlay').classList.add('hidden');createScene()}});

const controls=$('controls'),joy=$('joystick'),stick=$('stick');
let joystickActive=false,joystickPointerId=null;
function setJoystickFromPoint(clientX,clientY){
  if(!joy)return;
  const r=joy.getBoundingClientRect();
  const cx=r.left+r.width/2,cy=r.top+r.height/2;
  let x=clientX-cx,y=clientY-cy;
  const max=Math.max(r.width*.32,1),len=Math.hypot(x,y);
  if(len>max){x*=max/len;y*=max/len}
  stick.style.transform=`translate(${x}px,${y}px)`;
  keys.x=x/max;keys.z=y/max;
}
function joyStart(e){
  if(e.pointerType==='mouse'&&e.button!==0)return;
  e.preventDefault();
  joystickActive=true;joystickPointerId=e.pointerId;
  controls?.setPointerCapture?.(e.pointerId);
  setJoystickFromPoint(e.clientX,e.clientY);
}
function joyMove(e){
  if(!joystickActive||e.pointerId!==joystickPointerId)return;
  e.preventDefault();
  setJoystickFromPoint(e.clientX,e.clientY);
}
function joyEnd(e){
  if(joystickPointerId!==null&&e?.pointerId!==undefined&&e.pointerId!==joystickPointerId)return;
  joystickActive=false;joystickPointerId=null;stick.style.transform='translate(0,0)';keys.x=keys.z=0;
}
controls?.addEventListener('pointerdown',e=>{if(e.target.closest('.action'))return;const half=innerWidth*.52;if(e.clientX<=half)joyStart(e)},{passive:false});
controls?.addEventListener('pointermove',joyMove,{passive:false});controls?.addEventListener('pointerup',joyEnd,{passive:false});controls?.addEventListener('pointercancel',joyEnd,{passive:false});controls?.addEventListener('lostpointercapture',joyEnd,{passive:false});

window.addEventListener('resize',resize);const observer=new MutationObserver(()=>{if(!state.ready&&!wrap.classList.contains('hidden'))createScene()});observer.observe(wrap,{attributes:true,attributeFilter:['class']});if(!wrap.classList.contains('hidden'))createScene();