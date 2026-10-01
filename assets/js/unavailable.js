/** Estados das telas cujo contrato analítico ainda não existe no backend. */
window.BIUnavailable = {
  show({ errorId, cardsId, labels, cardClass = "history-kpi", bodyId, columns = 7, filterFields = [] }) {
    const message = "Consulta indisponível no momento. Os dados desta tela aguardam integração com o serviço de dados.";
    const error = document.getElementById(errorId);
    error.textContent = message; error.classList.remove("hidden"); error.setAttribute("role", "status");
    const cards = document.getElementById(cardsId);
    if (cards) cards.innerHTML = labels.map(label => '<article class="card '+cardClass+'"><span>'+label+'</span><strong>—</strong></article>').join("");
    const body = document.getElementById(bodyId);
    if (body) body.innerHTML = '<tr><td colspan="'+columns+'" class="abate-empty">'+message+'</td></tr>';
    filterFields.forEach(([id,label]) => {
      const host = document.getElementById(id);
      if (host) host.innerHTML = '<button class="checkbox-multiselect-trigger" type="button" disabled aria-label="'+label+' indisponível"><span class="checkbox-multiselect-label">Indisponível</span></button>';
    });
    document.querySelectorAll('.filter-card button, [data-sort], [data-lotes-view], [data-history-year], [data-history-view], #galpaoRanking').forEach(el => el.disabled = true);
  },
  formulas({ prefix, catalog, attribute }) {
    const modal = document.getElementById("formulaModal"+prefix);
    if (!modal) return;
    let opener, overflow;
    const hide = () => { modal.classList.add("hidden"); document.body.style.overflow = overflow || ""; opener?.focus(); };
    document.addEventListener("click", event => {
      const button = event.target.closest("["+attribute+"]"); if (!button) return;
      const id = button.getAttribute(attribute);
      const metric = catalog.find(item => item.id === (id === "tabela" ? "tabela_mortalidade" : id));
      if (!metric) return;
      opener = button; overflow = document.body.style.overflow;
      document.getElementById("formulaTitulo"+prefix).textContent = metric.nome;
      document.getElementById("formulaExpressao"+prefix).textContent = metric.formula_exibicao;
      document.getElementById("formulaDescricao"+prefix).textContent = metric.descricao;
      document.getElementById("formulaExplicacao"+prefix).innerHTML = FormulaUI.explanation(metric);
      modal.classList.remove("hidden"); document.body.style.overflow = "hidden";
      document.getElementById("formulaFechar"+prefix).focus();
    });
    document.getElementById("formulaFechar"+prefix).addEventListener("click", hide);
    document.getElementById("formulaBackdrop"+prefix).addEventListener("click", hide);
    document.addEventListener("keydown", event => {
      if (modal.classList.contains("hidden")) return;
      if (event.key === "Escape") hide();
      if (event.key === "Tab") { event.preventDefault(); document.getElementById("formulaFechar"+prefix).focus(); }
    });
  }
};
