/* Base exclusiva do RxP. Uma leitura paginada; filtros e visualizacoes reutilizam a memoria. */
window.RxpData = (() => {
  const keys=['ano','mes','dia','data','unidade','galpao','produtor','tecnico','tipo_granja','modelo'];
  let cache,pending;
  const n=value=>value==null?0:Number(value);
  const today=()=>{
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  const yesterday=day=>{const date=new Date(day+'T00:00:00Z');date.setUTCDate(date.getUTCDate()-1);return date.toISOString().slice(0,10);};
  function cards(rows){
    const c={programada:0,real:0,diferenca:0,registrosComDiferenca:0};
    for(const row of rows){c.programada+=n(row.programada);c.real+=n(row.real);c.diferenca+=n(row.difQtdeRxP);c.registrosComDiferenca+=Number(row.difQtdeRxP!=null&&n(row.difQtdeRxP)!==0);}
    return {...c,difPercent:c.programada?c.diferenca/c.programada*100:null};
  }
  function matches(row,filters,ignore){
    return keys.every(key=>key===ignore||!filters[key]?.length||[].concat(filters[key]).map(String).includes(String(row[key]??'')));
  }
  async function read(){
    const day=today();
    if(cache&&cache.day===day&&Date.now()-cache.loaded<60000)return cache;
    if(pending)return pending;
    pending=(async()=>{
      let cutoff=yesterday(day);
      const page=p=>apiGet('/api/bi/rxp/detalhes',{data_fim:cutoff,pagina:p,tamanho:500,ordenar:'id',direcao:'asc'});
      let first=await page(1);
      if(/^\d{4}-\d{2}-\d{2}$/.test(first.data_referencia||'')){
        const authoritative=yesterday(first.data_referencia);
        if(authoritative!==cutoff){cutoff=authoritative;first=await page(1);}
      }
      const raw=[],ids=new Set(),total=first.total,pages=Math.max(1,first.total_paginas);
      if(!first.rules_version||!Number.isInteger(total)||total<0||!Number.isInteger(first.total_paginas)||first.total_paginas<0||pages!==Math.max(1,Math.ceil(total/500)))throw Error('Detalhamento RxP incompatível.');
      function append(result){
        if(result.total!==total||result.total_paginas!==first.total_paginas||!Array.isArray(result.dados))throw Error('Os dados mudaram durante a leitura. Tente novamente.');
        for(const row of result.dados){
          const id=JSON.stringify([row.fonte,row.id]);
          if(ids.has(id))throw Error('Registros repetidos entre páginas. Tente novamente.');
          ids.add(id);
          for(const key of ['programada','real','difQtdeRxP'])if(row[key]!=null&&!Number.isFinite(Number(row[key])))throw Error('Quantidade inválida no detalhamento RxP.');
          raw.push(row);
        }
      }
      append(first);
      // Duas paginas por vez: limita concorrencia e evita uma consulta por filtro/grafico.
      for(let p=2;p<=pages;p+=2){const batch=await Promise.all([page(p),...(p<pages?[page(p+1)]:[])]);batch.forEach(append);}
      const totals=cards(raw);
      if(raw.length!==total||!first.cards||['programada','real','diferenca'].some(key=>Math.abs(totals[key]-n(first.cards[key]))>1e-8*Math.max(1,Math.abs(totals[key]))))throw Error('A leitura completa não conferiu com os totais da API. Tente novamente.');
      const rows=raw.filter(row=>RxpWeekFilter.week(String(row.data??'').slice(0,10))&&String(row.data).slice(0,10)<=cutoff&&row.real!=null&&n(row.real)>0).map(row=>{
        const data=String(row.data).slice(0,10);
        return {...row,data,ano:data.slice(0,4),mes:String(Number(data.slice(5,7))),dia:String(Number(data.slice(8,10))),difPercent:n(row.programada)&&row.difQtdeRxP!=null?n(row.difQtdeRxP)/n(row.programada)*100:null};
      });
      const {dados,cards:ignoredCards,groups,total:ignoredTotal,total_paginas,pagina,...metadata}=first;
      cache={day,loaded:Date.now(),rows,meta:{...metadata,realizados_ate:cutoff}};
      return cache;
    })();
    try{return await pending;}finally{pending=null;}
  }
  function buckets(rows){
    return Object.fromEntries(['ave_nova','real_alimentos','total'].map(key=>[key,cards(key==='total'?rows:rows.filter(row=>row.unidade===(key==='ave_nova'?'AVE NOVA':'REAL ALIMENTOS')))]));
  }
  async function query(endpoint,params={},options={}){
    const base=await read();
    if(options.signal?.aborted)throw new DOMException('Consulta cancelada','AbortError');
    if(endpoint.endsWith('/filtros'))return Object.fromEntries(keys.map(key=>[key,[...new Set(base.rows.filter(row=>matches(row,params,key)).map(row=>String(row[key]??'')).filter(Boolean))].sort((a,b)=>key==='ano'||key==='data'?b.localeCompare(a):a.localeCompare(b,'pt-BR',{numeric:true}))]));
    const rows=base.rows.filter(row=>matches(row,params)),meta={...base.meta,cards:cards(rows),groups:[],carga_completa:true};
    if(endpoint.endsWith('/detalhes')){
      const size=Number(params.tamanho||50),page=Number(params.pagina||1);
      return {...meta,dados:rows.slice((page-1)*size,page*size),total:rows.length,total_paginas:Math.ceil(rows.length/size),pagina:page};
    }
    meta.groups=[...new Set(rows.map(row=>row.unidade))].map(unidade=>({unidade,cards:cards(rows.filter(row=>row.unidade===unidade))}));
    if(params.etapa==='mensal')meta.monthly={rows:[...new Set(rows.map(row=>row.data.slice(0,7)))].sort().map(periodo=>({periodo,...buckets(rows.filter(row=>row.data.startsWith(periodo)))})),totals:buckets(rows)};
    return meta;
  }
  function connect({fields,errorId,clearId,render,clear}){
    let id=0;
    const filters=new FilterController({fields:fields.map(([id,apiKey])=>({id,apiKey,multi:true,search:true})),includeDependentRefresh:false,optionsProvider:params=>query('/filtros',params),onChange:()=>refresh()});
    filters.register();
    async function refresh(){
      const request=++id;clear();window.exibirAtualizacaoDados(ApiScreen.element('ultimaAtualizacao'),null);ApiScreen.element(errorId).classList.add('hidden');
      try{
        await filters.loadOptions({preserve:true});if(request!==id)return;
        const params=filters.values(),result=await query('/resumo',params);if(request!==id)return;
        window.exibirAtualizacaoDados(ApiScreen.element('ultimaAtualizacao'),result);render(result,params);
      }catch(error){if(request===id){clear();window.exibirAtualizacaoDados(ApiScreen.element('ultimaAtualizacao'),null);ApiScreen.message(errorId,error.message,true);}}
    }
    ApiScreen.element(clearId)?.addEventListener('click',()=>{cache=null;filters.clear();refresh();});
    // Inicializa depois que o adaptador de semanas estiver ligado.
    queueMicrotask(refresh);
    return {filters,refresh};
  }
  return {query,connect};
})();
