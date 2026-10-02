(() => {
  const A = ApiScreen, E = A.element, N = A.number, H = A.escape;
  const spec = [["lotes","Lotes em Criação"],["aves","Aves Alojadas"],["mortes","Mortalidade no Período"],["mortalidade","Mortalidade (%)",2],["peso","Peso Médio Geral",2]];
  const icons = [
    '<path d="M12 3a6 6 0 0 0-5.7 4.1A5 5 0 0 0 7 17h10a4 4 0 0 0 .8-7.9A6 6 0 0 0 12 3Z"/><path d="M9 12h6M12 9v6"/>',
    '<path d="M6 11c0-4 2.6-7 6-7 2.7 0 5 2 5 4.5 0 3.4-2.7 5.5-6 5.5H8l-2 3v-6Z"/><path d="M15.5 5 18 3l1 3M8 18h8M10 14v4M14 14v4"/>',
    '<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    '<circle cx="8" cy="8" r="2"/><circle cx="16" cy="16" r="2"/><path d="m7 18 10-12"/>',
    '<path d="M7 8h10l2 11H5L7 8Z"/><path d="M9 8a3 3 0 0 1 6 0M12 12v3l2 1"/>'
  ];
  const formulas = ["lotes_criacao","aves_alojadas","mortalidade_qtde","mortalidade","peso_medio"];
  function cards(values) {
    E("cardsLotes").innerHTML = spec.map(([key,label,decimals=0],i)=>`<article class="card lotes-reference-kpi"><span class="lotes-kpi-topline"></span><div class="lotes-reference-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${icons[i]}</svg></div><div><div class="lotes-reference-label">${H(label)}</div><div class="lotes-reference-value">${N(values?.[key],decimals)}${key==="mortalidade"&&values?.[key]!=null?"%":""}</div></div><button class="mini-button lotes-formula-button" type="button" data-lotes-formula="${formulas[i]}" title="Ver fórmula"><span class="formula-fx">ƒx</span></button></article>`).join("");
  }
  let data, sort = "aves", descending = true;
  const cells = c => [N(c.aves),N(c.mortes),N(c.mortalidade,2),N(c.peso,2)].map(v=>`<td class="num">${v}</td>`).join("");
  function table() {
    if (!data) return;
    document.querySelectorAll('[data-sort]').forEach(button=>{
      const active=button.dataset.sort===sort;
      button.classList.toggle('active',active);
      button.closest('th').setAttribute('aria-sort',active?(descending?'descending':'ascending'):'none');
      button.querySelector('.sort-icon').textContent=active?(descending?'↓':'↑'):'↕';
    });
    const keys = {tipo:"tipo_granja",produtor:"produtor",linhagem:"linhagem"};
    const list = [...data.groups].sort((a,b)=>{
      const x = keys[sort] ? a[keys[sort]] : a.cards[sort], y = keys[sort] ? b[keys[sort]] : b.cards[sort];
      if (x == null) return y == null ? 0 : 1; if (y == null) return -1;
      return (typeof x === "number" ? x-y : String(x).localeCompare(String(y),"pt-BR",{numeric:true})) * (descending?-1:1);
    });
    E("tabelaLotesBody").innerHTML = list.length ? list.map(g=>`<tr><td>${H(g.tipo_granja)}</td><td>${H(g.produtor)}</td><td>${H(g.linhagem)}</td>${cells(g.cards)}</tr>`).join("") : '<tr><td colspan="7">Nenhum lote para os filtros selecionados.</td></tr>';
    E("tabelaLotesFoot").innerHTML = `<tr><td colspan="3">Total</td>${cells(data.cards)}</tr>`;
  }
  function barns() {
    if (!data) return;
    const better = E("galpaoRanking").value === "melhores";
    const list = [...data.galpoes].sort((a,b)=>a.cards.mortalidade==null?1:b.cards.mortalidade==null?-1:(a.cards.mortalidade-b.cards.mortalidade)*(better?1:-1));
    E("galpaoRankingTitulo").textContent = better ? "Top 10 galpões com melhor resultado" : "Top 10 galpões com pior resultado";
    E("galpaoRankingList").innerHTML = list.map((g,i)=>`<button class="lotes-galpao-rank-row" type="button" data-barn="${i}"><span class="lotes-galpao-rank-pos">${i+1}</span><span class="lotes-galpao-rank-name"><strong>${H(g.galpao)}</strong><small>${H(g.produtor)}</small></span><span class="lotes-galpao-rank-metric"><strong>${N(g.cards.aves)}</strong><small>Aves</small></span><span class="lotes-galpao-rank-metric"><strong>${N(g.cards.peso,2)}</strong><small>Peso</small></span><span class="lotes-galpao-rank-highlight"><strong>${N(g.cards.mortalidade,2)}${g.cards.mortalidade==null?"":"%"}</strong><small>Mortalidade</small></span><span class="lotes-galpao-detail-cta"><span>Ver detalhes</span><small>Galpão e evolução</small><b>›</b></span></button>`).join("") || '<div class="lotes-galpao-empty">Nenhum galpão para os filtros selecionados.</div>';
    E("galpaoRankingList").querySelectorAll("[data-barn]").forEach(b=>b.addEventListener("click",()=>drawer(list[Number(b.dataset.barn)])));
    A.chart("chartGalpoesRanking",list.slice(0,10).map(g=>`${g.produtor} · ${g.galpao}`),[{name:"Mortalidade (%)",type:"bar",data:list.slice(0,10).map(g=>g.cards.mortalidade)}],true,p=>{if(list[p.dataIndex])drawer(list[p.dataIndex]);});
  }
  function drawer(g) {
    E("galpaoDrawerTitulo").textContent = `Galpão ${g.galpao}`; E("galpaoDrawerProdutor").textContent = g.produtor;
    E("galpaoDrawerResumo").innerHTML = [["Idade atual",g.idade_atual==null?"—":N(g.idade_atual)+" dias"],["Linhagem",(g.linhagens||[]).join(" / ")||"—"],["Aves alojadas",N(g.cards.aves)],["Média de peso",N(g.cards.peso,2)],["Mortalidade",N(g.cards.mortalidade,2)+(g.cards.mortalidade==null?"":"%")]].map(([label,value])=>`<div><small>${H(label)}</small><strong>${H(value)}</strong></div>`).join("");
    E("galpaoDrawerTabela").innerHTML = g.weekly.map(w=>`<tr><td>${w.idade} dias</td><td class="num">${N(w.peso,2)}</td><td class="num lotes-mortality-cell">${N(w.mortalidade,2)}${w.mortalidade==null?"":"%"}</td></tr>`).join("");
    E("galpaoDrawer").classList.remove("hidden"); E("galpaoDrawer").setAttribute("aria-hidden","false");
    document.body.classList.add("lotes-drawer-open");
    A.chart("chartGalpaoDetalhe",g.weekly.map(w=>`${w.idade} dias`),[{name:"Mortalidade (%)",data:g.weekly.map(w=>w.mortalidade)}]);
  }
  function close() { E("galpaoDrawer").classList.add("hidden"); E("galpaoDrawer").setAttribute("aria-hidden","true"); document.body.classList.remove("lotes-drawer-open"); }
  ["galpaoDrawerFechar","galpaoDrawerBackdrop"].forEach(id=>E(id).addEventListener("click",close));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
  document.querySelectorAll("[data-lotes-view]").forEach(b=>b.addEventListener("click",()=>{
    const gal = b.dataset.lotesView === "galpoes";
    E("produtoresView").classList.toggle("hidden",gal); E("galpoesView").classList.toggle("hidden",!gal); E("galpaoRankingControls").classList.toggle("hidden",!gal);
    document.querySelectorAll("[data-lotes-view]").forEach(x=>{x.classList.toggle("active",x===b);x.setAttribute("aria-selected",String(x===b));});
    if(gal)barns();
  }));
  document.querySelectorAll("[data-sort]").forEach(b=>b.addEventListener("click",()=>{descending=b.dataset.sort===sort?!descending:true;sort=b.dataset.sort;table();}));
  E("galpaoRanking").addEventListener("change",barns);
  ApiScreen.connect({bi:"lotes-abertos",errorId:"mensagemErroLotes",clearId:"limparFiltrosLotes",
    fields:[["periodoDias","periodo_dias"],["tipoGranja","tipo_granja"],["produtor","produtor"],["modelo","modelo"],["galpao","galpao"],["tecnico","tecnico"],["mistLinha","mist_linha"]],
    clear:()=>{data=null;close();cards(null);E("tabelaLotesBody").innerHTML='<tr><td colspan="7">Consultando…</td></tr>';E("tabelaLotesFoot").innerHTML="";E("galpaoRankingList").innerHTML="";},
    render:result=>{data=result;cards(data.cards);table();barns();
      const weeks=data.weekly, labels=weeks.map(w=>`${w.idade} dias`);
      FORMULAS_LOTES.splice(0,FORMULAS_LOTES.length,...buildLotesFormulas(weeks.map(w=>w.idade),data.pinto==null));
      A.chart("chartMortalidade",labels,[{name:"M+D (Qtde)",type:"bar",data:weeks.map(w=>w.mortes)},{name:"M+D (%)",yAxisIndex:1,data:weeks.map(w=>w.mortalidade)}]);
      A.chart("chartPesoSemanal",labels,[{name:"Peso médio",data:weeks.map(w=>w.peso)}]);
      A.chart("chartCrescimento",data.pinto==null?labels:["0 dias",...labels],[{name:"Peso médio",data:data.pinto==null?weeks.map(w=>w.peso):[data.pinto,...weeks.map(w=>w.peso)]}]);
    }});
  BIUnavailable.formulas({prefix:"Lotes",catalog:FORMULAS_LOTES,attribute:"data-lotes-formula"});
})();
