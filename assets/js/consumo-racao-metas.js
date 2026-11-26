/* Metas físicas separadas. Crescimento = FCI + FC2, vínculo confirmado. */
window.ConsumoRacaoMetas=(()=>{
  'use strict';
  const mapping=Object.freeze({fase_pre_menos_inicial:'plano_0001_fpi_cons_ave',fase_inicial:'plano_0001_fin_cons_ave',fase_crescimento:Object.freeze(['plano_0001_fci_cons_ave','plano_0001_fc2_cons_ave']),fase_final:'plano_0001_fab_cons_ave'});
  function normalize(rows){
    const result=[],seen=new Set();
    for(const row of rows){
      if(!Object.values(mapping).flat().includes(row.indicador_codigo)||row.ativo!==true)continue;
      if(row.tela!=='consumo-medio-racao'||row.unidade!=='kg/ave'||row.tabela_origem!=='fabrica_racao.consumo_medio_racao')throw Error('Cadastro de meta com unidade ou origem incompatível.');
      const value=ConsumoRacaoData.number(row.valor_meta),date=ConsumoRacaoData.day(row.referencia_mes),key=row.indicador_codigo+'|'+date;
      if(value===null||value<=0||!date||seen.has(key))throw Error('Meta inválida ou duplicada para a mesma vigência.');
      seen.add(key);result.push({code:row.indicador_codigo,date,value});
    }
    return result;
  }
  function find(metas,phase,date){
    const codes=phase==='consumo_total'?Object.values(mapping).flat():[mapping[phase]].flat();
    if(!date||codes.some(code=>!code))return null;
    let total=0;
    for(const code of codes){
      const selected=metas.filter(meta=>meta.code===code&&meta.date<=date).sort((a,b)=>b.date.localeCompare(a.date));
      if(!selected.length)return null;total+=selected[0].value;
    }
    return total;
  }
  function compare(value,goal){
    if(value==null||goal==null||goal<=0)return null;
    const deviation=Math.abs(value-goal)/goal*100;
    return {goal,deviation,tier:deviation<=1+1e-10?'green':deviation<=3+1e-10?'orange':'red'};
  }
  function grouped(metas,rows,phase){
    if(!mapping[phase]&&phase!=='consumo_total')return null;
    const valid=rows.filter(row=>row[phase]!==null&&row.qtde_aves>0);
    if(!valid.length)return null;
    let birds=0,actual=0,expected=0;
    for(const row of valid){const goal=find(metas,phase,row.data);if(goal===null)return null;birds+=row.qtde_aves;actual+=row[phase];expected+=goal*row.qtde_aves;}
    return compare(actual/birds,expected/birds);
  }
  function detail(metas,row,column){
    const phase=['consumo_total','consumo_ave'].includes(column)?'consumo_total':Object.keys(mapping).find(key=>column===key||column===key+'_cons_ave');
    if(!phase)return null;
    const value=column===phase?(row.qtde_aves>0&&row[phase]!==null?row[phase]/row.qtde_aves:null):row[column];
    return compare(value,find(metas,phase,row.data));
  }
  async function load(endpoint,{signal}={}){
    const rows=[];let total,pages,size;
    for(let page=1;page<=(pages??1);page++){
      const response=await apiGet(endpoint,{pagina:page,tamanho:500},{signal});
      if(response?.esquema!=='fabrica_racao'||response?.tabela!=='metas'||!Array.isArray(response.dados)
        ||!Number.isSafeInteger(response.total)||response.total<0||response.total>10000
        ||!Number.isSafeInteger(response.tamanho)||response.tamanho<1||response.tamanho>500
        ||response.pagina!==page||response.total_paginas!==Math.ceil(response.total/response.tamanho))throw Error('Resposta de metas incompleta ou incompatível.');
      if(page===1){total=response.total;pages=response.total_paginas;size=response.tamanho;}
      if(total!==response.total||pages!==response.total_paginas||size!==response.tamanho||response.dados.length!==Math.min(size,total-(page-1)*size))throw Error('As metas mudaram durante a consulta. Atualize a tela.');
      rows.push(...response.dados);
    }
    return normalize(rows);
  }
  return Object.freeze({mapping,normalize,find,compare,grouped,detail,load});
})();
