import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const $ = id => document.getElementById(id);
const wrap = $('canvasWrap');
const state = { renderer:null, camera:null, scene:null, ready:false, running:false };
const keys = {x:0,z:0};
const remoteKeys = {x:0,z:0};
let remotePlayerIndex=1;
let homeScore=0, awayScore=0, homeSets=0, awaySets=0, setNumber=1, matchHomePoints=0;
let servingTeam='home', controlledIndex=0, controlled=null, paused=false, rallyLocked=false;
const controlMode=()=>localStorage.getItem('volleyverseControlMode')||'team';
let homePlayers=[], awayPlayers=[], ball=null;
const COURT_LENGTH=18, COURT_WIDTH=9, HALF_LENGTH=9, HALF_WIDTH=4.5, ATTACK_LINE=3;
const ballState={v:new THREE.Vector3(),active:false,lastTouch:'home',cooldown:0,touches:0,lastAction:'',side:'home',targetX:0,targetZ:0,teamTouches:{home:0,away:0},crossed:false};

function updateHUD(){ $('homeScore').textContent=homeScore; $('awayScore').textContent=awayScore; $('setNumber').textContent=setNumber; $('setStatus').textContent=setNumber===5?'15':'25'; if(controlled)$('controlledPlayer').textContent=controlled.userData.name.toUpperCase()+' • '+controlled.userData.position; const onlineHud=$('onlineMatchStatus'); if(onlineHud){const live=onlineMatchActive;onlineHud.classList.toggle('hidden',!live);const team=$('onlineTeamLabel'),slot=$('onlineSlotLabel'),ping=$('onlinePingLabel');const net=window.VVOnlineClient?.getStatus?.()||{};if(team)team.textContent='ONLINE 6V6 • '+String(onlineTeam||'HOME').toUpperCase();if(slot)slot.textContent='SLOT '+(Number.isInteger(onlineSlot)?onlineSlot+1:'—');if(ping)ping.textContent='PING '+(Number(net.pingMs)||0)+' MS'}}
function tip(t){ $('tip').textContent=t; }
function showError(message){let e=$('renderError');if(!e){e=document.createElement('div');e.id='renderError';document.body.appendChild(e)}e.innerHTML='<b>3D MATCH COULD NOT START</b><span>'+message+'</span><button>RELOAD MATCH</button>';e.querySelector('button').onclick=()=>location.reload();}
function createScene(){
  if(state.ready)return true;if(!wrap)return false;
  try{
    state.scene=new THREE.Scene();state.scene.background=new THREE.Color(0x07182a);state.scene.fog=new THREE.Fog(0x07182a,32,70);
    // Wider elevated broadcast-style POV: the full regulation court stays visible and the ball has room to travel.
    state.camera=new THREE.PerspectiveCamera(46,Math.max(innerWidth,1)/Math.max(innerHeight,1),.1,140);
    state.camera.position.set(0,13.2,23.5);state.camera.lookAt(0,0.7,0);
    state.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'default',alpha:false});state.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));state.renderer.setSize(Math.max(innerWidth,1),Math.max(innerHeight,1),false);state.renderer.shadowMap.enabled=false;state.renderer.outputColorSpace=THREE.SRGBColorSpace;state.renderer.domElement.style.width='100%';state.renderer.domElement.style.height='100%';wrap.innerHTML='';wrap.appendChild(state.renderer.domElement);
    state.scene.add(new THREE.HemisphereLight(0xdff5ff,0x16304a,2.4));const key=new THREE.DirectionalLight(0xffffff,2.7);key.position.set(4,12,8);state.scene.add(key);const fill=new THREE.DirectionalLight(0x6ad8ff,1.5);fill.position.set(-8,6,-6);state.scene.add(fill);
    buildCourt();buildTeams();buildBall();if(controlMode()==='lock'){const saved=Number(localStorage.getItem('volleyverseLockPlayer')||0);controlledIndex=THREE.MathUtils.clamp(saved,0,5)}updateControlled();updateHUD();resetBall();state.ready=true;resize();if(!state.running){state.running=true;requestAnimationFrame(loop)}return true;
  }catch(err){console.error('VOLLEYVERSE 3D initialization failed:',err);showError('Your browser could not create the 3D graphics. Try Chrome again after reloading.');return false}
}
function buildCourt(){
  const s=state.scene;const floor=new THREE.Mesh(new THREE.BoxGeometry(COURT_LENGTH,.2,COURT_WIDTH),new THREE.MeshStandardMaterial({color:0x17658f,roughness:.72}));floor.position.y=-.12;s.add(floor);
  const free=new THREE.Mesh(new THREE.PlaneGeometry(24,15),new THREE.MeshBasicMaterial({color:0x0b2239,side:THREE.DoubleSide}));free.rotation.x=-Math.PI/2;free.position.y=-.215;s.add(free);
  const lineMat=new THREE.MeshBasicMaterial({color:0xffffff});const line=(x,z,w,d)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,.035,d),lineMat);m.position.set(x,.015,z);s.add(m)};
  line(0,-HALF_WIDTH,COURT_LENGTH,.08);line(0,HALF_WIDTH,COURT_LENGTH,.08);line(-HALF_LENGTH,0,.08,COURT_WIDTH);line(HALF_LENGTH,0,.08,COURT_WIDTH);line(0,-ATTACK_LINE,COURT_LENGTH,.055);line(0,ATTACK_LINE,COURT_LENGTH,.055);line(0,0,.055,COURT_WIDTH);
  const poleMat=new THREE.MeshStandardMaterial({color:0xe8f3fa,metalness:.5,roughness:.3});[-4.65,4.65].forEach(x=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,3.6,12),poleMat);p.position.set(x,1.8,0);s.add(p)});
  const net=new THREE.Mesh(new THREE.BoxGeometry(9.3,2.43,.04),new THREE.MeshBasicMaterial({color:0xeaf4fa,transparent:true,opacity:.32,wireframe:true}));net.position.y=1.215;s.add(net);
  const back=new THREE.Mesh(new THREE.PlaneGeometry(36,16),new THREE.MeshBasicMaterial({color:0x0b2239,side:THREE.DoubleSide}));back.position.set(0,5,-8);s.add(back);
}
function createPlayer(color,name,x,z,home,position,stats={}){
  const g=new THREE.Group();g.position.set(x,0,z);
  const jersey=new THREE.MeshStandardMaterial({color,roughness:.42,metalness:.04});
  const skin=new THREE.MeshStandardMaterial({color:0xf0ae87,roughness:.68});
  const dark=new THREE.MeshStandardMaterial({color:0x101827,roughness:.62});
  const hairMat=new THREE.MeshStandardMaterial({color:home?0x182338:0x24160f,roughness:.72});
  const white=new THREE.MeshStandardMaterial({color:0xf5fbff,roughness:.32});
  const accent=new THREE.MeshStandardMaterial({color:0x54e7ff,roughness:.35});
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.62,8,14),jersey);torso.scale.set(1.05,1.12,.72);torso.position.y=1.08;g.add(torso);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.105,.12,.16,10),skin);neck.position.y=1.55;g.add(neck);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.29,20,16),skin);head.scale.set(1,.98,.94);head.position.y=1.82;g.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.30,20,12,0,Math.PI*2,0,Math.PI*.52),hairMat);hair.position.set(0,1.91,-.015);g.add(hair);
  const shorts=new THREE.Mesh(new THREE.BoxGeometry(.58,.32,.42),dark);shorts.position.y=.62;g.add(shorts);
  const arms=[],legs=[];
  [-.43,.43].forEach(sx=>{const upper=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.27,6,8),jersey);upper.position.set(sx,1.25,0);upper.rotation.z=sx<0?-.14:.14;g.add(upper);const lower=new THREE.Mesh(new THREE.CapsuleGeometry(.065,.30,6,8),skin);lower.position.set(sx*1.03,.98,0);lower.rotation.z=sx<0?-.08:.08;g.add(lower);const hand=new THREE.Mesh(new THREE.SphereGeometry(.085,10,8),skin);hand.position.set(sx*1.08,.78,0);g.add(hand);arms.push({upper,lower,hand})});
  [-.15,.15].forEach(sx=>{const thigh=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.30,6,8),dark);thigh.position.set(sx,.43,0);g.add(thigh);const shin=new THREE.Mesh(new THREE.CapsuleGeometry(.085,.34,6,8),skin);shin.position.set(sx,.18,0);g.add(shin);const shoe=new THREE.Mesh(new THREE.BoxGeometry(.22,.11,.38),white);shoe.position.set(sx,.035,0);g.add(shoe);const sole=new THREE.Mesh(new THREE.BoxGeometry(.23,.035,.40),accent);sole.position.set(sx,0,0);g.add(sole);legs.push({thigh,shin,shoe})});
  const number=new THREE.Mesh(new THREE.PlaneGeometry(.18,.24),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,side:THREE.DoubleSide}));number.position.set(0,1.08,home ? .25 : -.25);number.rotation.y=home?0:Math.PI;g.add(number);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.48,.57,32),new THREE.MeshBasicMaterial({color:0x54e7ff,transparent:true,opacity:.9,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.025;g.add(ring);const arrow=new THREE.Mesh(new THREE.ConeGeometry(.11,.28,4),new THREE.MeshBasicMaterial({color:0x54e7ff}));arrow.rotation.x=Math.PI;arrow.position.y=2.45;g.add(arrow);
  g.userData={name,home,position,stats,baseX:x,baseZ:z,speed:3.9+(stats.speed||0)*.012,arms,legs,ring,arrow,action:0,cooldown:0,moveX:0,moveZ:0,phase:Math.random()*Math.PI*2,stance:0,jumpY:0,jumpV:0,aiTargetX:x,aiTargetZ:z,coverageX:x};state.scene.add(g);return g;
}
function matchStats(character){
  if(!character)return{};
  if(character.id&&window.VVProgression?.effectiveStats)return window.VVProgression.effectiveStats(character.id);
  return {...(character.stats||{})};
}
function buildTeams(){
  const roster=window.VVCharacters?.roster||[];
  const defaults=['astra','kairo','nova','rex','mira','zen'];
  let saved=null;try{saved=JSON.parse(localStorage.getItem('volleyverseRoster')||'null')}catch(e){}
  const picked=(saved||defaults).map(id=>roster.find(c=>c.id===id)).filter(Boolean);
  const squad=picked.length===6?picked:defaults.map(id=>roster.find(c=>c.id===id)).filter(Boolean);
  const fallback=[{id:'astra',name:'Astra',position:'OH',color:0x36bfff,stats:{}},{id:'kairo',name:'Kairo',position:'S',color:0x36bfff,stats:{}},{id:'nova',name:'Nova',position:'OPP',color:0x36bfff,stats:{}},{id:'rex',name:'Rex',position:'MB',color:0x36bfff,stats:{}},{id:'mira',name:'Mira',position:'MB',color:0x36bfff,stats:{}},{id:'zen',name:'Zen',position:'L',color:0x36bfff,stats:{}}];
  const data=squad.length===6?squad:fallback;
  const pos=[[-5.8,-3.45],[-2.2,-3.45],[2.2,-3.45],[-5.8,-1.15],[-2.2,-1.15],[2.2,-1.15]];
  homePlayers=data.map((ch,i)=>{
    const p=createPlayer(ch.color||0x36bfff,ch.name||('Player '+(i+1)),pos[i][0],pos[i][1],true,ch.position||'OH',matchStats(ch));
    p.userData.characterId=ch.id||null;
    p.userData.characterStyle=ch.style||'';
    p.userData.characterRarity=ch.rarity||'Common';
    return p;
  });
  const awayIds=['vex','luna','orion','kai','sora','axel'];
  const awayData=awayIds.map(id=>roster.find(c=>c.id===id)).filter(Boolean);
  const awayFallback=[['Vex','OH',0xff4f79],['Luna','S',0xff4f79],['Orion','OPP',0xff4f79],['Kai','MB',0xff8847],['Sora','MB',0xff8847],['Axel','L',0xff8847]];
  awayPlayers=(awayData.length===6?awayData:awayFallback).map((ch,i)=>{
    const name=ch.name||ch[0],position=ch.position||ch[1],color=ch.color||ch[2],stats=ch.stats||{};
    const p=createPlayer(color,name,pos[i][0],-pos[i][1],false,position,stats);
    p.userData.characterId=ch.id||null;
    p.userData.characterStyle=ch.style||'';
    p.userData.characterRarity=ch.rarity||'Common';
    return p;
  });
  controlled=homePlayers[0];
}
function buildBall(){ball=new THREE.Mesh(new THREE.SphereGeometry(.2,20,14),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.25}));state.scene.add(ball)}
function applyRemoteInput(input){
  if(!localConnected()||!localHost())return;
  if(input?.kind==='move'){remoteKeys.x=THREE.MathUtils.clamp(Number(input.x)||0,-1,1);remoteKeys.z=THREE.MathUtils.clamp(Number(input.z)||0,-1,1)}
  if(input?.kind==='switch'){homePlayers[remotePlayerIndex].userData.remoteControlled=false;remotePlayerIndex=(remotePlayerIndex+1)%homePlayers.length;homePlayers[remotePlayerIndex].userData.remoteControlled=true}
  if(input?.kind==='action'&&input.type){const old=controlledIndex;const oldControlled=controlled;controlledIndex=THREE.MathUtils.clamp(remotePlayerIndex,0,5);updateControlled();action(input.type);controlledIndex=old;controlled=oldControlled;updateControlled()}
}
function updateRemotePlayer(dt){
  const p=homePlayers[remotePlayerIndex];if(!p||p===controlled)return;
  p.userData.remoteControlled=true;p.userData.moveX=remoteKeys.x;p.userData.moveZ=remoteKeys.z;
  const speed=p.userData.speed||4.2;const mag=Math.hypot(remoteKeys.x,remoteKeys.z);
  if(mag>.05&&!rallyLocked){p.position.x=THREE.MathUtils.clamp(p.position.x+remoteKeys.x*speed*dt,-4.25,4.25);p.position.z=THREE.MathUtils.clamp(p.position.z+remoteKeys.z*speed*dt,-4.35,-.25)}
}
function updateControlled(){homePlayers.forEach((p,i)=>{p.userData.ring.visible=i===controlledIndex;p.userData.arrow.visible=i===controlledIndex});controlled=homePlayers[controlledIndex]||homePlayers[0]}
function resetPlayers(){window.VVReplay?.start?.({mode:localStorage.getItem('volleyverseMatchMode')||'real'});
  const roster=window.VVCharacters?.roster||[];
  let saved=null;try{saved=JSON.parse(localStorage.getItem('volleyverseRoster')||'null')}catch(e){}
  const homeIds=(Array.isArray(saved)&&saved.length===6?saved:['astra','kairo','nova','rex','mira','zen']);
  const awayIds=['vex','luna','orion','kai','sora','axel'];
  [...homePlayers,...awayPlayers].forEach((p,i)=>{
    const id=i<6?homeIds[i]:awayIds[i-6],ch=roster.find(x=>x.id===id);
    if(ch){
      p.userData.characterId=ch.id;
      p.userData.name=ch.name;
      p.userData.position=ch.position;
      p.userData.stats=matchStats(ch);
      p.userData.characterStyle=ch.style||'';
      p.userData.characterRarity=ch.rarity||'Common';
      p.userData.speed=3.9+(p.userData.stats.speed||0)*.012;
    }
    p.userData.remoteControlled=false;p.position.x=p.userData.baseX;p.position.z=p.userData.baseZ;p.position.y=0;p.userData.action=0;p.userData.cooldown=0;p.userData.moveX=0;p.userData.moveZ=0;p.userData.aiTargetX=p.userData.baseX;p.userData.aiTargetZ=p.userData.baseZ;p.userData.coverageX=p.userData.baseX;
  });
}
function resetBall(){if(!ball||!controlled)return;ballState.active=false;ballState.v.set(0,0,0);ballState.lastTouch=servingTeam;ballState.cooldown=0;ballState.touches=0;ballState.lastAction='serve';ballState.side=servingTeam;ballState.targetX=controlled.position.x;ballState.targetZ=servingTeam==='home'?-2.5:2.5;ballState.teamTouches={home:0,away:0};ballState.crossed=false;ball.position.set(servingTeam==='home'?controlled.position.x:0,1.95,servingTeam==='home'?-4.15:4.15);rallyLocked=false;if(servingTeam==='home'){tip('READY • SERVE TO START THE RALLY');setTimeout(()=>{if(state.ready&&!ballState.active&&!rallyLocked&&servingTeam==='home')serve()},650)}else{tip('RIVALS SERVING • RECEIVE THE BALL');setTimeout(aiServe,450)}}
function aiServe(){if(!state.ready||servingTeam!=='away'||ballState.active||rallyLocked)return;const p=awayPlayers[1];const targetX=THREE.MathUtils.clamp((Math.random()-.5)*7.2,-3.6,3.6);ball.position.set(p.position.x,1.95,4.15);const dx=targetX-ball.position.x;ballState.v.set(THREE.MathUtils.clamp(dx*.22,-1.25,1.25),5.8,-7.2);ballState.active=true;ballState.lastTouch='away';ballState.side='away';ballState.touches=1;ballState.lastAction='serve';ballState.teamTouches={home:0,away:1};p.userData.action=.55;tip('RIVALS SERVE • RECEIVE THE BALL')}
function serve(){if(!state.ready||ballState.active||rallyLocked||servingTeam!=='home')return;ball.position.set(controlled.position.x,1.95,-4.15);ballState.v.set(THREE.MathUtils.clamp(controlled.position.x*.06,-.65,.65),5.8,7.2);ballState.active=true;ballState.lastTouch='home';ballState.side='home';ballState.touches=1;ballState.lastAction='serve';ballState.teamTouches={home:1,away:0};controlled.userData.action=.55;tip('SERVE IN PLAY • MOVE INTO POSITION')}
function skillWindow(type){return {pass:[.72,2.65],set:[1.35,3.35],spike:[2.05,4.25],block:[1.25,3.25],dive:[.18,1.35],serve:[1.5,2.25]}[type]||[.2,4.5]}
function timingQuality(type){const [min,max]=skillWindow(type);const h=ball.position.y;const center=(min+max)/2;const span=Math.max(max-min,.1);return THREE.MathUtils.clamp(1-Math.abs(h-center)/(span*.72),.12,1)}
function timingFeedback(type){if(!ballState.active||!controlled)return;const [min,max]=skillWindow(type);const near=Math.hypot(ball.position.x-controlled.position.x,ball.position.z-controlled.position.z)<(type==='dive'?2.8:2.35);const q=timingQuality(type);const ready=ball.position.y>=min&&ball.position.y<=max&&near&&q>=.72;const el=$('tip');if(ready){el?.classList.add('timing-ready');if(!el?.dataset.ready) {el.textContent='● PERFECT TIMING • '+type.toUpperCase()+' READY';el.dataset.ready='1'}}else{el?.classList.remove('timing-ready');if(el)delete el.dataset.ready}}
function skillRating(player,type){const s=player?.userData?.stats||{};const map={pass:'receive',set:'set',spike:'spike',block:'block',dive:'receive',serve:'serve'};return Number(s[map[type]]||75)}
function skillQuality(player,type,base){const rating=skillRating(player,type);const reaction=Number(player?.userData?.stats?.reaction||75);const speed=Number(player?.userData?.stats?.speed||75);const variance=(Math.random()-.5)*Math.max(.08,(100-rating)/180);return THREE.MathUtils.clamp(base+((rating-75)/100)*.22+(reaction-75)/500+((speed-75)/500)+variance,.45,1.2)}
function launchTo(x,z,y=.35,forwardSpeed=7.4){const dx=x-ball.position.x,dz=z-ball.position.z;const horizontal=Math.max(Math.hypot(dx,dz),.1);const t=horizontal/forwardSpeed;ballState.v.x=dx/t;ballState.v.z=dz/t;ballState.v.y=((y-ball.position.y)+(5.75*t*t))/t}

// DEVELOPMENT #4 • local Wi-Fi gameplay bridge
let localLastSeq=0,clientControlledIndex=0,localSessionStarted=false,onlineMatchActive=false,onlineTeam='home',onlineSlot=-1,onlineLastInputAt=0;
function localConnected(){return !!window.VVLocalMultiplayer?.isConnected?.()}
function localHost(){return !!window.VVLocalMultiplayer?.isHost?.()}
function localNetSnapshot(){
  return {
    homeScore,awayScore,homeSets,awaySets,setNumber,servingTeam,rallyLocked,
    ball:ball?{x:ball.position.x,y:ball.position.y,z:ball.position.z,vx:ballState.v.x,vy:ballState.v.y,vz:ballState.v.z,active:ballState.active,lastTouch:ballState.lastTouch,touches:ballState.touches,teamTouches:ballState.teamTouches,lastAction:ballState.lastAction}:null,
    players:[...homePlayers,...awayPlayers].map(p=>({x:p.position.x,y:p.position.y,z:p.position.z,jumpY:p.userData.jumpY,action:p.userData.action})),
    controlledIndex
  };
}
function applyOnlineSnapshot(payload){const s=payload?.state||payload;if(!s)return;onlineMatchActive=true;localSessionStarted=true;onlineTeam=payload?.localTeam||onlineTeam;onlineSlot=Number.isInteger(payload?.localSlot)?payload.localSlot:onlineSlot;homeScore=s.scores?.home??homeScore;awayScore=s.scores?.away??awayScore;homeSets=s.sets?.home??homeSets;awaySets=s.sets?.away??awaySets;setNumber=s.setNumber??setNumber;servingTeam=s.serving||servingTeam;rallyLocked=s.status==='FINISHED';const all=[...homePlayers,...awayPlayers];if(Array.isArray(s.players)){s.players.forEach(v=>{const p=all[v.team==='home'?Number(v.slot):6+Number(v.slot)];if(!p)return;p.userData.onlineServerId=v.id;p.userData.moveX=THREE.MathUtils.clamp((Number(v.x)-p.position.x)*8,-1,1);p.userData.moveZ=THREE.MathUtils.clamp((Number(v.z)-p.position.z)*8,-1,1);p.position.set(Number(v.x)||0,Number(v.y)||0,Number(v.z)||0);p.userData.action=Number(v.lastAction?0:.0);p.userData.onlineAction=v.lastAction||null;p.userData.onlineConnected=v.connected!==false;p.userData.aiTakeover=!!v.aiTakeover})}if(s.ball&&ball){ball.position.set(Number(s.ball.x)||0,Number(s.ball.y)||0,Number(s.ball.z)||0);ballState.v.set(Number(s.ball.vx)||0,Number(s.ball.vy)||0,Number(s.ball.vz)||0);ballState.active=!!s.rally?.active;ballState.lastTouch=s.ball.lastTeam||ballState.lastTouch;ballState.teamTouches=s.rally?.teamTouches||ballState.teamTouches;ballState.touches=Number(s.rally?.touches)||0}const mine=onlineTeam==='away'?awayPlayers[onlineSlot]:homePlayers[onlineSlot];if(mine){controlled=mine;[...homePlayers,...awayPlayers].forEach(p=>{p.userData.ring.visible=false;p.userData.arrow.visible=false});mine.userData.ring.visible=true;mine.userData.arrow.visible=true}updateHUD();tip(onlineTeam==='away'?'ONLINE 6V6 • AWAY':'ONLINE 6V6 • HOME')}
function applyLocalSnapshot(s){
  if(!s)return;
  homeScore=s.homeScore??homeScore;awayScore=s.awayScore??awayScore;homeSets=s.homeSets??homeSets;awaySets=s.awaySets??awaySets;setNumber=s.setNumber??setNumber;servingTeam=s.servingTeam||servingTeam;rallyLocked=!!s.rallyLocked;
  if(s.ball&&ball){
    ball.position.set(s.ball.x,s.ball.y,s.ball.z);ballState.v.set(s.ball.vx,s.ball.vy,s.ball.vz);ballState.active=!!s.ball.active;ballState.lastTouch=s.ball.lastTouch||ballState.lastTouch;ballState.touches=s.ball.touches??ballState.touches;ballState.teamTouches=s.ball.teamTouches||ballState.teamTouches;ballState.lastAction=s.ball.lastAction||ballState.lastAction;
  }
  if(Array.isArray(s.players)){const all=[...homePlayers,...awayPlayers];s.players.forEach((v,i)=>{const p=all[i];if(!p)return;p.position.set(v.x,v.y,v.z);p.userData.jumpY=v.jumpY??p.userData.jumpY;p.userData.action=v.action??p.userData.action})}
  if(!localConnected()||localHost()){if(Number.isInteger(s.controlledIndex)&&s.controlledIndex!==controlledIndex){controlledIndex=THREE.MathUtils.clamp(s.controlledIndex,0,5);updateControlled()}}
  updateHUD();
}
window.addEventListener('vv-online-session',e=>{const d=e.detail||{};onlineMatchActive=true;localSessionStarted=true;onlineTeam=d.localTeam||'home';onlineSlot=Number.isInteger(d.localSlot)?d.localSlot:-1;localStorage.setItem('volleyverseMatchMode','online');setTimeout(()=>{if(!state.ready)createScene();tip('ONLINE 6V6 • LIVE MATCH');},0)});window.VVOnlineClient?.on?.('point',m=>{const w=m?.winner==='home'?'HOME':'AWAY';if(m?.score){homeScore=Number(m.score.home)||0;awayScore=Number(m.score.away)||0}if(m?.sets){homeSets=Number(m.sets.home)||0;awaySets=Number(m.sets.away)||0}if(m?.setNumber)setNumber=Number(m.setNumber)||setNumber;updateHUD();tip('REFEREE • POINT '+w+(m?.reason?' • '+String(m.reason).replaceAll('_',' '):''));});window.VVOnlineClient?.on?.('matchFinished',m=>{onlineMatchActive=false;rallyLocked=true;if(m?.sets){homeSets=Number(m.sets.home)||homeSets;awaySets=Number(m.sets.away)||awaySets}tip('MATCH COMPLETE • '+(m?.winner==='home'?'VICTORY':'DEFEAT'));updateHUD();});window.addEventListener('vv-online-snapshot',e=>{if(onlineMatchActive)applyOnlineSnapshot(e.detail||{})});
window.addEventListener('vv-local-packet',e=>{
  const p=e.detail||{};
  if(p.type==='input'&&localHost()){
    applyRemoteInput(p.input||{});
  }else if(p.type==='snapshot'&&!localHost()){
    if((p.seq||0)<localLastSeq)return;localLastSeq=p.seq;applyLocalSnapshot(p.state);
  }else if(p.type==='ready'&&localHost()){
    window.VVLocalMultiplayer.send({type:'session_assign',slot:1,t:Date.now()});
    window.VVLocalMultiplayer.send({type:'snapshot',seq:0,state:localNetSnapshot()});
  }else if(p.type==='session_assign'&&!localHost()){
    clientControlledIndex=THREE.MathUtils.clamp(Number(p.slot)||1,0,5);
    controlledIndex=clientControlledIndex;updateControlled();tip('LOCAL SLOT • PLAYER '+(clientControlledIndex+1));
  }else if(p.type==='session_start'){
    localSessionStarted=true;tip(localHost()?'LOCAL MATCH • HOST':'LOCAL MATCH • PLAYER '+(clientControlledIndex+1));
  }
});

function action(type){window.VVReplay?.record?.(type,{player:window.VVCharacters?.roster?.[controlledIndex]?.name||'PLAYER'});if(onlineMatchActive){const mine=onlineTeam==='away'?awayPlayers[onlineSlot]:homePlayers[onlineSlot];const o=window.VVOnlineClient?.getLocalPlayer?.()||{};const slot=Number.isInteger(o.slot)?o.slot:onlineSlot;if(slot>=0&&mine){keys.x=THREE.MathUtils.clamp(Number(keys.x)||0,-1,1);keys.z=THREE.MathUtils.clamp(Number(keys.z)||0,-1,1);window.VVOnlineClient?.input?.(slot,keys.x,keys.z,type);tip('ONLINE • '+type.toUpperCase()+' SENT')}return}
  if(localConnected()&&!localHost()){window.VVLocalMultiplayer.sendInput({kind:'action',type});tip('LOCAL • INPUT SENT TO HOST');return}
  $('tip')?.classList.remove('timing-ready');
  if(!state.ready||rallyLocked)return;if(type==='serve'){serve();return}if(!ballState.active||ballState.cooldown>0)return;
  const dx=ball.position.x-controlled.position.x,dz=ball.position.z-controlled.position.z;const timing=timingQuality(type);const near=Math.hypot(dx,dz)<(type==='dive'?2.8:2.35);
  if(!near||ball.position.y<.2||ball.position.y>4.4)return;if(type!=='serve'&&timing<.28){tip('TIMING OFF • WAIT FOR THE BALL');return;}const homeSide=ball.position.z<0;if(!homeSide&&type!=='block')return;
  const touches=ballState.teamTouches.home;if(type==='pass'&&touches!==0)return;if(type==='set'&&touches!==1)return;if(type==='spike'&&touches!==2)return;if(type==='dive'&&touches!==0)return;
  let targetX=THREE.MathUtils.clamp(controlled.position.x+dx*.35,-4.1,4.1);
  if(type==='pass'){const quality=skillQuality(controlled,'pass',.88)*(.72+timing*.28);const setter=homePlayers.find(p=>p.userData.position==='S'||p.userData.position==='SETTER')||homePlayers[1];const dir=controlled.userData.moveX||0;const lead=THREE.MathUtils.clamp(dir*.9,-.9,.9);targetX=THREE.MathUtils.clamp(setter.position.x+lead,-4.0,4.0);launchTo(targetX+((Math.random()-.5)*(1-quality)*1.4),setter.position.z,2.2,5.8*quality);ballState.targetX=targetX;ballState.targetZ=setter.position.z;tip(Math.abs(dir)>.35?'PASS • DIRECTIONAL RECEIVE':'PASS • FIRST TOUCH → SETTER')}
  else if(type==='set'){const quality=skillQuality(controlled,'set',.9)*(.72+timing*.28);const attackers=homePlayers.filter(p=>p.userData.position==='OH'||p.userData.position==='OPP');const dir=controlled.userData.moveX||0;let attacker=attackers[Math.abs(dir)>.25&&attackers[1]?1:0]||homePlayers[2];targetX=THREE.MathUtils.clamp(attacker.position.x+(dir*.45),-4.0,4.0);launchTo(targetX+((Math.random()-.5)*(1-quality)*1.2),attacker.position.z,3.25,5.3*quality);ballState.targetX=targetX;ballState.targetZ=attacker.position.z;tip(Math.abs(dir)>.25?'SET • DIRECTIONAL ATTACK':'SET • SECOND TOUCH → ATTACK')}
  else if(type==='spike'){const approach=Math.hypot(controlled.userData.moveX||0,controlled.userData.moveZ||0);const jump=jumpPlayer(controlled,5.15);const quality=skillQuality(controlled,'spike',.92)*(.65+timing*.35)*(.9+Math.min(approach,1)*.1);const lane=THREE.MathUtils.clamp((controlled.position.x+((controlled.userData.moveX||0)*.7)),-4.0,4.0);targetX=THREE.MathUtils.clamp(lane+dx*.55,-4.0,4.0);const targetZ=THREE.MathUtils.clamp(4.0+Math.abs(controlled.position.z)*.02,3.65,4.2);launchTo(targetX+((Math.random()-.5)*(1-quality)*1.5),targetZ,.3,7.4*(.86+quality*.14));ballState.targetX=targetX;ballState.targetZ=targetZ;tip(jump?'SPIKE • APPROACH + JUMP':'SPIKE • ATTACK');}
  else if(type==='block'){if(ball.position.z>-.9&&ball.position.y>1.25){jumpPlayer(controlled,4.7);const quality=skillQuality(controlled,'block',.9)*(.65+timing*.35);ballState.v.set(dx*.2*quality,5.0+quality*1.4,-Math.abs(ballState.v.z)*(.72+quality*.2)||-6.5);ballState.teamTouches.home=1;tip('BLOCK • CLOSE THE ANGLE')}else return}
  else if(type==='dive'){const quality=skillQuality(controlled,'dive',.86)*(.7+timing*.3);const dir=controlled.userData.moveX||0;controlled.position.x=THREE.MathUtils.clamp(controlled.position.x+dir*.8,-4.25,4.25);controlled.position.z=THREE.MathUtils.clamp(controlled.position.z+.7,-4.35,-.3);controlled.userData.moveX=dir;controlled.userData.moveZ=controlled.userData.moveZ||0;launchTo(controlled.position.x+((Math.random()-.5)*(1-quality)*1.2),-2.2,2.0,4.8+quality*.9);ballState.targetX=controlled.position.x;ballState.targetZ=-2.2;tip(Math.abs(dir)>.35?'DIG • DIRECTIONAL SAVE':'DIG • KEEP THE RALLY ALIVE')}
  if(type!=='block')ballState.teamTouches.home++;ballState.lastTouch='home';ballState.side='home';ballState.lastAction=type;ballState.cooldown=.25;controlled.userData.action=type==='dive' ? .8 : .55;
}
function jumpPlayer(p,force=4.8){if(!p||p.userData.jumpY>0.02)return false;p.userData.jumpV=force;p.userData.action=Math.max(p.userData.action,.35);return true}
function updateApproach(dt){if(!controlled)return;const u=controlled.userData;const speed=controlled.userData.speed||4.2;const mag=Math.hypot(u.moveX||0,u.moveZ||0);if(mag>.08&&state.ready&&!rallyLocked){controlled.position.x+=THREE.MathUtils.clamp(u.moveX,-1,1)*speed*dt;controlled.position.z+=THREE.MathUtils.clamp(u.moveZ,-1,1)*speed*dt;controlled.position.x=THREE.MathUtils.clamp(controlled.position.x,-4.25,4.25);controlled.position.z=THREE.MathUtils.clamp(controlled.position.z,-4.35,-.25);}}
function switchPlayer(){if(onlineMatchActive){tip('ONLINE 6V6 • YOUR ASSIGNED PLAYER IS LOCKED');return}if(localConnected()&&!localHost()){window.VVLocalMultiplayer.sendInput({kind:'switch'});return}if(rallyLocked||controlMode()==='lock')return;controlledIndex=(controlledIndex+1)%homePlayers.length;updateControlled();updateHUD();tip('CONTROL • '+controlled.userData.name.toUpperCase());if(!ballState.active)resetBall()}
function roleTarget(p,home,targetX,targetZ){
  const baseX=p.userData.baseX,baseZ=p.userData.baseZ,role=p.userData.position;const side=home?-1:1;let tx=baseX,tz=baseZ;
  // Advanced 6v6 positioning: players keep role lanes and cover the likely attack zone
  // instead of all converging on the ball.
  const dangerX=THREE.MathUtils.clamp(targetX,-4.15,4.15);
  const dangerZ=home?THREE.MathUtils.clamp(targetZ,-4.2,-.25):THREE.MathUtils.clamp(targetZ,.25,4.2);
  if(!ballState.active){tx=baseX+Math.sin(performance.now()*.001+p.userData.phase)*.18;tz=baseZ+Math.sin(performance.now()*.0012+p.userData.phase)*.08}
  else{
    const towardX=THREE.MathUtils.clamp((dangerX-baseX)*.34,-1.7,1.7);
    if(role==='S'||role==='SETTER'){tx=THREE.MathUtils.clamp(dangerX*.24,-3.0,3.0);tz=home?-2.55:2.55}
    else if(role==='MB'){tx=THREE.MathUtils.clamp(dangerX*.62,-4.0,4.0);tz=home?-1.0:1.0;if((home&&targetZ>-.9)||(!home&&targetZ<.9))tz=home?-.55:.55}
    else if(role==='L'||role==='LIBERO'){tx=THREE.MathUtils.clamp(dangerX*.82,-4.1,4.1);tz=home?-3.55:3.55}
    else{tx=baseX+towardX;tz=home?-2.55:2.55}
    const danger=home?dangerZ<-.9:dangerZ>.9;
    if(danger){tx+=THREE.MathUtils.clamp((dangerX-tx)*.28,-1.35,1.35);tz=home?Math.max(-4.2,tz-.28):Math.min(4.2,tz+.28)}
    if(role==='S'||role==='SETTER')tz=home?Math.min(tz,-1.45):Math.max(tz,1.45);
    if(role==='L'||role==='LIBERO')tz=home?Math.min(tz,-2.65):Math.max(tz,2.65);
  }
  return {x:THREE.MathUtils.clamp(tx,-4.15,4.15),z:home?THREE.MathUtils.clamp(tz,-4.2,-.35):THREE.MathUtils.clamp(tz,.35,4.2),side};
}
function moveAIPlayer(p,dt,targetX,targetZ,home){
  const t=roleTarget(p,home,targetX,targetZ);
  // Defensive coverage now influences the actual movement target rather than only storing a hint.
  const defending=ballState.active&&((home&&ballState.lastTouch==='away')||(!home&&ballState.lastTouch==='home'));
  const role=p.userData.position;
  const coverageRole=['L','LIBERO','OH','OPP'].includes(role);
  if(defending&&coverageRole){t.x=THREE.MathUtils.clamp(t.x*.62+p.userData.coverageX*.38,-4.15,4.15)}
  p.userData.aiTargetX=t.x;p.userData.aiTargetZ=t.z;
  const dx=t.x-p.position.x,dz=t.z-p.position.z,dist=Math.hypot(dx,dz);const profile=aiDifficultyProfile();const max=p.userData.speed*dt*(home ? .82 : 1.15)*profile.reaction;
  if(dist>.04){const step=Math.min(dist,max);p.position.x+=dx/dist*step;p.position.z+=dz/dist*step;p.userData.moveX=dx/dist;p.userData.moveZ=dz/dist}else{p.userData.moveX=0;p.userData.moveZ=0}
  p.position.x=THREE.MathUtils.clamp(p.position.x,-4.25,4.25);p.position.z=home?THREE.MathUtils.clamp(p.position.z,-4.35,-.25):THREE.MathUtils.clamp(p.position.z,.25,4.35);
}
function chooseAttackTarget(players,ballX){
  const attackers=players.filter(p=>['OH','OPP','MB'].includes(p.userData.position));
  if(!attackers.length)return players[0];
  // Prefer a ready attacker, but still vary the choice so rallies do not become scripted.
  const ready=attackers.filter(p=>Math.abs(p.position.x-ballX)<3.0);
  const pool=ready.length?ready:attackers;
  return pool.reduce((best,p)=>Math.abs(p.position.x-ballX)<Math.abs(best.position.x-ballX)?p:best,pool[0]);
}
function chooseSetterTarget(players,defenders=[]){
  const attackers=players.filter(p=>['OH','OPP','MB'].includes(p.userData.position));
  if(!attackers.length)return players[0];
  const usable=attackers.filter(p=>Math.abs(p.position.x-ball.position.x)<4.8);
  const pool=usable.length?usable:attackers;
  // Prefer an attacker who is already separating from the blockers, then vary between viable options.
  const scored=pool.map(p=>{const nearestBlock=defenders.length?defenders.reduce((d,b)=>Math.min(d,Math.abs(p.position.x-b.position.x)),99):3;const readiness=Math.max(0,3.8-Math.abs(p.position.x-ball.position.x));const roleBonus=p.userData.position==='MB' ? .28 : 0;return {p,score:Math.abs(p.position.x-ball.position.x)*.28+Math.abs(p.position.z-p.userData.baseZ)*.12-nearestBlock*.34-readiness*.08-roleBonus}});
  scored.sort((a,b)=>a.score-b.score);
  const top=scored.slice(0,Math.min(3,scored.length));
  return top[Math.floor(Math.random()*top.length)].p;
}
function chooseOpenAttackLane(attacker,defenders){
  const lanes=[-3.6,-2.4,-1.2,0,1.2,2.4,3.6];
  const scored=lanes.map(x=>{
    const nearest=defenders.reduce((d,p)=>Math.min(d,Math.hypot(x-p.position.x,4.0-p.position.z)),99);
    const crossBias=Math.abs(x+attacker.position.x*.72);
    const lineBias=Math.abs(x-attacker.position.x);
    return {x,score:nearest*1.2+Math.min(crossBias,lineBias)*.12+Math.random()*.7};
  });
  scored.sort((a,b)=>b.score-a.score);
  return scored[0].x;
}
function chooseAttackLane(attacker){
  const cross=THREE.MathUtils.clamp(-attacker.position.x*.72+(Math.random()-.5)*.8,-4.0,4.0);
  const line=THREE.MathUtils.clamp(attacker.position.x+(Math.random()-.5)*.65,-4.0,4.0);
  const tip=THREE.MathUtils.clamp(attacker.position.x*.45+(Math.random()-.5)*1.2,-3.7,3.7);
  const pick=Math.random();
  return pick<.42?cross:pick<.82?line:tip;
}
function chooseDefenseTarget(players){
  const roles=['L','LIBERO','OH','OPP'];
  const pool=players.filter(p=>roles.includes(p.userData.position));
  const list=pool.length?pool:players;
  const predictedX=THREE.MathUtils.clamp(ball.position.x+ballState.v.x*.38,-4.15,4.15);
  return list.reduce((best,p)=>{
    const d=Math.hypot(p.position.x-predictedX,p.position.z-ball.position.z);
    const role=p.userData.position;
    const bonus=(role==='L'||role==='LIBERO') ? .55 : (role==='OH'||role==='OPP') ? .22 : 0;
    const bd=Math.hypot(best.position.x-predictedX,best.position.z-ball.position.z);
    const br=best.userData.position;
    const bestBonus=(br==='L'||br==='LIBERO') ? .55 : (br==='OH'||br==='OPP') ? .22 : 0;
    return d-bonus<bd-bestBonus?p:best;
  },list[0]);
}
function transitionAfterDefense(team,players){
  const setter=players.find(p=>p.userData.position==='S'||p.userData.position==='SETTER')||players[1];
  const attackers=players.filter(p=>['OH','OPP','MB'].includes(p.userData.position));
  if(!setter||!attackers.length)return;
  const ready=attackers.reduce((best,p)=>Math.abs(p.position.x-ball.position.x)<Math.abs(best.position.x-ball.position.x)?p:best,attackers[0]);
  setter.userData.aiTargetX=THREE.MathUtils.clamp(ball.position.x*.2,-3,3);
  setter.userData.aiTargetZ=team==='home'?-2.55:2.55;
  ready.userData.coverageX=THREE.MathUtils.clamp(ball.position.x*.7,-4.1,4.1);
}
function defensiveRead(team,players){
  if(!ballState.active||ballState.cooldown>0)return false;
  const home=team==='home';
  if(ballState.lastTouch===team)return false;
  const candidates=players.filter(p=>!(home&&p===controlled));
  if(!candidates.length)return false;
  const predictedX=THREE.MathUtils.clamp(ball.position.x+ballState.v.x*.3,-4.15,4.15);
  const predictedZ=home?THREE.MathUtils.clamp(ball.position.z+ballState.v.z*.3,-4.25,-.3):THREE.MathUtils.clamp(ball.position.z+ballState.v.z*.3,.3,4.25);
  const target=chooseDefenseTarget(candidates);
  if(!target)return false;
  const dist=Math.hypot(target.position.x-predictedX,target.position.z-predictedZ);
  const profile=aiDifficultyProfile();
  const readRange=1.0+profile.reaction*.62;
  if(dist>readRange||ball.position.y<.28||ball.position.y>4.15)return false;
  // A defensive touch redirects the ball toward the setter zone instead of instantly attacking.
  const setter=players.find(p=>p.userData.position==='S'||p.userData.position==='SETTER')||players[1];
  launchTo(setter.position.x,setter.position.z,2.15,5.7);
  ballState.teamTouches[team]=Math.min(1,ballState.teamTouches[team]+1);
  ballState.lastTouch=team;ballState.side=team;ballState.lastAction='dig';ballState.cooldown=.42;
  target.userData.action=.65;target.userData.coverageX=predictedX;transitionAfterDefense(team,players);
  tip((home?'TEAM':'RIVALS')+' • DIG → SETTER');
  return true;
}
function aiTouch(team,players){
  if(!ballState.active||ballState.cooldown>0)return false;const home=team==='home',onSide=home?ball.position.z<-.25:ball.position.z>.25;if(!onSide||ball.position.y<.28||ball.position.y>4.0)return false;
  const candidates=players.filter(p=>!(home&&p===controlled));if(!candidates.length)return false;const touches=ballState.teamTouches[team];if(touches>=3)return false;
  const receiver=touches===0?chooseReceiver(candidates,ball.position.x):candidates.reduce((a,p)=>Math.hypot(p.position.x-ball.position.x,p.position.z-ball.position.z)<Math.hypot(a.position.x-ball.position.x,a.position.z-ball.position.z)?p:a,candidates[0]);
  const profile=aiDifficultyProfile();const reach=1.15+profile.reaction*.48;if(Math.hypot(ball.position.x-receiver.position.x,ball.position.z-receiver.position.z)>reach||receiver.userData.cooldown>0)return false;
  const decision=aiRallyDecision(team,players);const setter=players.find(p=>p.userData.position==='S'||p.userData.position==='SETTER')||players[1];const attacker=decision.player||chooseAttackTarget(players,ball.position.x);let target=setter,label='RECEIVE';
  if(touches===1){target=attacker;label='SET'}else if(touches===2){target=attacker;label='ATTACK'}
  if(touches===0){launchTo(setter.position.x,setter.position.z,2.2,5.8)}else if(touches===1){target=chooseSetterTarget(players);launchTo(target.position.x,target.position.z,3.25,5.3)}else{const opponents=home?awayPlayers:homePlayers;const openLane=chooseOpenAttackLane(attacker,opponents);const varied=chooseAttackLane(attacker);const lane=Math.random()<.68?openLane:varied;const miss=(Math.random()-.5)*(1.15*(1-profile.accuracy));launchTo(THREE.MathUtils.clamp(lane+miss,-4.0,4.0),home?4.0:-4.0,.3,7.4)}
  ballState.targetX=target.position.x;ballState.targetZ=target.position.z;ballState.lastTouch=team;ballState.side=team;ballState.teamTouches[team]++;ballState.lastAction=label.toLowerCase();receiver.userData.action=.55;receiver.userData.cooldown=.75;ballState.cooldown=.4;tip((home?'TEAM':'RIVALS')+' • '+label);return true;
}
function aiCoverage(){
  if(!ballState.active)return;
  const defendingHome=ballState.lastTouch==='away';const defenders=defendingHome?homePlayers:awayPlayers;
  const predictedX=THREE.MathUtils.clamp(ball.position.x+ballState.v.x*.32,-4.15,4.15);
  defenders.forEach(p=>{
    if(p===controlled||p.userData.remoteControlled)return;
    const role=p.userData.position;
    if(['L','LIBERO','OH','OPP'].includes(role)){
      p.userData.coverageX=THREE.MathUtils.clamp((p.userData.coverageX*.55)+(predictedX*.45),-4.1,4.1);
    }else p.userData.coverageX=p.userData.baseX;
  });
}
function aiBlock(){
  const profile=aiDifficultyProfile();if(!ballState.active||ballState.cooldown>0||ball.position.y<1.55)return false;
  const attackingHome=ballState.lastTouch==='home'&&ball.position.z>-1.15;const attackingAway=ballState.lastTouch==='away'&&ball.position.z<1.15;if(!attackingHome&&!attackingAway)return false;
  const defenders=attackingHome?awayPlayers:homePlayers.filter(p=>p!==controlled);const blockers=defenders.filter(p=>['MB','OPP','OH'].includes(p.userData.position));if(!blockers.length)return false;
  const predictedX=THREE.MathUtils.clamp(ball.position.x+ballState.v.x*.22,-4.15,4.15);
  const primary=blockers.reduce((a,p)=>Math.abs(p.position.x-predictedX)<Math.abs(a.position.x-predictedX)?p:a,blockers[0]);
  if(Math.abs(primary.position.x-predictedX)>1.45||Math.random()>profile.block)return false;
  primary.position.x=predictedX;primary.userData.action=.8;
  const partners=blockers.filter(p=>p!==primary&&Math.abs(p.position.x-predictedX)<3.4).sort((a,b)=>Math.abs(a.position.x-predictedX)-Math.abs(b.position.x-predictedX));
  const useDouble=partners.length&&Math.random()<(0.35+profile.block*.5);
  if(useDouble){const partner=partners[0];const side=predictedX>=0?-1:1;partner.position.x=THREE.MathUtils.clamp(predictedX+side*.95,-4.15,4.15);partner.userData.action=.72}
  const useTriple=useDouble&&partners.length>1&&profile.block>.78&&Math.random()<.28;
  if(useTriple){const third=partners[1];third.position.x=THREE.MathUtils.clamp(predictedX+(predictedX>=0?1.05:-1.05),-4.15,4.15);third.userData.action=.62}
  // Block angle: a coordinated wall sends the ball back toward the attacking side with a controlled lift.
  ballState.v.x+=(predictedX-ball.position.x)*.18;ballState.v.z*=-(.58+(useDouble ? .1 : 0)+(useTriple ? .06 : 0));ballState.v.y=Math.max(3.2,ballState.v.y*(useDouble ? .42 : .35));
  ballState.lastTouch=attackingHome?'away':'home';ballState.side=ballState.lastTouch;ballState.teamTouches[ballState.lastTouch]=0;ballState.cooldown=.5;
  tip((useTriple?'TRIPLE BLOCK!':useDouble?'DOUBLE BLOCK!':'BLOCK!')+' • '+(attackingHome?'RIVALS':'YOUR TEAM')+' WALL');return true;
}
function aiRallyDecision(team,players){
  const touches=ballState.teamTouches[team];
  const setter=players.find(p=>p.userData.position==='S'||p.userData.position==='SETTER')||players[1];
  const attackers=players.filter(p=>['OH','OPP','MB'].includes(p.userData.position));
  const attacker=chooseAttackTarget(players,ball.position.x);
  const pressure=Math.abs(ball.position.x-attacker.position.x);
  const profile=aiDifficultyProfile();
  if(touches===0)return {kind:'receive',player:chooseReceiver(players,ball.position.x)};
  if(touches===1){
    const defenders=team==='home'?awayPlayers:homePlayers;const target=chooseSetterTarget(players,defenders);
    return {kind:'set',player:target};
  }
  if(touches===2){
    // Under pressure, favor the safest available attacker; with better AI, vary the attack point.
    const safe=attackers.filter(p=>Math.abs(p.position.x-ball.position.x)<3.6);
    const pool=safe.length?safe:attackers;
    const player=profile.accuracy>.9&&pool.length?pool[Math.floor(Math.random()*pool.length)]:attacker;
    return {kind:'attack',player,pressure};
  }
  return {kind:'reset',player:setter};
}
function aiDifficultyProfile(){
  const mode=(localStorage.getItem('volleyverseDifficulty')||'medium').toLowerCase();
  const table={beginner:{reaction:.72,accuracy:.55,block:.35},easy:{reaction:.86,accuracy:.68,block:.48},medium:{reaction:1,accuracy:.78,block:.62},hard:{reaction:1.12,accuracy:.88,block:.76},master:{reaction:1.22,accuracy:.93,block:.86},grandmaster:{reaction:1.3,accuracy:.96,block:.92},champion:{reaction:1.38,accuracy:.98,block:.97}};
  return table[mode]||table.medium;
}
function defensivePositioning(dt){
  if(!state.ready||rallyLocked)return;
  const targets=ballState.active&&ball.position.z<0?ball.position:({x:0,z:-2.5});
  homePlayers.forEach((p,i)=>{
    if(p===controlled)return;
    const role=p.userData.position;
    let tx=p.userData.baseX,tz=p.userData.baseZ;
    if(ballState.active&&ball.position.z<0){
      const spread=role==='L'?-.9:role==='R'?.9:role==='MB'?0:(i%2?-1.45:1.45);
      tx=THREE.MathUtils.clamp(ball.position.x*.42+spread,-4.1,4.1);
      tz=THREE.MathUtils.clamp(-2.5+ball.position.z*.18,-4.15,-.65);
    }else{
      tx=THREE.MathUtils.clamp(p.userData.baseX+(targets.x*.12),-4.1,4.1);
      tz=p.userData.baseZ;
    }
    p.userData.aiTargetX=tx;p.userData.aiTargetZ=tz;
    const dx=tx-p.position.x,dz=tz-p.position.z;
    const d=Math.hypot(dx,dz);
    if(d>.08){
      const step=Math.min(d,(p.userData.speed||4)*dt*.7);
      p.position.x+=dx/d*step;p.position.z+=dz/d*step;
      p.userData.moveX=dx/d;p.userData.moveZ=dz/d;
    }else{
      p.userData.moveX*=.8;p.userData.moveZ*=.8;
    }
  });
}
function aiUpdate(dt){
  if(ballState.active)aiCoverage();
  const targetX=ballState.active?ball.position.x:0,targetZ=ballState.active?ball.position.z:0;
  homePlayers.forEach((p,i)=>{if(p===controlled){p.userData.moveX=keys.x;p.userData.moveZ=keys.z;return}if(p.userData.remoteControlled){return}moveAIPlayer(p,dt,targetX,targetZ,true);p.userData.cooldown=Math.max(0,p.userData.cooldown-dt)});
  awayPlayers.forEach(p=>{moveAIPlayer(p,dt,targetX,targetZ,false);p.userData.cooldown=Math.max(0,p.userData.cooldown-dt)});
  if(ballState.active){if(aiBlock())return;if(aiTouch('home',homePlayers))return;if(aiTouch('away',awayPlayers))return;const defendingHome=ballState.lastTouch==='away';const defenders=defendingHome?homePlayers:awayPlayers;const target=chooseDefenseTarget(defenders);if(target&&target!==controlled)target.userData.coverageX=THREE.MathUtils.clamp(ball.position.x,-4.1,4.1);if(defendingHome&&defensiveRead('home',homePlayers))return;if(!defendingHome&&defensiveRead('away',awayPlayers))return}
}
function point(winner){if(rallyLocked)return;rallyLocked=true;if(winner==='home'){homeScore++;matchHomePoints++}else awayScore++;servingTeam=winner;updateHUD();const target=setNumber===5?15:25;if((homeScore>=target||awayScore>=target)&&Math.abs(homeScore-awayScore)>=2){if(homeScore>awayScore)homeSets++;else awaySets++;if(homeSets>=3||awaySets>=3){const won=homeSets>awaySets;window.VVReplay?.stop?.();const career=window.VVCareer?.recordMatch?.({won,setsWon:homeSets,points:matchHomePoints});const reward=window.VVMatchRewards?.grant?.(won);window.VVMissions?.completeMatch?.(won,homeSets);$('overlayTitle').textContent=won?'VICTORY':'DEFEAT';$('overlayText').textContent=`Match complete • ${homeSets}–${awaySets} sets${career?` • +${career.xpAward} XP${career.leveledUp?' • LEVEL UP!':''}`:''}${reward?` • +${reward.coins} coins • +${reward.gems} gems`:''}`;$('playBtn').textContent='PLAY AGAIN';$('overlay').classList.remove('hidden');if(reward)window.VVMatchRewards.openSummary?.(reward);return}setNumber++;homeScore=awayScore=0;tip(`SET ${setNumber} • FIRST TO ${setNumber===5?15:25}`)}setTimeout(()=>{resetPlayers();resetBall();updateHUD()},700)}
function netApproachAssist(){
  if(!controlled||!ballState.active||rallyLocked)return;
  const attackingAway=ball.position.z>.15&&ballState.lastTouch==='away';
  if(!attackingAway)return;
  const role=controlled.userData.position;
  if(role!=='MB'&&role!=='OH'&&role!=='OPP')return;
  const targetX=THREE.MathUtils.clamp(ball.position.x,-3.5,3.5);
  if(controlled.position.z<-.9){
    controlled.userData.moveX=THREE.MathUtils.clamp((targetX-controlled.position.x)*.8,-1,1);
    controlled.userData.moveZ=.9;
  }
  if(ball.position.y>1.8&&ball.position.z<1.2&&Math.abs(controlled.position.x-targetX)<1.0)jumpPlayer(controlled,4.5);
}
function autoReceiveAssist(){
  if(!controlled||!ballState.active||rallyLocked)return;
  if(ball.position.z>=0)return;
  const dx=ball.position.x-controlled.position.x,dz=ball.position.z-controlled.position.z;
  const dist=Math.hypot(dx,dz);
  if(dist<1.45&&ball.position.y>.35&&ball.position.y<2.65&&ballState.teamTouches.home===0){
    const dirX=THREE.MathUtils.clamp(dx*1.8,-1,1),dirZ=THREE.MathUtils.clamp(dz*1.2,-1,1);
    controlled.userData.moveX=dirX;controlled.userData.moveZ=dirZ;
  }
}
function autoSetAssist(){
  if(!controlled||!ballState.active||rallyLocked)return;
  if(ballState.teamTouches.home!==1||ball.position.z>=0)return;
  const dx=ball.position.x-controlled.position.x,dz=ball.position.z-controlled.position.z;
  if(Math.hypot(dx,dz)<1.35&&ball.position.y>1.25&&ball.position.y<3.7){
    const setter=controlled.userData.position==='S'||controlled.userData.position==='SETTER';
    if(setter)controlled.userData.moveX*=.65;
  }
}
function physics(dt){
  if(onlineMatchActive)return;
  if(!state.ready||paused)return;
  if(localConnected()&&!localHost()&&!localSessionStarted)return;
  if(localConnected()&&localHost())updateRemotePlayer(dt);if(controlled){controlled.userData.moveX=keys.x;controlled.userData.moveZ=keys.z;updateApproach(dt)}
  aiUpdate(dt);defensivePositioning(dt);netApproachAssist();autoReceiveAssist();autoSetAssist();if(ballState.active){timingFeedback('pass');timingFeedback('spike')}if(!ballState.active)return;ballState.cooldown=Math.max(0,ballState.cooldown-dt);const prevZ=ball.position.z;ballState.v.y-=11.5*dt;ball.position.addScaledVector(ballState.v,dt);
  const netTop=2.43,ballRadius=.2;const crossedCenter=(prevZ<0&&ball.position.z>=0)||(prevZ>0&&ball.position.z<=0);
  if(crossedCenter){const crossingY=ball.position.y;if(crossingY<=netTop+ballRadius){ball.position.z=prevZ<0?-(ballRadius+.025):(ballRadius+.025);ballState.v.z*=-.82;ballState.v.y=Math.min(ballState.v.y,1.8);ballState.cooldown=Math.max(ballState.cooldown,.18);ballState.side=prevZ<0?'home':'away';tip('NET CONTACT • PLAY THE NEXT BALL')}else{ballState.side=ball.position.z<0?'home':'away';ballState.teamTouches[ballState.side]=0;ballState.crossed=true;tip(ballState.side==='home'?'BALL TO YOU • BUILD THE RALLY':'BALL TO RIVALS • DEFEND')}}
  if(ball.position.y<.2){ball.position.y=.2;point(ballState.lastTouch==='home'?'away':'home');return}if(Math.abs(ball.position.z)>5.05||Math.abs(ball.position.x)>9.05){point(ball.position.z<0?'away':'home');return}
}
function animatePlayers(dt){const now=performance.now();[...homePlayers,...awayPlayers].forEach(p=>{const u=p.userData;u.jumpV-=14*dt;u.jumpY+=u.jumpV*dt;if(u.jumpY<0){u.jumpY=0;u.jumpV=0;}p.position.y=u.jumpY;const uY=u.jumpY;u.cooldown=Math.max(0,u.cooldown-dt);u.action=Math.max(0,u.action-dt);const moving=Math.abs(u.moveX)+Math.abs(u.moveZ)>.12;const speed=Math.hypot(u.moveX,u.moveZ);const stride=moving?Math.sin(now*.014+u.phase)*Math.min(.42,.16+speed*.18):Math.sin(now*.002+u.phase)*.025;const rallyReady=ballState.active&&!moving;const crouch=rallyReady?-.10:0;const swing=u.action>0?Math.sin(u.action*18)*.8:0;const leftLeg=u.legs[0],rightLeg=u.legs[1],leftArm=u.arms[0],rightArm=u.arms[1];leftLeg.thigh.rotation.x=stride;rightLeg.thigh.rotation.x=-stride;leftLeg.shin.rotation.x=stride*.55;rightLeg.shin.rotation.x=-stride*.55;leftArm.upper.rotation.z=-.2-swing+(rallyReady?-.18:0);rightArm.upper.rotation.z=.2+swing+(rallyReady ? .18 : 0);leftArm.lower.rotation.z=-.08-swing*.45;rightArm.lower.rotation.z=.08+swing*.45;leftArm.upper.rotation.x=moving?-.18:0;rightArm.upper.rotation.x=moving ? .18 : 0;leftArm.lower.rotation.x=moving?-.08:0;rightArm.lower.rotation.x=moving ? .08 : 0;u.stance=crouch;p.position.y=uY+(u.action>.6?Math.max(0,Math.sin((.8-u.action)*Math.PI)*.18):0);p.rotation.y=Math.atan2(u.moveX,Math.max(.001,Math.abs(u.moveZ)))+(p.userData.home?Math.PI:0);const torso=p.children[0];if(torso)torso.rotation.x=crouch;if(u.action>0&&u.action<.35){leftArm.upper.rotation.z-=.25;rightArm.upper.rotation.z+=.25}})}
function resize(){if(!state.ready)return;state.camera.aspect=Math.max(innerWidth,1)/Math.max(innerHeight,1);state.camera.updateProjectionMatrix();state.renderer.setSize(Math.max(innerWidth,1),Math.max(innerHeight,1),false)}
let last=performance.now();function loop(now){const dt=Math.min((now-last)/1000,.035);last=now;if(state.ready){physics(dt);animatePlayers(dt);if(onlineMatchActive&&window.VVOnlineClient?.isConnected?.()&&now-onlineLastInputAt>70){const o=window.VVOnlineClient.getLocalPlayer?.()||{};if(Number.isInteger(o.slot)){onlineSlot=o.slot;window.VVOnlineClient.input(o.slot,keys.x,keys.z,null);onlineLastInputAt=now}}if(localConnected()&&localHost())window.VVLocalMultiplayer.sendSnapshot(localNetSnapshot());state.renderer.render(state.scene,state.camera)}requestAnimationFrame(loop)}
['pass','set','spike','block','dive','serve'].forEach(t=>$(t+'Btn')?.addEventListener('pointerdown',e=>{e.preventDefault();action(t)}));$('switchBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();switchPlayer()});$('pauseBtn')?.addEventListener('pointerdown',()=>{paused=!paused;$('pauseBtn').textContent=paused?'▶':'Ⅱ';tip(paused?'MATCH PAUSED':'RALLY LIVE • MOVE AND PLAY')});
$('playBtn')?.addEventListener('pointerdown',()=>{if($('playBtn').textContent==='PLAY AGAIN'){homeScore=awayScore=homeSets=awaySets=0;setNumber=1;matchHomePoints=0;servingTeam='home';controlledIndex=0;resetPlayers();updateControlled();updateHUD();$('overlayTitle').textContent='READY?';$('overlayText').textContent='Move your player, receive, set, spike and defend.';$('playBtn').textContent='PLAY MATCH';resetBall()}else{$('overlay').classList.add('hidden');createScene()}});
const controls=$('controls'),joy=$('joystick'),stick=$('stick');let joystickActive=false,joystickPointerId=null;
function setJoystickFromPoint(clientX,clientY){if(!joy)return;const r=joy.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;let x=clientX-cx,y=clientY-cy;const max=Math.max(r.width*.32,1),len=Math.hypot(x,y);if(len>max){x*=max/len;y*=max/len}stick.style.transform=`translate(${x}px,${y}px)`;keys.x=x/max;keys.z=y/max}
function joyStart(e){if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();joystickActive=true;joystickPointerId=e.pointerId;controls?.setPointerCapture?.(e.pointerId);setJoystickFromPoint(e.clientX,e.clientY);if(localConnected()&&!localHost())window.VVLocalMultiplayer.sendInput({kind:'move',x:keys.x,z:keys.z})}
function joyMove(e){if(!joystickActive||e.pointerId!==joystickPointerId)return;e.preventDefault();setJoystickFromPoint(e.clientX,e.clientY);if(localConnected()&&!localHost())window.VVLocalMultiplayer.sendInput({kind:'move',x:keys.x,z:keys.z})}
function joyEnd(e){if(joystickPointerId!==null&&e?.pointerId!==undefined&&e.pointerId!==joystickPointerId)return;joystickActive=false;joystickPointerId=null;stick.style.transform='translate(0,0)';keys.x=keys.z=0;if(localConnected()&&!localHost())window.VVLocalMultiplayer.sendInput({kind:'move',x:0,z:0})}
controls?.addEventListener('pointerdown',e=>{if(e.target.closest('.action'))return;const half=innerWidth*.52;if(e.clientX<=half)joyStart(e)},{passive:false});controls?.addEventListener('pointermove',joyMove,{passive:false});controls?.addEventListener('pointerup',joyEnd,{passive:false});controls?.addEventListener('pointercancel',joyEnd,{passive:false});controls?.addEventListener('lostpointercapture',joyEnd,{passive:false});
$('localStart')?.addEventListener('pointerdown',()=>{if(window.VVLocalMultiplayer?.isHost?.()){localSessionStarted=true;window.VVLocalMultiplayer.sendSessionStart?.();tip('LOCAL MATCH • HOST');}});
window.addEventListener('resize',resize);const observer=new MutationObserver(()=>{if(!state.ready&&!wrap.classList.contains('hidden'))createScene()});observer.observe(wrap,{attributes:true,attributeFilter:['class']});if(!wrap.classList.contains('hidden'))createScene();