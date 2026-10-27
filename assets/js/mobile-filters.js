/* Nova modificação de 27/10/2026: filtros móveis compartilhados, sem cálculos ou novos endpoints. */
(() => {
  'use strict';
  document.body.classList.add('mobile-bi-page');
  const card = document.querySelector('.filter-card');
  const grid = card?.querySelector('.filters-grid, .history-filters');
  const clear = card?.querySelector('button[id*="limpar"], #phaseClear');
  if (!card || !grid || !clear) return;
  const media = matchMedia('(max-width:767px)');
  const gridHome = document.createComment('Posição desktop dos filtros');
  const clearHome = document.createComment('Posição desktop de limpar filtros');
  grid.before(gridHome); clear.before(clearHome);
  const shell = document.createElement('section');
  shell.className = 'mobile-filter-shell';
  shell.setAttribute('aria-label','Filtros da análise');
  shell.innerHTML = `<div class="mobile-filter-surface">
    <header class="mobile-filter-handle">
      <button class="mobile-filter-toggle" type="button" aria-expanded="false" aria-controls="mobileFilterContent">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--card)"/><circle cx="15" cy="17" r="3" fill="var(--card)"/></svg>
        <span>Filtros</span><span class="mobile-filter-count" hidden>0</span><span class="mobile-filter-chevron" aria-hidden="true">⌃</span>
      </button>
      <button class="mobile-filter-expand" type="button" aria-label="Expandir filtros ao máximo" title="Expandir filtros ao máximo">↕</button>
    </header>
    <div id="mobileFilterContent" class="mobile-filter-content">
      <div class="mobile-filter-scroll"><h2>Refine sua análise</h2><div class="mobile-filter-mount"></div></div>
      <footer class="mobile-filter-footer"><p role="status" aria-live="polite">Filtros aplicados à análise.</p><div class="mobile-filter-actions"><button type="button" class="button mobile-filter-apply">Aplicar filtros <span aria-hidden="true">→</span></button></div></footer>
    </div></div>`;
  document.body.append(shell);
  const find = selector => shell.querySelector(selector);
  const toggle = find('.mobile-filter-toggle'), expand = find('.mobile-filter-expand');
  const handle = find('.mobile-filter-handle'), content = find('.mobile-filter-content');
  const count = find('.mobile-filter-count'), status = find('.mobile-filter-footer p');
  const closed = 56;
  let controller, originalChange, applied = '', dirty = false, level = 'closed';
  let maximum = 600, visible = closed, drag = null, frame = 0, nextHeight = closed, suppressClick = false;
  let draftId = 0, replay = false, applying = false, optionsPending = Promise.resolve(true);
  const externalChanges = new Set();
  const externalValues = () => [...grid.querySelectorAll('select,input[type="date"]')]
    .filter(el => !controller?.fields.some(field => field.id === el.id))
    .map(el => [el.id,el.value]);
  const signature = () => JSON.stringify([controller?.values() || {},externalValues()]);
  function counter() {
    const number = Object.keys(controller?.values() || {}).length;
    count.hidden = !number; count.textContent = String(number);
    const pending = dirty && signature() !== applied;
    status.textContent = applying ? 'Aplicando seleções…' : pending ? 'Seleções alteradas. Toque em Aplicar filtros.' : 'Filtros aplicados à análise.';
    toggle.setAttribute('aria-label',`Filtros${number ? `, ${number} critérios selecionados` : ''}${pending ? ', alterações por aplicar' : ''}`);
  }
  function place() {
    card.classList.toggle('mobile-filters-relocated',media.matches);
    if (media.matches) { find('.mobile-filter-mount').append(grid);find('.mobile-filter-actions').prepend(clear); }
    else { gridHome.after(grid);clearHome.after(clear); }
  }
  function paint(height) {
    visible = Math.max(closed,Math.min(maximum,height));
    shell.style.setProperty('--mobile-visible',`${visible}px`);
  }
  function measure() {
    const viewport = window.visualViewport, height = viewport?.height || innerHeight;
    const keyboard = viewport ? Math.max(0,innerHeight - viewport.height - viewport.offsetTop) : 0;
    maximum = Math.max(180,height - 40);
    shell.style.setProperty('--mobile-max',`${maximum}px`);
    shell.style.bottom = `calc(${16 + keyboard}px + env(safe-area-inset-bottom,0px))`;
    if (!drag) paint(level === 'closed' ? closed : level === 'full' ? maximum : Math.min(maximum,Math.max(240,maximum * .64)));
  }
  function setLevel(next, focus = false) {
    level = next;
    const open = media.matches && next !== 'closed';
    shell.classList.toggle('is-open',open);
    toggle.setAttribute('aria-expanded',String(open));
    content.inert = !open;
    expand.setAttribute('aria-label',next === 'full' ? 'Reduzir painel de filtros' : 'Expandir filtros ao máximo');
    if (!open) controller?.closeAll();
    measure();
    if (focus) toggle.focus({preventScroll:true});
  }
  async function refreshDraft() {
    const id = ++draftId; dirty = true;counter();
    try { await controller.loadOptions({preserve:true}); if (id === draftId) counter(); }
    catch (error) { if (id === draftId && error.name !== 'AbortError') status.textContent = 'Não foi possível atualizar as opções. Tente aplicar novamente.'; }
  }
  async function apply() {
    if (!controller || applying) return;
    applying = true;find('.mobile-filter-apply').disabled = true;
    shell.setAttribute('aria-busy','true');counter();
    // Await the existing dependency refresh; do not issue a duplicate request on Apply.
    let failed = false;
    try {
      const result = await optionsPending.catch(() => controller.loadOptions({preserve:true}));
      if (result === false) return;
      ++draftId;applied = signature();dirty = false;counter();setLevel('closed',media.matches);
      if (externalChanges.size) {
        const targets = [...externalChanges];externalChanges.clear();
        replay = true;
        try { targets.forEach(el => el.dispatchEvent(new Event('change',{bubbles:true}))); }
        finally { replay = false; }
      } else await originalChange?.(controller.values());
    } catch (error) { if (error.name !== 'AbortError') { failed = true;status.textContent = 'Não foi possível aplicar os filtros. Tente novamente.'; } }
    finally { applying = false;find('.mobile-filter-apply').disabled = false;shell.setAttribute('aria-busy','false');if (!failed) counter(); }
  }
  // Optional hook used by FilterController; one controller for each existing screen.
  window.MobileFilterPanel = {attach(instance) {
    if (controller || !instance.fields.some(field => grid.contains(document.getElementById(field.id)))) return;
    controller = instance; originalChange = instance.onChange;
    const emitChange = instance.emitChange.bind(instance);
    instance.emitChange = (...args) => {
      if (media.matches && !instance.silent) { dirty = true;counter(); }
      return emitChange(...args);
    };
    const loadOptions = instance.loadOptions.bind(instance);
    instance.loadOptions = (...args) => {
      optionsPending = loadOptions(...args).then(result => {
        if (!dirty) applied = signature();
        counter(); return result;
      });
      return optionsPending;
    };
    instance.onChange = (...args) => {
      if (!media.matches) { dirty = false;applied = signature();counter();return originalChange?.(...args); }
      dirty = true;counter();
      // Controllers with dependent refresh already fetched options in emitChange.
      if (!instance.includeDependentRefresh) return refreshDraft();
    };
    applied = signature();counter();
  }};
  clear.addEventListener('click',event => {
    if (!media.matches || !controller) return;
    event.stopImmediatePropagation();controller.clear();refreshDraft();
  },true);
  grid.addEventListener('change',event => {
    if (!media.matches || replay || !controller || !event.target.matches('select,input[type="date"]')) return;
    if (controller.fields.some(field => field.id === event.target.id)) return;
    event.stopImmediatePropagation();externalChanges.add(event.target);dirty = true;counter();
  },true);
  find('.mobile-filter-apply').addEventListener('click',apply);
  toggle.addEventListener('click',() => {
    if (suppressClick) { suppressClick = false; return; }
    setLevel(level === 'closed' ? 'middle' : 'closed');
  });
  expand.addEventListener('click',() => {
    if (suppressClick) { suppressClick = false; return; }
    setLevel(level === 'full' ? 'middle' : 'full');
  });
  handle.addEventListener('pointerdown',event => {
    if (!media.matches || !event.isPrimary || event.button > 0) return;
    drag = {id:event.pointerId,y:event.clientY,height:visible,original:level,moved:false};
  });
  handle.addEventListener('pointermove',event => {
    if (!drag || event.pointerId !== drag.id) return;
    const delta = drag.y - event.clientY;
    if (!drag.moved && Math.abs(delta) < 6) return;
    if (!drag.moved) {
      drag.moved = true;handle.setPointerCapture(event.pointerId);
      shell.classList.add('is-dragging','is-open');content.inert = false;toggle.setAttribute('aria-expanded','true');
    }
    nextHeight = drag.height + delta;
    if (!frame) frame = requestAnimationFrame(() => {frame = 0;paint(nextHeight);});
  });
  function endDrag(event,canceled = false) {
    if (!drag || event.pointerId !== drag.id) return;
    const gesture = drag;
    if (frame) {cancelAnimationFrame(frame);frame = 0;paint(nextHeight);}
    drag = null;shell.classList.remove('is-dragging');
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    if (!gesture.moved) return;
    suppressClick = true;setTimeout(() => {suppressClick = false;},0);
    const mid = Math.min(maximum,Math.max(240,maximum * .64));
    const nearest = [['closed',closed],['middle',mid],['full',maximum]].sort((a,b) => Math.abs(a[1] - visible) - Math.abs(b[1] - visible))[0][0];
    setLevel(canceled ? gesture.original : nearest);
  }
  handle.addEventListener('pointerup',event => endDrag(event));
  handle.addEventListener('pointercancel',event => endDrag(event,true));
  handle.addEventListener('keydown',event => {
    if (!media.matches || !['ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
    event.preventDefault();
    setLevel(event.key === 'Home' ? 'closed' : event.key === 'End' ? 'full' : event.key === 'ArrowUp' ? (level === 'closed' ? 'middle' : 'full') : (level === 'full' ? 'middle' : 'closed'));
  });
  document.addEventListener('keydown',event => {
    if (event.key !== 'Escape' || !media.matches || level === 'closed') return;
    if (shell.querySelector('.checkbox-multiselect.open')) controller?.closeAll();
    else setLevel('closed',true);
  });
  media.addEventListener('change',async () => {
    if (drag && handle.hasPointerCapture(drag.id)) handle.releasePointerCapture(drag.id);
    drag = null;shell.classList.remove('is-dragging');
    if (frame) {cancelAnimationFrame(frame);frame = 0;}
    controller?.closeAll();place();setLevel('closed');
    if (!media.matches && dirty) await apply();
  });
  window.addEventListener('resize',measure);
  window.visualViewport?.addEventListener('resize',measure);
  window.visualViewport?.addEventListener('scroll',measure);
  place();setLevel('closed');
})();
