(() => {
  const A=ApiScreen,E=A.element,H=A.escape,N=A.number;
  const dimensions=[["type","tipo_granja","Tipo de Granja"],["producer","produtor","Produtor"],["model","modelo","Modelo"],["barn","galpao","Galpão"],["technician","tecnico","Técnico"],["originalLineage","linhagem","Linhagem"],["lineage","mist_linha","Mist Linha"]];
  E("historyFilters").innerHTML=dimensions.map(([id,,label])=>`<div class="filter-field"><span>${label}</span><div id="history-filter-${id}" class="checkbox-multiselect"></div></div>`).join("");
  const spec=[["lotes","Lotes consultados"],["aves","Aves alojadas"],["mortalidade","Mortalidade acumulada",2,"%"],["peso_atual","Peso médio atual (kg)",3]];
  function cards(values) {
    A.cards('historyKpis',values,spec,'history-kpi');
    E('historyKpis').querySelectorAll('article').forEach((card,index)=>{
      const button=document.createElement('button');button.type='button';button.className='mini-button';
      button.style.cssText='float:right;min-width:40px;min-height:40px';
      button.dataset.historicoFormula=spec[index][0];button.setAttribute('aria-label','Ver fórmula do indicador');
      button.innerHTML='<span class="formula-fx">ƒx</span>';card.prepend(button);
    });
  }
  let data,view="mortality",year="",sequence=0;
  const expanded=new Set();
  function values(cards,weekly,tag='td') {
    const points=new Map(weekly.map(w=>[w.idade,w]));
    const cell=(value,combined=false,alert=false)=>`<${tag} class="num${combined?' history-col-combined':''}${alert?' history-md-alert':''}">${value}</${tag}>`;
    const percentage=value=>value==null?'—':N(value,2)+'%';
    const combinedCell=value=>{
      const displayed=N(value,2);
      const rounded=Number(displayed.replace(/\./g,'').replace(',','.'));
      return cell(percentage(value),true,Number.isFinite(rounded)&&rounded>1);
    };
    return cell(N(cards.aves))+cell(percentage(cards.mortalidade))+cell(N(cards.peso_pinto,3))+cell(N(cards.peso_abate_final,3))+cell(cards.vezes_maior==null?'—':N(cards.vezes_maior,1)+'×')+[7,14,21,28,35].map(age=>{
      const w=points.get(age);
      return view==="weight"?cell(N(w?.peso,2)):combinedCell(w?.mortalidade)+cell(percentage(w?.mortalidade_sem_descartes))+cell(percentage(w?.descarte_percent));
    }).join("");
  }
  function renderTable() {
    const count=view==="weight"?12:22;
    E("historyTableHead").innerHTML='<tr><th>Semana / Produtor</th><th>Galpão</th><th class="num">Aves Alojadas</th><th class="num" title="Soma de mortes e descartes de 7, 14, 21, 28 e 35 dias / aves alojadas do grupo vezes 100">Mortalidade total (%)</th><th class="num" title="Média simples de ps_pinto dos lotes do grupo">Peso do pintinho (g)</th><th class="num" title="Média simples de ps_abate dos lotes com vínculo">Peso de abate (kg)</th><th class="num" title="Média simples de (ps_abate × 1000) / ps_pinto por lote com pesos positivos">Vezes maior</th>'+[7,14,21,28,35].map(age=>view==="weight"?`<th class="num">Peso Med. ${age} dias</th>`:`<th class="num history-col-combined">%M+D${age}</th><th class="num">%M${age}</th><th class="num">%D${age}</th>`).join("")+'</tr>';
    if(!data)return;
    let rows=[],buttons=[]; sequence=0;
    function traverse(nodes,path=[]){nodes.forEach(node=>{
      const next=[...path,node.valor],key=JSON.stringify(next),id=sequence++,open=expanded.has(key);
      buttons.push([id,key]);
      const label=node.campo==="semana"?`Semana ${node.valor}`:node.valor;
      rows.push(`<tr class="history-row history-level-${path.length}" data-sort-depth="${path.length}"><td>${node.children.length?`<button class="history-expand" type="button" data-history-node="${id}" aria-expanded="${open}"><span>${open?'−':'+'}</span><span>${H(label)}</span></button>`:H(node.campo==='galpao'?`Galpão ${label}`:label)}</td><td>${node.campo==="galpao"?H(label):'—'}</td>${values(node.cards,node.weekly)}</tr>`);
      if(open)traverse(node.children,next);
    });}
    traverse(data.hierarchy||[]);
    E("historyTableBody").innerHTML=rows.join("")||`<tr><td colspan="${count}">Nenhum lote para os filtros selecionados.</td></tr>`;
    E("historyTableFoot").innerHTML=`<tr><th colspan="2">Total</th>${values(data.cards,data.weekly,'th')}</tr>`;
    E("historyTableBody").querySelectorAll("[data-history-node]").forEach(b=>b.addEventListener("click",()=>{const key=buttons.find(([id])=>id===Number(b.dataset.historyNode))[1];expanded.has(key)?expanded.delete(key):expanded.add(key);renderTable();}));
    document.querySelector(".history-table").dataset.view=view;
  }
  const screen=A.connect({bi:"historico-abertos",errorId:"mensagemErroHistorico",clearId:"limparFiltrosHistorico",fields:dimensions.map(([id,key])=>['history-filter-'+id,key]),context:()=>year?{ano:year}:{},
    clear:()=>{data=null;cards(null);E("historyTableBody").innerHTML=`<tr><td colspan="${view==='weight'?12:22}">Consultando…</td></tr>`;E("historyTableFoot").innerHTML="";},
    onOptions:options=>{
      const host=document.querySelector(".history-year-filter");
      const years=[...new Set((options.ano||[]).map(String).filter(y=>/^\d{4}$/.test(y)&&Number(y)>=2023&&Number(y)<=new Date().getFullYear()))].sort((a,b)=>Number(b)-Number(a));
      if(!years.includes(year))year=years[0]||"";
      host.innerHTML=years.map(y=>`<button type="button" class="history-year-button ${y===year?"active":""}" data-history-year="${H(y)}" role="radio" aria-checked="${y===year}">${H(y)}</button>`).join("");
      host.querySelectorAll("[data-history-year]").forEach(b=>b.addEventListener("click",()=>{year=b.dataset.historyYear;screen.refresh();}));
    },render:result=>{data=result;expanded.clear();cards(result.cards);renderTable();}});
  document.querySelectorAll("[data-history-view]").forEach(b=>b.addEventListener("click",()=>{view=b.dataset.historyView;document.querySelectorAll("[data-history-view]").forEach(x=>{x.classList.toggle("active",x===b);x.setAttribute("aria-checked",String(x===b));});renderTable();}));
  document.querySelector(".history-year-filter").innerHTML="";
  renderTable();
  BIUnavailable.formulas({prefix:"Historico",catalog:FORMULAS_HISTORICO,attribute:"data-historico-formula"});
})();
