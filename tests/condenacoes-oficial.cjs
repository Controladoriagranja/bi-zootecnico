const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'assets/js/condenacoes-oficial.js'),'utf8');
const context={window:{}};vm.createContext(context);vm.runInContext(source,context);const api=context.window.ZooCondenacoesOficial;
const values=n=>Array.from({length:11},(_,i)=>i===10?n:null);
const report={ok:true,data_limite:'2026-11-18',indicadores:[{ordem:11}],dias:[
 {data:'2026-10-01',valores:{'1':values(.01),'2':values(.03),'111':values(.1)}},
 {data:'2026-10-02',valores:{'1':values(null),'2':values(null),'111':values(null)}},
 {data:'2026-11-01',valores:{'1':values(0),'2':values(null),'111':values(.02)}}
],mensal:[{mes:'2026-10',valores:{'10':values(.025),'111':values(.1)}},{mes:'2026-11',valores:{'10':values(0),'111':values(.02)}}]};
const row=(data,empresa,secao,quantidade,turno_codigo)=>({data,empresa,secao,quantidade,turno_codigo,descricao:'Peso Vivo(-D+A)'});
const daily=[row('2026-10-01','Real Alimentos','Recepção de Aves Vivas',100),row('2026-10-01','Real Alimentos','Compra de Aves Vivas',5),row('2026-10-01','Real Alimentos','Abate - Total',200),row('2026-11-01','Real Alimentos','Recepção de Aves Vivas',900),row('2026-11-01','Real Alimentos','Abate - Total',5000)];
const shifts=[row('2026-10-01','Ave Nova','Recepção de Aves Vivas',1000,'1'),row('2026-10-01','Ave Nova','Recepção de Aves Vivas',3000,'2'),row('2026-10-02','Ave Nova','Recepção de Aves Vivas',700,'1'),row('2026-11-01','Ave Nova','Recepção de Aves Vivas',100,'1')];
const payload=api.consolidate(report,daily,shifts,2026,[10,11]);
assert.equal(payload.peso_condenado_kg,138);assert.equal(payload.peso_vivo_kg,5200);assert.equal(payload.percentual,138/5200);
assert.equal(payload.totais_mensais['2026-10'].percentual,120/4200);assert.equal(payload.totais_mensais['2026-11'].percentual,.018);
assert.throws(()=>api.consolidate(report,[],shifts,2026,[10,11]),/ausente/);
const bad=structuredClone(report);bad.mensal[0].valores['10'][10]=.04;assert.throws(()=>api.consolidate(bad,daily,shifts,2026,[10,11]),/diverge/);
const empty=api.consolidate({...report,dias:[],mensal:[]},[],[],2026,[12]);assert.equal(empty.percentual,null);
async function main(){
 const calls=[];
 const get=async(endpoint,q)=>{
  calls.push({endpoint,q});
  if(endpoint.endsWith('cirurgico-geral'))return report;
  const table=endpoint.split('/').at(-1),rows=table==='diario_industria'?daily:shifts;
  return {ok:true,tabela:table,pagina:q.pagina,tamanho:1,total:rows.length,dados:rows.slice(q.pagina-1,q.pagina)};
 };
 assert.equal((await api.load(get,2026,[10,11])).percentual,138/5200);
 assert.equal(calls.length,10);assert(!calls.some(c=>c.endpoint.endsWith('/condenacoes')));
 const real=path.join(root,'outputs/condenacoes-oficial-20261119/reference.json');
 if(fs.existsSync(real)){
  const fixture=JSON.parse(fs.readFileSync(real,'utf8')),r=api.consolidate(fixture.report,fixture.daily,fixture.shifts,2026,[10,11]);
  assert.equal(r.totais_mensais['2026-10'].kg,622383);assert.equal(r.totais_mensais['2026-11'].kg,351875);
  console.log('PASS dados reais: pesos e percentuais mensais conferidos contra calculo oficial PCP (outubro/novembro)');
 }
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.setContent('<main id="indicadores"><article class="metric-card-birds"></article></main>');
  for(const file of ['assets/css/app.css','assets/css/condenacoes-card.css'])await page.addStyleTag({content:fs.readFileSync(path.join(root,file),'utf8')});
  await page.evaluate(payload=>{
   window.apiCalls=[];window.opened=[];
   window.PcpCondenacoes={create:()=>({open:q=>opened.push(q)})};
   window.apiGet=async(endpoint,q)=>{apiCalls.push({endpoint,q});if(q.ano===2025)throw Error('Falha simulada');return payload;};
  },report);
  await page.addScriptTag({content:source});
  await page.evaluate(({daily,shifts})=>{
   const original=apiGet;window.apiGet=async(endpoint,q)=>{
    if(endpoint.endsWith('cirurgico-geral'))return original(endpoint,q);
    apiCalls.push({endpoint,q});const table=endpoint.split('/').at(-1);return {ok:true,tabela:table,pagina:1,tamanho:1000,total:table==='diario_industria'?daily.length:shifts.length,dados:table==='diario_industria'?daily:shifts};
   };
  },{daily,shifts});
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'assets/js/condenacoes-card.js'),'utf8')});
  await page.evaluate(()=>ZooCondenacoes.render(document.getElementById('indicadores'),{years:[2026],months:[{numero:10,nome:'outubro'},{numero:11,nome:'novembro'}],revision:1}));
  await page.waitForSelector('.zoo-cond-table tbody');
  assert.deepEqual(await page.locator('.zoo-cond-value').allTextContents(),['2,86%','1,80%']);
  assert((await page.locator('.total-row').textContent()).includes('2,65%'));
  await page.locator('.zoo-cond-value').first().click();
  assert.deepEqual(await page.evaluate(()=>opened.at(-1)),{ano:'2026',mes:'10',visao:'geral'});
  await page.locator('.zoo-cond-details').click();
  assert.deepEqual(await page.evaluate(()=>opened.at(-1)),{ano:'2026',mes:'10,11',visao:'geral'});
  await page.locator('.zoo-cond-sort[data-column="1"]').click();
  assert.equal(await page.locator('tbody tr').last().getAttribute('class'),'total-row');
  await page.evaluate(()=>ZooCondenacoes.render(document.getElementById('indicadores'),{years:[2025],months:[{numero:10,nome:'outubro'}],revision:2}));
  const failed=page.locator('.zoo-cond-card').last();await failed.locator('tbody').waitFor();
  assert.equal(await failed.locator('.zoo-cond-value').count(),0);assert(await failed.locator('.zoo-cond-state').isVisible());
  assert(!await page.evaluate(()=>apiCalls.some(c=>c.endpoint.endsWith('/comparativo/condenacoes'))));
  console.log(`PASS ${width}px: fonte oficial, consolidado ponderado, acumulado, ordenacao, falha sem fallback e detalhes gerais`);
  await page.close();
 }}finally{await browser.close();}
 console.log('PASS consolidacao: turnos, Real/compra/abate, nulos, zero, ausencia de peso, divergencia e paginacao');
}
main().catch(e=>{console.error(e);process.exitCode=1});
