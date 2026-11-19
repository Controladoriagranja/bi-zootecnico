"use strict";
window.PcpCondPeriod = (() => {
  const iso = d => d.toISOString().slice(0,10);
  const date = s => new Date(s+'T00:00:00Z');
  const br = s => s.split('-').reverse().join('/');
  const monday = d => { const result=new Date(d); result.setUTCDate(result.getUTCDate()-(result.getUTCDay()+6)%7); return result; };
  function weekLabel(start) {
    const first=date(start),last=new Date(first),thursday=new Date(first);
    last.setUTCDate(last.getUTCDate()+6); thursday.setUTCDate(thursday.getUTCDate()+3);
    const number=Math.ceil((((thursday-new Date(Date.UTC(thursday.getUTCFullYear(),0,1)))/86400000)+1)/7);
    return 'Semana '+String(number).padStart(2,'0')+' · '+br(start)+' a '+br(iso(last));
  }
  function create(el,onChange) {
    const toolbar=el.querySelector('.cg-cond-toolbar');
    toolbar.setAttribute('role','region'); toolbar.setAttribute('aria-label','Filtros de condenações'); toolbar.tabIndex=0;
    toolbar.insertAdjacentHTML('afterbegin','<div class="cg-cond-period"><label>Ano<select id="cgCondAno"></select></label><label>Mês<select id="cgCondMes"></select></label><label>Semana<select id="cgCondSemana" title="Semana do ano, de segunda a domingo"><option value="">Todas</option></select></label></div>');
    const year=el.querySelector('#cgCondAno'),month=el.querySelector('#cgCondMes'),week=el.querySelector('#cgCondSemana');
    PcpMulti.enhance(el.querySelector('.cg-cond-period'));
    const values=select=>PcpMulti.values(select.value);
    const selected=select=>values(select).length?values(select):[...select.options].map(o=>o.value).filter(Boolean);
    const warning=document.createElement('p'); warning.className='cg-cond-period-warning'; warning.setAttribute('role','alert'); warning.hidden=true; toolbar.after(warning);
    const snapshot=()=>({year:year.value,month:month.value,week:week.value});
    let accepted;
    function days() {
      const result=[];
      for(const y of selected(year)) for(const m of selected(month)) {
        const d=new Date(Date.UTC(Number(y),Number(m)-1,1));
        while(d.getUTCMonth()===Number(m)-1) { result.push(iso(d)); d.setUTCDate(d.getUTCDate()+1); }
      }
      return [...new Set(result)].sort();
    }
    function refreshWeeks() {
      const keep=values(week),starts=[...new Set(days().map(d=>iso(monday(date(d)))))];
      week.innerHTML='<option value="">Todas</option>'+starts.map(start=>'<option value="'+start+'">'+weekLabel(start)+'</option>').join('');
      week.value=keep.filter(start=>starts.includes(start)).join(',');
    }
    function change() {
      if(this!==week) refreshWeeks();
      const allDays=days(),weeks=new Set(values(week));
      const dates=weeks.size?allDays.filter(d=>weeks.has(iso(monday(date(d))))):[];
      const filteredDays=dates.length&&dates.length!==allDays.length?dates.join(','):'';
      // Respeita o limite de 4000 caracteres da API existente, sem ampliar o recorte.
      if(filteredDays.length>4000) {
        year.value=accepted.year; month.value=accepted.month; refreshWeeks(); week.value=accepted.week;
        warning.textContent='Para combinar tantas semanas, selecione menos anos ou meses. A seleção anterior foi mantida.';
        warning.hidden=false; return;
      }
      warning.hidden=true; accepted=snapshot();
      onChange({ano:selected(year).join(','),mes:selected(month).join(','),...(filteredDays?{dias:filteredDays}:{})});
    }
    year.onchange=month.onchange=week.onchange=change;
    function set(q) {
      const now=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric'}).format(new Date()));
      const years=[...new Set([...Array.from({length:Math.max(1,now-2019)},(_,i)=>String(2020+i)),...PcpMulti.values(q.ano)])].sort();
      year.innerHTML=years.map(y=>'<option value="'+Number(y)+'">'+Number(y)+'</option>').join('');
      month.innerHTML=Array.from({length:12},(_,i)=>'<option value="'+(i+1)+'">'+new Date(Date.UTC(2026,i,1)).toLocaleDateString('pt-BR',{month:'long',timeZone:'UTC'})+'</option>').join('');
      year.value=String(q.ano||now); month.value=String(q.mes||'').split(',').filter(Boolean).map(Number).join(','); week.value=''; refreshWeeks(); accepted=snapshot(); warning.hidden=true;
    }
    function describe(q) {
      const weeks=values(week),days=q.dias?.split(',')||[];
      el.querySelector('.cg-cond-context').textContent=(weeks.length?(weeks.length===1?weekLabel(weeks[0]):'Semanas selecionadas: '+weeks.length)+' · ':'')+(days.length?(days.length<=7?'Dias '+days.map(br).join(', '):days.length+' dias selecionados'):'Meses '+q.mes+' / '+q.ano);
    }
    // Menus fixos escapam da faixa horizontal e continuam dentro da subtela.
    function positionMenus() {
      if(!el.open) return;
      const bounds=el.getBoundingClientRect();
      toolbar.querySelectorAll('.checkbox-multiselect.open').forEach(host=>{
        const panel=host.querySelector('.checkbox-multiselect-panel'),rect=host.querySelector('button').getBoundingClientRect();
        const width=Math.min(320,Math.max(260,rect.width),bounds.width-24),bottom=Math.min(bounds.bottom-12,innerHeight-12),top=Math.min(rect.bottom+6,bottom-120);
        Object.assign(panel.style,{width:width+'px',left:Math.max(bounds.left+12,Math.min(rect.left,bounds.right-width-12))+'px',top:top+'px',maxHeight:Math.max(100,bottom-top)+'px'});
      });
    }
    function closeMenus(except) {
      toolbar.querySelectorAll('.checkbox-multiselect.open').forEach(host=>{
        if(except&&host.contains(except)) return;
        host.classList.remove('open'); host.querySelector('button').setAttribute('aria-expanded','false');
      });
    }
    toolbar.addEventListener('click',event=>{const trigger=event.target.closest('.checkbox-multiselect-trigger');if(trigger)closeMenus(trigger);},true);
    toolbar.querySelectorAll('.checkbox-multiselect-trigger').forEach(button=>button.addEventListener('click',positionMenus));
    toolbar.addEventListener('scroll',positionMenus);
    el.querySelector('.cg-stops-body').addEventListener('scroll',positionMenus);
    window.addEventListener('resize',positionMenus);
    el.addEventListener('keydown',event=>{if(event.key==='Escape'&&toolbar.querySelector('.checkbox-multiselect.open')){event.preventDefault();event.stopPropagation();closeMenus();}});
    return {set,describe};
  }
  return {create};
})();
