/**
 * MAPA DE FÓRMULAS: ./FORMULAS.md
 * Monta a página de catálogos; não calcula indicadores.
 */
FormulaUI.render(document.getElementById("formulaContainer"), BI_METRIC_ORDER.map(id => METRICAS[id]), "formula-desempenho");
FormulaUI.render(document.getElementById("formulaLotesContainer"), FORMULAS_LOTES, "formula-lotes");

FormulaUI.render(document.getElementById("formulaRxpContainer"), FORMULAS_RXP, "rxp");

FormulaUI.render(document.getElementById("formulaHistoricoContainer"), FORMULAS_HISTORICO, "formula-historico");

// Somente metadados das fontes físicas do catálogo; não consulta os indicadores.
apiGet('/api/bi/formulas/atualizacao').then(data=>{
  window.exibirAtualizacaoDados(document.getElementById('ultimaAtualizacao'),data);
}).catch(()=>{
  const element=document.getElementById('ultimaAtualizacao');
  window.exibirAtualizacaoDados(element,null);
  element.title='Não foi possível consultar as datas de carga das fontes do catálogo.';
});
