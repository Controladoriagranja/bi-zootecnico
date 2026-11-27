/* Apresentacao desta pagina. Autenticacao e HTTP reutilizam api.js. */
(() => {
  'use strict';
  const D=ConsumoRacaoData,E=id=>document.getElementById(id),adapter=D.create();
  let snapshot=null,selected=[],summary=null,request=null,loadId=0,page=1,pageSize=25,sort='data',direction='desc',metric='total',grouping='dia';
  let metas=[];
  const fields=[['fazenda','Fazenda / Integrado'],['galpao','Galpão'],['lote','Lote'],['linhagens','Linhagem']]
    .map(([apiKey,label])=>({id:'feed_'+apiKey,apiKey,label,multi:true,search:true}));
  for(const field of fields){const host=document.createElement('div');host.className='filter-field';
    const label=document.createElement('span');label.textContent=field.label;const control=document.createElement('div');control.className='checkbox-multiselect';control.id=field.id;host.append(label,control);E('feedFilters').append(host);}
  class FeedFilters extends FilterController {
    normalizeOptions(field,items){return (items||[]).map(item=>({value:String(item.value),label:String(item.label)}));}
    loadOptions(options){return FeedActivity.run(()=>super.loadOptions(options));}
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
      {key:phase.key,label:'Consumo (kg)',group:phase.label,phase:phase.key,kind:'number'},
      {key:phase.key+'_cons_ave',label:'Cons/Ave (kg/ave) · original',group:phase.label,phase:phase.key,kind:'number'},
      {key:phase.key+'_cons_dia',label:'Cons/Dia · original',group:phase.label,phase:phase.key,kind:'number',title:'Significado em confirmação. Valor não utilizado nos indicadores.'}
    ])
  ];
  const visibleColumns=()=>FeedPhase.columns(columns);
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
    document.dispatchEvent(new CustomEvent('feed:ranking-data',{detail:{rows:[],metas:[]}}));
    selected=[];summary=null;
    for(const id of ['feedTotal','feedBirds','feedPerBird','feedRecords','feedUpdated','feedPage','feedPageCount'])E(id).textContent='—';
    E('feedCoverage').textContent='';
    messageRow(E('feedDetailRows'),message,visibleColumns().length);
    E('feedPrev').disabled=true;E('feedNext').disabled=true;
    for(const id of ['feedPhasesEmpty']){E(id).hidden=false;E(id).textContent=message;}
    phaseChart?.clear();
  }
  function headings(){
    E('feedDetailHead').replaceChildren(...visibleColumns().map(column=>{
      const th=document.createElement('th');th.scope='col';th.setAttribute('aria-sort',sort===column.key?(direction==='asc'?'ascending':'descending'):'none');
      const button=document.createElement('button');button.type='button';button.title=column.title||'Ordenar por '+column.label;
      const text=document.createElement('span');if(column.group){const group=document.createElement('small');group.textContent=column.group;text.append(group);}const label=document.createElement('span');label.textContent=column.label;text.append(label);
      const icon=document.createElement('span');icon.ariaHidden='true';icon.textContent=sort===column.key?(direction==='asc'?'↑':'↓'):'↕';button.append(text,icon);
      button.onclick=()=>{if(!snapshot)return;direction=sort===column.key&&direction==='asc'?'desc':'asc';sort=column.key;page=1;renderDetails();};th.append(button);return th;
    }));
  }
  function renderDetails(){
    try{adapter.assertSession();}catch(error){fail(error);return;}
    if(!visibleColumns().some(column=>column.key===sort)){sort='data';direction='desc';}
    E('feedDetailTable').style.minWidth=FeedPhase.get()==='consumo_total'?'1200px':'1400px';
    headings();const rows=D.ordered(selected,sort,direction),pages=Math.ceil(rows.length/pageSize);page=Math.max(1,Math.min(page,pages||1));
    const shown=rows.slice((page-1)*pageSize,page*pageSize);
    E('feedDetailRows').replaceChildren(...shown.map(row=>{const tr=document.createElement('tr');tr.dataset.recordId=row.registro_id;
      for(const column of visibleColumns()){let value=row[column.key];if(column.key==='fazenda')value=`${row.codigo} - ${row.integrado||'Não informado'}`;
        tr.append(targetCell(cell(column.kind==='date'?date(value):column.kind==='number'?num(value,column.digits??3):value||'—',column.kind==='number'),ConsumoRacaoMetas.detail(metas,row,column.key)));}return tr;}));
    if(!shown.length)messageRow(E('feedDetailRows'),'Nenhum registro para os filtros selecionados.',visibleColumns().length);
    E('feedPage').textContent=pages?`${page} / ${pages}`:'0 / 0';
    E('feedPageCount').textContent=rows.length?`${num((page-1)*pageSize+1,0)}–${num(Math.min(page*pageSize,rows.length),0)} de ${num(rows.length,0)} registros`:'0 registros';
    E('feedPrev').disabled=page<=1||!pages;E('feedNext').disabled=page>=pages||!pages;
  }
  function renderCards(){
    const card=FeedPhase.cards(selected),phase=FeedPhase.get();
    const label=phase==='consumo_total'?'Total':D.phases.find(item=>item.key===phase).label;
    E('feedTotalTitle').textContent=phase==='consumo_total'?'Consumo total':`Consumo ${label}`;
    E('feedTotal').textContent=num(card.total);E('feedBirds').textContent=num(card.birds,0);E('feedPerBird').textContent=num(card.perBird.value);E('feedRecords').textContent=num(card.records,0);
    E('feedTotalNote').textContent=`${unit()} · ${card.totalRecords} registros com consumo informado`;
    E('feedPerBirdNote').textContent=`${unit()}/ave · base: ${num(card.perBird.denominator,0)} aves`;
    E('feedCoverage').textContent=selected.length?`Total: ${card.totalRecords} de ${card.records} registros com consumo informado informadas. Por ave: ${card.perBird.records} registros com consumo completo e aves maiores que zero. Cada fase usa seu próprio conjunto de valores válidos.`:'';
  }
  function renderNow(){
    adapter.assertSession();
    const inicio=E('feedStart').value,fim=E('feedEnd').value;
    if(snapshot.rows.length&&(!D.day(inicio)||!D.day(fim)||inicio>fim)){clearDisplay('Selecione um período válido.');state('error','Confira o período','A data inicial deve ser menor ou igual à data final.');return;}
    if(inicio<snapshot.period.inicio||fim>snapshot.period.fim){clearDisplay('Período fora dos dados disponíveis.');state('error','Período indisponível',`Os dados disponíveis vão de ${date(snapshot.period.inicio)} a ${date(snapshot.period.fim)}.`);return;}
    selected=snapshot.rows.filter(row=>D.matches(row,{...filters.values(),inicio,fim}));summary=D.aggregate(selected);page=1;
    E('feedPeriod').textContent=`Período selecionado: ${date(inicio)} a ${date(fim)}`;
    E('feedUpdated').textContent=formatarDataHoraBR(snapshot.updated);E('feedUpdated').title=snapshot.demonstration?'Demonstração sintética, sem coleta real.':'Última importação dos dados autorizados (importado_em).';
    renderCards();
    E('feedState').hidden=selected.length>0;
    if(!selected.length)state('empty','Nenhum registro neste recorte','Ajuste o período ou limpe os filtros para consultar outros registros disponíveis.');
    renderDetails();drawCharts();
    document.dispatchEvent(new CustomEvent('feed:ranking-data',{detail:{rows:selected,metas}}));
  }
  function render(){if(!snapshot)return;return FeedActivity.run(()=>{try{renderNow();}catch(error){fail(error);}});}
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
          if(id!==loadId)return;adapter.assertSession();metas=loaded;renderDetails();document.dispatchEvent(new CustomEvent('feed:ranking-data',{detail:{rows:selected,metas}}));
          E('feedTargetsStatus').textContent=loaded.length?'Metas em kg/ave · verde: até ±1% · laranja: acima de ±1% até ±3% · vermelho: acima de ±3%. Meta de Crescimento = Crescimento + Crescimento 2; total = soma das fases vigentes.':'Nenhuma meta aplicável cadastrada.';
        }catch(error){
          if(id!==loadId||error?.name==='AbortError')return;
          if(error.code==='SESSION_CHANGED'){fail(error);return;}
          E('feedTargetsStatus').textContent='Metas indisponíveis: '+(error.message||'confira o cadastro e a rota.');
        }
      }else E('feedTargetsStatus').textContent='Sem metas reais nesta demonstração.';
    }catch(error){if(id===loadId)fail(error);}
    finally{if(id===loadId)E('feedDetailTable').setAttribute('aria-busy','false');}
  }
  let phaseChart=null;
  function drawCharts(){
    if(!summary)return;
    const periods=ConsumoRacaoStacked.layout(ConsumoRacaoStacked.periods(selected,grouping,metric,FeedPhase.get()));
    E('feedPhasesEmpty').hidden=periods.length>0;
    E('feedPhasesEmpty').textContent='Sem consumo completo válido para os filtros selecionados.';
    if(!periods.length){phaseChart?.clear();return;}
    const style=getComputedStyle(document.body),color=name=>style.getPropertyValue(name).trim(),font=style.fontFamily;
    const numUnit=metric==='total'?'kg':'kg/ave';
    const colors=[color('--feed-phase-0'),color('--feed-phase-3'),color('--feed-phase-2'),color('--feed-phase-1')];
    const labels=periods.map(item=>grouping==='semana'?ConsumoRacaoStacked.weekLabel(item.name):grouping==='mes'?item.name.slice(0,7).split('-').reverse().join('/'):date(item.name));
    phaseChart??=echarts.init(E('feedPhasesChart'));phaseChart.clear();
    const visible=ConsumoRacaoStacked.visibleCount(E('feedPhasesChart').clientWidth,metric,periods.length);
    const selectedPhase=FeedPhase.get(),isTotal=selectedPhase==='consumo_total';
    const phaseName=isTotal?'Total':D.phases.find(phase=>phase.key===selectedPhase).label;
    const series=D.phases.map((phase,index)=>({name:phase.label,type:'bar',stack:'consumo',barMaxWidth:130,
      itemStyle:{color:colors[index]},label:{show:true,position:'inside',fontFamily:font,fontSize:12,fontWeight:600,
        color:index===2?'#211b1d':'#ffffff',formatter:p=>num(periods[p.dataIndex].values[index])},labelLayout:{hideOverlap:true},
      data:periods.map(item=>isTotal?item.blocks[index]:D.phases[index].key===selectedPhase?item.height:null)}));
    // The total is a label at the top of the existing stack, never an extra segment.
    series.push({name:'Total',type:'scatter',symbolSize:0,silent:true,tooltip:{show:false},
      label:{show:true,position:'top',distance:10,color:color('--primary'),fontFamily:font,fontSize:12,lineHeight:16,fontWeight:700,formatter:p=>`${phaseName}:\n${num(periods[p.dataIndex].total)}\n${numUnit}`},
      data:periods.map(item=>item.height)});
    phaseChart.setOption({animation:false,textStyle:{fontFamily:font},
      grid:{left:24,right:24,top:65,bottom:110},
      legend:{bottom:40,data:[...D.phases.map(phase=>phase.label),'Total'],selected:Object.fromEntries([...D.phases.map(phase=>[phase.label,isTotal||phase.key===selectedPhase]),['Total',true]]),textStyle:{color:color('--foreground'),fontSize:13}},
      tooltip:{trigger:'axis',confine:true,renderMode:'richText',backgroundColor:color('--card'),borderColor:color('--border'),textStyle:{color:color('--foreground'),fontFamily:font},
        formatter:items=>{const item=periods[items[0].dataIndex];return `${labels[items[0].dataIndex]}${grouping==='semana'?' (início da semana)':''}\n${D.phases.map((phase,i)=>isTotal||phase.key===selectedPhase?`${phase.label}: ${num(item.values[i])} ${numUnit}`:null).filter(Boolean).join('\n')}\n${phaseName}: ${num(item.total)} ${numUnit}\nRegistros: ${num(item.records,0)}\nAves: ${num(item.birds,0)}`;}},
      xAxis:{type:'category',data:labels,axisTick:{show:false},axisLabel:{color:color('--foreground'),fontSize:12,hideOverlap:true},axisLine:{lineStyle:{color:color('--border')}}},
      yAxis:{type:'value',min:0,max:1.12,show:false},
      dataZoom:[{type:'slider',height:18,bottom:8,startValue:0,endValue:visible-1,maxValueSpan:visible-1,minValueSpan:0,borderColor:color('--border'),textStyle:{color:color('--foreground')},labelFormatter:(_,label)=>label},{type:'inside',maxValueSpan:visible-1,minValueSpan:0,zoomOnMouseWheel:false,moveOnMouseWheel:false}],series
    },true);
    phaseChart.off('click');phaseChart.on('click',event=>{
      if(event.componentType==='series')FeedPhase.set(event.seriesName==='Total'?'consumo_total':D.phases.find(phase=>phase.label===event.seriesName)?.key);
    });
    phaseChart.off('legendselectchanged');phaseChart.on('legendselectchanged',event=>FeedPhase.set(event.name==='Total'?'consumo_total':D.phases.find(phase=>phase.label===event.name)?.key));
  }
  document.addEventListener('feed:phase-change',()=>{
    page=1;if(snapshot){renderCards();renderDetails();drawCharts();}else headings();
    const scroll=E('feedDetailTable').closest('.feed-scroll');if(scroll)scroll.scrollLeft=0;
  });
  E('feedPrev').onclick=()=>{if(!E('feedPrev').disabled){page--;renderDetails();}};
  E('feedNext').onclick=()=>{if(!E('feedNext').disabled){page++;renderDetails();}};
  E('feedPageSize').onchange=()=>{pageSize=Number(E('feedPageSize').value);page=1;renderDetails();};
  E('feedReload').onclick=load;
  E('limparFeedFiltros').onclick=async()=>{if(!snapshot)return;filters.clear();E('feedStart').value=snapshot.period.inicio;E('feedEnd').value=snapshot.period.fim;
    try{await filters.loadOptions({preserve:false});FeedPhase.set('consumo_total');await render();}catch(error){fail(error);}};
  for(const id of ['feedStart','feedEnd'])E(id).addEventListener('change',async()=>{
    if(!snapshot||matchMedia('(max-width:767px)').matches)return;
    try{await filters.loadOptions({preserve:true});render();}catch(error){fail(error);}
  });
  document.querySelectorAll('[data-feed-metric]').forEach(button=>button.onclick=()=>{metric=button.dataset.feedMetric;
    document.querySelectorAll('[data-feed-metric]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));drawCharts();});
  document.querySelectorAll('[data-feed-period]').forEach(button=>button.onclick=()=>{grouping=button.dataset.feedPeriod;
    document.querySelectorAll('[data-feed-period]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));drawCharts();});
  document.addEventListener('dashboard:theme-changed',drawCharts);
  let resizeFrame,chartWidth=0;const resize=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{phaseChart?.resize();const width=E('feedPhasesChart').clientWidth;if(width!==chartWidth){chartWidth=width;drawCharts();}});});
  resize.observe(E('feedPhasesChart'));
  window.addEventListener('focus',()=>{if(snapshot)try{adapter.assertSession();}catch(error){snapshot=null;enabled(false);fail(error);}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&snapshot)try{adapter.assertSession();}catch(error){snapshot=null;enabled(false);fail(error);}});
  filters.register();headings();enabled(false);E('feedDemo').hidden=!adapter.demonstration;load();
})();
