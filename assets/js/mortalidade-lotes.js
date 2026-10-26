/* Nova modificação de 26/10/2026: lotes do período escolhido, somente ao clicar. */
window.MortalityLots=(()=>{
  const E=id=>document.getElementById(id);
  const H=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const N=(value,digits=2)=>value==null?'—':Number(value).toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  const date=value=>value?/^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('/'):value:'—';
  let selection=null,controller=null,sequence=0,page=1,totalPages=0,initialized=false;
  function close(){controller?.abort();++sequence;selection=null;if(E('mortalityLotsDialog')?.open)E('mortalityLotsDialog').close();}
  function init(){
    if(initialized)return;
    E('mortalityLotsClose').onclick=close;
    E('mortalityLotsPrevious').onclick=()=>load(page-1);
    E('mortalityLotsNext').onclick=()=>load(page+1);
    E('mortalityLotsDialog').addEventListener('close',()=>{controller?.abort();++sequence;selection=null;});
    initialized=true;
  }
  function render(data){
    if(data.lot_rules_version!=='mortalidade-lotes-2026-10-26-v1'||!Array.isArray(data.dados)
      ||data.ano!==selection.year||data.agrupamento!==selection.grouping||data.inicio_periodo!==selection.period.inicio)
      throw new Error('Atualize o complemento de lotes no backend para abrir este detalhamento.');
    page=data.pagina;totalPages=data.total_paginas;
    const excluded=data.resumo?.lotes_excluidos||0;
    E('mortalityLotsContext').textContent=`${date(data.data_inicio)} a ${date(data.data_fim)} · ${data.total} lotes${excluded?` · ${excluded} excluídos por valores negativos`:''}`;
    const phase=selection.phase;
    const heads=['Produtor','Galpão','Lote','Alojamento','Abate','Aves alojadas',phase.nome,'% Mort. Total','Detalhe'];
    E('mortalityLotsContent').innerHTML=data.dados.length?'<div class="mortality-lots-table-scroll"><table><thead><tr>'+heads.map(h=>`<th>${H(h)}</th>`).join('')+'</tr></thead><tbody>'+data.dados.map(row=>{
      const phases=data.faixas.map(f=>`<div class="${f.id===phase.id?'selected':''}"><dt>${H(f.nome)}</dt><dd>${N(row.faixas[f.id])}%</dd></div>`).join('');
      return `<tr><td><strong>${H(row.produtor||row.codigo_produtor||'—')}</strong><small>Cód. ${H(row.codigo_produtor||'—')}</small></td><td>${H(row.galpao||'—')}</td><td>${H(row.lote||'—')}</td><td>${H(date(row.alojamento))}</td><td>${H(date(row.abate))}</td><td class="num">${N(row.aves_alojadas,0)}</td><td class="num selected">${N(row.faixas[phase.id])}%</td><td class="num">${N(row.mortalidade)}%</td><td><details><summary>Ver lote</summary><div class="mortality-lot-expanded"><p>Técnico: ${H(row.tecnico||'—')}</p><dl>${phases}</dl>${!row.base_vinculada?'<p>Sem vínculo na base dinâmica.</p>':''}</div></details></td></tr>`;
    }).join('')+'</tbody></table></div>':'<p>Nenhum lote para este período e estes filtros.</p>';
    const warning=data.resumo && (!data.resumo.valido || Math.abs(Number(data.resumo.total)-Number(selection.period.total))>0.01);
    E('mortalityLotsWarning').textContent=warning?'Os dados consultados agora apresentam atualização ou divergência em relação ao gráfico. Recarregue a análise para conferir os totais.':'';
    E('mortalityLotsWarning').classList.toggle('hidden',!warning);
    E('mortalityLotsPage').textContent=totalPages?`Página ${page} de ${totalPages}`:'Sem resultados';
    E('mortalityLotsPrevious').disabled=page<=1;
    E('mortalityLotsNext').disabled=page>=totalPages;
  }
  async function load(nextPage=1){
    if(!selection||nextPage<1)return;
    controller?.abort();controller=new AbortController();const request=++sequence;
    E('mortalityLotsContent').textContent='Carregando os lotes deste período…';
    E('mortalityLotsPrevious').disabled=true;E('mortalityLotsNext').disabled=true;
    E('mortalityLotsWarning').classList.add('hidden');
    try{
      const data=await apiGet(APP_CONFIG.endpoints.detalhes,{...selection.filters,
        indicador:'mortalidade',etapa:'lotes',ano:selection.year,agrupamento:selection.grouping,
        inicio_periodo:selection.period.inicio,pagina:nextPage,tamanho:50},{signal:controller.signal});
      if(request!==sequence||!selection)return;
      render(data);
    }catch(error){
      if(request!==sequence||error.name==='AbortError')return;
      E('mortalityLotsContent').textContent=error.status===422
        ? 'O backend instalado ainda não oferece os lotes por período. Instale o complemento deste ajuste para abrir a lista.'
        : error.message||'Não foi possível consultar os lotes.';
    }
  }
  function open(value){
    init();selection={...value,filters:structuredClone(value.filters)};
    E('mortalityLotsTitle').textContent=`Lotes · ${value.phase.nome} · ${value.grouping==='semanal'?`semana ${value.period.semana}`:new Date(Date.UTC(value.year,value.period.mes-1,1)).toLocaleString('pt-BR',{month:'long',timeZone:'UTC'})} de ${value.year}`;
    E('mortalityLotsContext').textContent='Mesmo contexto de filtros do gráfico';
    E('mortalityLotsPage').textContent='';
    if(!E('mortalityLotsDialog').open)E('mortalityLotsDialog').showModal();
    return load(1);
  }
  return {open,close};
})();
