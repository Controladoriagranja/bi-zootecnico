/* Somente dados sinteticos e funcoes desta tela; nenhuma rede/banco. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),context={URLSearchParams,location:{hostname:'example.test',search:''}};
context.window=context;vm.createContext(context);
for(const name of ['config','data'])vm.runInContext(fs.readFileSync(path.join(root,`assets/js/consumo-racao-${name}.js`),'utf8'),context);
const D=context.ConsumoRacaoData,phases=D.phases.map(item=>item.key);
function row(id,birds,values,lineage='COBB'){
 const result={registro_id:id,tipo_linha:'detalhe',empresa_codigo:'1',unidade_codigo:'053',data:'2026-11-20',codigo:'001',integrado:'Fazenda Sintética',galpao:'G1',lote:'0041',qtde_aves:birds,idade:42,sexo:'Misto',nutricao:'A',linhagens:lineage,standard:'X'};
 phases.forEach((key,i)=>{result[key]=values[i];result[key+'_cons_ave']=null;result[key+'_cons_dia']=7;});return result;
}
const payload={contract_version:'consumo-racao-snapshot-v1',arquivo:'fabrica_racao.consumo_medio_racao',completo:true,periodo_disponivel:{inicio:'2026-11-01',fim:'2026-11-25'},total_registros:4,atualizado_em:null,unidade_consumo:null,
 dados:[row('A',10,[100,100,100,100]),row('B',90,[450,0,0,0]),row('C',30,[null,90,60,30],'COBB, HUBBARD'),row('D',0,[10,10,10,10]),{tipo_linha:'total',fase_final:999999}]};
const snapshot=D.normalize(payload),summary=D.aggregate(snapshot.rows);
assert.equal(snapshot.rows.length,4);assert.equal(snapshot.excluded,1);
assert.equal(summary.total,890);assert.equal(summary.totalRecords,3);
assert.equal(summary.birds,130);assert.equal(summary.perBird.value,8.5);
assert.equal(summary.perBird.denominator,100);assert.equal(summary.perBird.numerator,850);
assert.equal(summary.phases[0].perBird.value,5.5);assert.equal(summary.phases[1].perBird.denominator,130);
assert.equal(snapshot.rows[2].consumo_total,null);assert.equal(snapshot.rows[3].consumo_ave,null);
assert.equal(snapshot.rows[1].fase_final,0);assert.equal(snapshot.rows[0].lote,'0041');
assert.equal(D.group(snapshot.rows,'linhagens').length,2);
assert.equal(D.group(snapshot.rows,'linhagens').reduce((sum,g)=>sum+g.records,0),4);
assert.equal(D.aggregate(snapshot.rows.filter(r=>r.registro_id==='D')).perBird.value,null);
assert.equal(D.day('2026-02-30'),null);assert.equal(D.number('1.234,5'),null);assert.equal(D.number('9'.repeat(400)),null);
assert.equal(D.number('0'),0);assert.equal(D.number(null),null);
assert.equal(D.evolution(snapshot.rows,'dia')[0].perBird.value,8.5);
assert.equal(D.evolution([{...snapshot.rows[0],data:'2026-01-01'}],'semana')[0].name,'2025-12-29');
assert.equal(D.options(snapshot.rows,{linhagens:['COBB']}).linhagens.length,2); // ignora apenas o proprio filtro
assert.equal(D.ordered(snapshot.rows,'consumo_total','desc').at(-1).registro_id,'C');
assert.throws(()=>D.normalize({...payload,completo:false}),/incompat/);
assert.throws(()=>D.normalize({...payload,total_registros:100}),/quantidade/);
assert.throws(()=>D.normalize({...payload,dados:[...payload.dados,payload.dados[0]]}),/repetidos/);
assert.throws(()=>D.normalize({...payload,dados:[{...payload.dados[0],unidade_codigo:'52'}]}),/unidade/);
assert.throws(()=>D.normalize({...payload,dados:[{...payload.dados[0],tipo_linha:undefined}]}),/classifica/);
(async()=>{
 let calls=0;context.getPortalToken=()=> 'token-sintetico';context.apiGet=async()=>{calls++;throw Object.assign(Error('Negado'),{status:403});};
 const pending=D.create({...context.ConsumoRacaoConfig,mode:'pending'},{hostname:'example.test',search:'?demo=1'});assert.equal(pending.demonstration,false);
 await assert.rejects(pending.load(),/Aguardando/);assert.equal(calls,0);
 const api=D.create({...context.ConsumoRacaoConfig,transport:'snapshot',mode:'api',snapshotEndpoint:'/api/test-only/consumo'},{hostname:'example.test',search:''});
 await assert.rejects(api.load(),/Negado/);assert.equal(calls,1);
 context.apiGet=async()=>payload;await api.load();context.getPortalToken=()=> 'outra-sessao';assert.throws(()=>api.assertSession(),/sessão/);
 const portalRows=payload.dados.slice(0,4).map((input,i)=>({...input,chave_hash:input.registro_id,importado_em:`2026-11-26T0${i+6}:02:36-03:00`}));
 const columns=Object.keys(portalRows[0]);let pagesRequested=[];
 const portalPage=(page,total=4)=>({esquema:'fabrica_racao',tabela:'consumo_medio_racao',colunas:columns,dados:portalRows.slice((page-1)*2,page*2),total,pagina:page,tamanho:2,total_paginas:Math.ceil(total/2)});
 context.apiGet=async(endpoint,params)=>{pagesRequested.push(params.pagina);assert.equal(params.tamanho,2);return portalPage(params.pagina);};
 const portal=D.create({...context.ConsumoRacaoConfig,pageSize:2});const real=await portal.load();
 assert.deepEqual(pagesRequested,[1,2]);assert.equal(real.rows.length,4);assert.equal(real.updated,'2026-11-26T09:02:36-03:00');assert.equal(D.aggregate(real.rows).perBird.value,8.5);
 context.apiGet=async(_,params)=>params.pagina===1?portalPage(1):portalPage(2,5);await assert.rejects(portal.load(),/mudaram/);
 context.apiGet=async(_,params)=>{const response=portalPage(params.pagina);if(params.pagina===2)response.dados[0]=portalRows[0];return response;};await assert.rejects(portal.load(),/repetido/);
 context.apiGet=async()=>({...portalPage(1),dados:[portalRows[0]]});await assert.rejects(portal.load(),/incompleta/);
 context.apiGet=async()=>({...portalPage(1,0),dados:[]});const empty=await portal.load();assert.equal(empty.rows.length,0);assert.equal(empty.updated,null);assert.equal(empty.period.inicio,'');
 context.apiGet=async()=>{throw Object.assign(Error('Sem permissão'),{status:403});};await assert.rejects(portal.load(),/permissão/);
 console.log(JSON.stringify({result:'PASS',ratioOfSums:8.5,notSimpleMean:true,nullAndZero:true,totalsExcluded:true,mixedLineageNotDuplicated:true,scalesPreserved:true,noBackendCallsWhenPending:true,noDemoFallback:true,sessionChange:true}));
})().catch(error=>{console.error(error);process.exitCode=1;});
