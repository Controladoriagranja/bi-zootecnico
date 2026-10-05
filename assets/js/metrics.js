/** Explicações das regras acerto-2026-10-05; execução somente no SQL da API. */
const METRICAS = {};
const definitions = [
  ['iep','IEP','AVG(iep)',2,'','media_simples'],
  ['ca','CA','SUM(consumo_racao) / SUM(pes_total)',3,'','divisao_somas'],
  ['cac','CAC','SUM(cac × aloj) / SUM(aloj)',3,'','media_ponderada'],
  ['gmd','GPD','SUM(pes_total / qt_aves) / SUM((qt_aves × ida) / qt_aves) × 1000',2,'g/dia','divisao_somas'],
  ['mortalidade','% Mortalidade','SUM(mort) / SUM(aloj) × 100',2,'%','divisao_somas'],
  ['idade','Idade Média','SUM(qt_aves × ida) / SUM(qt_aves)',2,'dias','divisao_somas'],
  ['peso_medio','Peso Médio','SUM(pes_total) / SUM(qt_aves)',3,'kg/ave','divisao_somas'],
  ['vazio','Vazio','SUM(vazio_sanitario × qt_aves) / SUM(qt_aves)',2,'dias','media_ponderada'],
  ['morte_transporte','% Morte no Transporte','SUM(mort_transporte_2 × aloj) / SUM(aloj)',2,'%','media_ponderada'],
  ['cac_ref','CAC Ref','SUM(cac_ref × aloj) / SUM(aloj)',3,'','media_ponderada'],
  ['aves_abatidas','Aves Abatidas','SUM(qt_aves)',0,'aves','soma']
];
definitions.forEach(([id,nome,expression,decimals,unit,kind])=>{
  const sum=id==="aves_abatidas",complement=["morte_transporte","cac_ref"].includes(id);
  METRICAS[id]={id,nome,coluna:expression,unidade:unit,casas_decimais:decimals,
    tipo_calculo:kind,colunas:[expression],formula_exibicao:expression,
    descricao:id==='vazio'?'Média ponderada por aves abatidas (qt_aves), sem limite de 14.':id==='gmd'?'Dividir a soma dos pesos médios calculados de cada lote pela soma das idades médias de cada lote, multiplicando por 1000. Sem ponderação adicional.':kind==='media_ponderada'?'Média ponderada por aves alojadas (aloj), somente com pares válidos de indicador e peso.':kind==='media_simples'?'Média simples dos valores válidos de IEP.':sum?'Soma das aves abatidas selecionadas.':'Aplicar a fórmula às somas dos componentes no contexto selecionado.',
    passos:["Use os acertos selecionados e a data_abate a partir de 2023.",
      complement?"Complete apenas por vínculo único de código, galpão, lote e dia de abate na base_dinamica. Sem vínculo ou vínculo ambíguo permanece sem valor.":"Use as colunas de acerto_lote_resultado_geral.",
      "Divisão por zero e componentes ausentes retornam null e são apresentados como —.",
      `Consolidar usando ${expression}. Nas ponderações, excluir do denominador os pesos de indicadores ausentes.`]};
});
const BI_METRIC_ORDER=definitions.map(([id])=>id);
window.METRICAS=METRICAS;
window.BI_METRIC_ORDER=BI_METRIC_ORDER;
