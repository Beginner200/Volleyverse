// VOLLEYVERSE authoritative server foundation
// Deployment target: Node.js-compatible server (Railway or another persistent host).
const http=require('http');
const crypto=require('crypto');
const sessions=new Map(),queues=new Map();
const uid=p=>p+'_'+crypto.randomBytes(6).toString('hex');
function session(region,mode){const id=uid('match');const s={schema:'VV_SERVER_SESSION',version:1,id,region,mode,tick:0,status:'WAITING',createdAt:Date.now(),players:new Map(),scores:{home:0,away:0},sets:{home:0,away:0},lastActivity:Date.now()};sessions.set(id,s);return s}
function publicSession(s){return {...s,players:[...s.players.values()]}}
function enqueue(player){const q=queues.get(player.mode)||[];q.push(player);queues.set(player.mode,q);if(q.length>=2){const a=q.shift(),b=q.shift(),s=session(a.region||'SEA',a.mode);s.status='READY';s.players.set(a.id,{id:a.id,team:'home',connected:true});s.players.set(b.id,{id:b.id,team:'away',connected:true});return publicSession(s)}return null}
function tick(){const now=Date.now();for(const s of sessions.values()){if(s.status==='LIVE'){s.tick++;s.lastActivity=now}}}
setInterval(tick,50);
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');if(req.url==='/health'){res.end(JSON.stringify({ok:true,service:'volleyverse-server',sessions:sessions.size,queues:queues.size}));return}if(req.url==='/session'&&req.method==='POST'){let body='';req.on('data',d=>body+=d);req.on('end',()=>{try{const p=JSON.parse(body||'{}');const id=p.playerId||uid('player'),mode=p.mode||'RANKED',region=p.region||'SEA';const match=enqueue({id,mode,region});res.end(JSON.stringify(match||{queued:true,playerId:id,mode,region}))}catch(e){res.statusCode=400;res.end(JSON.stringify({error:'invalid_request'}))}});return}res.statusCode=404;res.end(JSON.stringify({error:'not_found'}))});
const port=Number(process.env.PORT||3001);server.listen(port,()=>console.log('VOLLEYVERSE SERVER '+port));
module.exports={sessions,queues,session,enqueue,publicSession};
