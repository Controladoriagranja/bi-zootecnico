const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const sandbox={console,AbortController,DOMException,URL,APP_CONFIG:{},sessionStorage:{getItem:()=>''}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/js/api.js'),'utf8')+'\nthis.progress=ApiProgressive;',sandbox);
(async()=>{
  let calls=[],snapshots=[];
  sandbox.apiGet=async(endpoint,p)=>{
    calls.push(p);
    const months=p.mes_carga;
    return {anos:[2026],meses_carregados:months,indicadores:{ca:{por_ano:{2026:Array.from({length:12},(_,i)=>months.includes(i+1)?i+1:null)},totais:{2026:p.incluir_totais==='1'?999:null}}}};
  };
  await sandbox.progress.summary('/resumo',{}, {},data=>snapshots.push(JSON.parse(JSON.stringify(data))));
  assert.equal(calls.length,6);assert.deepEqual(Array.from(calls[0].mes_carga),[1,2]);
  assert.equal(snapshots[0].carga_completa,false);assert.equal(snapshots.at(-1).carga_completa,true);
  assert.deepEqual(snapshots.at(-1).indicadores.ca.por_ano['2026'],Array.from({length:12},(_,i)=>i+1));
  assert(snapshots.every(data=>data.indicadores.ca.totais['2026']===999),'Totais não podem ser recalculados ou substituídos pelos blocos');
  calls=[];const controller=new AbortController();
  await assert.rejects(sandbox.progress.summary('/resumo',{}, {signal:controller.signal},()=>controller.abort()),{name:'AbortError'});
  assert.equal(calls.length,1);
  calls=[];await sandbox.progress.summary('/resumo',{mes:['7','8']},{},()=>{});assert.equal(calls.length,1);
  calls=[];snapshots=[];
  sandbox.apiGet=async(endpoint,p)=>{calls.push(p);return p.etapa==='principal'?{etapa:'principal',indicador:{valor:321.57},ranking_produtores:[{nome:'A',valor:300}],evolucao:{series:[]}}:{etapa:'evolucao',evolucao:{series:[{ano:2026,valores:[321.57]}]}};};
  await sandbox.progress.details('/detalhes',{}, {},data=>snapshots.push(JSON.parse(JSON.stringify(data))));
  assert.deepEqual(calls.map(p=>p.etapa),['principal','evolucao']);
  assert.equal(snapshots[0].indicador.valor,321.57);assert.equal(snapshots[0].carga_completa,false);
  assert.equal(snapshots[1].ranking_produtores.length,1);assert.equal(snapshots[1].evolucao.series.length,1);
  console.log('Carga progressiva: meses, totais, filtro, cancelamento e etapas conferidos.');
})().catch(error=>{console.error(error);process.exitCode=1;});
