/* Ranking exclusivo do RxP, sobre o detalhamento existente, sem mudar as formulas dos cards. */
window.RxpBarnRanking = (() => {
  const E=ApiScreen.element,N=ApiScreen.number,H=ApiScreen.escape;
  let rows=null,requestId=0,abort,contextKey='',currentContext,currentCards,chart;
  let descending=true,all=false;
  const metric=()=>E('rxpRankingMetric').value;
  const finite=value=>value==null?0:Number(value);
  const equal=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
  function message(text) { E('rxpRankingMessage').textContent=text;E('rxpRankingMessage').classList.toggle('hidden',!text); }
  function draw() {
    const difference=metric()==='diferenca';
    E('rxpRankingDescending').textContent=difference?'Maior diferença → Menor':'Maior → Menor';
    E('rxpRankingAscending').textContent=difference?'Menor diferença → Maior':'Menor → Maior';
    E('rxpRankingDescending').setAttribute('aria-pressed',String(descending));
    E('rxpRankingAscending').setAttribute('aria-pressed',String(!descending));
    E('rxpRankingAll').setAttribute('aria-pressed',String(all));
    E('rxpRankingAll').textContent=all?'Mostrar Top 15':'Ver todos';
    if (rows===null) return;
    const selected=[...rows].sort((a,b)=>{
      // Diferenca: maior magnitude absoluta; quantidades: maior valor numerico.
      const value=row=>difference?Math.abs(row.diferenca):row[metric()];
      return (value(a)-value(b))*(descending?-1:1)||a.galpao.localeCompare(b.galpao,'pt-BR',{numeric:true});
    });
    const visible=all?selected:selected.slice(0,15);
    E('rxpRankingAll').disabled=rows.length<=15;
    E('rxpRankingStatus').textContent=rows.length?`${visible.length} de ${rows.length} galpões · ${difference?'ordem pela diferença absoluta':'ordem pela quantidade'}`:'Nenhum galpão no contexto';
    const element=E('rxpRankingChart'),viewport=element.parentElement;
    element.style.width=Math.max(viewport.clientWidth,visible.length*74+90)+'px';
    if(!chart)chart=echarts.init(element,null,{renderer:'svg'});
    chart.resize();
    const css=getComputedStyle(document.documentElement),color=name=>css.getPropertyValue(name).trim();
    const text=color('--foreground'),muted=color('--muted-foreground'),negative=color('--destructive');
    message(rows.length?'':'Sem dados para os filtros selecionados');
    chart.setOption({animationDuration:250,aria:{enabled:true},textStyle:{fontFamily:getComputedStyle(document.body).fontFamily},
      tooltip:{trigger:'axis',confine:true,axisPointer:{type:'shadow'},backgroundColor:color('--card'),borderColor:color('--border'),textStyle:{color:text},
        formatter:points=>{
          const row=visible[points[0]?.dataIndex]; if(!row)return '';
          return `<strong>Galpão ${H(row.galpao)}</strong><br>Qtde Programada: ${N(row.programada)}<br>Qtde Real: ${N(row.real)}<br>Dif %: ${row.difPercent==null?'—':N(row.difPercent,2)+'%'}<br>Dif Qtde RxP: ${N(row.diferenca)}`;
        }},
      grid:{left:65,right:25,top:40,bottom:72},
      xAxis:{type:'category',data:visible.map(row=>row.galpao),axisLabel:{color:muted,interval:0,rotate:35,fontSize:11},axisTick:{show:false},axisLine:{lineStyle:{color:color('--border')}}},
      yAxis:{type:'value',axisLabel:{color:muted,fontSize:10,formatter:value=>N(value)},splitLine:{lineStyle:{color:color('--border'),opacity:.6}}},
      series:[{name:E('rxpRankingMetric').selectedOptions[0].textContent,type:'bar',barMaxWidth:42,
        data:visible.map(row=>({value:row[metric()],itemStyle:{color:difference&&row.diferenca<0?negative:color('--primary'),borderRadius:row[metric()]<0?[0,0,5,5]:[5,5,0,0]},
          label:{position:row[metric()]<0?'bottom':'top',color:difference&&row.diferenca<0?negative:text}})),
        label:{show:true,fontSize:11,formatter:params=>N(params.value)},labelLayout:{hideOverlap:true}}]},true);
  }
  function clear() {
    ++requestId;abort?.abort();rows=null;contextKey='';chart?.clear();
    E('rxpRankingStatus').textContent='Consultando…';message('Carregando ranking…');E('rxpRankingRetry').classList.add('hidden');
  }
  async function load(params,cards) {
    const key=JSON.stringify(params);
    if(key===contextKey)return;
    clear();contextKey=key;currentContext={...params};currentCards={...cards};
    const id=requestId;abort=new AbortController();const signal=abort.signal;
    const grouped=new Map(),identities=new Set(),totals={programada:0,real:0,diferenca:0};
    let expected,read=0,pages=1;
    try {
      for(let page=1;page<=pages;page++) {
        const result=await apiGet('/api/bi/rxp/detalhes',{...params,pagina:page,tamanho:500,ordenar:'id',direcao:'asc'},{signal});
        if(id!==requestId)return;
        if(!Array.isArray(result.dados)||!Number.isInteger(result.total)||result.total<0||!Number.isInteger(result.total_paginas)||result.total_paginas<0)throw new Error('Não foi possível conferir todos os registros do ranking.');
        if(page===1){expected=result.total;pages=Math.max(1,result.total_paginas);}
        if(result.total!==expected)throw new Error('Os dados mudaram durante a consulta. Tente novamente.');
        for(const row of result.dados) {
          const identity=JSON.stringify([row.fonte,row.id]);
          if(identities.has(identity))throw new Error('Os registros mudaram entre páginas. Tente novamente.');
          identities.add(identity);read++;
          const barn=String(row.galpao??'').trim()||'Não informado';
          if(!grouped.has(barn))grouped.set(barn,{galpao:barn,programada:0,real:0,diferenca:0});
          const group=grouped.get(barn);
          for(const [target,source] of [['programada','programada'],['real','real'],['diferenca','difQtdeRxP']]) {
            const value=finite(row[source]);if(!Number.isFinite(value))throw new Error('O ranking recebeu uma quantidade inválida.');
            group[target]+=value;totals[target]+=value;
          }
        }
        E('rxpRankingStatus').textContent=`Carregando ${N(read)} de ${N(expected)} registros…`;
      }
      if(read!==expected||Object.keys(totals).some(key=>!equal(totals[key],finite(cards[key]))))throw new Error('O ranking não conferiu com os totais do contexto. Tente novamente.');
      // Mesma regra da tabela: soma do campo de origem / soma da programada; nunca real - programada.
      rows=[...grouped.values()].map(row=>({...row,difPercent:row.programada?row.diferenca/row.programada*100:null}));
      draw();
    } catch(error) {
      if(error.name!=='AbortError'&&id===requestId){chart?.clear();rows=null;contextKey='';E('rxpRankingStatus').textContent='Ranking indisponível';message(error.message);E('rxpRankingRetry').classList.remove('hidden');}
    }
  }
  E('rxpRankingMetric').addEventListener('change',draw);
  E('rxpRankingDescending').addEventListener('click',()=>{descending=true;draw();});
  E('rxpRankingAscending').addEventListener('click',()=>{descending=false;draw();});
  E('rxpRankingAll').addEventListener('click',()=>{all=!all;draw();});
  E('rxpRankingRetry').addEventListener('click',()=>load(currentContext,currentCards));
  new ResizeObserver(()=>{if(rows!==null)draw();}).observe(E('rxpRankingChart').parentElement);
  document.addEventListener('dashboard:theme-changed',draw);
  return {clear,load};
})();
