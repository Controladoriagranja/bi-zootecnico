const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
function context(){const s={console,AbortController,DOMException,URL,APP_CONFIG:{},sessionStorage:{getItem:()=>''},setTimeout:(fn)=>setTimeout(fn,5),clearTimeout};vm.createContext(s);vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/js/api.js'),'utf8')+'\nthis.client={apiGet,ApiProgressive,ApiError};',s);return s;}
(async()=>{
 const s=context(),calls=[],snapshots=[];let failed=false;
 s.requestApi=async(_url,p)=>{const months=p.mes_carga;calls.push(months.join(','));if(months[0]===5&&!failed){failed=true;throw new s.client.ApiError('temporary',503);}return {anos:[2026],meses_carregados:months,indicadores:{iep:{totais:{2026:123},por_ano:{2026:Array.from({length:12},(_,i)=>months.includes(i+1)?i+1:null)}}}};};
 await s.client.ApiProgressive.summary('/resumo',{}, {},v=>snapshots.push(JSON.parse(JSON.stringify(v))));
 assert.deepEqual(calls,['1,2','3,4','5,6','5,6','7,8','9,10','11,12']);assert.equal(snapshots.at(-1).carga_completa,true);assert.deepEqual(snapshots.at(-1).indicadores.iep.por_ano['2026'],Array.from({length:12},(_,i)=>i+1));assert(snapshots.every(x=>x.indicadores.iep.totais['2026']===123));
 let count=0;s.requestApi=async()=>{count++;throw new s.client.ApiError('unauthorized',401);};await assert.rejects(s.client.apiGet('/resumo'),{status:401});assert.equal(count,1);
 count=0;s.requestApi=async()=>{count++;throw new s.client.ApiError('unavailable',503);};await assert.rejects(s.client.apiGet('/resumo'),{status:503});assert.equal(count,3);
 count=0;const controller=new AbortController();s.requestApi=async()=>{count++;controller.abort();throw new DOMException('cancelled','AbortError');};await assert.rejects(s.client.apiGet('/resumo',{}, {signal:controller.signal}),{name:'AbortError'});assert.equal(count,1);
 console.log('OK: falha em maio/junho retomada sem repetir janeiro/abril; 12 meses completos, totais preservados, sem repetir 401 e cancelamento respeitado.');
})().catch(e=>{console.error(e);process.exitCode=1;});
