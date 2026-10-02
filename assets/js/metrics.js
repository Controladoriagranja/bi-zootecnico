/** Catálogo de explicações. Fórmulas executadas somente no SQL da API. */
const METRICAS = {};
const definitions = [
  ["iep","IEP","iep",2,""], ["ca","CA","consumo_racao / pes_total",3,""],
  ["cac","CAC","cac",3,""], ["gmd","GPD","(ps_med / ida) × 1000",2,"g/dia"],
  ["mortalidade","% Mortalidade","(mort / aloj) × 100",2,"%"],
  ["idade","Idade Média","(qt_aves × ida) / qt_aves",1,"dias"],
  ["peso_medio","Peso Médio","pes_total / qt_aves",3,"kg/ave"],
  ["vazio","Vazio","vazio_sanitario, substituindo por 14 somente se maior que 14",1,"dias"],
  ["morte_transporte","% Morte no Transporte","mort_transporte_2",2,"%"],
  ["cac_ref","CAC Ref","cac_ref",3,""], ["aves_abatidas","Aves Abatidas","qt_aves",0,"aves"]
];
definitions.forEach(([id,nome,expression,decimals,unit])=>{
  const sum=id==="aves_abatidas",complement=["morte_transporte","cac_ref"].includes(id);
  METRICAS[id]={id,nome,coluna:expression,unidade:unit,casas_decimais:decimals,
    tipo_calculo:sum?"soma":"media_simples",colunas:[expression],
    formula_exibicao:sum?"Soma de qt_aves":`Média simples de: ${expression}`,
    descricao:sum?"Total de aves abatidas dos acertos no contexto selecionado.":`Cada lote usa ${expression}. O grupo, mês ou ano apresenta a média simples dos resultados válidos, sem ponderação.`,
    passos:["Use os acertos selecionados e a data_abate a partir de 2023.",
      complement?"Complete apenas por vínculo único de código, galpão, lote e dia de abate na base_dinamica. Sem vínculo ou vínculo ambíguo permanece sem valor.":"Use as colunas de acerto_lote_resultado_geral.",
      "Divisão por zero e componentes ausentes retornam null e são apresentados como —.",
      sum?"Some os valores válidos de qt_aves.":"Faça a média simples dos resultados válidos de cada acerto, sem ponderação por quantidade de aves."]};
});
const BI_METRIC_ORDER=definitions.map(([id])=>id);
window.METRICAS=METRICAS;
window.BI_METRIC_ORDER=BI_METRIC_ORDER;
