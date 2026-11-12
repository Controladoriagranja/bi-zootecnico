"use strict";
window.ApiScreen=window.ApiScreen||{escape:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
window.ZooCondenacoes=(()=>{
 const cache=new Map(),esc=ApiScreen.escape,pct=v=>v==null?'—':Number(v*100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
 let modal;
 const open=q=>{modal=modal||PcpCondenacoes.create(apiGet);modal.open({...q,visao:'geral'});};
 function render(container,{years,months,revision}){
  const card=document.createElement('article');card.className='metric-card zoo-cond-card';
  card.innerHTML='<header class="metric-card-header"><div><h2>% Cond (Tot+Par Quilos)</h2><p>Mensal por ano · PCP · Ave Nova + Real</p></div><button type="button" class="button zoo-cond-details">Detalhes →</button></header><p class="zoo-cond-state" role="status">Carregando condenações…</p><div class="zoo-cond-table"></div>';
  container.append(card);const monthNumbers=months.map(m=>Number(m.numero));
  card.querySelector('.zoo-cond-details').onclick=()=>open({ano:years.join(','),mes:monthNumbers.join(',')});
  if(!years.length||!months.length){card.querySelector('.zoo-cond-state').textContent='Sem período selecionado.';return;}
  const request=year=>{const key=JSON.stringify([year,monthNumbers,revision]);if(!cache.has(key)){const promise=apiGet('/api/pcp/comparativo/condenacoes',{ano:year,mes:monthNumbers.join(','),visao:'geral'},{silent:true}).then(r=>{if(!r.ok)throw Error('Resposta incompleta');return r;}).catch(e=>{cache.delete(key);throw e;});cache.set(key,promise);}return cache.get(key);};
  Promise.allSettled(years.map(request)).then(results=>{
   if(!card.isConnected)return;const responses=results.map(r=>r.status==='fulfilled'?r.value:null),failed=results.some(r=>r.status==='rejected');
   const state=card.querySelector('.zoo-cond-state');state.hidden=!failed;state.textContent='Parte das condenações não pôde ser consultada. Os valores indisponíveis aparecem como —.';
   const cell=(year,m,value)=>value==null?'<td>—</td>':'<td><button type="button" class="metric-value-link zoo-cond-value" data-year="'+year+'" data-month="'+m+'">'+pct(value)+'</button></td>';
   card.querySelector('.zoo-cond-table').innerHTML='<table class="metric-table"><thead><tr><th>Mês</th>'+years.map(y=>'<th>'+y+'</th>').join('')+'</tr></thead><tbody>'+months.map(m=>'<tr><td class="month-cell">'+esc(m.nome||m.label||m.numero)+'</td>'+years.map((year,i)=>cell(year,m.numero,responses[i]?.totais_mensais?.[year+'-'+String(m.numero).padStart(2,'0')]?.percentual)).join('')+'</tr>').join('')+'</tbody><tfoot><tr><th>Total</th>'+years.map((year,i)=>cell(year,monthNumbers.join(','),responses[i]?.percentual)).join('')+'</tr></tfoot></table>';
   card.querySelectorAll('.zoo-cond-value').forEach(button=>button.onclick=()=>open({ano:button.dataset.year,mes:button.dataset.month}));
  });
 }
 return {render};
})();
