(()=>{
  const getChosen=()=>[...document.querySelectorAll('.char-card.chosen')].map(x=>x.dataset.char);
  const update=()=>{
    const roster=window.VVCharacters?.roster||[];
    const engine=window.VVChemistry;
    if(!engine)return;
    const result=engine.calculate(getChosen(),roster);
    const score=document.getElementById('chemScore');
    const label=document.getElementById('chemLabel');
    const detail=document.getElementById('chemDetail');
    if(score)score.textContent=result.score;
    if(label)label.textContent=result.label;
    if(detail)detail.textContent=result.detail;
  };
  const boot=()=>{
    update();
    document.getElementById('characterGrid')?.addEventListener('click',()=>setTimeout(update,0));
    document.getElementById('teamStrip')?.addEventListener('click',()=>setTimeout(update,0));
    window.addEventListener('vv:character-open',()=>setTimeout(update,0));
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
