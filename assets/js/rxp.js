(() => {
  const A=ApiScreen,E=A.element,H=A.escape,N=A.number;
  const state=value=>value<0?"is-negative":value>0?"is-positive":"is-zero";
  const signed=(value,decimals=0)=>`${value>0?"+":""}${N(value,decimals)}`;
  const percent=value=>value==null?"—":`${signed(value,2)}%`;
  const pill=value=>`<span class="abate-diff-pill ${state(value)}">${signed(value)}</span>`;
  const date=value=>/^\d{4}-\d{2}-\d{2}/.test(String(value||''))?String(value).slice(0,10).split('-').reverse().join('/'):H(value);
  function detailRow(r) {
    const fields=[['Unidade',H(r.unidade)],['Produtor',`<strong>${H(r.produtor)}</strong>`],['Técnico',H(r.tecnico)],['Data',date(r.data)],['Galpão',H(r.galpao)],['Lote',H(r.lote)],['Tipo Granja',H(r.tipo_granja)],['Modelo Aviário',H(r.modelo)],['Qtde Programada',N(r.programada)],['Qtde Real',N(r.real)],['Dif %',percent(r.difPercent)],['Dif Qtde RxP',pill(r.difQtdeRxP)]];
    return `<tr class="abate-row ${state(r.difQtdeRxP)}">${fields.map(([label,value],i)=>`<td data-label="${label}"${i>=8?' class="num"':''}>${value}</td>`).join('')}</tr>`;
  }
  let data,context={},unit="",page=1,detailAbort,detailId=0,opener;
  const pager=document.createElement("div");pager.className="card-actions";
  pager.innerHTML='<button class="mini-button" id="rxpPrevious" type="button">Anterior</button><span id="rxpPage" role="status"></span><button class="mini-button" id="rxpNext" type="button">Próxima</button>';
  E("tabelaProdutoresAbate").closest(".abate-table-wrap").after(pager);
  function close(){++detailId;detailAbort?.abort();E("modalAbate").classList.add("hidden");opener?.focus();}
  function row(label,c,index) {
    const tag=index===-1?'th':'td';
    return `<tr class="abate-row ${state(c.diferenca)}"><${tag}><strong>${H(label)}</strong></${tag}><${tag} class="num">${N(c.programada)}</${tag}><${tag} class="num">${N(c.real)}</${tag}><${tag} class="num">${percent(c.difPercent)}</${tag}><${tag} class="num">${pill(c.diferenca)}</${tag}><${tag} class="num">${N(c.registrosComDiferenca)}</${tag}><${tag} class="action"><button class="mini-button" type="button" data-rxp-unit="${index}">Ver produtores</button></${tag}></tr>`;
  }
  function render(result,params){
    data=result;context=params;
    [["kpiProgramada","programada"],["kpiReal","real"],["kpiDiferenca","diferenca"],["kpiRegistros","registrosComDiferenca"]].forEach(([id,key])=>E(id).textContent=N(data.cards[key]));
    E("kpiDiferenca").textContent=signed(data.cards.diferenca);
    const card=E("kpiDiferenca").closest(".abate-kpi-diff");
    card.classList.remove("is-negative","is-positive","is-zero");card.classList.add(state(data.cards.diferenca));
    E("kpiDiferencaLegenda").textContent=data.cards.diferenca<0?"aves abaixo do programado":data.cards.diferenca>0?"aves acima do programado":"sem diferença no contexto atual";
    E("statusRxp").textContent="Dados recebidos da API";
    E("periodoRxp").textContent="AVE NOVA / REAL ALIMENTOS";
    E("tabelaUnidadesAbate").innerHTML=data.groups.length?data.groups.map((g,i)=>row(g.unidade,g.cards,i)).join(""):'<tr><td colspan="7">Nenhum registro para os filtros selecionados.</td></tr>';
    E("tabelaUnidadesAbateTotal").innerHTML=row("Total",data.cards,-1);
    document.querySelectorAll("[data-rxp-unit]").forEach(b=>b.addEventListener("click",()=>{
      opener=b;unit=Number(b.dataset.rxpUnit)<0?"":data.groups[Number(b.dataset.rxpUnit)].unidade;page=1;
      E("modalAbateTitulo").textContent=unit?`Produtores · ${unit}`:"Produtores · Todas as unidades";
      E("modalAbate").classList.remove("hidden");E("modalAbateFechar").focus();details();
    }));
  }
  async function details(){
    const id=++detailId;detailAbort?.abort();detailAbort=new AbortController();
    E("tabelaProdutoresAbate").innerHTML='<tr><td colspan="12">Consultando…</td></tr>';
    ["modalProgramada","modalReal","modalDiferenca","modalDifPercent"].forEach(k=>E(k).textContent="—");
    E("rxpPrevious").disabled=true;E("rxpNext").disabled=true;
    try{
      const result=await apiGet('/api/bi/rxp/detalhes',{...context,...(unit?{unidade:unit}:{}),pagina:page,tamanho:50},{signal:detailAbort.signal});
      if(id!==detailId)return;
      if(!Array.isArray(result.dados)||!result.cards||!Number.isInteger(result.total))throw new Error("Contrato de detalhes incompatível.");
      [["modalProgramada","programada",0],["modalReal","real",0],["modalDiferenca","diferenca",0],["modalDifPercent","difPercent",2]].forEach(([k,v,d])=>E(k).textContent=N(result.cards[v],d));
      E("modalDiferenca").textContent=signed(result.cards.diferenca);
      E("modalDifPercent").textContent=percent(result.cards.difPercent);
      ["modalDiferenca","modalDifPercent"].forEach(k=>E(k).className=`abate-summary-diff ${state(result.cards.diferenca)}`);
      E("tabelaProdutoresAbate").innerHTML=result.dados.length?result.dados.map(detailRow).join(''):'<tr><td colspan="12" class="abate-empty">Nenhum registro.</td></tr>';
      E("rxpPage").textContent=`Página ${page} de ${Math.max(1,result.total_paginas)} · ${N(result.total)} registros`;
      E("rxpPrevious").disabled=page<=1;E("rxpNext").disabled=page>=result.total_paginas;
    }catch(error){if(error.name!=="AbortError"&&id===detailId){E("tabelaProdutoresAbate").innerHTML=`<tr><td colspan="12">${H(error.message)}</td></tr>`;E("rxpPage").textContent="Consulta não concluída";}}
  }
  E("rxpPrevious").addEventListener("click",()=>{page--;details();});E("rxpNext").addEventListener("click",()=>{page++;details();});
  ["modalAbateFechar","modalAbateBackdrop"].forEach(id=>E(id).addEventListener("click",close));
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!E("modalAbate").classList.contains("hidden"))close();});
  A.connect({bi:"rxp",errorId:"erroRxp",clearId:"limparFiltrosAbate",
    fields:[["filtroData","data"],["filtroUnidade","unidade"],["filtroProdutor","produtor"],["filtroGalpao","galpao"],["filtroTecnico","tecnico"],["filtroTipoGranja","tipo_granja"],["filtroModelo","modelo"]],
    clear:()=>{data=null;close();["kpiProgramada","kpiReal","kpiDiferenca","kpiRegistros"].forEach(id=>E(id).textContent="—");E("statusRxp").textContent="Consultando…";E("tabelaUnidadesAbate").innerHTML='<tr><td colspan="7">Consultando…</td></tr>';E("tabelaUnidadesAbateTotal").innerHTML="";},render});
  BIUnavailable.formulas({prefix:"Rxp",catalog:FORMULAS_RXP,attribute:"data-rxp-formula"});
})();
