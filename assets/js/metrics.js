const BI_METRIC_ORDER=["iep", "ca", "cac", "gmd", "mortalidade", "idade", "peso_medio", "vazio", "morte_transporte", "cac_ref", "aves_abatidas"];
const METRICAS=Object.fromEntries(FormulaRegistry.legacyGroup("desempenho").filter(item=>BI_METRIC_ORDER.includes(item.id)).map(item=>[item.id,item]));
window.METRICAS=METRICAS;window.BI_METRIC_ORDER=BI_METRIC_ORDER;
