/* Adaptador do catálogo: nenhum modal ou expressão duplicados. */
function renderFormulaEntries(container,entries){
 if(!container)return;
 container.replaceChildren(...entries.filter(Boolean).map(entry=>{
  const card=document.createElement('article');card.className='card if-catalog-card';
  const header=document.createElement('header'),heading=document.createElement('h3');heading.textContent=entry.title;header.append(heading);card.append(header);
  IndicatorFormulaUI.mount(header,entry.id);return card;
 }));
}
window.FormulaUI={renderEntries:renderFormulaEntries,render(container,metrics,prefix='formula'){
 if(!container)return;
 const groups={'formula-desempenho':'desempenho','formula-lotes':'lotes','formula-historico':'historico','rxp':'rxp'};
 const group=groups[prefix];if(!group)return;
 renderFormulaEntries(container,metrics.filter(Boolean).map(metric=>FormulaRegistry.get(group+'.'+metric.id)));
}};
