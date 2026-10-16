(() => {
  const A=ApiScreen,E=A.element,H=A.escape,N=A.number;
  const dimensions=[['ano','Ano'],['mes','Mês'],['status_acerto','Status Acerto'],['tipo_granja','Tipo de Granja'],['modelo','Modelo'],['produtor','Produtor'],['galpao','Galpão'],['tecnico','Técnico'],['tipo_linhagem','Tipo de Linhagem'],['linhagem','Linhagem']];
  E('phaseFilters').innerHTML=dimensions.map(([key,label])=>`<div class="filter-field"><span>${label}</span><div class="checkbox-multiselect" id="phase-filter-${key}"></div></div>`).join('');
  const colors=['#641b36','#8c2d47','#b34c53','#cc7358','#cf9953','#b29c30'];
  let unit='semana',data=null,chart=null;
  const label=p=>unit==='dia'?p.inicio.split('-').reverse().join('/'):`Sem. ${p.semana} · ${p.inicio.slice(5).split('-').reverse().join('/')}/${p.ano_semana}`;
  function draw(){
    if(!data||!chart)return;
    const css=getComputedStyle(document.documentElement),c=name=>css.getPropertyValue(name).trim();
    const count=data.periodos.length,narrow=E('phaseChart').clientWidth<600;
    chart.setOption({animationDuration:250,color:colors,textStyle:{fontFamily:getComputedStyle(document.body).fontFamily},
      tooltip:{trigger:'axis',confine:true,renderMode:'richText',backgroundColor:c('--card'),borderColor:c('--border'),textStyle:{color:c('--foreground')}},
      legend:{type:'scroll',top:0,textStyle:{color:c('--foreground'),fontSize:11}},
      grid:{left:52,right:22,top:48,bottom:count>16?102:70},
      xAxis:{type:'category',data:data.periodos.map(label),boundaryGap:false,axisLine:{lineStyle:{color:c('--border')}},axisLabel:{color:c('--muted-foreground'),fontSize:10,rotate:narrow?35:0,hideOverlap:true}},
      yAxis:{type:'value',name:'g/dia',nameTextStyle:{color:c('--muted-foreground')},axisLabel:{color:c('--muted-foreground')},splitLine:{lineStyle:{color:c('--border'),opacity:.6}}},
      dataZoom:count>16?[{type:'inside',startValue:Math.max(0,count-20),endValue:count-1},{type:'slider',height:18,bottom:12,startValue:Math.max(0,count-20),endValue:count-1,textStyle:{color:c('--muted-foreground')}}]:[],
      series:data.fases.map((phase,i)=>({id:phase.id,name:phase.nome,type:'line',connectNulls:false,smooth:false,symbol:'circle',symbolSize:7,
        lineStyle:{width:3,color:colors[i]},itemStyle:{color:colors[i]},
        data:data.periodos.map(p=>p.fases[phase.id].valor),
        tooltip:{valueFormatter:value=>value==null?'Sem dados':N(value,2)+' g/dia'},
        label:{show:count<=24&&!narrow,position:'top',fontSize:10,color:c('--foreground'),formatter:p=>p.value==null?'':N(p.value,1)},labelLayout:{hideOverlap:true}})),
      graphic:count?[]:[{type:'text',left:'center',top:'middle',style:{text:'Nenhum lote para os filtros selecionados.',fill:c('--muted-foreground'),fontSize:13}}]
    },true);
  }
  function clear(){data=null;chart?.clear();E('phaseHead').innerHTML='';E('phaseBody').innerHTML='';E('phaseCoverage').classList.add('hidden');E('phaseContext').textContent='Consultando…';E('phaseUpdated').textContent='—';}
  const screen=A.connect({bi:'gpd-fases',fields:dimensions.map(([key])=>['phase-filter-'+key,key]),errorId:'phaseError',clearId:'phaseClear',context:()=>({agrupamento:unit}),clear,
    render:result=>{
      if(result.rules_version!=='gpd-fases-2026-10-16'||!Array.isArray(result.periodos)||!Array.isArray(result.fases))throw new Error('Atualize o backend para consultar GPD por Fase.');
      data=result;unit=result.agrupamento;
      E('phaseUpdated').textContent=result.atualizado_em||'—';
      E('phaseContext').textContent=`${unit==='dia'?'Dia':'Semana'} do abate · ${N(result.cards.lotes)} lotes · ${N(result.cards.com_vinculo)} com pesos vinculados`;
      const incomplete=result.fases.some(f=>result.totais[f.id].lotes<result.cards.lotes);
      if(incomplete)A.message('phaseCoverage','Há lotes sem vínculo ou sem bases válidas em alguma fase. Cada célula mostra a quantidade usada no cálculo.');
      E('phaseHead').innerHTML='<tr><th>Fase / GPD (g/dia)</th>'+result.periodos.map(p=>`<th class="num">${H(label(p))}</th>`).join('')+'<th class="num">Total consolidado</th></tr>';
      const cell=(v,total)=>`<td class="num" title="${v.lotes} de ${total} lotes com bases válidas">${N(v.valor,2)}<small>${N(v.lotes)} de ${N(total)} lotes</small></td>`;
      E('phaseBody').innerHTML=result.fases.map((f,i)=>`<tr><th><span class="phase-swatch" style="background:${colors[i]}"></span>${H(f.nome)}</th>${result.periodos.map(p=>cell(p.fases[f.id],p.lotes)).join('')}${cell(result.totais[f.id],result.cards.lotes)}</tr>`).join('');
      if(!chart)chart=echarts.init(E('phaseChart'),null,{renderer:'svg'});
      draw();
    }});
  document.querySelectorAll('[data-phase-unit]').forEach(button=>button.addEventListener('click',()=>{
    if(unit===button.dataset.phaseUnit)return;
    unit=button.dataset.phaseUnit;
    document.querySelectorAll('[data-phase-unit]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-checked',String(b===button));});screen.refresh();
  }));
  new ResizeObserver(()=>{chart?.resize();draw();}).observe(E('phaseChart'));
  document.addEventListener('dashboard:theme-changed',draw);
  const modal=E('phaseFormula'),open=E('phaseFormulaOpen'),close=E('phaseFormulaClose');
  const hide=()=>{modal.classList.add('hidden');open.focus();};
  open.addEventListener('click',()=>{modal.classList.remove('hidden');close.focus();});
  close.addEventListener('click',hide);E('phaseFormulaBackdrop').addEventListener('click',hide);
  modal.addEventListener('keydown',event=>{if(event.key==='Escape')hide();if(event.key==='Tab'){event.preventDefault();close.focus();}});
})();
