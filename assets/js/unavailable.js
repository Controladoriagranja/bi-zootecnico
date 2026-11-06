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
  }
};
