/* Nova modificação de 26/10/2026. Exclusivo do gráfico inferior de mortalidade. */
window.MortalityChart = (() => {
  // Somente apresentação: diferenças menores que meia casa não devem aparecer como -0,00.
  const format = value => value == null ? '—' : (Math.abs(Number(value)) < 0.005 ? 0 : Number(value)).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2});
  const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const monthNames = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const fallback = ['#1E3A8A','#2563EB','#0EA5E9','#14B8A6','#84CC16','#F59E0B'];
  let current=null, chart=null, weekStart=0, weekEnd=0, lotOpener=null;
  const element = id => document.getElementById(id);
  // A API ja calcula as faixas somente sobre os lotes vinculados/validos.
  // Reusar esse subtotal apenas quando os problemas correspondem a lotes pulados.
  function presentation(period) {
    const valid=value=>value!=null&&Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=100;
    const phases=current.faixas.map(f=>period.faixas?.[f.id]);
    const reasons=(period.problemas||[]).map(issue=>issue.motivo);
    const skipped=['sem_vinculo_base_dinamica','base_ausente_invalida_ou_aloj_nao_positivo'];
    const partial=period.valido!==true&&reasons.some(r=>skipped.includes(r))
      &&reasons.every(r=>skipped.includes(r)||r==='total_divergente_ou_ausente')
      &&period.vinculados>0&&phases.every(valid)&&valid(period.total_dinamica)
      &&Math.abs(phases.reduce((sum,value)=>sum+Number(value),0)-Number(period.total_dinamica))<=Number(current.tolerancia_pp??.01);
    const show=phases.every(valid)&&(period.valido===true||partial);
    return {partial,show,total:partial?period.total_dinamica:valid(period.total)?period.total:null};
  }
  // Nova modificação de 26/10/2026: janela semanal e rolagem sem nova consulta.
  function weekCount(width) {return Math.max(3,Math.min(10,Math.floor((width-90)/85)));}
  function weekControls() {
    const weekly=current?.agrupamento==='semanal' && current.periodos.length>0;
    element('mortalityWeekNav')?.classList.toggle('hidden',!weekly);
    if(!weekly)return;
    const periods=current.periodos;
    element('mortalityWeeksRange').textContent=periods.length
      ? `Sem. ${periods[weekStart].semana} a ${periods[weekEnd].semana} · ${weekEnd-weekStart+1} de ${periods.length}` : 'Sem semanas disponíveis';
    element('mortalityWeeksPrevious').disabled=weekStart===0;
    element('mortalityWeeksNext').disabled=weekEnd>=periods.length-1;
    element('mortalityWeeksLatest').disabled=weekEnd>=periods.length-1;
    element('mortalityWeeksPrevious').onclick=()=>moveWeeks(-1);
    element('mortalityWeeksNext').onclick=()=>moveWeeks(1);
    element('mortalityWeeksLatest').onclick=()=>moveWeeks(0,true);
  }
  function moveWeeks(direction,latest=false) {
    if(!current||!chart||current.agrupamento!=='semanal')return;
    const count=weekEnd-weekStart+1, maximum=Math.max(0,current.periodos.length-count);
    weekStart=latest?maximum:Math.max(0,Math.min(maximum,weekStart+direction*count));
    weekEnd=Math.min(current.periodos.length-1,weekStart+count-1);
    chart.dispatchAction({type:'dataZoom',dataZoomIndex:0,startValue:weekStart,endValue:weekEnd});
    weekControls();
  }
  function zoomed(event) {
    if(current?.agrupamento!=='semanal')return;
    const zoom=event.batch?.[0]||event, last=current.periodos.length-1;
    if(Number.isFinite(zoom.start))weekStart=Math.max(0,Math.min(last,Math.round(last*zoom.start/100)));
    if(Number.isFinite(zoom.end))weekEnd=Math.max(weekStart,Math.min(last,Math.round(last*zoom.end/100)));
    weekControls();
  }
  function clicked(event) {
    if(!lotOpener||!current||event.componentType!=='series'||event.seriesType!=='bar')return;
    const period=current.periodos[event.dataIndex], phase=current.faixas[event.seriesIndex];
    if(!period?.lotes||!phase||!presentation(period).show)return;
    lotOpener({period,phase,year:current.ano,grouping:current.agrupamento});
  }
  function audit(payload) {
    const container = element('mortalityAudit');
    const labels = {
      percentual_fora_de_0_a_100:'Lote com percentual fora de 0% a 100%',
      faixa_negativa:'Faixa consolidada negativa',
      sem_vinculo_base_dinamica:'Lote sem vínculo na base dinâmica',
      base_ausente_invalida_ou_aloj_nao_positivo:'Campo ausente/inválido ou alojamento não positivo',
      aloj_divergente:'Aves alojadas diferentes entre as fontes',
      total_divergente_ou_ausente:'Total divergente ou ausente'
    };
    const rows = [...payload.periodos.filter(p=>p.lotes), ...(payload.consolidado?[{...payload.consolidado,inicio:'Total do contexto'}]:[])];
    const tolerance=Number(payload.tolerancia_pp ?? 0.01);
    const totalsMatch=rows.length>0 && rows.every(p=>p.diferenca!=null && Math.abs(Number(p.diferenca))<=tolerance);
    const reasons=[...new Set(rows.flatMap(p=>(p.problemas||[]).map(v=>v.motivo)))];
    const message=(totalsMatch?'As somas conferem com o Desempenho dentro da tolerância. ':'A soma das faixas ainda não foi conciliada com o Desempenho. ')
      +'Gráfico mantido com os dados disponíveis. Ocorrências: '+reasons.map(r=>labels[r]||r).join('; ')+'. A tabela abaixo preserva os totais originais para conferência.';
    container.innerHTML='<p>'+esc(message)+'</p><div class="mortality-audit-scroll"><table><thead><tr><th>Período</th>'+payload.faixas.map(f=>`<th>${esc(f.nome)}</th>`).join('')+'<th>Soma</th><th>Desempenho</th><th>Diferença (p.p.)</th><th>Ocorrências</th></tr></thead><tbody>'+rows.map(p=>'<tr><th>'+esc(p.inicio)+'</th>'+payload.faixas.map(f=>`<td>${format(p.faixas[f.id])}</td>`).join('')+`<td>${format(p.soma_faixas)}</td><td>${format(p.total)}</td><td>${format(p.diferenca)}</td><td>${esc([...new Set((p.problemas||[]).map(v=>labels[v.motivo]||v.motivo))].join('; '))}</td></tr>`).join('')+'</tbody></table></div>';
    // Não duplicar cada problema na linha consolidada se ele já está listado no período.
    let details=payload.periodos.flatMap(p=>(p.problemas||[]).map(issue=>({period:p.inicio,issue})));
    if(!details.length)details=(payload.consolidado?.problemas||[]).map(issue=>({period:'Total do contexto',issue}));
    if(details.length) {
      const detailedRows=details.flatMap(({period,issue})=>{
        const identity=issue.identificacao||{},fields=issue.campos?.length?issue.campos:[null];
        return fields.map(field=>{
          const components=field?Object.entries(field.componentes||{}).map(([key,value])=>`${key} = ${value??'ausente'}`).join('; '):'';
          const origin=identity.origem_arquivo||'';
          const help=field?'Conferir estes valores na origem e na linha do banco. Não substituir por zero sem confirmar.':'A API atual informa a chave do lote. Atualize o diagnóstico do backend para obter campo, valor e ID da linha.';
          return '<tr><td>'+esc(period)+'</td><td>'+esc(identity.codigo_produtor||'—')+'</td><td>'+esc(identity.galpao||'—')+'</td><td>'+esc(identity.numero_lote||'—')+'</td><td>'+esc(identity.alojamento||'—')+'</td><td>'+esc(identity.abate||'—')+'</td><td>'+esc(identity.base_dinamica_id??'—')+'</td><td>'+esc(field?.campo||labels[issue.motivo]||issue.motivo)+'</td><td>'+esc(field?format(field.valor)+'%':'Campo/valor não fornecidos nesta versão da API')+'</td><td>'+esc(components)+'</td><td>'+esc(issue.lote||'—')+'</td><td>'+esc(origin)+'</td><td>'+esc(help)+'</td></tr>';
        });
      }).join('');
      container.innerHTML+='<details class="mortality-record-details"><summary>Ver registros que precisam de conferência ('+details.length+' ocorrências por período)</summary><div class="mortality-audit-scroll"><table><thead><tr><th>Período</th><th>Código produtor</th><th>Galpão</th><th>Lote</th><th>Alojamento</th><th>Abate</th><th>ID base dinâmica</th><th>Campo</th><th>Valor</th><th>Componentes originais</th><th>Chave do Desempenho</th><th>Arquivo de origem</th><th>Como conferir</th></tr></thead><tbody>'+detailedRows+'</tbody></table></div></details>';
    }
    container.classList.remove('hidden');
  }

  function draw(instance,payload) {
    const changed=current!==payload;
    if(chart){chart.off('datazoom',zoomed);chart.off('click',clicked);}
    chart=instance;current=payload;
    if(payload.rules_version!=='mortalidade-faixas-2026-10-26-v1')throw new Error('Atualize o backend para as faixas de mortalidade.');
    element('mortalityAudit').classList.add('hidden');
    element('mortalityLegend').innerHTML='';
    const displayed=payload.periodos.map(presentation);
    const partial=displayed.filter(p=>p.partial).length;
    const unavailable=payload.periodos.filter((p,i)=>p.lotes&&!displayed[i].show).length;
    const notice=element('mortalityPartialNotice');
    if(notice){
      notice.textContent=`Resultado parcial: ${partial} período(s) com faixas calculadas apenas sobre os lotes vinculados e válidos${unavailable?`; ${unavailable} período(s) sem faixas conferidas`:''}. Nos períodos parciais, a linha também usa o total desses lotes. KPI e rankings mantêm a base completa e suas exclusões atuais. Consulte as ocorrências abaixo.`;
      notice.classList.toggle('hidden',payload.valido===true);
    }
    if(!payload.valido)audit(payload);
    const host=element('evolucaoChart'),css=getComputedStyle(host);
    const c=(name,other)=>css.getPropertyValue(name).trim()||other;
    const colors=fallback.map((color,i)=>c('--mortality-band-'+i,color));
    const strong=c('--foreground','#211b1d'),muted=c('--muted-foreground','#766d70');
    const weekly=payload.agrupamento==='semanal';
    const width=Math.max(280,host.parentElement.clientWidth);
    host.style.width='100%';chart.resize();
    if(weekly) {
      const count=Math.min(payload.periodos.length,weekCount(width));
      weekEnd=changed?payload.periodos.length-1:Math.min(weekEnd,payload.periodos.length-1);
      weekStart=Math.max(0,weekEnd-count+1);
    }
    weekControls();
    const names=payload.faixas.map(f=>f.nome);
    element('mortalityLegend').innerHTML=names.map((name,i)=>`<span><i style="background:${colors[i]}"></i>${esc(name)}</span>`).join('')+`<span><i class="mortality-line-key" style="background:${strong}"></i>% Mort. Total</span>`;
    const series=payload.faixas.map((f,i)=>({name:f.nome,type:'bar',stack:'mortalidade',barMaxWidth:56,
      cursor:'pointer',
      data:payload.periodos.map((p,index)=>({value:displayed[index].show?p.faixas[f.id]:null,itemStyle:{borderRadius:
        p.faixas[f.id]>0 && !payload.faixas.slice(i+1).some(next=>p.faixas[next.id]>0)?[8,8,0,0]:0}})),itemStyle:{color:colors[i]},
      label:{show:true,position:'inside',fontSize:11,color:i<3?'#fff':'#122026',formatter:p=>p.value==null||p.value===0?'':format(p.value)},
      labelLayout:{hideOverlap:true}}));
    series.push({name:'% Mort. Total',type:'line',yAxisIndex:0,smooth:0.22,smoothMonotone:'x',connectNulls:false,symbol:'circle',symbolSize:7,z:10,
      lineStyle:{color:strong,width:2.5,cap:'round',join:'round'},itemStyle:{color:strong},data:displayed.map(p=>p.total),
      label:{show:true,position:'top',distance:10,fontWeight:700,fontSize:12,color:c('--mortality-total-label','#c95b65'),formatter:p=>p.value==null?'':format(p.value)},
      labelLayout:{hideOverlap:true}});
    chart.setOption({animationDuration:200,textStyle:{fontFamily:getComputedStyle(document.body).fontFamily},legend:{show:false},
      tooltip:{trigger:'axis',confine:true,renderMode:'richText',backgroundColor:c('--card','#fff'),borderColor:c('--border','#ddd'),textStyle:{color:strong},valueFormatter:v=>format(v)+'%',
        formatter:points=>{
          const index=points[0]?.dataIndex,period=payload.periodos[index],view=displayed[index];
          if(!period)return '';
          return [period.inicio,...points.map(point=>`${point.seriesName}: ${format(point.value)}%`),
            view.partial?`Parcial: ${period.vinculados} de ${period.lotes} lotes; faixas e linha sobre os vinculados.`:
            view.show?'Faixas conferidas com o Desempenho.':'Faixas indisponíveis; linha = total do Desempenho.'].join('\n');
        }},
      grid:{left:60,right:32,top:48,bottom:weekly?96:44},
      dataZoom:weekly?[{type:'slider',xAxisIndex:0,startValue:weekStart,endValue:weekEnd,
        bottom:12,height:24,left:60,right:32,filterMode:'filter',zoomLock:true,brushSelect:false,
        showDetail:false,showDataShadow:false,throttle:50,borderColor:c('--border','#ddd'),
        fillerColor:'rgba(37,99,235,0.18)',handleStyle:{color:colors[1]},moveHandleStyle:{color:colors[1]}},
        {type:'inside',xAxisIndex:0,startValue:weekStart,endValue:weekEnd,filterMode:'filter',
        zoomLock:true,zoomOnMouseWheel:false,moveOnMouseWheel:true,moveOnMouseMove:true}]:[],
      xAxis:{type:'category',data:payload.periodos.map(p=>payload.agrupamento==='mensal'?monthNames[p.mes-1]:`Sem. ${p.semana}`),
        axisLabel:{interval:0,color:muted},axisLine:{lineStyle:{color:c('--border','#ddd')}}},
      yAxis:{type:'value',min:0,interval:3,max:r=>Math.max(3,Math.ceil(r.max*1.12/3)*3),name:'%',axisLabel:{color:muted,formatter:v=>Number(v).toLocaleString('pt-BR',{maximumFractionDigits:0})+'%'},splitLine:{lineStyle:{color:c('--border','#ddd'),opacity:0.5,width:1}}},
      series},true);
    chart.on('datazoom',zoomed);
    chart.on('click',clicked);
  }
  function clear(){if(chart){chart.off('datazoom',zoomed);chart.off('click',clicked);}current=null;weekControls();window.MortalityLots?.close();element('mortalityAudit')?.classList.add('hidden');element('mortalityPartialNotice')?.classList.add('hidden');element('mortalityLegend').innerHTML='';element('evolucaoChart').style.width='';}
  const resize = ()=>{if(current&&chart)draw(chart,current);};
  window.addEventListener('resize',resize);
  return {draw,clear,format,setLotOpener:callback=>{lotOpener=callback;}};
})();
