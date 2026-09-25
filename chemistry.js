window.VVChemistry={
  calculate(team,roster){
    const players=team.map(id=>roster.find(c=>c.id===id)).filter(Boolean);
    if(!players.length)return{score:0,label:'NO TEAM',detail:'Select players to build chemistry.',bonuses:{}};

    const stat=c=>window.VVProgression?.effectiveStats?window.VVProgression.effectiveStats(c.id):c.stats;
    const roles=players.map(c=>c.position);
    const s=roles.filter(x=>x==='S').length;
    const m=roles.filter(x=>x==='MB').length;
    const l=roles.filter(x=>x==='L').length;
    const w=roles.filter(x=>x==='OH'||x==='OPP').length;

    let score=Math.round(players.reduce((a,c)=>a+(c.ovr||0),0)/players.length);
    const bonuses={role:0,receive:0,set:0,attack:0,style:0,training:0};

    if(s===1&&m===2&&l===1&&w===2){score+=8;bonuses.role=8}
    else if(s>=1){score+=3;bonuses.role=3}

    const recv=players.reduce((a,c)=>a+Number(stat(c).receive||0),0)/players.length;
    const setters=players.filter(c=>c.position==='S');
    const attack=players.filter(c=>c.position==='OH'||c.position==='OPP');

    if(l===1&&recv>=82){score+=3;bonuses.receive=3}
    if(s===1&&setters[0]&&Number(stat(setters[0]).set||0)>=88){score+=3;bonuses.set=3}
    if(w>=2&&attack.reduce((a,c)=>a+Number(stat(c).spike||0),0)/attack.length>=88){score+=3;bonuses.attack=3}

    const styleGroups={};
    players.forEach(c=>{const key=(c.style||'').split(' ')[0].toLowerCase();styleGroups[key]=(styleGroups[key]||0)+1});
    if(players.some(c=>/precision|complete|balanced/i.test(c.style||''))){score+=2;bonuses.style=2}

    const trained=players.filter(c=>{
      const base=c.stats||{},now=stat(c);
      return Object.keys(base).some(k=>Number(now[k]||0)>Number(base[k]||0));
    }).length;
    if(trained>=3){score+=2;bonuses.training=2}

    score=Math.min(100,Math.max(0,score));

    const missing=[];
    if(s!==1)missing.push('1 SETTER');
    if(m!==2)missing.push('2 MIDDLES');
    if(l!==1)missing.push('1 LIBERO');
    if(w!==2)missing.push('2 WING ATTACKERS');

    const label=score>=95?'ELITE SYNERGY':score>=88?'HIGH SYNERGY':score>=78?'SOLID SYNERGY':'BUILDING SYNERGY';
    const detail=missing.length?'Improve role balance: '+missing.join(' • '):'Role-balanced six with strong coverage.';
    return{score,label,detail,bonuses,trainedPlayers:trained};
  }
};