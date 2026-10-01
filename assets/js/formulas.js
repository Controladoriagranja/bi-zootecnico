/**
 * MAPA DE FÓRMULAS: ./FORMULAS.md
 * Monta a página de catálogos; não calcula indicadores.
 */
FormulaUI.render(document.getElementById("formulaContainer"), BI_METRIC_ORDER.map(id => METRICAS[id]), "formula-desempenho");
FormulaUI.render(document.getElementById("formulaLotesContainer"), FORMULAS_LOTES, "formula-lotes");

FormulaUI.render(document.getElementById("formulaRxpContainer"), FORMULAS_RXP, "rxp");

FormulaUI.render(document.getElementById("formulaHistoricoContainer"), FORMULAS_HISTORICO, "formula-historico");
