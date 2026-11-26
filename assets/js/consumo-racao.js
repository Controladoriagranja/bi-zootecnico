/* Apresentacao desta pagina. Autenticacao e HTTP reutilizam api.js. */
(() => {
  'use strict';
  const D=ConsumoRacaoData,E=id=>document.getElementById(id),adapter=D.create();
  let snapshot=null,selected=[],summary=null,request=null,loadId=0,page=1,pageSize=25,sort='data',direction='desc',metric='perBird',grouping='dia';
  let metas=[];
  let lineageSort=0,lineageDirection='asc';
  const lineageHeaders=[...E('feedLineageTable').querySelectorAll('thead th')];
  function lineageHeadings(){
    lineageHeaders.forEach((th,index)=>{
      th.setAttribute('aria-sort',index===lineageSort?(lineageDirection==='asc'?'ascending':'descending'):'none');
      th.querySelector('[data-sort-icon]').textContent=index===lineageSort?(lineageDirection==='asc'?'↑':'↓'):'↕';
    });
  }
  lineageHeaders.forEach((th,index)=>{
    const label=th.textContent,button=document.createElement('button'),icon=document.createElement('span');
    button.type='button';button.title='Ordenar por '+label;button.append(document.createTextNode(label+' '));
    icon.dataset.sortIcon='';icon.setAttribute('aria-hidden','true');button.append(icon);
    button.onclick=()=>{if(!snapshot)return;lineageDirection=lineageSort===index&&lineageDirection==='asc'?'desc':'asc';lineageSort=index;renderLineages();};
    th.replaceChildren(button);
  });
  lineageHeadings();
  const fields=[['fazenda','Fazenda / Integrado'],['galpao','Galpão'],['lote','Lote'],['linhagens','Linhagem']]
    .map(([apiKey,label])=>({id:'feed_'+apiKey,apiKey,label,multi:true,search:true}));
  for(const field of fields){const host=document.createElement('div');host.className='filter-field';
    const label=document.createElement('span');label.textContent=field.label;const control=document.createElement('div');control.className='checkbox-multiselect';control.id=field.id;host.append(label,control);E('feedFilters').append(host);}
  class FeedFilters extends FilterController {
    normalizeOptions(field,items){return (items||[]).map(item=>({value:String(item.value),label:String(item.label)}));}
  }
  const filters=new FeedFilters({fields,contextProvider:()=>({inicio:E('feedStart').value,fim:E('feedEnd').value}),
    optionsProvider:async current=>snapshot?D.options(snapshot.rows,current):{},onChange:()=>render()});
  const num=(value,digits=3)=>value==null?'—':value.toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  const date=value=>value?value.split('-').reverse().join('/'):'—';
  const unit=()=>snapshot?.unit||ConsumoRacaoConfig.consumptionUnit||'unidade de origem';
  const columns=[
    {key:'data',label:'Data do acerto',kind:'date'},
    {key:'fazenda',label:'Fazenda / Integrado'},
    {key:'galpao',label:'Galpão'},{key:'lote',label:'Lote'},
    {key:'qtde_aves',label:'Aves',kind:'number',digits:0},{key:'idade',label:'Idade',kind:'number',digits:0},
    {key:'linhagens',label:'Linhagem'},{key:'standard',label:'Standard'},
    {key:'consumo_total',label:'Consumo total (kg)',kind:'number'},{key:'consumo_ave',label:'Consumo / ave (kg/ave)',kind:'number'},
    ...D.phases.flatMap(phase=>[
      {key:phase.key,label:'Consumo (kg)',group:phase.label,kind:'number'},
      {key:phase.key+'_cons_ave',label:'Cons/Ave (kg/ave) · original',group:phase.label,kind:'number'},
      {key:phase.key+'_cons_dia',label:'Cons/Dia · original',group:phase.label,kind:'number',title:'Significado em confirmação. Valor não utilizado nos indicadores.'}
    ])
  ];
  function cell(value,numeric=false){const td=document.createElement('td');td.textContent=value;if(numeric)td.className='feed-numeric';return td;}
  function targetCell(td,result){
    if(!result)return td;
    td.classList.add('feed-target-'+result.tier);
    td.title=`Meta: ${num(result.goal)} kg/ave · desvio absoluto: ${num(result.deviation)}%.`;
    td.setAttribute('aria-label',`${td.textContent}. ${td.title}`);return td;
  }
  function messageRow(target,message,colspan){const tr=document.createElement('tr'),td=cell(message);td.colSpan=colspan;tr.append(td);target.replaceChildren(tr);}
  function state(kind,title,text){const host=E('feedState');host.hidden=false;host.dataset.state=kind;host.setAttribute('role',kind==='error'?'alert':'status');E('feedStateTitle').textContent=title;E('feedStateText').textContent=text;E('feedReload').hidden=kind!=='error';}
  function enabled(value){
    for(const field of fields){const button=filters.getState(field).button;if(button)button.disabled=!value;}
    for(const id of ['feedStart','feedEnd','limparFeedFiltros','feedPageSize'])E(id).disabled=!value;
  }
  function clearDisplay(message){
    selected=[];summary=null;
    for(const id of ['feedTotal','feedBirds','feedPerBird','feedRecords','feedUpdated','feedPage','feedPageCount'])E(id).textContent='—';
    E('feedCoverage').textContent='';E('feedLineageTotal').replaceChildren();
    messageRow(E('feedLineages'),message,8);messageRow(E('feedDetailRows'),message,columns.length);
    E('feedPrev').disabled=true;E('feedNext').disabled=true;
    for(const id of ['feedPhasesEmpty','feedEvolutionEmpty']){E(id).hidden=false;E(id).textContent=message;}
    phaseChart?.clear();evolutionChart?.clear();
  }
  function headings(){
    E('feedDetailHead').replaceChildren(...columns.map(column=>{
      const th=document.createElement('th');th.scope='col';th.setAttribute('aria-sort',sort===column.key?(direction==='asc'?'ascending':'descending'):'none');
      const button=document.createElement('button');button.type='button';button.title=column.title||'Ordenar por '+column.label;
      const text=document.createElement('span');if(column.group){const group=document.createElement('small');group.textContent=column.group;text.append(group);}const label=document.createElement('span');label.textContent=column.label;text.append(label);
      const icon=document.createElement('span');icon.ariaHidden='true';icon.textContent=sort===column.key?(direction==='asc'?'↑':'↓'):'↕';button.append(text,icon);
      button.onclick=()=>{if(!snapshot)return;direction=sort===column.key&&direction==='asc'?'desc':'asc';sort=column.key;page=1;renderDetails();};th.append(button);return th;
    }));
  }
  function renderDetails(){
    try{adapter.assertSession();}catch(error){fail(error);return;}
    headings();const rows=D.ordered(selected,sort,direction),pages=Math.ceil(rows.length/pageSize);page=Math.max(1,Math.min(page,pages||1));
    const shown=rows.slice((page-1)*pageSize,page*pageSize);
    E('feedDetailRows').replaceChildren(...shown.map(row=>{const tr=document.createElement('tr');tr.dataset.recordId=row.registro_id;
      for(const column of columns){let value=row[column.key];if(column.key==='fazenda')value=`${row.codigo} - ${row.integrado||'Não informado'}`;
        tr.append(targetCell(cell(column.kind==='date'?date(value):column.kind==='number'?num(value,column.digits??3):value||'—',column.kind==='number'),ConsumoRacaoMetas.detail(metas,row,column.key)));}return tr;}));
    if(!shown.length)messageRow(E('feedDetailRows'),'Nenhum registro para os filtros selecionados.',columns.length);
    E('feedPage').textContent=pages?`${page} / ${pages}`:'0 / 0';
    E('feedPageCount').textContent=rows.length?`${num((page-1)*pageSize+1,0)}–${num(Math.min(page*pageSize,rows.length),0)} de ${num(rows.length,0)} registros`:'0 registros';
    E('feedPrev').disabled=page<=1||!pages;E('feedNext').disabled=page>=pages||!pages;
  }
  function renderLineages(){
    const makeRow=(name,item,rows)=>{const tr=document.createElement('tr');tr.append(cell(name));
      for(const phase of item.phases){const td=cell(num(phase.perBird.value),true);td.title=`${num(phase.perBird.denominator,0)} aves em ${phase.perBird.records} registros válidos`;tr.append(targetCell(td,ConsumoRacaoMetas.grouped(metas,rows,phase.key)));}
      const ratio=cell(num(item.perBird.value),true);ratio.title=`${num(item.perBird.denominator,0)} aves em ${item.perBird.records} registros válidos`;
      tr.append(targetCell(ratio,ConsumoRacaoMetas.grouped(metas,rows,'consumo_total')),cell(num(item.birds,0),true),cell(num(item.records,0),true));return tr;};
    const value=item=>lineageSort===0?item.name:lineageSort<=4?item.phases[lineageSort-1].perBird.value:lineageSort===5?item.perBird.value:lineageSort===6?item.birds:item.records;
    const groups=D.group(selected,'linhagens').sort((a,b)=>{
      const x=value(a),y=value(b);
      if(x==null||y==null)return x==null?(y==null?a.name.localeCompare(b.name,'pt-BR'):1):-1;
      const comparison=typeof x==='number'?x-y:x.localeCompare(y,'pt-BR',{numeric:true});
      return comparison*(lineageDirection==='asc'?1:-1)||a.name.localeCompare(b.name,'pt-BR');
    });
    lineageHeadings();
    E('feedLineages').replaceChildren(...groups.map(item=>makeRow(item.name,item,selected.filter(row=>(row.linhagens||'Não informado')===item.name))));
    if(!selected.length)messageRow(E('feedLineages'),'Nenhum registro para os filtros selecionados.',8);
    E('feedLineageTotal').replaceChildren(...(selected.length?[makeRow('Total',summary,selected)]:[]));
  }
  function renderNow(){
    adapter.assertSession();
    const inicio=E('feedStart').value,fim=E('feedEnd').value;
    if(snapshot.rows.length&&(!D.day(inicio)||!D.day(fim)||inicio>fim)){clearDisplay('Selecione um período válido.');state('error','Confira o período','A data inicial deve ser menor ou igual à data final.');return;}
    if(inicio<snapshot.period.inicio||fim>snapshot.period.fim){clearDisplay('Período fora dos dados disponíveis.');state('error','Período indisponível',`Os dados disponíveis vão de ${date(snapshot.period.inicio)} a ${date(snapshot.period.fim)}.`);return;}
    selected=snapshot.rows.filter(row=>D.matches(row,{...filters.values(),inicio,fim}));summary=D.aggregate(selected);page=1;
    E('feedPeriod').textContent=`Período selecionado: ${date(inicio)} a ${date(fim)}`;
    E('feedUpdated').textContent=formatarDataHoraBR(snapshot.updated);E('feedUpdated').title=snapshot.demonstration?'Demonstração sintética, sem coleta real.':'Última importação dos dados autorizados (importado_em).';
    E('feedTotal').textContent=num(summary.total);E('feedBirds').textContent=num(summary.birds,0);E('feedPerBird').textContent=num(summary.perBird.value);E('feedRecords').textContent=num(summary.records,0);
    E('feedTotalNote').textContent=`${unit()} · ${summary.totalRecords} registros com quatro fases`;
    E('feedPerBirdNote').textContent=`${unit()}/ave · base: ${num(summary.perBird.denominator,0)} aves`;
    E('feedCoverage').textContent=selected.length?`Total: ${summary.totalRecords} de ${summary.records} registros com quatro fases informadas. Por ave: ${summary.perBird.records} registros com consumo completo e aves maiores que zero. Cada fase usa seu próprio conjunto de valores válidos.`:'';
    E('feedState').hidden=selected.length>0;
    if(!selected.length)state('empty','Nenhum registro neste recorte','Ajuste o período ou limpe os filtros para consultar outros registros disponíveis.');
    renderLineages();renderDetails();drawCharts();
  }
  function render(){if(!snapshot)return;const finish=ApiActivity.begin();requestAnimationFrame(()=>{try{renderNow();}catch(error){fail(error);}finally{finish();}});}
  function fail(error){
    if(error?.name==='AbortError')return;
    if(error.code==='SESSION_CHANGED'||[401,403].includes(error.status)){
      snapshot=null;for(const field of fields)filters.renderMultiOptions(field,[],[]);
    }
    clearDisplay('Não foi possível consultar os dados.');
    state(error.code==='INTEGRATION_PENDING'?'pending':'error',error.code==='INTEGRATION_PENDING'?'Aguardando conexão dos dados':'Não foi possível carregar o relatório',error.message||'Tente novamente.');
    if(error.code==='INTEGRATION_PENDING'||!snapshot)enabled(false);
  }
  async function load(){
    const id=++loadId;request?.abort();request=new AbortController();snapshot=null;metas=[];enabled(false);clearDisplay('Carregando dados…');E('feedDetailTable').setAttribute('aria-busy','true');
    state('loading','Carregando dados…','Os indicadores serão calculados após a consulta completa.');
    try{
      const result=await adapter.load({signal:request.signal});if(id!==loadId)return;snapshot=result;
      E('feedDemo').hidden=!result.demonstration;
      for(const [name,value]of [['feedStart',result.period.inicio],['feedEnd',result.period.fim]]){E(name).min=result.period.inicio;E(name).max=result.period.fim;E(name).value=value;}
      filters.clear();await filters.loadOptions({preserve:false});if(id!==loadId)return;enabled(true);renderNow();
      E('feedTargetsStatus').textContent='Metas: aguardando consulta.';
      if(!result.demonstration&&ConsumoRacaoConfig.targetsEndpoint){
        try{
          const loaded=await ConsumoRacaoMetas.load(ConsumoRacaoConfig.targetsEndpoint,{signal:request.signal});
          if(id!==loadId)return;adapter.assertSession();metas=loaded;renderLineages();renderDetails();
          E('feedTargetsStatus').textContent=loaded.length?'Metas em kg/ave · amarelo: até ±1% · laranja: acima de ±1% até ±3% · vermelho: acima de ±3%. Meta de Crescimento = Crescimento + Crescimento 2; total = soma das fases vigentes.':'Nenhuma meta aplicável cadastrada.';
        }catch(error){
          if(id!==loadId||error?.name==='AbortError')return;
          if(error.code==='SESSION_CHANGED'){fail(error);return;}
          E('feedTargetsStatus').textContent='Metas indisponíveis: '+(error.message||'confira o cadastro e a rota.');
        }
      }else E('feedTargetsStatus').textContent='Sem metas reais nesta demonstração.';
    }catch(error){if(id===loadId)fail(error);}
    finally{if(id===loadId)E('feedDetailTable').setAttribute('aria-busy','false');}
  }
  let phaseChart=null,evolutionChart=null;
  function drawCharts(){
    if(!summary)return;
    E('feedPhaseSubtitle').textContent=`${metric==='total'?'Consumo total':'Consumo por ave'} · ${unit()}`;
    E('feedEvolutionSubtitle').textContent=`Por data do acerto · ${metric==='total'?'consumo total':'consumo por ave'}`;
    const hasPhase=summary.phases.some(phase=>(metric==='total'?phase.total:phase.perBird.value)!==null);
    E('feedPhasesEmpty').hidden=hasPhase;E('feedPhasesEmpty').textContent='Sem consumo válido para os filtros selecionados.';
    const periods=D.evolution(selected,grouping),hasEvolution=periods.some(item=>(metric==='total'?item.total:item.perBird.value)!==null);
    E('feedEvolutionEmpty').hidden=hasEvolution;E('feedEvolutionEmpty').textContent='Sem consumo válido para os filtros selecionados.';
    if(!hasPhase){phaseChart?.clear();}if(!hasEvolution){evolutionChart?.clear();}
    if(!hasPhase&&!hasEvolution)return;
    const style=getComputedStyle(document.body),color=name=>style.getPropertyValue(name).trim(),font=style.fontFamily;
    const colors=D.phases.map((_,i)=>color('--feed-phase-'+i));
    const tooltip={trigger:'axis',confine:true,renderMode:'richText',backgroundColor:color('--card'),borderColor:color('--border'),textStyle:{color:color('--foreground'),fontFamily:font}};
    const axis={axisLine:{lineStyle:{color:color('--border')}},axisTick:{show:false},axisLabel:{color:color('--muted-foreground'),fontFamily:font,fontSize:11},splitLine:{lineStyle:{color:color('--border')}}};
    if(hasPhase){phaseChart??=echarts.init(E('feedPhasesChart'));
      phaseChart.setOption({animationDuration:180,textStyle:{fontFamily:font},grid:{left:90,right:26,top:24,bottom:44},
        tooltip:{...tooltip,formatter:items=>{const phase=summary.phases[items[0].dataIndex];return `${phase.label}\n${metric==='total'?'Consumo':'Consumo/ave'}: ${num(metric==='total'?phase.total:phase.perBird.value)}\nBase por ave: ${num(phase.perBird.denominator,0)} aves\n${phase.perBird.records} registros válidos`; }},
        xAxis:{...axis,type:'category',data:D.phases.map(phase=>phase.label),axisLabel:{...axis.axisLabel,interval:0,fontSize:10}},
        yAxis:{...axis,type:'value',axisLabel:{...axis.axisLabel,formatter:value=>num(value)}},
        series:[{type:'bar',barMaxWidth:55,label:{show:true,position:'top',color:color('--foreground'),formatter:params=>num(params.value)},
          data:summary.phases.map((phase,i)=>({value:metric==='total'?phase.total:phase.perBird.value,itemStyle:{color:colors[i],borderRadius:[5,5,0,0]}}))}]},true);}
    if(hasEvolution){evolutionChart??=echarts.init(E('feedEvolutionChart'));
      const zoom=evolutionChart.getOption()?.dataZoom?.[0];
      evolutionChart.setOption({animationDuration:180,textStyle:{fontFamily:font},grid:{left:90,right:24,top:24,bottom:78},
        tooltip:{...tooltip,formatter:items=>{const item=periods[items[0].dataIndex];return `${date(item.name)}${grouping==='semana'?' · início da semana':''}\nConsumo${metric==='total'?'':'/ave'}: ${num(metric==='total'?item.total:item.perBird.value)}\n${item.records} registros\nBase por ave: ${num(item.perBird.denominator,0)} aves`; }},
        xAxis:{...axis,type:'category',data:periods.map(item=>date(item.name)),boundaryGap:metric==='total',axisLabel:{...axis.axisLabel,hideOverlap:true}},
        yAxis:{...axis,type:'value',axisLabel:{...axis.axisLabel,formatter:value=>num(value)}},
        dataZoom:[{type:'slider',height:16,bottom:14,start:zoom?.start??0,end:zoom?.end??100,borderColor:color('--border'),textStyle:{color:color('--muted-foreground')}}],
        series:[{type:metric==='total'?'bar':'line',name:'Consumo',data:periods.map(item=>metric==='total'?item.total:item.perBird.value),connectNulls:false,
          itemStyle:{color:color('--primary')},lineStyle:{width:2},areaStyle:{opacity:.05},symbolSize:5,barMaxWidth:28}]},true);}
  }
  E('feedPrev').onclick=()=>{if(!E('feedPrev').disabled){page--;renderDetails();}};
  E('feedNext').onclick=()=>{if(!E('feedNext').disabled){page++;renderDetails();}};
  E('feedPageSize').onchange=()=>{pageSize=Number(E('feedPageSize').value);page=1;renderDetails();};
  E('feedReload').onclick=load;
  E('limparFeedFiltros').onclick=async()=>{if(!snapshot)return;filters.clear();E('feedStart').value=snapshot.period.inicio;E('feedEnd').value=snapshot.period.fim;
    try{await filters.loadOptions({preserve:false});render();}catch(error){fail(error);}};
  for(const id of ['feedStart','feedEnd'])E(id).addEventListener('change',async()=>{
    if(!snapshot||matchMedia('(max-width:767px)').matches)return;
    try{await filters.loadOptions({preserve:true});render();}catch(error){fail(error);}
  });
  document.querySelectorAll('[data-feed-metric]').forEach(button=>button.onclick=()=>{metric=button.dataset.feedMetric;
    document.querySelectorAll('[data-feed-metric]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));drawCharts();});
  document.querySelectorAll('[data-feed-period]').forEach(button=>button.onclick=()=>{grouping=button.dataset.feedPeriod;
    document.querySelectorAll('[data-feed-period]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));drawCharts();});
  document.addEventListener('dashboard:theme-changed',drawCharts);
  let resizeFrame;const resize=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{phaseChart?.resize();evolutionChart?.resize();});});
  resize.observe(E('feedPhasesChart'));resize.observe(E('feedEvolutionChart'));
  window.addEventListener('focus',()=>{if(snapshot)try{adapter.assertSession();}catch(error){snapshot=null;enabled(false);fail(error);}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&snapshot)try{adapter.assertSession();}catch(error){snapshot=null;enabled(false);fail(error);}});
  filters.register();headings();enabled(false);E('feedDemo').hidden=!adapter.demonstration;load();
})();
