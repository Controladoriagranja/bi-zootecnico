/* Componente único de apresentação. Não consulta dados nem calcula indicadores. */
(() => {
  'use strict';
  const R=window.FormulaRegistry;if(!R)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let dialog,opener,locks=[],scheduled=false;
  const button=(ids)=>{const el=document.createElement('button');el.type='button';el.className='if-button';el.dataset.formulaId=ids;el.textContent='ƒx';el.title='Ver fórmula';el.setAttribute('aria-label','Ver fórmula');el.setAttribute('aria-haspopup','dialog');return el;};
  function section(entry,index){
    return `<section class="if-metric" id="if-entry-${index}" data-formula-section="${esc(entry.id)}"><h3>${esc(entry.title)}</h3>${entry.status==='A DEFINIR'?'<p class="if-pending">A DEFINIR — regra ainda não comprovada nas fontes disponíveis.</p>':''}<p class="if-label">FÓRMULA</p><pre class="if-expression"><code>${esc(entry.formula)}</code></pre><p class="if-label">DESCRIÇÃO</p><p>${esc(entry.description)}</p>${entry.rules?.length?`<aside class="if-rules" aria-label="Regras específicas"><h4>Regras específicas deste indicador</h4><ul>${entry.rules.map(rule=>`<li>${esc(rule)}</li>`).join('')}</ul></aside>`:''}<h4>Colunas utilizadas</h4><div class="if-columns">${entry.columns.map(column=>`<code>${esc(column)}</code>`).join('')}</div><h4>Como calcular</h4><ol>${entry.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol>${entry.apiRule?`<details class="if-reference"><summary>Ver regra atual da API</summary><pre><code>${esc(entry.apiRule)}</code></pre></details>`:''}</section>`;
  }
  function ensure(){
    if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='indicatorFormulaDialog';dialog.className='if-dialog';dialog.setAttribute('aria-labelledby','indicatorFormulaTitle');
    dialog.innerHTML='<header class="if-dialog-header"><div><p class="if-eyebrow">FÓRMULA DO INDICADOR</p><h2 id="indicatorFormulaTitle">Fórmulas do relatório</h2></div><button type="button" class="if-close" aria-label="Fechar fórmulas">×</button></header><div class="if-dialog-content" tabindex="0"></div>';
    document.body.append(dialog);dialog.querySelector('.if-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
    dialog.addEventListener('close',()=>{locks.forEach(([el,value])=>el.style.overflow=value);locks=[];if(opener?.isConnected)opener.focus({preventScroll:true});});
    return dialog;
  }
  function open(ids,source=document.activeElement){
    const wanted=String(ids||'').split(/\s+/).filter(Boolean),entries=R.reportEntries();
    for(const id of wanted){const entry=R.get(id);if(entry&&!entries.some(item=>item.id===id))entries.push(entry);}
    if(!entries.length)return;
    opener=source;const modal=ensure(),content=modal.querySelector('.if-dialog-content');content.innerHTML=entries.map(section).join('');
    if(!modal.open){locks=[document.documentElement,document.body,...document.querySelectorAll('.mz-layout')].map(el=>[el,el.style.overflow]);locks.forEach(([el])=>el.style.overflow='hidden');modal.showModal();}
    const selected=[...content.querySelectorAll('[data-formula-section]')].find(el=>el.dataset.formulaSection===wanted[0]);
    if(selected){selected.classList.add('if-selected');content.scrollTop=selected.offsetTop-content.offsetTop;}else content.scrollTop=0;
    modal.querySelector('.if-close').focus({preventScroll:true});
  }
  function mount(target,ids,position='append'){
    if(!target||!ids)return;
    const existing=target.querySelector(':scope > .if-button,:scope > .if-formula-actions > .if-button');
    if(existing){if(existing.dataset.formulaId!==ids)existing.dataset.formulaId=ids;return;}
    target.classList.add('if-formula-header');
    const el=button(ids);if(position==='prepend')target.prepend(el);else target.append(el);
  }
  function scan(){
    scheduled=false;
    document.querySelectorAll('[data-formula-mount]').forEach(host=>{if(!host.querySelector('.if-button'))host.replaceChildren(button(host.dataset.formulaMount));});
    R.mounts?.().forEach(({selector,ids,position})=>document.querySelectorAll(selector).forEach(target=>mount(target,typeof ids==='function'?ids(target):ids,position)));
  }
  document.addEventListener('click',event=>{const el=event.target.closest('button[data-formula-id]');if(!el)return;event.preventDefault();event.stopPropagation();open(R.resolveIds?.(el.dataset.formulaId)||el.dataset.formulaId,el);});
  // Escape não deve fechar simultaneamente o detalhe sob o modal de fórmulas.
  document.addEventListener('keydown',event=>{if(dialog?.open&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();dialog.close();}},true);
  new MutationObserver(records=>{if(records.every(record=>record.target.closest?.('.if-dialog')))return;if(!scheduled){scheduled=true;requestAnimationFrame(scan);}}).observe(document.body,{childList:true,subtree:true});
  window.IndicatorFormulaUI={button,mount,scan,open,section};scan();
})();
