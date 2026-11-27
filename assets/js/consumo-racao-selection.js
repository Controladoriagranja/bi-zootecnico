/* Uma seleção de fase compartilhada pelos gráficos e detalhes. */
window.FeedPhase = (() => {
  const allowed=['consumo_total',...ConsumoRacaoData.phases.map(phase=>phase.key)];
  let value='consumo_total';
  return Object.freeze({get:()=>value,cards(rows,phase=value){
    if(phase==='consumo_total')return ConsumoRacaoData.aggregate(rows);
    const matching=rows.filter(row=>Number.isFinite(row[phase]));
    const aggregate=ConsumoRacaoData.aggregate(matching),item=aggregate.phases.find(item=>item.key===phase);
    return {...aggregate,total:item.total,totalRecords:item.records,perBird:item.perBird};
  },set(next){
    if(!allowed.includes(next))return;
    value=next;document.dispatchEvent(new CustomEvent('feed:phase-change',{detail:{phase:value}}));
  },columns(columns,phase=value){return columns.filter(column=>
    column.phase?column.phase===phase:!['consumo_total','consumo_ave'].includes(column.key)||phase==='consumo_total');}});
})();
