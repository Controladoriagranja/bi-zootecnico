/**
 * MAPA DE FÓRMULAS: ./FORMULAS.md
 * Monta a página de catálogos; não calcula indicadores.
 */
FormulaUI.render(document.getElementById("formulaContainer"), BI_METRIC_ORDER.map(id => METRICAS[id]), "formula-desempenho");
FormulaUI.render(document.getElementById("formulaLotesContainer"), FORMULAS_LOTES, "formula-lotes");

FormulaUI.render(document.getElementById("formulaRxpContainer"), FORMULAS_RXP, "rxp");

FormulaUI.render(document.getElementById("formulaHistoricoContainer"), FORMULAS_HISTORICO, "formula-historico");

// Todo o catálogo vem do registro único, incluindo fases e métricas dos detalhes.
const listedFormulaIds=new Set([...document.querySelectorAll('[data-formula-id]')].map(el=>el.dataset.formulaId));
const complementary=[...FormulaRegistry.entries.values()].filter(entry=>!listedFormulaIds.has(entry.id));
if(complementary.length){
 const section=document.createElement('section');section.className='formula-page-section';
 const heading=document.createElement('h2');heading.textContent='Fases e regras complementares';
 const grid=document.createElement('div');grid.className='formula-grid';section.append(heading,grid);
 document.getElementById('formulaHistoricoContainer').closest('main,.app-shell')?.append(section);
 FormulaUI.renderEntries(grid,complementary);
}

// Somente metadados das fontes físicas do catálogo; não consulta os indicadores.
apiGet('/api/bi/formulas/atualizacao').then(data=>{
  window.exibirAtualizacaoDados(document.getElementById('ultimaAtualizacao'),data);
}).catch(()=>{
  const element=document.getElementById('ultimaAtualizacao');
  window.exibirAtualizacaoDados(element,null);
  element.title='Não foi possível consultar as datas de carga das fontes do catálogo.';
});
