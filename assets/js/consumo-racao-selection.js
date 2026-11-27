/* Uma seleção de fase compartilhada pelos gráficos e detalhes. */
window.FeedPhase = (() => {
  const allowed=['consumo_total',...ConsumoRacaoData.phases.map(phase=>phase.key)];
  let value='consumo_total';
  return Object.freeze({get:()=>value,set(next){
    if(!allowed.includes(next))return;
    value=next;document.dispatchEvent(new CustomEvent('feed:phase-change',{detail:{phase:value}}));
  },columns(columns,phase=value){return columns.filter(column=>
    column.phase?column.phase===phase:!['consumo_total','consumo_ave'].includes(column.key)||phase==='consumo_total');}});
})();
