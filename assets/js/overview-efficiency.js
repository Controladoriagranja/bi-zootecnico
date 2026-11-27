/* Visão Geral: mesmos componentes/revisão da Eficiência de Abate do BI-PCP.
 * Soma aves/capacidade válidas; não substitui eficiência por produtividade.
 * Meta da Visão Geral confirmada: 98%. Sem alterações na API ou no BI-PCP.
 */
window.OverviewEfficiency=(()=>{
  'use strict';
  const endpoint='/api/pcp/comparativo/eficiencia-abate',target=98;
  const units={pcp_10:'10',pcp_111:'111'};
  function periodKey(day,view){
    if(view==='dia')return day;
    if(view==='semana'){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
    return day.slice(0,7)+'-01';
  }
  function grade(value){
    if(value===null)return {valor:null,desvio:null,cor:'sem-dados',situacao:'Sem dados',direcao:'maior'};
    const delta=(value-target)/target*100,adverse=-delta,epsilon=1e-10;
    const [cor,situacao]=adverse<=epsilon?['verde','Meta atingida']:adverse<=1+epsilon?['amarelo','Até 1% abaixo']:adverse<3-epsilon?['laranja','De 1% a menos de 3% abaixo']:['vermelho','3% ou mais abaixo'];
    return {valor:value,desvio:delta,cor,situacao,direcao:'maior'};
  }
  function metric(rows,error){
    const valid=rows.filter(row=>Number.isFinite(row.capacidade_nominal_aves)&&row.capacidade_nominal_aves>0&&Number.isFinite(row.aves_abatidas_liquidas)&&row.aves_abatidas_liquidas>=0);
    const sum=key=>valid.reduce((total,row)=>total+row[key],0),capacity=sum('capacidade_nominal_aves');
    return {id:'eficiencia',nome:'Eficiência de abate',meta:target,unidade:'%',decimais:2,
      formula:'SUM(aves_abatidas_liquidas) / SUM(capacidade_nominal_aves) × 100 · mesma base/revisão do BI-PCP · meta 98%.',
      ...grade(!error&&capacity>0?sum('aves_abatidas_liquidas')/capacity*100:null),
      ...(error?{situacao:'Eficiência indisponível',erro:error}:{}),dias_validos:valid.length};
  }
  function combine(payload,answer,view,error){
    const grouped=new Map(),seen=new Set();
    if(!error){
      if(answer?.ok!==true||answer.contrato!=='eficiencia-abate-v1'||answer.revisao_formulas!=='eficiencia-capacidade-v3'||!Array.isArray(answer.dias))throw Error('A API não retornou a revisão de eficiência usada pelo BI-PCP.');
      for(const row of answer.dias){
        const unit=String(row.unidade);if(!Object.values(units).includes(unit))continue;
        if(!/^\d{4}-\d{2}-\d{2}$/.test(row.data)||Number.isNaN(Date.parse(row.data+'T12:00:00Z'))||new Date(row.data+'T12:00:00Z').toISOString().slice(0,10)!==row.data)throw Error('Data inválida na eficiência de abate.');
        if(row.data<payload.inicio||row.data>payload.fim)continue;
        const identity=unit+'|'+row.data;if(seen.has(identity))throw Error('Eficiência retornou mais de um registro para o mesmo dia e unidade.');seen.add(identity);
        const key=periodKey(row.data,view)+'|'+unit;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(row);
      }
    }
    return {...payload,eficiencia_erro:error||null,periodos:payload.periodos.map(period=>{
      const sectors=(period.setores||[]).map(sector=>{
        if(!units[sector.id])return sector;
        const replacement=metric(grouped.get(period.chave+'|'+units[sector.id])||[],error),metrics=[];let inserted=false;
        for(const current of sector.indicadores||[]){if(['produtividade','eficiencia'].includes(current.id)){if(!inserted)metrics.push(replacement);inserted=true;}else metrics.push(current);}
        if(!inserted)metrics.push(replacement);
        return {...sector,indicadores:metrics};
      });
      return {...period,setores:sectors.length?sectors:period.setores};
    })};
  }
  async function enrich(payload,view,signal){
    if(!payload.periodos?.some(period=>period.setores?.some(sector=>units[sector.id])))return payload;
    try{
      const answer=await apiGet(endpoint,{inicio:payload.inicio,fim:payload.fim},{signal});
      return combine(payload,answer,view);
    }catch(error){
      if(error?.name==='AbortError'||error.code==='SESSION_CHANGED'||error.status===401)throw error;
      return combine(payload,null,view,error.message||'Não foi possível consultar a eficiência do BI-PCP.');
    }
  }
  return Object.freeze({enrich,combine,metric,grade,periodKey});
})();
