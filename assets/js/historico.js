(() => {
  const A=ApiScreen,E=A.element,H=A.escape,N=A.number;
  const dimensions=[["type","tipo_granja","Tipo de Granja"],["producer","produtor","Produtor"],["model","modelo","Modelo"],["barn","galpao","Galpão"],["technician","tecnico","Técnico"],["lineage","mist_linha","Mist Linha"]];
  E("historyFilters").innerHTML=dimensions.map(([id,,label])=>`<div class="filter-field"><span>${label}</span><div id="history-filter-${id}" class="checkbox-multiselect"></div></div>`).join("");
  const spec=[["lotes","Lotes consultados"],["aves","Aves alojadas"],["mortalidade","Mortalidade acumulada",2,"%"],["peso_atual","Peso médio atual (kg)",3]];
  let data,view="mortality",year="",sequence=0;
  const expanded=new Set();
  function values(cards,weekly) {
    const points=new Map(weekly.map(w=>[w.idade,w]));
    return `<td class="num">${N(cards.aves)}</td>`+[7,14,21,28,35].map(age=>{
      const w=points.get(age);
      return view==="weight"?`<td class="num">${N(w?.peso,2)}</td>`:`<td class="num">${N(w?.mortalidade,2)}</td><td class="num">${N(w?.mortalidade_sem_descartes,2)}</td><td class="num">${N(w?.descarte_percent,2)}</td>`;
    }).join("");
  }
  function renderTable() {
    const count=view==="weight"?8:18;
    E("historyTableHead").innerHTML='<tr><th>Semana / Produtor</th><th>Galpão</th><th>Aves Alojadas</th>'+[7,14,21,28,35].map(age=>view==="weight"?`<th>Peso ${age}</th>`:`<th>%M+D ${age}</th><th>%M ${age}</th><th>%D ${age}</th>`).join("")+'</tr>';
    if(!data)return;
    let rows=[],buttons=[]; sequence=0;
    function traverse(nodes,path=[]){nodes.forEach(node=>{
      const next=[...path,node.valor],key=JSON.stringify(next),id=sequence++,open=expanded.has(key);
      buttons.push([id,key]);
      const label=node.campo==="semana"?`Semana ${node.valor}`:node.valor;
      rows.push(`<tr data-sort-depth="${path.length}"><td style="padding-left:${12+path.length*20}px">${node.children.length?`<button class="mini-button" type="button" data-history-node="${id}" aria-expanded="${open}">${open?"−":"+"}</button> `:""}${node.campo!=="galpao"?H(label):""}</td><td>${node.campo==="galpao"?H(label):""}</td>${values(node.cards,node.weekly)}</tr>`);
      if(open)traverse(node.children,next);
    });}
    traverse(data.hierarchy||[]);
    E("historyTableBody").innerHTML=rows.join("")||`<tr><td colspan="${count}">Nenhum lote para os filtros selecionados.</td></tr>`;
    E("historyTableFoot").innerHTML=`<tr><td colspan="2">Total</td>${values(data.cards,data.weekly)}</tr>`;
    E("historyTableBody").querySelectorAll("[data-history-node]").forEach(b=>b.addEventListener("click",()=>{const key=buttons.find(([id])=>id===Number(b.dataset.historyNode))[1];expanded.has(key)?expanded.delete(key):expanded.add(key);renderTable();}));
    document.querySelector(".history-table").dataset.view=view;
  }
  const screen=A.connect({bi:"historico-fechados",errorId:"mensagemErroHistorico",clearId:"limparFiltrosHistorico",fields:dimensions.map(([id,key])=>['history-filter-'+id,key]),context:()=>year?{ano:year}:{},
    clear:()=>{data=null;A.cards("historyKpis",null,spec,"history-kpi");E("historyTableBody").innerHTML='<tr><td colspan="18">Consultando…</td></tr>';E("historyTableFoot").innerHTML="";},
    onOptions:options=>{
      const host=document.querySelector(".history-year-filter");
      const years=[...new Set((options.ano||[]).map(String).filter(y=>/^\d{4}$/.test(y)&&Number(y)>=2023&&Number(y)<=new Date().getFullYear()))].sort((a,b)=>Number(b)-Number(a));
      if(!years.includes(year))year=years[0]||"";
      host.innerHTML=years.map(y=>`<button type="button" class="history-year-button ${y===year?"active":""}" data-history-year="${H(y)}" role="radio" aria-checked="${y===year}">${H(y)}</button>`).join("");
      host.querySelectorAll("[data-history-year]").forEach(b=>b.addEventListener("click",()=>{year=b.dataset.historyYear;screen.refresh();}));
    },render:result=>{data=result;expanded.clear();A.cards("historyKpis",result.cards,spec,"history-kpi");renderTable();}});
  document.querySelectorAll("[data-history-view]").forEach(b=>b.addEventListener("click",()=>{view=b.dataset.historyView;document.querySelectorAll("[data-history-view]").forEach(x=>{x.classList.toggle("active",x===b);x.setAttribute("aria-checked",String(x===b));});renderTable();}));
  document.querySelector(".history-year-filter").innerHTML="";
  renderTable();
  BIUnavailable.formulas({prefix:"Historico",catalog:FORMULAS_HISTORICO,attribute:"data-historico-formula"});
})();
