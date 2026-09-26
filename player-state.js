const ROLE_DEFAULTS={OH:'OH',S:'S',OPP:'OPP',MB:'MB',L:'L'};

function makePlayerState({id=null,name,team,role='OH',rotationPosition=0,active=true,liberoEligible=false,characterId=null,stats={}}={}){
  return {
    id:id||`${team}-${name}`,name,team,role:ROLE_DEFAULTS[role]||'OH',rotationPosition,
    active,substitute:!active,liberoEligible:Boolean(liberoEligible),isLibero:false,
    controlled:false,aiControlled:team==='away',characterId,stats:{...stats},
    setsPlayed:0,ralliesPlayed:0,lastEnteredAt:0,lastExitedAt:0
  };
}

class VVPlayerStateManager{
  constructor(){
    this.players=new Map();
    this.activeByTeam={home:[],away:[]};
    this.substitutesByTeam={home:[],away:[]};
    this.liberoByTeam={home:null,away:null};
    this.substitutionHistory={home:[],away:[]};
    this.substitutionsUsed={home:0,away:0};
    this.rallyNumber=0;
    this.lastLiberoReplacementRally={home:-1,away:-1};
  }
  register(player){this.players.set(player.id,player);return player}
  registerTeam(team,players,{liberoId=null}={}){
    this.activeByTeam[team]=[];this.substitutesByTeam[team]=[];
    players.forEach((p,i)=>{
      p.team=team;p.rotationPosition=p.rotationPosition||i+1;
      p.active=i<6;p.substitute=!p.active;p.aiControlled=team==='away';
      this.register(p);
      if(p.active)this.activeByTeam[team].push(p);else this.substitutesByTeam[team].push(p);
    });
    const libero=liberoId?this.players.get(liberoId):players.find(p=>p.liberoEligible)||null;
    if(libero){libero.liberoEligible=true;libero.isLibero=false;this.liberoByTeam[team]=libero}
  }
  registerBench(team,players){
    (players||[]).forEach(p=>{p.team=team;p.active=false;p.substitute=true;p.aiControlled=team==='away';this.register(p);this.substitutesByTeam[team].push(p)});
  }
  get(id){return this.players.get(id)||null}
  getActive(team){return this.activeByTeam[team].slice()}
  getSubstitutes(team){return this.substitutesByTeam[team].slice()}
  getServer(team){return this.activeByTeam[team].find(p=>p.rotationPosition===1)||null}
  setControlled(id,controlled){const p=this.get(id);if(!p)return false;p.controlled=Boolean(controlled);return true}
  setLibero(team,id){
    const p=this.get(id);
    if(!p||p.team!==team||!p.liberoEligible)return {ok:false,reason:'INVALID_LIBERO'};
    this.liberoByTeam[team]=p;return {ok:true,player:p};
  }
  canSubstitute(team,inId,outId,{beforeServe=true}={}){
    if(!beforeServe)return {ok:false,reason:'BALL_IN_PLAY'};
    if(this.substitutionsUsed[team]>=6)return {ok:false,reason:'SUBSTITUTION_LIMIT'};
    const incoming=this.get(inId),outgoing=this.get(outId);
    if(!incoming||!outgoing||incoming.team!==team||outgoing.team!==team)return {ok:false,reason:'PLAYER_NOT_ON_TEAM'};
    if(incoming.isLibero||outgoing.isLibero||incoming.liberoEligible||outgoing.liberoEligible)return {ok:false,reason:'USE_LIBERO_REPLACEMENT'};
    if(incoming.active||!outgoing.active)return {ok:false,reason:'INVALID_ACTIVE_STATE'};
    const previous=this.substitutionHistory[team].filter(x=>x.inId===inId||x.outId===inId||x.inId===outId||x.outId===outId);
    const priorPair=previous.find(x=>(x.inId===inId&&x.outId===outId)||(x.inId===outId&&x.outId===inId));
    const hasIncomingPlayed=previous.some(x=>x.inId===inId);
    const hasOutgoingPlayed=previous.some(x=>x.inId===outId);
    if(hasIncomingPlayed&&hasOutgoingPlayed&&!priorPair)return {ok:false,reason:'ILLEGAL_REENTRY_PAIR'};
    return {ok:true};
  }
  substitute(team,inId,outId,{rallyNumber=this.rallyNumber}={}){
    const check=this.canSubstitute(team,inId,outId);if(!check.ok)return check;
    const incoming=this.get(inId),outgoing=this.get(outId);
    const rotationPosition=outgoing.rotationPosition;
    incoming.rotationPosition=rotationPosition;incoming.active=true;incoming.substitute=false;incoming.lastEnteredAt=rallyNumber;
    outgoing.active=false;outgoing.substitute=true;outgoing.lastExitedAt=rallyNumber;
    this.activeByTeam[team]=this.activeByTeam[team].filter(p=>p.id!==outgoing.id);this.activeByTeam[team].push(incoming);
    this.substitutesByTeam[team]=this.substitutesByTeam[team].filter(p=>p.id!==incoming.id);this.substitutesByTeam[team].push(outgoing);
    this.substitutionHistory[team].push({inId,outId,rallyNumber});
    this.substitutionsUsed[team]++;
    return {ok:true,incoming,outgoing,rotationPosition};
  }
  canLiberoReplace(team,liberoId,outId,{beforeServe=true}={}){
    if(!beforeServe)return {ok:false,reason:'BALL_IN_PLAY'};
    const libero=this.get(liberoId)||this.liberoByTeam[team],outgoing=this.get(outId);
    if(!libero||!outgoing||libero.team!==team||outgoing.team!==team)return {ok:false,reason:'INVALID_LIBERO'};
    if(!libero.liberoEligible||libero.isLibero)return {ok:false,reason:'INVALID_LIBERO_STATE'};
    if(libero.active||!outgoing.active)return {ok:false,reason:'INVALID_ACTIVE_STATE'};
    if(outgoing.rotationPosition<=3)return {ok:false,reason:'LIBERO_BACK_ROW_ONLY'};
    if(this.lastLiberoReplacementRally[team]===this.rallyNumber)return {ok:false,reason:'RALLY_NOT_COMPLETED'};
    return {ok:true};
  }
  replaceWithLibero(team,liberoId,outId,{rallyNumber=this.rallyNumber}={}){
    const check=this.canLiberoReplace(team,liberoId,outId);if(!check.ok)return check;
    const libero=this.get(liberoId),outgoing=this.get(outId);
    libero.isLibero=true;libero.active=true;libero.substitute=false;libero.rotationPosition=outgoing.rotationPosition;
    outgoing.isLibero=false;outgoing.active=false;outgoing.substitute=true;
    libero.lastReplacedId=outgoing.id;
    this.activeByTeam[team]=this.activeByTeam[team].filter(p=>p.id!==outgoing.id);this.activeByTeam[team].push(libero);
    this.substitutesByTeam[team]=this.substitutesByTeam[team].filter(p=>p.id!==libero.id);this.substitutesByTeam[team].push(outgoing);
    this.lastLiberoReplacementRally[team]=rallyNumber;
    this.substitutionHistory[team].push({inId:libero.id,outId:outgoing.id,rallyNumber,libero:true});
    return {ok:true,incoming:libero,outgoing,rotationPosition:outgoing.rotationPosition};
  }
  returnFromLibero(team,liberoId,outId,{rallyNumber=this.rallyNumber}={}){\n    const libero=this.get(liberoId),regular=this.get(outId);\n    if(!libero||!regular||libero.team!==team||regular.team!==team||!libero.isLibero)return {ok:false,reason:'INVALID_LIBERO_RETURN'};\n    if(!libero.active||regular.active)return {ok:false,reason:'INVALID_ACTIVE_STATE'};\n    if(this.lastLiberoReplacementRally[team]===this.rallyNumber)return {ok:false,reason:'RALLY_NOT_COMPLETED'};\n    const rotationPosition=libero.rotationPosition;\n    libero.active=false;libero.substitute=true;libero.isLibero=false;libero.lastReplacedId=null;\n    regular.active=true;regular.substitute=false;regular.rotationPosition=rotationPosition;\n    this.activeByTeam[team]=this.activeByTeam[team].filter(p=>p.id!==libero.id);this.activeByTeam[team].push(regular);\n    this.substitutesByTeam[team]=this.substitutesByTeam[team].filter(p=>p.id!==regular.id);this.substitutesByTeam[team].push(libero);\n    this.lastLiberoReplacementRally[team]=rallyNumber;\n    this.substitutionHistory[team].push({inId:regular.id,outId:libero.id,rallyNumber,liberoReturn:true});\n    return {ok:true,incoming:regular,outgoing:libero,rotationPosition};\n  }\n  removeLibero(team,liberoId,{rallyNumber=this.rallyNumber}={}){
    const libero=this.get(liberoId||this.liberoByTeam[team]?.id);
    if(!libero||!libero.active||!libero.isLibero)return {ok:false,reason:'LIBERO_NOT_ACTIVE'};
    const outgoing=this.players.get(libero.lastReplacedId);
    if(!outgoing||outgoing.active)return {ok:false,reason:'REGULAR_REPLACEMENT_NOT_AVAILABLE'};
    return {ok:false,reason:'RETURN_TARGET_REQUIRED'};
  }
  endRally(){
    this.rallyNumber++;
    for(const p of this.players.values())if(p.active)p.ralliesPlayed++;
  }
  startSet(){
    this.substitutionsUsed={home:0,away:0};
    this.substitutionHistory={home:[],away:[]};
    this.lastLiberoReplacementRally={home:-1,away:-1};
    for(const p of this.players.values())if(p.active)p.setsPlayed++;
  }
  resetMatch(){
    this.substitutionsUsed={home:0,away:0};this.substitutionHistory={home:[],away:[]};
    this.lastLiberoReplacementRally={home:-1,away:-1};this.rallyNumber=0;
  }
}

export const VVPlayerState=new VVPlayerStateManager();
export {makePlayerState};