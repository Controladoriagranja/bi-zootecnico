/* Resposta real do backend testado com exportacoes do usuario, em frontend isolado. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const response=JSON.parse(fs.readFileSync('outputs/rxp-versoes-20261106/_validacao/api_d1.json','utf8'));
let calls=0;
const ctx=vm.createContext({window:{},Intl,Date,DOMException,queueMicrotask,apiGet:async()=>{calls++;return structuredClone(response);}});
vm.runInContext(fs.readFileSync('assets/js/rxp-weeks.js','utf8'),ctx);ctx.RxpWeekFilter=ctx.window.RxpWeekFilter;
vm.runInContext(fs.readFileSync('assets/js/rxp-data.js','utf8'),ctx);
(async()=>{
 const q=ctx.window.RxpData.query;
 const summary=await q('/resumo');assert.equal(summary.cards.programada,5394778);assert.equal(summary.cards.real,5305960);assert.equal(summary.cards.diferenca,-88818);
 const details=await q('/detalhes',{galpao:['626B']});assert.equal(details.total,2);assert.equal(details.cards.real,39666);assert.equal(details.cards.diferenca,-559);
 const real=await q('/detalhes',{galpao:['626B'],unidade:['REAL ALIMENTOS']});assert.equal(real.total,1);assert.equal(real.cards.real,35904);assert.equal(real.cards.diferenca,-559);
 const monthly=await q('/resumo',{mes:['10'],etapa:'mensal'});assert.equal(monthly.monthly.totals.total.diferenca,-77146); // Regra atual real>0: exclui FOM, real=0 e diferenca=-5011.
 assert.equal(calls,1,'Filtro, resumo, mensal e detalhes reutilizam a mesma consulta');
 console.log(JSON.stringify({resultado:'OK',frontendComDadosDoUsuario:true,D1:true,galpao626B:true,outubroConciliado:true,consultaUnica:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
