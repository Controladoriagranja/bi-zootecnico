/* Teste • Lotes em Criação — 27/10/2026.
 * Adapter exclusivo desta página: reutiliza lotes.js e FilterController intactos.
 * Nenhum cálculo, endpoint ou componente oficial é substituído no disco.
 */
(() => {
  'use strict';
  const shell = document.getElementById('testFilterShell');
  if (!shell) return;
  const mobile = matchMedia('(max-width:767px)');
  const toggle = document.getElementById('testFilterToggle');
  const handle = document.getElementById('testFilterHandle');
  const content = document.getElementById('testFilterContent');
  const expand = document.getElementById('testFilterExpand');
  const status = document.getElementById('testFilterStatus');
  const count = document.getElementById('testFilterCount');
  const conventional = document.getElementById('testConventionalFilters');
  const grid = conventional.querySelector('.filters-grid');
  const clearButton = document.getElementById('limparFiltrosLotes');
  const gridHome = document.createComment('Posição original dos sete filtros');
  const clearHome = document.createComment('Posição original de Limpar filtros');
  grid.before(gridHome); clearButton.before(clearHome);
  function placeControls() {
    if (mobile.matches) {
      document.getElementById('testFilterMount').append(grid);
      document.getElementById('testFilterActions').prepend(clearButton);
    } else {
      gridHome.after(grid); clearHome.after(clearButton);
    }
  }
  placeControls();
  let connection, applied = '{}', level = 'closed', visible = 56, maximum = 600;
  let drag = null, frame = 0, nextHeight = 56, suppressClick = false, draftVersion = 0;
  const closed = 56;
  const signature = () => JSON.stringify(connection?.filters.values() || {});
  function counter() {
    const n = Object.keys(connection?.filters.values() || {}).length;
    count.hidden = !n; count.textContent = String(n);
    const pending = signature() !== applied;
    status.textContent = pending ? 'Seleções alteradas. Toque em Aplicar filtros.' : 'Filtros aplicados à análise.';
    toggle.setAttribute('aria-label', `Filtros${n ? `, ${n} critérios selecionados` : ''}${pending ? ', alterações por aplicar' : ''}`);
  }
  function paint(height) {
    visible = Math.max(closed, Math.min(maximum, height));
    shell.style.setProperty('--test-visible', `${visible}px`);
  }
  function measure() {
    const viewport = window.visualViewport;
    // Fixed coordinates are in the layout viewport; lift above the Android keyboard.
    const keyboard = viewport ? Math.max(0, innerHeight - viewport.height - viewport.offsetTop) : 0;
    const h = viewport?.height || innerHeight;
    maximum = Math.max(180, Math.min(760, h - 40));
    shell.style.setProperty('--test-max', `${maximum}px`);
    shell.style.bottom = mobile.matches ? `calc(${16 + keyboard}px + env(safe-area-inset-bottom,0px))` : '';
    if (drag) return;
    paint(level === 'closed' ? closed : level === 'full' ? maximum : Math.min(maximum, Math.max(240, maximum * .64)));
  }
  function setLevel(next, focus = false) {
    level = next;
    const open = next !== 'closed';
    shell.classList.toggle('is-open', mobile.matches && open);
    toggle.setAttribute('aria-expanded', String(open));
    expand.setAttribute('aria-label', next === 'full' ? 'Reduzir painel de filtros' : 'Expandir filtros ao máximo');
    content.inert = mobile.matches && !open;
    if (!open) connection?.filters.closeAll();
    measure();
    if (focus) toggle.focus({preventScroll:true});
  }
  toggle.addEventListener('click', () => {
    if (suppressClick) { suppressClick = false; return; }
    setLevel(level === 'closed' ? 'middle' : 'closed');
  });
  expand.addEventListener('click', () => {
    if (suppressClick) { suppressClick = false; return; }
    setLevel(level === 'full' ? 'middle' : 'full');
  });
  handle.addEventListener('pointerdown', event => {
    if (!mobile.matches || !event.isPrimary || event.button > 0) return;
    drag = {id:event.pointerId, y:event.clientY, height:visible, moved:false, original:level};
  });
  handle.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const delta = drag.y - event.clientY;
    if (!drag.moved && Math.abs(delta) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      handle.setPointerCapture(event.pointerId);
      shell.classList.add('is-dragging','is-open');
      content.inert = false;
      toggle.setAttribute('aria-expanded','true');
    }
    nextHeight = drag.height + delta;
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; paint(nextHeight); });
  });
  function endDrag(event, canceled = false) {
    if (!drag || event.pointerId !== drag.id) return;
    const gesture = drag;
    if (frame) { cancelAnimationFrame(frame); frame = 0; paint(nextHeight); }
    drag = null;
    shell.classList.remove('is-dragging');
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    if (!gesture.moved) return;
    suppressClick = true;
    // Suppress only the synthetic click following this drag, never the next real tap.
    setTimeout(() => { suppressClick = false; }, 0);
    const middle = Math.min(maximum, Math.max(240, maximum * .64));
    const nearest = [['closed',closed],['middle',middle],['full',maximum]]
      .sort((a,b) => Math.abs(a[1] - visible) - Math.abs(b[1] - visible))[0][0];
    setLevel(canceled ? gesture.original : nearest);
  }
  handle.addEventListener('pointerup', event => endDrag(event));
  handle.addEventListener('pointercancel', event => endDrag(event,true));
  handle.addEventListener('keydown', event => {
    if (!mobile.matches || !['ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
    event.preventDefault();
    setLevel(event.key === 'Home' ? 'closed' : event.key === 'End' ? 'full' : event.key === 'ArrowUp' ? (level === 'closed' ? 'middle' : 'full') : (level === 'full' ? 'middle' : 'closed'));
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !mobile.matches || level === 'closed') return;
    if (shell.querySelector('.checkbox-multiselect.open')) { connection?.filters.closeAll(); return; }
    setLevel('closed',true);
  });
  async function draftChanged() {
    const version = ++draftVersion;
    counter();
    try {
      // Same dependent-options endpoint, no graph reload until Apply.
      await connection.filters.loadOptions({preserve:true});
      if (version === draftVersion) counter();
    } catch (error) {
      if (version === draftVersion && error.name !== 'AbortError') status.textContent = 'Não foi possível atualizar as opções. Tente aplicar novamente.';
    }
  }
  // Capture exactly the existing screen connection, then restore the shared API immediately.
  const originalConnect = ApiScreen.connect;
  ApiScreen.connect = function(options) {
    ApiScreen.connect = originalConnect;
    const originalRender = options.render;
    connection = originalConnect({...options, render(...args) {
      originalRender(...args);
      counter();
    }});
    applied = signature();
    const immediateChange = connection.filters.onChange;
    connection.filters.onChange = (...args) => {
      if (mobile.matches) return draftChanged();
      applied = signature(); counter();
      return immediateChange(...args);
    };
    counter();
    return connection;
  };
  document.getElementById('limparFiltrosLotes').addEventListener('click', event => {
    if (!mobile.matches || !connection) return;
    event.stopImmediatePropagation();
    connection.filters.clear();
    draftChanged();
  },true);
  document.getElementById('testFilterApply').addEventListener('click', () => {
    if (!connection) return;
    ++draftVersion;
    connection.filters.invalidateRefresh();
    applied = signature();
    counter();
    setLevel('closed',true);
    connection.refresh();
  });
  mobile.addEventListener('change', () => {
    if (drag) { drag = null; shell.classList.remove('is-dragging'); }
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    connection?.filters.closeAll();
    placeControls();
    setLevel('closed');
    if (!mobile.matches && connection && signature() !== applied) {
      ++draftVersion; applied = signature(); counter(); connection.refresh();
    }
  });
  window.addEventListener('resize',measure);
  window.visualViewport?.addEventListener('resize',measure);
  window.visualViewport?.addEventListener('scroll',measure);
  setLevel('closed');
})();
