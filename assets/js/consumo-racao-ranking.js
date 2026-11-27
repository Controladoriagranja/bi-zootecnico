/* Ranking de consumo total versus as mesmas metas vigentes da tela. */
window.ConsumoRacaoRanking = (() => {
  'use strict';
  function aggregate(rows, metas, integrated = null, phase = 'fase_pre_menos_inicial') {
    const groups = new Map();
    let excluded = 0;
    for (const row of rows) {
      if (integrated !== null && row.codigo !== integrated) continue;
      const goal = ConsumoRacaoMetas.find(metas, phase, row.data), actual=row[phase];
      if (!Number.isFinite(actual) || !(row.qtde_aves > 0) || goal === null) { excluded++; continue; }
      const key = integrated === null ? row.codigo : (row.galpao || 'Não informado');
      if (!groups.has(key)) groups.set(key, {key, label: integrated === null ? `${row.codigo} - ${row.integrado || 'Não informado'}` : `Galpão ${key}`, birds:0, actual:0, expected:0, records:0});
      const item = groups.get(key);
      item.birds += row.qtde_aves; item.actual += actual;
      item.expected += goal * row.qtde_aves; item.records++;
    }
    return {excluded, groups:[...groups.values()].map(item => ({...item,
      real:item.actual/item.birds, goal:item.expected/item.birds,
      kgPerBird:(item.actual-item.expected)/item.birds, tonnes:(item.actual-item.expected)/1000,
      comparison:ConsumoRacaoMetas.compare(item.actual/item.birds,item.expected/item.birds)
    }))};
  }
  function ordered(groups, descending=true){
    return [...groups].sort((a,b)=>(descending?b.kgPerBird-a.kgPerBird:a.kgPerBird-b.kgPerBird)||a.label.localeCompare(b.label,'pt-BR'));
  }
  function gradient(deviation, min, max, green, amber, red){
    if(Math.abs(deviation)<1e-12)return green;
    const range=Math.max(Math.abs(min),Math.abs(max));
    const distance=range>0?Math.min(1,Math.abs(deviation)/range):0;
    const start=distance<=.5?green:amber, end=distance<=.5?amber:red;
    const t=distance<=.5?distance*2:(distance-.5)*2;
    const rgb=hex=>hex.replace('#','').match(/../g).map(v=>parseInt(v,16));
    const a=rgb(start),b=rgb(end);
    return '#'+a.map((value,i)=>Math.round(value+(b[i]-value)*t).toString(16).padStart(2,'0')).join('');
  }
  return Object.freeze({aggregate,ordered,gradient});
})();

(() => {
  'use strict';
  if(typeof document==='undefined')return;
  const E=id=>document.getElementById(id), host=E('feedRanking'), chartHost=E('feedRankingChart');
  let rows=[], metas=[], integrated=null, phase=FeedPhase.get(), descending=true, chart=null;
  const phaseLabels={...Object.fromEntries(ConsumoRacaoData.phases.map(item=>[item.key,item.label])),consumo_total:'Total'};
  const num=(v,d=3)=>v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
  let currentGoal=null;
  function positionMeta(){
    const marker=E('feedRankingMeta');
    if(!chart||currentGoal===null){marker.hidden=true;return;}
    const x=chart.convertToPixel({xAxisIndex:0},currentGoal);
    marker.hidden=!Number.isFinite(x);
    if(Number.isFinite(x)){marker.style.left=`${x}px`;marker.textContent=`Meta: ${num(currentGoal)} kg/ave`;}
  }
  function draw(){
    const result=ConsumoRacaoRanking.aggregate(rows,metas,integrated,phase);
    const shown=ConsumoRacaoRanking.ordered(result.groups,descending);
    const goal=shown[0]?.goal, mixed=shown.some(item=>Math.abs(item.goal-goal)>1e-10);
    E('feedRankingTitle').textContent=integrated===null?'Ranking de desvios por integrado':`Desvios por galpão · ${rows.find(row=>row.codigo===integrated)?.integrado || integrated}`;
    E('feedRankingStatus').textContent=`${phaseLabels[phase]} · ${shown.length} ${integrated===null?'integrados':'galpões'} · kg/ave${result.excluded?` · ${result.excluded} registros sem consumo da fase, aves válidas ou meta vigente`:''}`;
    E('feedRankingEmpty').hidden=shown.length>0&&!mixed;
    E('feedRankingEmpty').textContent=mixed?'Há metas vigentes diferentes entre os grupos. Selecione um período com meta única para comparar com a linha de referência.':!metas.length?'Metas indisponíveis para calcular o ranking.':'Nenhum registro válido nesta seleção.';
    const scroll=host.querySelector('.feed-ranking-scroll');
    if(scroll)scroll.scrollTop=0;
    if(!shown.length||mixed){currentGoal=null;chart?.clear();chartHost.style.height='300px';chart?.resize();positionMeta();return;}
    currentGoal=goal;
    chartHost.style.height=`${Math.max(300,shown.length*38+100)}px`;
    const style=getComputedStyle(document.body), color=name=>style.getPropertyValue(name).trim();
    chart??=echarts.init(chartHost);
    // Remove the previous render before resizing: its callbacks/data belong to the old filter.
    chart.clear();chart.resize();
    const min=Math.min(0,...shown.map(item=>item.kgPerBird)), max=Math.max(0,...shown.map(item=>item.kgPerBird));
    const mobile=matchMedia('(max-width:767px)').matches;
    chart.setOption({animation:false,textStyle:{fontFamily:style.fontFamily},
      grid:{left:12,right:mobile?125:180,top:18,bottom:65,containLabel:true},
      tooltip:{trigger:'item',renderMode:'richText',confine:true,backgroundColor:color('--card'),borderColor:color('--border'),textStyle:{color:color('--foreground')},
        formatter:p=>{const item=shown[p.dataIndex];return `${item.label}\nDesvio: ${num(item.kgPerBird)} kg/ave · ${num(item.tonnes)} t\nRealizado: ${num(item.actual/item.birds)} kg/ave\nMeta ponderada: ${num(item.expected/item.birds)} kg/ave\nAves: ${num(item.birds,0)} · Registros: ${item.records}`;}},
      xAxis:{type:'value',name:'kg/ave',min:0,max:Math.max(goal,...shown.map(item=>item.real))*1.12,axisLabel:{color:color('--foreground'),fontSize:12,formatter:value=>num(value)},splitLine:{lineStyle:{color:color('--border')}}},
      yAxis:{type:'category',inverse:true,triggerEvent:true,data:shown.map(item=>item.label),axisLabel:{color:color('--foreground'),fontSize:13,width:matchMedia('(max-width:767px)').matches?115:260,overflow:'truncate'},axisTick:{show:false},axisLine:{show:false}},
      series:[{type:'bar',barMaxWidth:24,label:{show:true,position:'right',fontSize:mobile?11:13,color:color('--foreground'),formatter:p=>{const item=shown[p.dataIndex];return `${num(item.real)} (${item.kgPerBird>0?'+':''}${num(item.kgPerBird)})`;}},
        markLine:{silent:true,symbol:['none','none'],lineStyle:{color:'#000000',type:'dotted',width:2},label:{show:false},data:[{xAxis:goal}]},
        data:shown.map(item=>({value:item.real,itemStyle:{color:ConsumoRacaoRanking.gradient(item.kgPerBird,min,max,color('--feed-green-text'),color('--feed-orange-text'),color('--feed-red-text'))}}))}]
    },true);
    positionMeta();
    chart.off('click');
  }
  host.querySelectorAll('[data-ranking-phase]').forEach(button=>button.onclick=()=>{
    FeedPhase.set(button.dataset.rankingPhase);
  });
  document.addEventListener('feed:phase-change',event=>{
    phase=event.detail.phase;integrated=null;
    host.querySelectorAll('[data-ranking-phase]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.rankingPhase===phase)));draw();
  });
  E('feedRankingOrder').onclick=()=>{descending=!descending;integrated=null;E('feedRankingOrder').textContent=descending?'Maior ↓':'Menor ↑';E('feedRankingOrder').setAttribute('aria-label',descending?'Ordenação: maior desvio primeiro. Alternar para menor.':'Ordenação: menor desvio primeiro. Alternar para maior.');draw();};
  document.addEventListener('feed:ranking-data',event=>{rows=event.detail.rows;metas=event.detail.metas;integrated=null;draw();});
  document.addEventListener('dashboard:theme-changed',draw);
  new ResizeObserver(()=>{chart?.resize();positionMeta();}).observe(host);
})();
