const ROLE_DEFAULTS={OH:'OH',S:'S',OPP:'OPP',MB:'MB',L:'L'};
function makePlayerState({id=null,name,team,role='OH',rotationPosition=0,active=true,liberoEligible=false,characterId=null,stats={}}={}){
  return {
    id:id||`${team}-${name}`,
    name,team,role:ROLE_DEFAULTS[role]||'OH',rotationPosition,
    active,substitute:!active,liberoEligible:Boolean(liberoEligible),
    isLibero:false,controlled:false,aiControlled:team==='away',
    characterId,stats:{...stats},setsPlayed:0,ralliesPlayed:0,
    lastEnteredAt:0
  };
}
class VVPlayerStateManager{
  constructor(){this.players=new Map();this.activeByTeam={home:[],away:[]};this.substitutesByTeam={home:[],away:[]};this.liberoByTeam={home:null,away:null};this.substitutionHistory={home:[],away:[]};}
  register(player){this.players.set(player.id,player);return player}
  registerTeam(team,players,{liberoId=null}={}){
    this.activeByTeam[team]=[];this.substitutesByTeam[team]=[];
    players.forEach((p,i)=>{p.team=team;p.rotationPosition=p.rotationPosition||i+1;p.active=i<6;p.substitute=!p.active;p.aiControlled=team==='away';this.register(p);if(p.active)this.activeByTeam[team].push(p);else this.substitutesByTeam[team].push(p)});
    const libero=liberoId?this.players.get(liberoId):this.substitutesByTeam[team].find(p=>p.liberoEligible);
    if(libero)this.liberoByTeam[team]=libero;
  }
  get(id){return this.players.get(id)||null}
  getActive(team){return this.activeByTeam[team].slice()}
  getSubstitutes(team){return this.substitutesByTeam[team].slice()}
  getServer(team){return this.activeByTeam[team].find(p=>p.rotationPosition===1)||null}
  setControlled(id,controlled){const p=this.get(id);if(!p)return false;p.controlled=Boolean(controlled);return true}
  canSubstitute(team,inId,outId,{beforeServe=true}={}){
    if(!beforeServe)return {ok:false,reason:'SUBSTITUTION_NOT_AVAILABLE'};
    const incoming=this.get(inId),outgoing=this.get(outId);
    if(!incoming||!outgoing||incoming.team!==team||outgoing.team!==team)return {ok:false,reason:'PLAYER_NOT_ON_TEAM'};
    if(incoming.active||!outgoing.active)return {ok:false,reason:'INVALID_ACTIVE_STATE'};
    if(incoming.isLibero!==outgoing.isLibero&&incoming.isLibero)return {ok:false,reason:'LIBERO_USE_REPLACEMENT'};
    return {ok:true};
  }
  substitute(team,inId,outId,{rallyNumber=0}={}){
    const check=this.canSubstitute(team,inId,outId);if(!check.ok)return check;
    const incoming=this.get(inId),outgoing=this.get(outId);
    incoming.active=true;incoming.substitute=false;incoming.lastEnteredAt=rallyNumber;
    outgoing.active=false;outgoing.substitute=true;
    this.activeByTeam[team]=this.activeByTeam[team].filter(p=>p.id!==outgoing.id);this.activeByTeam[team].push(incoming);
    this.substitutesByTeam[team]=this.substitutesByTeam[team].filter(p=>p.id!==incoming.id);this.substitutesByTeam[team].push(outgoing);
    this.substitutionHistory[team].push({inId,outId,rallyNumber});
    return {ok:true,incoming,outgoing};
  }
  replaceWithLibero(team,liberoId,outId,{rallyNumber=0}={}){
    const libero=this.get(liberoId),outgoing=this.get(outId);
    if(!libero||!outgoing||libero.team!==team||outgoing.team!==team||!libero.liberoEligible)return {ok:false,reason:'INVALID_LIBERO'};
    if(libero.active||!outgoing.active||outgoing.role==='L')return {ok:false,reason:'INVALID_LIBERO_REPLACEMENT'};
    libero.isLibero=true;outgoing.isLibero=false;libero.active=true;libero.substitute=false;outgoing.active=false;outgoing.substitute=true;
    this.activeByTeam[team]=this.activeByTeam[team].filter(p=>p.id!==outgoing.id);this.activeByTeam[team].push(libero);
    this.substitutesByTeam[team]=this.substitutesByTeam[team].filter(p=>p.id!==libero.id);this.substitutesByTeam[team].push(outgoing);
    this.substitutionHistory[team].push({inId:libero.id,outId:outgoing.id,rallyNumber,libero:true});
    return {ok:true,incoming:libero,outgoing};
  }
  endRally(){for(const p of this.players.values())if(p.active)p.ralliesPlayed++}
  startSet(){for(const p of this.players.values())if(p.active)p.setsPlayed++}
}
export const VVPlayerState=new VVPlayerStateManager();
export {makePlayerState};