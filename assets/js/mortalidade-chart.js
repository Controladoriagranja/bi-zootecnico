/* Nova modificação de 26/10/2026. Exclusivo do gráfico inferior de mortalidade. */
window.MortalityChart = (() => {
  const format = value => value == null ? '—' : Number(value).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2});
  const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const monthNames = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const fallback = ['#1E3A8A','#2563EB','#0EA5E9','#14B8A6','#84CC16','#F59E0B'];
  let current=null, chart=null;
  const element = id => document.getElementById(id);
  function audit(payload) {
    const container = element('mortalityAudit');
    const rows = [...payload.periodos.filter(p=>p.lotes), ...(payload.consolidado?[{...payload.consolidado,inicio:'Total do contexto'}]:[])];
    container.innerHTML='<p>Conferência interrompida. Há faixa negativa, base ausente ou diferença em relação ao Desempenho. Os valores não foram ajustados.</p><div class="mortality-audit-scroll"><table><thead><tr><th>Período</th>'+payload.faixas.map(f=>`<th>${esc(f.nome)}</th>`).join('')+'<th>Soma</th><th>Desempenho</th><th>Diferença (p.p.)</th><th>Ocorrências</th></tr></thead><tbody>'+rows.map(p=>'<tr><th>'+esc(p.inicio)+'</th>'+payload.faixas.map(f=>`<td>${format(p.faixas[f.id])}</td>`).join('')+`<td>${format(p.soma_faixas)}</td><td>${format(p.total)}</td><td>${format(p.diferenca)}</td><td>${esc([...new Set((p.problemas||[]).map(v=>v.motivo))].join('; '))}</td></tr>`).join('')+'</tbody></table></div>';
    container.classList.remove('hidden');
  }
  function draw(instance,payload) {
    chart=instance;current=payload;
    if(payload.rules_version!=='mortalidade-faixas-2026-10-26-v1')throw new Error('Atualize o backend para as faixas de mortalidade.');
    element('mortalityAudit').classList.add('hidden');
    element('mortalityLegend').innerHTML='';
    if(!payload.valido){chart.clear();audit(payload);return;}
    const host=element('evolucaoChart'),css=getComputedStyle(host);
    const c=(name,other)=>css.getPropertyValue(name).trim()||other;
    const colors=fallback.map((color,i)=>c('--mortality-band-'+i,color));
    const strong=c('--foreground','#211b1d'),muted=c('--muted-foreground','#766d70');
    const width=Math.max(host.parentElement.clientWidth,payload.periodos.length*86+110);
    if(host.style.width!==width+'px'){host.style.width=width+'px';chart.resize();}
    const names=payload.faixas.map(f=>f.nome);
    element('mortalityLegend').innerHTML=names.map((name,i)=>`<span><i style="background:${colors[i]}"></i>${esc(name)}</span>`).join('')+`<span><i class="mortality-line-key" style="background:${strong}"></i>% Mort. Total</span>`;
    const series=payload.faixas.map((f,i)=>({name:f.nome,type:'bar',stack:'mortalidade',barMaxWidth:56,
      data:payload.periodos.map(p=>p.faixas[f.id]),itemStyle:{color:colors[i]},
      label:{show:true,position:'inside',fontSize:11,color:i<3?'#fff':'#122026',formatter:p=>p.value==null||p.value===0?'':format(p.value)},
      labelLayout:{hideOverlap:true}}));
    series.push({name:'% Mort. Total',type:'line',yAxisIndex:0,smooth:false,connectNulls:false,symbol:'circle',symbolSize:7,z:10,
      lineStyle:{color:strong,width:3},itemStyle:{color:strong},data:payload.periodos.map(p=>p.total),
      label:{show:true,position:'top',distance:10,fontWeight:700,fontSize:12,color:c('--mortality-total-label','#c95b65'),formatter:p=>p.value==null?'':format(p.value)},
      labelLayout:{hideOverlap:true}});
    chart.setOption({animationDuration:200,textStyle:{fontFamily:getComputedStyle(document.body).fontFamily},legend:{show:false},
      tooltip:{trigger:'axis',confine:true,renderMode:'richText',backgroundColor:c('--card','#fff'),borderColor:c('--border','#ddd'),textStyle:{color:strong},valueFormatter:v=>format(v)+'%'},
      grid:{left:60,right:32,top:48,bottom:44},
      xAxis:{type:'category',data:payload.periodos.map(p=>payload.agrupamento==='mensal'?monthNames[p.mes-1]:`Sem. ${p.semana}`),
        axisLabel:{interval:0,color:muted},axisLine:{lineStyle:{color:c('--border','#ddd')}}},
      yAxis:{type:'value',min:0,max:r=>Math.max(1,r.max*1.18),name:'%',axisLabel:{color:muted,formatter:v=>Number(v).toLocaleString('pt-BR')+'%'},splitLine:{lineStyle:{color:c('--border','#ddd')}}},
      series},true);
  }
  function clear(){current=null;element('mortalityAudit')?.classList.add('hidden');element('mortalityLegend').innerHTML='';element('evolucaoChart').style.width='';}
  const resize = ()=>{if(current&&chart)draw(chart,current);};
  window.addEventListener('resize',resize);
  return {draw,clear,format};
})();
