/* Fonte/adaptador e regras EXCLUSIVAS do consumo de racao; sem alterar outros BIs.
 * Origem: fabrica_racao.consumo_medio_racao. Nomes das colunas preservados.
 * O adaptador reúne e confere TODAS as páginas antes de expor os dados à tela.
 * Metas, unidade e Cons/Dia dependem de confirmacao: nao inferir do Standard.
 */
window.ConsumoRacaoData = (() => {
  'use strict';
  const phases = Object.freeze([
    {key:'fase_pre_menos_inicial',label:'Pré-Inicial'},
    {key:'fase_inicial',label:'Inicial'},
    {key:'fase_crescimento',label:'Crescimento'},
    {key:'fase_final',label:'Final'}
  ]);
  const dimensions = ['fazenda','galpao','lote','nutricao','linhagens','sexo'];
  const number = value => {
    if(value===null||value===undefined||value==='')return null;
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value==='string'&&/^[+-]?\d+(?:\.\d+)?$/.test(value.trim()))return Number.isFinite(Number(value))?Number(value):null;
    return null;
  };
  function day(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
    const date=new Date(value+'T00:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?value:null;
  }
  const text=value=>value==null?'':String(value).trim();
  const key=(row,field)=>field==='fazenda'?row.codigo:row[field];
  const complete=row=>phases.every(phase=>row[phase.key]!==null);
  const total=row=>complete(row)?phases.reduce((sum,phase)=>sum+row[phase.key],0):null;
  function normalize(payload,config=ConsumoRacaoConfig){
    if(payload?.contract_version!==config.contractVersion||payload.arquivo!=='fabrica_racao.consumo_medio_racao'
      ||payload.completo!==true||!Array.isArray(payload.dados)||payload.dados.length>config.maxRecords)
      throw Error('Resposta incompatível ou incompleta. Confira o contrato do relatório.');
    const period=payload.periodo_disponivel;
    const emptyPeriod=payload.dados.length===0&&period?.inicio===''&&period?.fim==='';
    if(!emptyPeriod&&(!day(period?.inicio)||!day(period?.fim)||period.inicio>period.fim))throw Error('Período disponível inválido.');
    const ids=new Set();let excluded=0;
    const rows=[];
    for(const input of payload.dados){
      if(['total','subtotal'].includes(input?.tipo_linha)){excluded++;continue;}
      if(input?.tipo_linha!=='detalhe'||!text(input.registro_id)||!text(input.codigo)||!day(input.data))
        throw Error('Registro sem identificação, data ou classificação de detalhe válida.');
      const id=text(input.registro_id);
      if(ids.has(id))throw Error('A consulta trouxe registros repetidos. Confira as cargas da origem.');
      ids.add(id);
      if(input.data<period.inicio||input.data>period.fim)throw Error('Registro fora do período disponível.');
      if(text(input.empresa_codigo).replace(/^0+(?=\d)/,'')!=='1'
        ||text(input.unidade_codigo).replace(/^0+(?=\d)/,'')!=='53')throw Error('Empresa ou unidade diferente da fonte deste relatório.');
      const row={...input,registro_id:id,data:input.data};
      for(const field of ['codigo','integrado','galpao','lote','sexo','nutricao','linhagens','standard'])row[field]=text(input[field]);
      row.fazenda=`${row.codigo} - ${row.integrado||'Não informado'}`;
      for(const field of ['qtde_aves','idade',...phases.flatMap(phase=>[phase.key,phase.key+'_cons_ave',phase.key+'_cons_dia'])]){
        row[field]=number(input[field]);
        if(input[field]!=null&&input[field]!==''&&row[field]===null)throw Error('Valor numérico inválido na origem: '+field+'.');
      }
      row.consumo_total=total(row);
      row.consumo_ave=row.consumo_total!==null&&row.qtde_aves>0?row.consumo_total/row.qtde_aves:null;
      rows.push(row);
    }
    if(payload.total_registros!==rows.length)throw Error('A quantidade de registros não confere com o snapshot completo.');
    return Object.freeze({rows,period,updated:payload.atualizado_em??null,
      unit:text(payload.unidade_consumo)||null,excluded,demonstration:payload.demonstracao===true});
  }
  function matches(row,filters={},ignore){
    if(filters.inicio&&row.data<filters.inicio)return false;
    if(filters.fim&&row.data>filters.fim)return false;
    return dimensions.every(field=>field===ignore||!filters[field]?.length||filters[field].map(String).includes(String(key(row,field))));
  }
  function options(rows,filters){
    return Object.fromEntries(dimensions.map(field=>{
      const found=new Map();
      for(const row of rows){
        if(!matches(row,filters,field))continue;
        const value=key(row,field);if(!value)continue;
        const label=field==='fazenda'?`${row.codigo} - ${row.integrado||'Não informado'}`:value;
        if(!found.has(value)||label.localeCompare(found.get(value),'pt-BR')<0)found.set(value,label);
      }
      return [field,[...found].map(([value,label])=>({value,label})).sort((a,b)=>a.label.localeCompare(b.label,'pt-BR',{numeric:true}))];
    }));
  }
  function sumPresent(rows,field){const valid=rows.filter(row=>row[field]!==null);return valid.length?valid.reduce((sum,row)=>sum+row[field],0):null;}
  function ratio(rows,field){
    const valid=rows.filter(row=>row[field]!==null&&row.qtde_aves!==null&&row.qtde_aves>0);
    const numerator=valid.reduce((sum,row)=>sum+row[field],0),denominator=valid.reduce((sum,row)=>sum+row.qtde_aves,0);
    return {value:denominator>0?numerator/denominator:null,numerator,denominator,records:valid.length};
  }
  function aggregate(rows){
    const full=rows.filter(complete),counted=rows.filter(row=>row.qtde_aves!==null);
    return {records:rows.length,birds:sumPresent(rows,'qtde_aves'),birdsRecords:counted.length,
      total:sumPresent(full,'consumo_total'),totalRecords:full.length,perBird:ratio(rows,'consumo_total'),
      phases:phases.map(phase=>({...phase,total:sumPresent(rows,phase.key),
        records:rows.filter(row=>row[phase.key]!==null).length,perBird:ratio(rows,phase.key)}))};
  }
  function group(rows,field){
    const groups=new Map();
    for(const row of rows){const name=text(row[field])||'Não informado';if(!groups.has(name))groups.set(name,[]);groups.get(name).push(row);}
    return [...groups].map(([name,items])=>({name,...aggregate(items)})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR',{numeric:true}));
  }
  function periodKey(date,grouping){
    if(grouping==='mes')return date.slice(0,7)+'-01';
    if(grouping==='semana'){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);}
    return date;
  }
  function evolution(rows,grouping){
    return group(rows.map(row=>({...row,period:periodKey(row.data,grouping)})),'period').sort((a,b)=>a.name.localeCompare(b.name));
  }
  function ordered(rows,field,direction){
    return rows.slice().sort((a,b)=>{
      const x=a[field],y=b[field],emptyX=x==null||x==='',emptyY=y==null||y==='';
      if(emptyX||emptyY)return emptyX===emptyY?a.registro_id.localeCompare(b.registro_id):emptyX?1:-1;
      const cmp=typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'pt-BR',{numeric:true});
      return cmp*(direction==='desc'?-1:1)||a.registro_id.localeCompare(b.registro_id);
    });
  }
  function create(config=ConsumoRacaoConfig,locationInfo=window.location){
    const demonstration=['localhost','127.0.0.1','[::1]'].includes(locationInfo.hostname)
      &&new URLSearchParams(locationInfo.search).get('demo')==='1';
    let session=null;
    return {
      demonstration,
      async load({signal}={}){
        if(demonstration){
          if(!window.ConsumoRacaoDemo)await new Promise((resolve,reject)=>{
            const script=document.createElement('script');script.src='assets/js/consumo-racao-demo.js';
            script.onload=resolve;script.onerror=()=>reject(Error('Não foi possível carregar a demonstração local.'));document.head.append(script);
          });
          return normalize(window.ConsumoRacaoDemo,config);
        }
        if(config.mode!=='api'||!config.snapshotEndpoint){const error=Error('Aguardando a liberação dos dados deste relatório.');error.code='INTEGRATION_PENDING';throw error;}
        if(typeof config.snapshotEndpoint!=='string'||!config.snapshotEndpoint.startsWith('/api/')||/[?#]/.test(config.snapshotEndpoint))throw Error('Ponto de integração inválido.');
        session=getPortalToken();
        const payload=config.transport==='portal-paginated'
          ?await portalSnapshot(config,signal,()=>this.assertSession())
          :await apiGet(config.snapshotEndpoint,config.requestParams,{signal});
        if(payload?.demonstracao)throw Error('A fonte real retornou uma demonstração. Consulta interrompida.');
        const snapshot=normalize(payload,config);this.assertSession();return snapshot;
      },
      assertSession(){if(!demonstration&&session!==null&&session!==getPortalToken()){const error=Error('A sessão foi alterada. Abra o relatório novamente pela Central.');error.code='SESSION_CHANGED';throw error;}}
    };
  }
  async function portalSnapshot(config,signal,assertSession){
    const rows=[],ids=new Set();let count,pages,pageSize;
    for(let page=1;page<=(pages??1);page++){
      if(signal?.aborted)throw new DOMException('Consulta cancelada','AbortError');
      assertSession();
      const response=await apiGet(config.snapshotEndpoint,{...config.requestParams,pagina:page,tamanho:config.pageSize??500},{signal});
      assertSession();
      if(response?.demonstracao||response?.esquema!=='fabrica_racao'||response?.tabela!=='consumo_medio_racao'
        ||!Array.isArray(response.dados)||!Array.isArray(response.colunas)
        ||!Number.isSafeInteger(response.total)||response.total<0||response.total>config.maxRecords
        ||!Number.isSafeInteger(response.tamanho)||response.tamanho<1||response.tamanho>500
        ||response.pagina!==page||!Number.isSafeInteger(response.total_paginas))
        throw Error('Resposta incompatível ou incompleta do Portal de Dados.');
      const expectedPages=Math.ceil(response.total/response.tamanho);
      if(response.total_paginas!==expectedPages)throw Error('Paginação inconsistente no Portal de Dados.');
      if(page===1){count=response.total;pages=expectedPages;pageSize=response.tamanho;}
      if(response.total!==count||response.total_paginas!==pages||response.tamanho!==pageSize)
        throw Error('Os dados mudaram durante a consulta. Atualize o relatório para tentar novamente.');
      const expectedLength=Math.min(pageSize,count-(page-1)*pageSize);
      if(response.dados.length!==expectedLength)throw Error('Uma página chegou incompleta. Nenhum total parcial foi exibido.');
      const required=['data','codigo','integrado','galpao','lote','qtde_aves','chave_hash','empresa_codigo','unidade_codigo','importado_em',...phases.map(phase=>phase.key)];
      if(required.some(field=>!response.colunas.includes(field)))throw Error('A consulta não trouxe todas as colunas necessárias.');
      for(const input of response.dados){
        const id=text(input?.chave_hash);
        if(!id||ids.has(id))throw Error('Registro sem chave ou repetido entre páginas/cargas. Confira a origem antes de calcular.');
        ids.add(id);
        rows.push({...input,registro_id:id,tipo_linha:input.tipo_linha??'detalhe'});
      }
    }
    if(rows.length!==count)throw Error('A consulta não trouxe todos os registros.');
    const dates=rows.map(row=>day(row.data));
    if(dates.some(date=>date===null))throw Error('Data do acerto inválida na origem.');
    dates.sort();
    // A API já fornece importado_em com offset. Nunca usar agora/data da view.
    const imports=rows.map(row=>row.importado_em).filter(value=>value!=null&&value!=='');
    if(imports.some(value=>typeof value!=='string'||!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value))))
      throw Error('Data de importação inválida ou sem fuso na origem.');
    const updated=imports.reduce((latest,value)=>!latest||Date.parse(value)>Date.parse(latest)?value:latest,null);
    const detailCount=rows.filter(row=>!['total','subtotal'].includes(row.tipo_linha)).length;
    return {contract_version:config.contractVersion,arquivo:'fabrica_racao.consumo_medio_racao',completo:true,
      total_registros:detailCount,dados:rows,periodo_disponivel:{inicio:dates[0]??'',fim:dates.at(-1)??''},
      atualizado_em:updated,unidade_consumo:null};
  }
  return Object.freeze({phases,dimensions,number,day,normalize,matches,options,aggregate,group,evolution,ordered,create});
})();
