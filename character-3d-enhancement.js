import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

// VOLLEYVERSE 3D CHARACTER PASS
// Adds lightweight detail to the existing procedural players without external model files.
// The enhancement hooks into the shared Three.js renderer so it can decorate players
// created by game.js while keeping the current gameplay systems intact.

const playerGroups = new WeakSet();
const cache = new Map();

function mat(color, roughness=.5, metalness=0){
  return new THREE.MeshStandardMaterial({color, roughness, metalness});
}

function addMesh(group, geometry, material, position, scale=null){
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position);
  if(scale) m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

function enhancePlayer(player){
  if(!player?.userData?.name || player.userData.enhanced3D) return;
  player.userData.enhanced3D = true;
  playerGroups.add(player);

  const home = !!player.userData.home;
  const jerseyColor = player.children.find(m=>m.isMesh && m.geometry?.type==='CapsuleGeometry')?.material?.color?.getHex?.() ?? (home?0x19aee8:0xff4f79);
  const skin = mat(0xd99a76,.72,0);
  const hairColor = home ? 0x101828 : 0x171b2b;
  const hair = mat(hairColor,.72,0);
  const white = mat(0xf4f8ff,.35,.02);
  const dark = mat(0x101522,.58,0);
  const accent = mat(jerseyColor,.38,.05);

  // Neck and shoulder silhouette.
  addMesh(player,new THREE.CylinderGeometry(.12,.14,.2,12),skin,[0,1.57,0]);
  addMesh(player,new THREE.SphereGeometry(.36,16,10),accent,[0,1.18,0],[1.16,.72,.82]);

  // Athletic shoulder caps and wrist bands.
  for(const sx of [-.34,.34]){
    addMesh(player,new THREE.SphereGeometry(.105,10,8),accent,[sx,1.22,0],[1.15,1,.9]);
    addMesh(player,new THREE.CylinderGeometry(.075,.075,.08,10),white,[sx,1.02,0]);
  }

  // Face details: ears, eyes and small nose highlight.
  addMesh(player,new THREE.SphereGeometry(.055,10,8),skin,[-.255,1.82,0]);
  addMesh(player,new THREE.SphereGeometry(.055,10,8),skin,[.255,1.82,0]);
  const eyeMat=mat(0x0b1020,.35,0);
  addMesh(player,new THREE.SphereGeometry(.035,8,8),eyeMat,[-.105,1.84,-.255]);
  addMesh(player,new THREE.SphereGeometry(.035,8,8),eyeMat,[.105,1.84,-.255]);
  addMesh(player,new THREE.SphereGeometry(.025,8,8),skin,[0,1.77,-.27]);

  // Hair cap plus side locks. The shape is deliberately simple for mobile performance.
  addMesh(player,new THREE.SphereGeometry(.285,16,10),hair,[0,1.98,0],[1.03,.58,1.02]);
  for(const sx of [-.2,.2]){
    addMesh(player,new THREE.SphereGeometry(.085,10,8),hair,[sx,1.84,-.12],[.85,1.35,.8]);
  }

  // Jersey trim, chest badge and number plate.
  addMesh(player,new THREE.TorusGeometry(.18,.018,6,18),white,[0,1.39,-.26],[1.1,.65,1]);
  addMesh(player,new THREE.BoxGeometry(.23,.15,.018),white,[0,1.16,-.31]);

  // Knee pads and more structured footwear.
  for(const sx of [-.14,.14]){
    addMesh(player,new THREE.SphereGeometry(.09,10,8),dark,[sx,.42,-.01],[1.05,.62,1]);
    addMesh(player,new THREE.BoxGeometry(.2,.09,.36),white,[sx,.07,-.08],[1.05,1,1]);
    addMesh(player,new THREE.BoxGeometry(.2,.045,.12),accent,[sx,.105,-.19]);
  }

  // Position-specific visual cue: libero gets a contrasting chest stripe.
  if(player.userData.position==='L'){
    addMesh(player,new THREE.BoxGeometry(.54,.055,.018),accent,[0,1.08,-.31]);
  }
}

const originalRender = THREE.WebGLRenderer.prototype.render;
THREE.WebGLRenderer.prototype.render = function(scene,camera){
  if(scene && !scene.userData?.vvCharacterPass){
    scene.userData.vvCharacterPass=true;
    scene.traverse(obj=>{if(obj.isGroup && obj.userData?.name) enhancePlayer(obj);});
  }
  return originalRender.call(this,scene,camera);
};

window.VVCharacter3D={enhancePlayer};
