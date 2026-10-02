(() => {
  const A=ApiScreen,E=A.element,H=A.escape,N=A.number;
  let data,context={},unit="",page=1,detailAbort,detailId=0,opener;
  const pager=document.createElement("div");pager.className="card-actions";
  pager.innerHTML='<button class="mini-button" id="rxpPrevious" type="button">Anterior</button><span id="rxpPage" role="status"></span><button class="mini-button" id="rxpNext" type="button">Próxima</button>';
  E("tabelaProdutoresAbate").closest(".abate-table-wrap").after(pager);
  function close(){++detailId;detailAbort?.abort();E("modalAbate").classList.add("hidden");opener?.focus();}
  function row(label,c,index) {
    return `<tr><td>${H(label)}</td><td class="num">${N(c.programada)}</td><td class="num">${N(c.real)}</td><td class="num">${N(c.difPercent,2)}%</td><td class="num">${N(c.diferenca)}</td><td class="num">${N(c.registrosComDiferenca)}</td><td><button class="mini-button" type="button" data-rxp-unit="${index}">Ver produtores</button></td></tr>`;
  }
  function render(result,params){
    data=result;context=params;
    [["kpiProgramada","programada"],["kpiReal","real"],["kpiDiferenca","diferenca"],["kpiRegistros","registrosComDiferenca"]].forEach(([id,key])=>E(id).textContent=N(data.cards[key]));
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
      E("tabelaProdutoresAbate").innerHTML=result.dados.length?result.dados.map(r=>`<tr>${[r.unidade,r.produtor,r.tecnico,r.data,r.galpao,r.lote,r.tipo_granja,r.modelo].map(v=>`<td>${H(v)}</td>`).join("")}<td class="num">${N(r.programada)}</td><td class="num">${N(r.real)}</td><td class="num">${N(r.difPercent,2)}%</td><td class="num">${N(r.difQtdeRxP)}</td></tr>`).join(""):'<tr><td colspan="12">Nenhum registro.</td></tr>';
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
