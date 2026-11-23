/* Apresentação apenas; fonte e cálculos pertencem ao adaptador. */
(() => {
 'use strict';
 const data=LancMortalidadesData, E=id=>document.getElementById(id);
 const fields=[['data_base','Data base'],['unidade','Unidade'],['tecnico','Técnico'],['granja','Granja'],['galpao','Galpão'],['lote','Lote'],['dias_atraso','Dias de atraso'],['status_peso','Status peso']].map(([key,label])=>({id:'lanc_'+key,apiKey:key,multi:true,search:true,label}));
 E('lancFilters').innerHTML=fields.map(f=>`<div class="filter-field" data-lanc-filter="${f.apiKey}"><span>${f.label}</span><div class="checkbox-multiselect" id="${f.id}"></div></div>`).join('');
 let page=1,order='granja',direction='asc',sequence=0,controller;
 class LancFilters extends FilterController {
  normalizeOptions(field,items){
   const options=super.normalizeOptions(field,items);
   return field.apiKey==='data_base'?options.map(option=>({...option,label:option.value.split('-').reverse().join('/')})):options;
  }
 }
 const filters=new LancFilters({fields,optionsProvider:current=>data.options(current),optionsObserver:options=>{
  for(const key of ['data_base','unidade'])document.querySelector(`[data-lanc-filter="${key}"]`).hidden=!(options[key]?.length);
 },onChange:()=>load(1)});
 const columns=[['granja','GRANJA'],['galpao','GALPAO'],['tecnico','TÉCNICO'],['idade','IDADE'],['idd_umo','IDD UMO'],['dias_atraso','DIAS ATRASO MORT.'],['glp','GLP'],['tec','TÉC'],['status_peso','STATUS PESO']];
 const numeric=new Set(['idade','idd_umo','dias_atraso']);
 function format(value,key){if(value==null||value==='')return '—';return numeric.has(key)?Number(value).toLocaleString('pt-BR',{maximumFractionDigits:4}):String(value);}
 function headings(){E('lancHead').replaceChildren(...columns.map(([key,title])=>{
  const th=document.createElement('th');th.scope='col';th.setAttribute('aria-sort',order===key?(direction==='asc'?'ascending':'descending'):'none');
  const button=document.createElement('button');button.type='button';button.textContent=title+' ';const icon=document.createElement('span');icon.textContent=order===key?(direction==='asc'?'↑':'↓'):'↕';icon.ariaHidden='true';button.append(icon);
  button.onclick=()=>{direction=order===key&&direction==='asc'?'desc':'asc';order=key;load(1);};th.append(button);return th;
 }));}
 async function load(next=1){
  const id=++sequence;controller?.abort();controller=new AbortController();E('lancTable').setAttribute('aria-busy','true');E('lancError').classList.add('hidden');
  try{
   const result=await data.query(filters.values(),{page:next,size:100,order,direction,signal:controller.signal});
   if(id!==sequence)return;page=result.pagina;headings();
   const rows=result.dados.map(row=>{const tr=document.createElement('tr');tr.dataset.lotKey=row.chave_lote||row.example_id||'';
    for(const [key]of columns){const td=document.createElement('td');td.textContent=format(row[key],key);if(numeric.has(key))td.classList.add('lanc-num');
     if(key==='dias_atraso'&&row[key]!=null&&Number(row[key])>4)td.classList.add('lanc-delay');
     if(key==='status_peso'&&row[key]==='PESO ATRASADO'){const badge=document.createElement('span');badge.className='lanc-weight';badge.textContent=row[key];td.replaceChildren(badge);}tr.append(td);
    }return tr;});
   if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=9;td.textContent='Nenhum lote para os filtros selecionados.';tr.append(td);rows.push(tr);}
   E('lancRows').replaceChildren(...rows);E('lancCount').textContent=`${result.total.toLocaleString('pt-BR')} registros · colunas de mortalidade e peso`;
   E('lancUpdated').textContent=formatarDataHoraBR(result.atualizado_em);
   E('lancUpdated').title=result.example?'A planilha não informa coletado_em.':'MAX(coletado_em) da tabela física zootecnico.acompanhamento_lotes_criacao.';
   E('lancSource').textContent=result.example?'Dados de exemplo da aba TDC_LançMort · todos os 219 registros, sem o filtro salvo de pesos.'+(result.source_note||''):'Fonte: acompanhamento de lotes em criação · dados consultados na API.';
   E('lancPage').textContent=result.total_paginas?`${page} / ${result.total_paginas}`:'0 / 0';
   E('lancPrevious').disabled=page<=1;E('lancNext').disabled=page>=result.total_paginas;
  }catch(error){if(id!==sequence||error.name==='AbortError')return;E('lancError').textContent=error.message||'Não foi possível consultar o acompanhamento.';E('lancError').classList.remove('hidden');}
  finally{if(id===sequence)E('lancTable').setAttribute('aria-busy','false');}
 }
 E('lancPrevious').onclick=()=>load(page-1);E('lancNext').onclick=()=>load(page+1);
 E('limparLancFiltros').onclick=async()=>{filters.clear();if(await filters.loadOptions({preserve:false})!==false)load(1);};
 filters.register();headings();IndicatorFormulaUI.mount(E('lancFormulaMount'),'lanc.atraso lanc.glp lanc.tec lanc.peso');
 filters.loadOptions({preserve:false}).then(()=>load(1)).catch(error=>{E('lancError').textContent=error.message;E('lancError').classList.remove('hidden');});
})();
