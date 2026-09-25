const $=id=>document.getElementById(id);
let localMode='host',pc=null,channel=null,roomCode='';
const localState={connected:false,host:false,reconnects:0,lastDisconnect:0,slot:null,sessionReady:false,pingMs:0};

function localLog(message){
  const el=$('localLog'); if(el) el.innerHTML=message;
}
function localStatus(message,good=false){
  const el=$('localStatus'); if(el){el.textContent=message;el.classList.toggle('good',good)}
}
function makeRoomCode(){
  return Math.random().toString(36).slice(2,8).toUpperCase();
}
function setLocalMode(mode){
  localMode=mode;
  $('localHostBtn')?.classList.toggle('selected',mode==='host');
  $('localJoinBtn')?.classList.toggle('selected',mode==='join');
  $('localPrimary').textContent=mode==='host'?'CREATE OFFER':'CREATE ANSWER';
  $('localSignal').placeholder=mode==='host'?'Host offer/answer data appears here…':'Paste the host offer here…';
  localStatus(mode==='host'?'HOST MODE • READY TO CREATE OFFER':'JOIN MODE • PASTE THE HOST OFFER');
}
function showLocal(){
  $('localModal')?.classList.remove('hidden');
  setLocalMode('host');
  if(!$('localRoomCode').textContent||$('localRoomCode').textContent==='------') $('localRoomCode').textContent=makeRoomCode();
}
function closeLocal(){
  $('localModal')?.classList.add('hidden');
}
function resetLocal(){
  try{channel?.close();pc?.close()}catch(e){}
  channel=null;pc=null;roomCode=makeRoomCode();
  $('localRoomCode').textContent=roomCode;
  $('localSignal').value='';
  localState.connected=false;localState.host=false;localState.slot=null;localState.sessionReady=false;
  netState.seq=0;netState.lastInputAt=0;netState.lastSnapshotAt=0;netState.lastPingAt=0;netState.lastPongAt=netNow();
  localStatus('READY • CHOOSE HOST OR JOIN');
  localLog('STEP 1 • Put both phones on the same Wi-Fi or hotspot.<br>STEP 2 • Host creates an offer and sends the data to the other phone.<br>STEP 3 • Joiner applies it, sends the answer back, then Host applies the answer.');
}
function encodeSignal(value){
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))));
}
function decodeSignal(value){
  try{return JSON.parse(decodeURIComponent(escape(atob(value.trim()))))}
  catch(e){throw new Error('Invalid connection data. Paste the complete offer or answer.')}
}
function sendPacket(packet){
  if(channel?.readyState==='open') channel.send(JSON.stringify(packet));
}
function bindChannel(ch){
  channel=ch;
  channel.onopen=()=>{
    localState.connected=true;localState.sessionReady=false;netState.lastPongAt=netNow();
    localStatus('CONNECTED • PEER LINK ACTIVE',true);
    localLog('PEER CONNECTED • Direct data channel is active.<br>Next architecture step: synchronize player inputs and match state.');
    sendPacket({type:'hello',game:'VOLLEYVERSE',version:1,room:roomCode});
    sendReady();
  };
  channel.onclose=()=>{localState.connected=false;localState.lastDisconnect=Date.now();localState.reconnects++;localStatus('DISCONNECTED • RECONNECT OR RESET TO CONTINUE')};
  channel.onerror=()=>localStatus('CONNECTION ERROR • RESET AND TRY AGAIN');
  channel.onmessage=e=>{
    try{
      const packet=JSON.parse(e.data);
      window.dispatchEvent(new CustomEvent('vv-local-packet',{detail:packet}));
      if(packet.type==='hello') localStatus('CONNECTED • PEER READY',true);
      if(packet.type==='ping'){sendPacket({type:'pong',t:Date.now()})}
      if(packet.type==='pong'){const sent=Number(packet.t)||Date.now();netState.lastPongAt=netNow();localState.pingMs=Math.max(0,Date.now()-sent);localStatus('CONNECTED • '+localState.pingMs+' MS',true)}
      if(packet.type==='session_assign'){localState.slot=Number(packet.slot)||1;localState.sessionReady=false;window.dispatchEvent(new CustomEvent('vv-local-packet',{detail:packet}))}
      if(packet.type==='session_start'){localState.sessionReady=true;localStatus('MATCH READY • LOCAL SLOT '+(localState.slot??'?'),true);window.dispatchEvent(new CustomEvent('vv-local-packet',{detail:packet}))}
    }catch(err){}
  };
}
function makePeer(host){
  if(!window.RTCPeerConnection){localStatus('WEBRTC NOT SUPPORTED • USE A MODERN CHROME');return null}
  const peer=new RTCPeerConnection({iceServers:[]});
  peer.onconnectionstatechange=()=>{
    if(['failed','disconnected','closed'].includes(peer.connectionState)&&localState.connected){
      localState.connected=false;localStatus('PEER DISCONNECTED • CHECK WI-FI / HOTSPOT');
    }
  };
  if(host){
    const ch=peer.createDataChannel('volleyverse');
    bindChannel(ch);
  }else{
    peer.ondatachannel=e=>bindChannel(e.channel);
  }
  return peer;
}
async function waitForIceComplete(peer){
  if(peer.iceGatheringState==='complete')return;
  await new Promise(resolve=>{
    const timer=setTimeout(resolve,4500);
    peer.addEventListener('icegatheringstatechange',()=>{
      if(peer.iceGatheringState==='complete'){clearTimeout(timer);resolve()}
    });
  });
}
async function createOffer(){
  resetLocal();
  localState.host=true;pc=makePeer(true);if(!pc)return;
  const offer=await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceComplete(pc);
  $('localSignal').value=encodeSignal({type:'offer',sdp:pc.localDescription});
  localStatus('OFFER READY • SEND IT TO THE JOINER');
  localLog('HOST STEP • Copy the connection data and send it to the other phone.<br>JOIN STEP • The other phone selects JOIN ROOM, pastes it, then creates an answer.<br>HOST FINAL STEP • Paste the returned answer and tap APPLY.');
}
async function createAnswer(){
  const raw=$('localSignal').value.trim();if(!raw){localStatus('PASTE THE HOST OFFER FIRST');return}
  resetLocal();localState.host=false;pc=makePeer(false);if(!pc)return;
  try{
    const offer=decodeSignal(raw);
    if(offer.type!=='offer')throw new Error('Expected a host offer.');
    await pc.setRemoteDescription(offer.sdp);
    const answer=await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIceComplete(pc);
    $('localSignal').value=encodeSignal({type:'answer',sdp:pc.localDescription});
    localStatus('ANSWER READY • SEND IT BACK TO THE HOST');
    localLog('JOIN STEP COMPLETE • Copy the answer data and send it back to the Host.<br>HOST • Paste the answer into the box and tap APPLY.');
  }catch(err){localStatus(err.message||'COULD NOT CREATE ANSWER')}
}
async function applySignal(){
  const raw=$('localSignal').value.trim();if(!raw){localStatus('PASTE CONNECTION DATA FIRST');return}
  try{
    const signal=decodeSignal(raw);
    if(localMode==='host'){
      if(!pc){localStatus('CREATE AN OFFER FIRST');return}
      if(signal.type!=='answer')throw new Error('Host expects the joiner answer.');
      await pc.setRemoteDescription(signal.sdp);
      localStatus('ANSWER APPLIED • CONNECTING…');
      localLog('HOST • Answer accepted. Waiting for the peer-to-peer data channel to open.');
    }else{
      await createAnswer();
    }
  }catch(err){localStatus(err.message||'COULD NOT APPLY DATA')}
}
async function copyRoomCode(){
  const code=$('localRoomCode')?.textContent||'';
  try{await navigator.clipboard.writeText(code);localStatus('ROOM CODE COPIED • '+code,true)}
  catch(e){localStatus('ROOM CODE • '+code)}
}

const netState={seq:0,lastInputAt:0,lastSnapshotAt:0,lastPingAt:0,lastPongAt:0};
function netNow(){return performance.now()}
function sendInput(input){
  const now=netNow();
  if(now-netState.lastInputAt<45)return false;
  netState.lastInputAt=now;
  sendPacket({type:'input',seq:++netState.seq,t:Date.now(),input});
  return true;
}
function sendSnapshot(snapshot){
  const now=netNow();
  if(now-netState.lastSnapshotAt<80)return false;
  netState.lastSnapshotAt=now;
  sendPacket({type:'snapshot',seq:++netState.seq,t:Date.now(),state:snapshot});
  return true;
}
function sendReady(){sendPacket({type:'ready',t:Date.now()})}
function sendSessionStart(){if(localState.host&&localState.connected){localState.sessionReady=true;sendPacket({type:'session_start',t:Date.now()})}}
function sendSessionAssign(slot){if(localState.host&&localState.connected){localState.slot=0;sendPacket({type:'session_assign',slot,t:Date.now()})}}
function netHeartbeat(){
  if(!localState.connected)return;
  const now=netNow();
  if(now-netState.lastPingAt>1800){netState.lastPingAt=now;sendPacket({type:'ping',t:Date.now()})}
  if(now-netState.lastPongAt>6500){localState.connected=false;localState.sessionReady=false;localStatus('CONNECTION LOST • RECONNECT OR RESET TO CONTINUE');}
}

window.VVLocalMultiplayer={open:showLocal,close:closeLocal,isConnected:()=>localState.connected,isSessionReady:()=>localState.sessionReady,send:sendPacket,sendInput,sendSnapshot,sendReady,sendSessionStart,sendSessionAssign,isHost:()=>localState.host,getStatus:()=>({...localState}),reset:resetLocal};

$('localHostBtn')?.addEventListener('click',()=>setLocalMode('host'));
$('localJoinBtn')?.addEventListener('click',()=>setLocalMode('join'));
$('localClose')?.addEventListener('click',closeLocal);
$('localReset')?.addEventListener('click',resetLocal);
$('copyRoomCode')?.addEventListener('click',copyRoomCode);
$('localPrimary')?.addEventListener('click',()=>localMode==='host'?createOffer():createAnswer());
$('localApply')?.addEventListener('click',applySignal);
resetLocal();

setInterval(netHeartbeat,1000);
