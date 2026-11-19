"use strict";
// O percentual diario e mensal vem do Cirurgico Geral oficial. Os pesos da
// mesma fonte servem apenas para consolidar unidades e periodos sem media simples.
window.ZooCondenacoesOficial = (() => {
  const weightDescription='Peso Vivo(-D+A)';
  const date=value=>/^\d{4}-\d{2}-\d{2}/.exec(String(value||''))?.[0]||null;
  const number=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;
  const company=value=>({'AVE NOVA':'10','AVENOVA':'10','AVE':'10','REAL ALIMENTOS':'111','REAL':'111','RA':'111','10':'10','111':'111'}[String(value||'').trim().toUpperCase()]);
  async function weights(get,table,inicio,fim) {
    const rows=[]; let total=null;
    for(let page=1;;page++) {
      const r=await get('/api/pcp/dados/'+table,{inicio,fim,descricao:weightDescription,pagina:page,tamanho:1000},{silent:true});
      if(!r.ok||r.tabela!==table||!Array.isArray(r.dados)||r.pagina!==page||!Number.isSafeInteger(r.total)||r.total<0||!Number.isSafeInteger(r.tamanho)||r.tamanho<1)throw Error('Pesos oficiais indisponíveis.');
      if(total===null)total=r.total;
      if(r.total!==total||r.dados.length>r.tamanho)throw Error('A base oficial mudou durante a consulta.');
      rows.push(...r.dados);
      if(rows.length>total||(rows.length<total&&r.dados.length!==r.tamanho))throw Error('Consulta de pesos oficiais incompleta.');
      if(rows.length===total)return rows;
    }
  }
  function consolidate(report,daily,shifts,year,months) {
    const indicator=report.indicadores?.find(r=>r.ordem===11);
    if(!report.ok||!indicator||!Array.isArray(report.dias)||!Array.isArray(report.mensal))throw Error('Indicador oficial de condenação indisponível.');
    const index=indicator.ordem-1,allowed=new Set(months.map(Number)),cells=new Map();
    for(const [rows,turns] of [[daily,false],[shifts,true]])for(const row of rows) {
      const d=date(row.data)||date(row.data_referencia),unit=company(row.empresa)||company(row.unidade_codigo),turn=String(row.turno_codigo||'');
      if(!d||Number(d.slice(0,4))!==Number(year)||!allowed.has(Number(d.slice(5,7)))||d>date(report.data_limite)||row.descricao!==weightDescription)continue;
      const column=turns&&unit==='10'&&['1','2'].includes(turn)?turn:!turns&&unit==='111'?'111':null;
      if(!column)continue;
      const key=d+'|'+column;
      if(!cells.has(key))cells.set(key,new Map());
      const sections=cells.get(key),value=number(row.quantidade);
      if(value!==null)sections.set(row.secao,(sections.get(row.secao)||0)+value);
    }
    const bases=new Map();
    for(const block of report.dias) {
      const d=date(block.data);
      if(!d||Number(d.slice(0,4))!==Number(year)||!allowed.has(Number(d.slice(5,7)))||d>date(report.data_limite))continue;
      for(const column of ['1','2','111']) {
        const ratio=number(block.valores?.[column]?.[index]);
        if(ratio===null)continue;
        const sections=cells.get(d+'|'+column);
        if(!sections)throw Error('Peso vivo ausente para um valor oficial.');
        const live=column==='111'?(sections.has('Compra de Aves Vivas')&&sections.has('Abate - Total')?sections.get('Abate - Total'):sections.get('Recepção de Aves Vivas')):(sections.get('Recepção de Aves Vivas')||0)+(sections.get('Compra de Aves Vivas')||0);
        if(!(live>0))throw Error('Peso vivo inválido para um valor oficial.');
        const month=d.slice(0,7),unit=column==='111'?'111':'10',key=month+'|'+unit;
        const base=bases.get(key)||{kg:0,peso_vivo_kg:0};
        base.kg+=ratio*live; base.peso_vivo_kg+=live; bases.set(key,base);
      }
    }
    // Confere a consolidacao contra os valores mensais efetivamente exibidos no PCP.
    for(const block of report.mensal)for(const unit of ['10','111']) {
      if(Number(block.mes?.slice(0,4))!==Number(year)||!allowed.has(Number(block.mes?.slice(5,7))))continue;
      const official=number(block.valores?.[unit]?.[index]),base=bases.get(block.mes+'|'+unit);
      if(official===null&&base)throw Error('A base de pesos diverge do mês oficial.');
      if(official!==null&&(!base||Math.abs(base.kg/base.peso_vivo_kg-official)>1e-9))throw Error('A base de pesos diverge do mês oficial.');
    }
    let kg=0,live=0;
    const totais_mensais={};
    for(const month of months) {
      const key=year+'-'+String(month).padStart(2,'0'),entries=['10','111'].map(unit=>bases.get(key+'|'+unit)).filter(Boolean);
      const n=entries.reduce((s,r)=>s+r.kg,0),d=entries.reduce((s,r)=>s+r.peso_vivo_kg,0);
      totais_mensais[key]={kg:n,peso_vivo_kg:d,percentual:d>0?n/d:null};kg+=n;live+=d;
    }
    return {ok:true,percentual:live>0?kg/live:null,peso_condenado_kg:kg,peso_vivo_kg:live,totais_mensais,fonte:'cirurgico-geral',data_limite:report.data_limite};
  }
  async function load(get,year,months) {
    const report=await get('/api/pcp/comparativo/cirurgico-geral',{ano:year,mes:months.join(',')},{silent:true});
    if(!report.ok||!date(report.data_limite))throw Error('Consulta oficial incompleta.');
    if(!Array.isArray(report.dias)||!report.dias.length)return consolidate(report,[],[],year,months);
    const inicio=year+'-'+String(Math.min(...months)).padStart(2,'0')+'-01';
    const last=new Date(Date.UTC(Number(year),Math.max(...months),0)).toISOString().slice(0,10),fim=last<date(report.data_limite)?last:date(report.data_limite);
    const [daily,shifts]=await Promise.all([weights(get,'diario_industria',inicio,fim),weights(get,'diario_industria_turnos',inicio,fim)]);
    return consolidate(report,daily,shifts,year,months);
  }
  return {load,consolidate};
})();
