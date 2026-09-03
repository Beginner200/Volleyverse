(()=>{
  const THREE = window.THREE;
  if(!THREE) return;
  const host=document.getElementById('mainMenu');
  if(!host) return;
  let scene,camera,renderer,raf;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function init(){
    if(document.getElementById('menuSceneCanvas')) return;
    const canvas=document.createElement('canvas');canvas.id='menuSceneCanvas';canvas.setAttribute('aria-hidden','true');host.prepend(canvas);
    scene=new THREE.Scene();scene.fog=new THREE.Fog(0x03152d,16,42);
    camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,100);camera.position.set(0,5.5,18);camera.lookAt(0,3,0);
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;
    scene.add(new THREE.HemisphereLight(0x9ddcff,0x061326,2.1));
    const key=new THREE.DirectionalLight(0xffffff,3.4);key.position.set(5,10,8);scene.add(key);
    const rim=new THREE.PointLight(0x20dfff,18,24);rim.position.set(-7,6,2);scene.add(rim);
    const warm=new THREE.PointLight(0xff7218,14,22);warm.position.set(8,4,-2);scene.add(warm);
    buildCourt();buildNet();buildBall();buildCrowd();
    addEventListener('resize',resize,{passive:true});
    if(!reduce) raf=requestAnimationFrame(loop);else render(0);
  }
  function mat(c,rough=.7,metal=0){return new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:metal})}
  function buildCourt(){
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,20),mat(0x0757a8,.55));floor.rotation.x=-Math.PI/2;floor.position.y=-1;scene.add(floor);
    const line=mat(0xffffff,.4);
    [[0,0,0,20],[0,0,Math.PI/2,30]].forEach(([x,z,r,w])=>{const m=new THREE.Mesh(new THREE.BoxGeometry(0.08,w,.08),line);m.rotation.y=r;m.position.set(x,-.94,z);scene.add(m)});
    const mid=new THREE.Mesh(new THREE.BoxGeometry(0.08,10,.08),line);mid.rotation.z=Math.PI/2;mid.position.set(0,-.93,0);scene.add(mid);
  }
  function buildNet(){
    const net=new THREE.Mesh(new THREE.PlaneGeometry(16,3.4,16,6),new THREE.MeshBasicMaterial({color:0xdff7ff,transparent:true,opacity:.18,wireframe:true}));net.position.set(0,1.15,0);scene.add(net);
    [-8,8].forEach(x=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,5.4,10),mat(0xeafaff,.35,.5));p.position.set(x,1.2,0);scene.add(p)});
  }
  function buildBall(){
    const ball=new THREE.Mesh(new THREE.SphereGeometry(.72,24,16),mat(0xf7fbff,.3,.05));ball.position.set(3.5,4,-1.8);ball.userData.float=true;scene.add(ball);ball.userData.baseY=4;ball.userData.phase=0;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.035,8,40),new THREE.MeshBasicMaterial({color:0x20dfff,transparent:true,opacity:.45}));ring.position.copy(ball.position);ring.rotation.x=Math.PI/2;ring.userData.follow=ball;scene.add(ring);
  }
  function buildCrowd(){
    const group=new THREE.Group();
    for(let i=0;i<80;i++){
      const a=(i/80)*Math.PI*2,r=11+Math.random()*3,x=Math.cos(a)*r,z=Math.sin(a)*r-3;
      const p=new THREE.Mesh(new THREE.SphereGeometry(.14+Math.random()*.1,8,6),mat(i%4===0?0xff7a18:0x8fdfff,.9));p.position.set(x,1.5+Math.random()*3,z);group.add(p)
    }
    scene.add(group)
  }
  function render(t){
    scene.traverse(o=>{if(o.userData.float){o.position.y=o.userData.baseY+Math.sin(t*.0015)*.22;o.rotation.y=t*.0007}if(o.userData.follow)o.position.copy(o.userData.follow.position)});
    renderer.render(scene,camera)
  }
  function loop(t){render(t);raf=requestAnimationFrame(loop)}
  function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}
  const load=()=>import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js').then(m=>{window.THREE=m;init()}).catch(()=>{});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
