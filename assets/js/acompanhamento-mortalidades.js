/* Apresentação apenas; fonte e cálculos pertencem ao adaptador. */
(() => {
 'use strict';
 const data=LancMortalidadesData, E=id=>document.getElementById(id);
 const fields=[['data_base','Data base'],['unidade','Unidade'],['tecnico','Técnico'],['granja','Granja'],['galpao','Galpão'],['lote','Lote'],['dias_atraso','Dias de atraso'],['status_peso','Status peso']].map(([key,label])=>({id:'lanc_'+key,apiKey:key,multi:true,search:true,label}));
 E('lancFilters').innerHTML=fields.map(f=>`<div class="filter-field" data-lanc-filter="${f.apiKey}"><span>${f.label}</span><div class="checkbox-multiselect" id="${f.id}"></div></div>`).join('');
 let page=1,totalPages=0,ready=false,busy=false,order='granja',direction='asc',sequence=0,controller;
 function pagination(){E('lancPrevious').disabled=busy||!ready||page<=1;E('lancNext').disabled=busy||!ready||page>=totalPages;}
 function showError(error){
  ready=false;totalPages=0;pagination();
  E('lancError').textContent=error.status===403?'Esta tela está disponível somente para usuários com acesso geral à Integração.':error.message||'Falha na consulta.';E('lancError').classList.remove('hidden');
  E('lancCount').textContent='Consulta indisponível.';E('lancRows').replaceChildren();E('lancPage').textContent='';
  E('lancUpdated').textContent='—';E('lancSource').textContent='';
 }
 class LancFilters extends FilterController {
  normalizeOptions(field,items){
   const options=super.normalizeOptions(field,items);
   return field.apiKey==='data_base'?options.map(option=>({...option,label:option.value.split('-').reverse().join('/')})):options;
  }
 }
 const filters=new LancFilters({fields,optionsProvider:current=>data.options(current),optionsObserver:options=>{
  for(const key of ['data_base','unidade'])document.querySelector(`[data-lanc-filter="${key}"]`).hidden=!(options[key]?.length);
 },onChange:()=>load(1)});
 const columns=[['granja','Granja'],['galpao','Galpão'],['tecnico','Técnico'],['idade','Idade'],['idd_umo','Idade última mortalidade'],['dias_atraso','Dias atraso mort.'],['idd_ups','Idade última pesagem'],['status_peso','Status peso']];
 const numeric=new Set(['idade','idd_umo','idd_ups','dias_atraso']);
 function format(value,key){if(value==null||value==='')return '—';if(key==='tecnico')return String(data.technicianName(value));return numeric.has(key)?Number(value).toLocaleString('pt-BR',{maximumFractionDigits:4}):String(value);}
 function headings(){E('lancHead').replaceChildren(...columns.map(([key,title])=>{
  const th=document.createElement('th');th.scope='col';th.setAttribute('aria-sort',order===key?(direction==='asc'?'ascending':'descending'):'none');
  const button=document.createElement('button');button.type='button';button.textContent=title+' ';const icon=document.createElement('span');icon.textContent=order===key?(direction==='asc'?'↑':'↓'):'↕';icon.ariaHidden='true';button.append(icon);
  button.onclick=()=>{direction=order===key&&direction==='asc'?'desc':'asc';order=key;load(1);};th.append(button);return th;
 }));}
 async function load(next=1){
  next=Math.max(1,Number.isInteger(next)?next:1);busy=true;pagination();
  const id=++sequence;controller?.abort();controller=new AbortController();E('lancTable').setAttribute('aria-busy','true');E('lancError').classList.add('hidden');
  try{
   const result=await data.query(filters.values(),{page:next,size:100,order,direction,signal:controller.signal});
   if(id!==sequence)return;page=result.pagina;totalPages=result.total_paginas;ready=true;headings();
   const rows=result.dados.map(row=>{const tr=document.createElement('tr');tr.dataset.lotKey=row.chave_lote||row.example_id||'';
    for(const [key]of columns){const td=document.createElement('td');td.textContent=format(row[key],key);if(numeric.has(key))td.classList.add('lanc-num');
     if(key==='dias_atraso'&&row[key]!=null&&Number(row[key])>4)td.classList.add('lanc-delay');
     if(key==='status_peso'&&row[key]==='PESO ATRASADO'){const badge=document.createElement('span');badge.className='lanc-weight';badge.textContent=row[key];td.replaceChildren(badge);}tr.append(td);
    }return tr;});
   if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=columns.length;td.textContent='Nenhum lote para os filtros selecionados.';tr.append(td);rows.push(tr);}
   E('lancRows').replaceChildren(...rows);E('lancCount').textContent=`${result.total.toLocaleString('pt-BR')} registros · colunas de mortalidade e peso`;
   E('lancUpdated').textContent=formatarDataHoraBR(result.atualizado_em);
   E('lancUpdated').title=result.example?'A planilha não informa coletado_em.':'MAX(coletado_em) da tabela física zootecnico.acompanhamento_lotes_criacao.';
   E('lancSource').textContent=result.example?'Dados de exemplo da aba TDC_LançMort · todos os 219 registros, sem o filtro salvo de pesos.'+(result.source_note||''):'Fonte: acompanhamento de lotes em criação · dados consultados na API.';
   E('lancPage').textContent=result.total_paginas?`${page} / ${result.total_paginas}`:'0 / 0';
  }catch(error){if(id!==sequence||error.name==='AbortError')return;showError(error);}
  finally{if(id===sequence){busy=false;pagination();E('lancTable').setAttribute('aria-busy','false');}}
 }
 E('lancPrevious').onclick=()=>{if(!E('lancPrevious').disabled)load(page-1);};E('lancNext').onclick=()=>{if(!E('lancNext').disabled)load(page+1);};
 E('limparLancFiltros').onclick=async()=>{ready=false;pagination();filters.clear();try{if(await filters.loadOptions({preserve:false})!==false)load(1);}catch(error){showError(error);}};
 filters.register();headings();IndicatorFormulaUI.mount(E('lancFormulaMount'),'lanc.atraso lanc.peso');
 async function initialize(){
  if(await filters.loadOptions({preserve:false})===false)return;
  const field=fields.find(item=>item.apiKey==='data_base');
  const latest=filters.getState(field).options.map(item=>item.value).filter(value=>/^\d{4}-\d{2}-\d{2}$/.test(value)).sort().pop();
  if(latest){
   filters.set('data_base',[latest]);
   if(await filters.loadOptions({preserve:true})===false)return;
  }
  await load(1);
 }
 pagination();initialize().catch(showError);
})();
