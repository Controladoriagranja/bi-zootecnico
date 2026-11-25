/* Unica fonte/adaptador desta tela. Fonte real obrigatoria em producao: mode: 'api' (obrigatorio) ou 'example' (somente exemplo).
 * Excel -> SQL: GRANJA -> granja; GALPAO/GLP -> galpao;
 * TECNICO/TEC -> tecnico; IDADE -> idade_atual; Idade ultima mortalidade (UMO) -> idade_ultima_mortalidade;
 * Idade ultima pesagem (UPS) -> idade_ultimo_peso (alias API idd_ups);
 * DIAS ATRASO MORT. -> idade_atual - idade_ultima_mortalidade;
 * STATUS PESO -> IF(idade_ultimo_peso < 35 AND idade_atual - idade_ultimo_peso > 8).
 * LOTE e usado somente no filtro; UPS tambem e entrada da formula de STATUS PESO.
 * coletado_em nao consta da planilha: atualizado_em permanece null nos exemplos.
 * Origem dos exemplos: TDC_Lan\u00e7Mort, A4:AM222. Nada depende do filtro salvo do Excel.
 */
window.LancMortalidadesData = (() => {
 const config = Object.freeze({mode: 'api', bi: 'acompanhamento-mortalidades'});
 // Correspondencias confirmadas pelo usuario em 24/11/2026: mesmos lotes
 // (granja, galpao, lote, alojamento) em mortalidade_peso_abertos.
 // Apenas exibicao; siglas originais continuam nos dados e nos filtros.
 const technicianNames=Object.freeze({
  CNM:'CARLOS EDUARDO NAIME DE PAULA',
  CVB:'CRISTIANO VALADARES BARRETO',
  EGO:'EDER GABRIEL OLIVEIRA',
  HRN:'HUGO RODRIGUES NOGUEIRA',
  JDS:'JOELMIR DIVINO DOS SANTOS',
  JJC:'JANIO JOSE DA CUNHA',
  LAS:'LUCAS AUGUSTO DOS SANTOS',
  LLM:'LAZARO LUAN MIGUEL',
  MAX:'MAX GUSTAVO SILVA SANTOS',
  MIFS:'MARIA ISABEL FERREIRA SANTOS',
  MLC:'MARIANA LEMAR CARDOSO',
  PKS:'PRISCILA KENNEDY SILVA',
  WJS:'WENDERSON JOSE FERREIRA SILVA'
 });
 function technicianName(value){
  if(value==null||value==='')return value;
  const key=String(value).trim().toUpperCase();
  return Object.hasOwn(technicianNames,key)?technicianNames[key]:value;
 }
 const rawRows = []; // Exemplos somente nos testes locais; nunca no pacote publicado.
 let activeMode=config.mode==='auto'?(typeof getPortalToken==='function'&&getPortalToken()?'api':'example'):config.mode;
 let unavailableReason='';
 const numeric=value=>value==null||value===''||!Number.isFinite(Number(value))?null:Number(value);
 function adapt(row){
  const age=numeric(row.idade_atual),last=numeric(row.idade_ultima_mortalidade),weight=numeric(row.idade_ultimo_peso);
  return {...row,idade:age,idd_umo:last,idd_ups:weight,dias_atraso:age==null||last==null?null:age-last,
   glp:row.galpao,tec:row.tecnico,status_peso:age==null||weight==null?null:weight<35&&age-weight>8?'PESO ATRASADO':''};
 }
 const rows=rawRows.map(adapt),keys=['data_base','unidade','tecnico','granja','galpao','lote','dias_atraso','status_peso'];
 const match=(row,filters,ignore)=>keys.every(key=>key===ignore||!filters[key]?.length||filters[key].map(String).includes(String(row[key]??'')));
 async function options(filters){
  if(activeMode==='api'){
   try{return await apiGet(`/api/bi/${config.bi}/filtros`,filters);}
   catch(error){throw error;}
  }
  return Object.fromEntries(keys.map(key=>[key,[...new Set(rows.filter(row=>match(row,filters,key)).map(row=>row[key]).filter(v=>v!=null&&v!=='').map(String))].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true}))]));
 }
 async function query(filters,{page=1,size=100,order='granja',direction='asc',signal}={}){
  if(activeMode==='api'){
   const result=await apiGet(`/api/bi/${config.bi}/detalhes`,{...filters,pagina:page,tamanho:size,ordenar:order,direcao:direction},{signal});
   if(result.rules_version!=='acompanhamento-lancamentos-20261123-v1'||!Array.isArray(result.dados))throw Error('Atualize o registry do acompanhamento antes de conectar os dados.');
   return {...result,example:false};
  }
  const selected=rows.filter(row=>match(row,filters)).slice().sort((a,b)=>{
   const x=a[order],y=b[order],missingX=x==null||x==='',missingY=y==null||y==='';
   if(missingX||missingY)return missingX===missingY?0:missingX?1:-1;
   const cmp=typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'pt-BR',{numeric:true});
   return cmp*(direction==='desc'?-1:1)||a.example_id.localeCompare(b.example_id,'pt-BR',{numeric:true});
  });
  return {dados:selected.slice((page-1)*size,page*size),total:selected.length,pagina:page,tamanho:size,total_paginas:Math.ceil(selected.length/size),atualizado_em:null,example:true,source_note:unavailableReason};
 }
 return Object.freeze({options,query,config,technicianName});
})();
