/* Dados inteiramente SINTETICOS; carregados somente em localhost com ?demo=1. */
window.ConsumoRacaoDemo = (() => {
  const phases=['fase_pre_menos_inicial','fase_inicial','fase_crescimento','fase_final'];
  const dados=Array.from({length:64},(_,index)=>{
    const birds=12000+(index%6)*3600,date=new Date(Date.UTC(2026,9,13+index%44)).toISOString().slice(0,10);
    const lineage=['COBB','HUBBARD','ROSS','COBB, HUBBARD'][index%4];
    const row={tipo_linha:'detalhe',registro_id:'sintetico-'+index,empresa_codigo:'1',unidade_codigo:'53',data:date,
      codigo:['DEMO01','DEMO02','DEMO03','DEMO04'][index%4],integrado:['Fazenda Exemplo Águas Claras','Fazenda Exemplo Bela Vista','Fazenda Exemplo Cedro','Fazenda Exemplo Dois Rios'][index%4],
      galpao:'G'+String(index%12+1).padStart(2,'0'),lote:String(index%9+1).padStart(4,'0'),qtde_aves:birds,idade:40+index%9,
      sexo:index%3?'Misto':'Macho',nutricao:index%2?'Nutrição A':'Nutrição B',linhagens:lineage,standard:'STD-DEMO-'+index%3,
      data_referencia:'2026-11-25',carga_id:'carga-sintetica',importado_em:null};
    phases.forEach((phase,i)=>{row[phase]=Math.round(birds*([.22,.96,1.78,1.61][i]+(index%5)*.015));
      row[phase+'_cons_ave']=row[phase]/birds;row[phase+'_cons_dia']=[7,14,13,11][i];});
    if(index===12)row.fase_final=null;
    if(index===15)row.qtde_aves=0;
    if(index===17)row.fase_inicial_cons_dia=null;
    return row;
  });
  return {contract_version:'consumo-racao-snapshot-v1',arquivo:'fabrica_racao.consumo_medio_racao',completo:true,
    demonstracao:true,total_registros:dados.length,periodo_disponivel:{inicio:'2026-10-13',fim:'2026-11-25'},
    atualizado_em:null,unidade_consumo:null,dados};
})();
