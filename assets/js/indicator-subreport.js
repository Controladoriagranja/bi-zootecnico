"use strict";
(() => {
  if (new URLSearchParams(location.search).get('subrelatorio') === '1' && parent !== window) {
    document.documentElement.classList.add('embedded-subreport');
    document.getElementById('voltarDashboard')?.addEventListener('click', event => {
      event.preventDefault(); parent.postMessage({type:'zoo:close-subreport'}, location.origin);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) parent.postMessage({type:'zoo:close-subreport'}, location.origin);
    });
    return;
  }
  const dashboard = document.getElementById('indicadores');
  if (!dashboard) return;
  function maximize(dialog, actions) {
    if (actions.querySelector('.subreport-maximize')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'button subreport-maximize'; button.textContent = 'Maximizar'; button.setAttribute('aria-pressed','false');
    button.onclick = () => {
      const active = dialog.classList.toggle('subreport-maximized');
      button.textContent = active ? 'Restaurar' : 'Maximizar'; button.setAttribute('aria-pressed', String(active));
    };
    actions.prepend(button);
  }
  let dialog, frame, trigger;
  dashboard.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !url.pathname.endsWith('/detalhes.html')) return;
    event.preventDefault();
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.className = 'indicator-subreport'; dialog.setAttribute('aria-label','Detalhamento Zootécnico');
      dialog.innerHTML = '<header class="subreport-header"><strong>Detalhamento Zootécnico</strong><div class="subreport-actions"><button type="button" class="button subreport-back">Voltar</button></div></header><iframe title="Detalhamento do indicador"></iframe>';
      document.body.append(dialog); frame = dialog.querySelector('iframe');
      dialog.querySelector('.subreport-back').onclick = () => dialog.close();
      maximize(dialog, dialog.querySelector('.subreport-actions'));
      dialog.addEventListener('close', () => { frame.src = 'about:blank'; trigger?.focus(); });
      window.addEventListener('message', e => {
        if (e.origin === location.origin && e.source === frame.contentWindow && e.data?.type === 'zoo:close-subreport') dialog.close();
      });
    }
    trigger = link; url.searchParams.set('subrelatorio','1'); frame.src = url.href; dialog.showModal();
  });
  new MutationObserver(() => {
    document.querySelectorAll('.cg-cond-dialog').forEach(dialog => {
      const actions = dialog.querySelector('.cg-cond-actions');
      if (!actions) return;
      maximize(dialog, actions);
      const close = actions.querySelector('.cg-cond-close');
      if (close) close.textContent = 'Voltar à visão geral';
    });
  }).observe(document.body, {childList:true});
})();
