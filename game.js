import * as THREE from 'three';

const wrap = document.getElementById('canvasWrap');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b18);
scene.fog = new THREE.Fog(0x070b18, 18, 42);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 7.8, 13.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
wrap.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xbfe8ff, 0x111522, 2.2));
const key = new THREE.DirectionalLight(0xffffff, 3.1);
key.position.set(4, 12, 7);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key);
const rim = new THREE.PointLight(0x3d8cff, 25, 20);
rim.position.set(-7, 6, -4);
scene.add(rim);

const court = new THREE.Group();
scene.add(court);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x17527b, roughness: 0.72, metalness: 0.05 });
const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.25, 10), floorMat);
floor.position.y = -0.15; floor.receiveShadow = true; court.add(floor);

function line(x, z, w, d) {
  const m = new THREE.MeshBasicMaterial({ color: 0xeaf8ff });
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), m);
  o.position.set(x, 0.02, z); court.add(o);
}
line(0, -5, 18, .08); line(0, 5, 18, .08); line(-9, 0, .08, 10); line(9, 0, .08, 10);
line(-3, 0, .055, 10); line(3, 0, .055, 10);
line(0, -3, 18, .055); line(0, 3, 18, .055);

const net = new THREE.Group();
const poleMat = new THREE.MeshStandardMaterial({ color: 0xd8e7f5, metalness: .7, roughness: .3 });
for (const x of [-4.65, 4.65]) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 2.65, 12), poleMat);
  p.position.set(x, 1.32, 0); p.castShadow = true; net.add(p);
}
const netMesh = new THREE.Mesh(new THREE.BoxGeometry(9.3, 1.05, .045), new THREE.MeshBasicMaterial({ color: 0xdce8ef, transparent: true, opacity: .36, wireframe: true }));
netMesh.position.y = 1.75; net.add(netMesh); scene.add(net);

function createPlayer(color, name, x, z, home = true) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: .52 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xf1b08b, roughness: .7 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.32, .72, 6, 12), bodyMat); torso.position.y = 1.05; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.27, 16, 12), skin); head.position.y = 1.83; head.castShadow = true; g.add(head);
  const shorts = new THREE.Mesh(new THREE.BoxGeometry(.48, .3, .3), new THREE.MeshStandardMaterial({ color: 0x101728 })); shorts.position.y = .57; shorts.castShadow = true; g.add(shorts);
  for (const sx of [-.14, .14]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.075, .52, 5, 8), skin); leg.position.set(sx, .27, 0); leg.castShadow = true; g.add(leg); }
  for (const sx of [-.42, .42]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .5, 5, 8), skin); arm.position.set(sx, 1.12, 0); arm.rotation.z = sx < 0 ? -.18 : .18; arm.castShadow = true; g.add(arm); }
  g.userData = { name, home, speed: 4.2, baseX: x, baseZ: z, action: 0 };
  scene.add(g); return g;
}

const homePlayers = [
  createPlayer(0x3fdcff, 'Astra', -5.8, -3.4), createPlayer(0x3fdcff, 'Kairo', -2.2, -3.4), createPlayer(0x3fdcff, 'Nova', 2.2, -3.4),
  createPlayer(0x2467ff, 'Rex', -5.8, -1.2), createPlayer(0x2467ff, 'Mira', -2.2, -1.2), createPlayer(0x2467ff, 'Zen', 2.2, -1.2)
];
const awayPlayers = [
  createPlayer(0xff527e, 'Vex', -5.8, 3.4, false), createPlayer(0xff527e, 'Luna', -2.2, 3.4, false), createPlayer(0xff527e, 'Orion', 2.2, 3.4, false),
  createPlayer(0xff8b46c7, 'Kai', -5.8, 1.2, false), createPlayer(0xff8b46c7, 'Sora', -2.2, 1.2, false), createPlayer(0xff8b46c7, 'Axel', 2.2, 1.2, false)
];

const ball = new THREE.Mesh(new THREE.SphereGeometry(.19, 20, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .32 }));
ball.castShadow = true; scene.add(ball);
const ballState = { v: new THREE.Vector3(), active: false, lastTouch: 'home', phase: 0 };

let homeScore = 0, awayScore = 0, homeSets = 0, awaySets = 0, setNumber = 1;
let controlled = homePlayers[2];
let paused = false;
const keys = { x: 0, z: 0 };

const $ = id => document.getElementById(id);
const updateHUD = () => {
  $('homeScore').textContent = homeScore; $('awayScore').textContent = awayScore;
  $('setNumber').textContent = setNumber;
  $('setStatus').textContent = setNumber === 5 ? '15' : '25';
};

function serve() {
  if (ballState.active) return;
  ball.position.set(controlled.position.x, 1.8, -4.25);
  ballState.v.set((Math.random()-.5)*1.5, 5.5, 8.3);
  ballState.active = true; ballState.lastTouch = 'home'; ballState.phase = 0;
  $('tip').textContent = 'RALLY LIVE • MOVE AND PLAY THE BALL';
}
function action(type) {
  if (!ballState.active) { serve(); return; }
  const dx = ball.position.x - controlled.position.x;
  const dz = ball.position.z - controlled.position.z;
  if (Math.abs(dx) < 3 && Math.abs(dz) < 3.2) {
    if (type === 'pass') ballState.v.set(dx * .3, 6.2, Math.abs(ballState.v.z) > 0 ? 5.2 : 4.5);
    if (type === 'set') ballState.v.set(dx * .25, 7.2, 4.8);
    if (type === 'spike') ballState.v.set(dx * .2, 5.0, 10.5);
    if (type === 'block') ballState.v.y = 7.0;
    if (type === 'dive') { controlled.position.z = Math.max(-4.6, controlled.position.z + .9); }
    ballState.lastTouch = 'home';
  }
}

['pass','set','spike','block','dive','serve'].forEach(type => $(type+'Btn').addEventListener('pointerdown', e => { e.preventDefault(); action(type); }));
$('pauseBtn').addEventListener('pointerdown', () => { paused = !paused; $('pauseBtn').textContent = paused ? '▶' : 'Ⅱ'; $('tip').textContent = paused ? 'MATCH PAUSED' : 'RALLY LIVE • MOVE AND PLAY THE BALL'; });
$('playBtn').addEventListener('pointerdown', () => $('overlay').classList.add('hidden'));

const joy = $('joystick'), stick = $('stick');
function joyMove(e) {
  const r = joy.getBoundingClientRect(), cx = r.left+r.width/2, cy = r.top+r.height/2;
  let x = e.clientX-cx, y=e.clientY-cy; const max=r.width*.32; const len=Math.hypot(x,y);
  if(len>max){x*=max/len;y*=max/len;} stick.style.transform=`translate(${x}px,${y}px)`; keys.x=x/max; keys.z=y/max;
}
function joyEnd(){ stick.style.transform='translate(0,0)'; keys.x=keys.z=0; }
joy.addEventListener('pointerdown', e=>{joy.setPointerCapture(e.pointerId);joyMove(e)});
joy.addEventListener('pointermove', e=>{if(e.pressure||e.buttons)joyMove(e)});
joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);

function point(winner) {
  if (winner === 'home') homeScore++; else awayScore++;
  const target = setNumber === 5 ? 15 : 25;
  const lead = Math.abs(homeScore-awayScore);
  if ((homeScore >= target || awayScore >= target) && lead >= 2) {
    if (homeScore > awayScore) homeSets++; else awaySets++;
    if (homeSets >= 3 || awaySets >= 3) {
      $('overlayTitle').textContent = homeSets > awaySets ? 'VICTORY' : 'DEFEAT';
      $('overlayText').textContent = `Match complete • ${homeSets}–${awaySets} sets`;
      $('playBtn').textContent = 'PLAY AGAIN';
      $('overlay').classList.remove('hidden');
      homeScore=awayScore=0; homeSets=awaySets=0; setNumber=1;
    } else { setNumber++; homeScore=awayScore=0; }
  }
  updateHUD(); ballState.active=false; ball.position.set(0,2,-4); $('tip').textContent='TAP SERVE TO START THE RALLY';
}

const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate); const dt=Math.min(clock.getDelta(),.033);
  if(!paused){
    controlled.position.x += keys.x * controlled.userData.speed * dt;
    controlled.position.z += -keys.z * controlled.userData.speed * dt;
    controlled.position.x=THREE.MathUtils.clamp(controlled.position.x,-8.2,8.2); controlled.position.z=THREE.MathUtils.clamp(controlled.position.z,-4.7,-.35);
    homePlayers.forEach(p=>{ if(p!==controlled){p.position.x += Math.sin(performance.now()*.0007+p.position.x)*.002; p.position.z += Math.cos(performance.now()*.0006+p.position.z)*.002;} });
    awayPlayers.forEach((p,i)=>{ const targetX=THREE.MathUtils.clamp(ball.position.x,-7.5,7.5); p.position.x += THREE.MathUtils.clamp(targetX-p.position.x,-1,1)*dt*(1.2+i*.05); p.position.z += THREE.MathUtils.clamp(2.2-p.position.z,-1,1)*dt*.35; });
    if(ballState.active){
      ballState.v.y -= 9.8*dt; ball.position.addScaledVector(ballState.v,dt);
      if(ball.position.y<.2){ const winner=ball.position.z<0?'away':'home'; point(winner); }
      if(ball.position.z>5.2 || ball.position.z<-5.2){ point(ball.position.z<0?'away':'home'); }
      if(ball.position.x>8.7 || ball.position.x<-8.7){ ballState.v.x*=-.75; ball.position.x=THREE.MathUtils.clamp(ball.position.x,-8.7,8.7); }
      if(ball.position.z>-.12 && ball.position.z<.12 && ball.position.y<1.75){ ballState.v.z*=-.78; ball.position.z=ball.position.z<0?-.14:.14; }
    }
  }
  const target = new THREE.Vector3(controlled.position.x*.22, 1.2, controlled.position.z*.12);
  camera.position.lerp(new THREE.Vector3(target.x,7.7,13.2),.04); camera.lookAt(target);
  renderer.render(scene,camera);
}
updateHUD(); ball.position.set(0,2,-4); animate();

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));});
