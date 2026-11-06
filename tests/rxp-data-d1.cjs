/* Fonte simulada: exercita o frontend sem API, banco ou servidor reais. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const rows=[
 {id:1,data:'2026-11-05',real:90,programada:100,difQtdeRxP:-7},
 {id:2,data:'2026-11-04',real:30,programada:0,difQtdeRxP:3},
 ...[0,null,-1].map((real,i)=>({id:3+i,data:'2026-11-05',real,programada:999,difQtdeRxP:-999})),
 {id:6,data:'2026-11-06',real:99,programada:100,difQtdeRxP:-1},
 {id:7,data:'2026-11-07',real:99,programada:100,difQtdeRxP:-1},
 {id:8,data:'2026-99-99',real:99,programada:100,difQtdeRxP:-1}
].map(row=>({...row,fonte:'ave',unidade:'AVE NOVA',galpao:'616A',produtor:row.real>0?'Ademir':'Sem realizacao',lote:'1'}));
let calls=0,fail=false,empty=false;
const context=vm.createContext({window:{},Intl,Date,DOMException,console,queueMicrotask,apiGet:async()=>{
 calls++;if(fail)throw Error('Falha simulada');const raw=empty?[]:rows;
 // Simula API antiga: ignora data_fim e inclui valores futuros/sem realizacao.
 return {rules_version:'rxp-2026-10-15',data_referencia:'2026-11-06',atualizado_em:'2026-11-06 14:09:00',dados:raw,total:raw.length,total_paginas:raw.length?1:0,cards:raw.reduce((c,r)=>({programada:c.programada+r.programada,real:c.real+(r.real||0),diferenca:c.diferenca+r.difQtdeRxP}),{programada:0,real:0,diferenca:0})};
}});
vm.runInContext(fs.readFileSync('assets/js/rxp-weeks.js','utf8'),context);
context.RxpWeekFilter=context.window.RxpWeekFilter;
vm.runInContext(fs.readFileSync('assets/js/rxp-data.js','utf8'),context);
(async()=>{
 const query=context.window.RxpData.query;
 const [summary,detail,facets,monthly]=await Promise.all([query('/resumo'),query('/detalhes'),query('/filtros'),query('/resumo',{etapa:'mensal'})]);
 assert.equal(calls,1,'Requisicoes simultaneas compartilham a mesma leitura');
 assert.equal(summary.cards.real,120);assert.equal(summary.cards.programada,100);assert.equal(summary.cards.diferenca,-4);assert.equal(summary.cards.difPercent,-4);
 assert.equal(summary.realizados_ate,'2026-11-05');assert.equal(summary.atualizado_em,'2026-11-06 14:09:00');assert(!('dados' in summary));
 assert.equal(detail.total,2);assert.equal(detail.dados[1].difPercent,null);assert.equal(monthly.monthly.totals.total.real,120);
 assert.deepEqual(Array.from(facets.data),['2026-11-05','2026-11-04']);assert.deepEqual(Array.from(facets.produtor),['Ademir']);
 assert.equal((await query('/resumo',{dia:['5']})).cards.real,90);assert.equal(calls,1);
 const controller=new AbortController();controller.abort();await assert.rejects(query('/detalhes',{}, {signal:controller.signal}),{name:'AbortError'});
 console.log(JSON.stringify({resultado:'OK',d1:true,realMaiorQueZero:true,apiAntiga:true,concorrenciaCompartilhada:true,semNovasConsultasNosFiltros:true,nuloPercentual:true,metadadosPreservados:true}));
})().catch(error=>{console.error(error);process.exitCode=1;});
