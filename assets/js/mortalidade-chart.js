/* Nova modificação de 26/10/2026. Exclusivo do gráfico inferior de mortalidade. */
window.MortalityChart = (() => {
  // Somente apresentação: diferenças menores que meia casa não devem aparecer como -0,00.
  const format = value => value == null ? '—' : (Math.abs(Number(value)) < 0.005 ? 0 : Number(value)).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2});
  const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const monthNames = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const fallback = ['#1E3A8A','#2563EB','#0EA5E9','#14B8A6','#84CC16','#F59E0B'];
  let current=null, chart=null;
  const element = id => document.getElementById(id);
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
      +'Gráfico interrompido: '+reasons.map(r=>labels[r]||r).join('; ')+'. Os valores não foram ajustados.';
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
