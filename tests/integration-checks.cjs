const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const pages = ['index','detalhes','lotes','historico','diferenca-aves-abatidas','formulas'];
async function run() {
  const results = [];
  async function check(name, action) { await action(); results.push(name); }
  const config = await fs.readFile(path.join(root,'assets/js/config.js'),'utf8');
  const api = await fs.readFile(path.join(root,'assets/js/api.js'),'utf8');
  function client({token='synthetic-test-token', fetchImpl} = {}) {
    const calls = [];
    const sandbox = {URL, sessionStorage:{getItem:key => { assert.equal(key,'granjabi_auth_token'); return token; }}, fetch: async (...args) => { calls.push(args); return fetchImpl ? fetchImpl(...args) : {ok:true,status:200,json:async()=>({ok:true})}; }};
    vm.createContext(sandbox); vm.runInContext(config+'\n'+api+'\nthis.apiGet=apiGet;',sandbox);
    return {get:sandbox.apiGet,calls};
  }
  await check('Bearer, multisseleção, filtros vazios, cache e cancelamento', async()=>{
    const c=client(); const controller=new AbortController();
    await c.get('/api/bi/zootecnico/filtros',{ano:[2025,2026],produtor:['A & B','C'],mes:'',data_inicio:'2026-01-01'},{signal:controller.signal,headers:{Authorization:'override'}});
    const [url,opts]=c.calls[0]; const parsed=new URL(url);
    assert.deepEqual(parsed.searchParams.getAll('ano'),['2025','2026']);
    assert.deepEqual(parsed.searchParams.getAll('produtor'),['A & B','C']);
    assert.equal(parsed.searchParams.has('mes'),false); assert.equal(opts.headers.Authorization,'Bearer synthetic-test-token');
    assert.equal(opts.signal,controller.signal); assert.equal(opts.cache,'no-store');
  });
  await check('Sessão ausente não dispara HTTP',async()=>{const c=client({token:''}); await assert.rejects(c.get('/api/bi/zootecnico/filtros'),e=>e.status===401&&e.code==='SESSION_MISSING');assert.equal(c.calls.length,0);});
  for(const status of [400,401,403,404,422,500,502,503]) await check('Erro '+status+' sem detalhe interno',async()=>{
    const c=client({fetchImpl:async()=>({ok:false,status,json:async()=>({detail:'internal-secret-stack'})})});
    await assert.rejects(c.get('/api/bi/zootecnico/resumo'),e=>e.status===status&&!e.message.includes('internal-secret-stack'));
  });
  await check('Erro de rede sanitizado',async()=>{const c=client({fetchImpl:async()=>{throw Error('internal-secret');}});await assert.rejects(c.get('/api/bi/zootecnico/filtros'),e=>!e.message.includes('internal-secret'));});
  await check('AbortError preservado',async()=>{const abort=Object.assign(Error('cancelled'),{name:'AbortError'});const c=client({fetchImpl:async()=>{throw abort;}});await assert.rejects(c.get('/api/bi/zootecnico/filtros'),e=>e===abort);});
  await check('JSON inválido tratado',async()=>{const c=client({fetchImpl:async()=>({ok:true,status:200,json:async()=>{throw Error('bad-json');}})});await assert.rejects(c.get('/api/bi/zootecnico/resumo'),e=>e.code==='INVALID_JSON');});
  await check('Recusa backend antigo e permite Vazio somente na nova fonte',async()=>{
    const old=client();await assert.rejects(old.get('/api/bi/zootecnico/resumo'),e=>e.code==='SOURCE_PENDING');
    const c=client({fetchImpl:async()=>({ok:true,status:200,json:async()=>({rules_version:'acerto-2026-10-05',arquivo:'zootecnico.vw_desempenho_acerto',indicadores:{vazio:{por_ano:{2026:[14,18]},totais:{2026:16}},iep:{totais:{2026:360}}}})})});
    const data=await c.get('/api/bi/zootecnico/resumo');assert.equal(data.indicadores.vazio.totais[2026],16);assert.equal(data.indicadores.vazio.por_ano[2026][0],14);assert.equal(data.indicadores.iep.totais[2026],360);
    await c.get('/api/bi/zootecnico/detalhes',{indicador:'vazio'});assert.equal(c.calls.length,2);
  });
  await check('Recusa caminho fora da API',async()=>{const c=client();await assert.rejects(c.get('/outside'),e=>e.code==='CONFIG_ERROR');assert.equal(c.calls.length,0);});
  await check('Normalização api-db de meses e linhagem',async()=>{
    const code=await fs.readFile(path.join(root,'assets/js/filters.js'),'utf8');
    const s={window:{},document:{addEventListener(){}},APP_CONFIG:{endpoints:{filtros:'/filters'}}}; vm.createContext(s);vm.runInContext(code+'\nthis.FilterController=FilterController;',s);
    const f=new s.FilterController({fields:[]});
    assert.deepEqual(Array.from(f.normalizeOptions({apiKey:'mes'},['jan',{valor:2,nome:'fevereiro'},'dez']).map(x=>x.value)),['1','2','12']);
    assert.deepEqual(Array.from(f.normalizeOptions({apiKey:'tipo_linhagem'},['Mista',{valor:'pura',nome:'Pura'}]).map(x=>x.value)),['mista','pura']);
  });
  for(const page of pages) await check('Assets e fluxo de produção: '+page,async()=>{
    const html=await fs.readFile(path.join(root,page+'.html'),'utf8');
    assert.doesNotMatch(html,/local-parquet|data\/|_local\.js|https:\/\/cdn/);
    for(const m of html.matchAll(/(?:src|href)="([^"?#]+)[^"]*"/g)) if(!/^(https?:|#)/.test(m[1])) await fs.access(path.join(root,m[1]));
    for(const m of html.matchAll(/<script(?:[^>]*src="([^"]+)")?[^>]*>([\s\S]*?)<\/script>/g)) {
      const code=m[1]?await fs.readFile(path.join(root,m[1].split('?')[0]),'utf8'):m[2];new vm.Script(code);
    }
  });
  await check('Um único fetch; sem SQL nem snapshots no JS publicado',async()=>{
    const entries=await fs.readdir(path.join(root,'assets/js')); let fetchCount=0;
    for(const file of entries.filter(x=>x.endsWith('.js'))) {const code=await fs.readFile(path.join(root,'assets/js',file),'utf8');fetchCount+=(code.match(/\bfetch\s*\(/g)||[]).length;assert.doesNotMatch(code,/sqlNumero|sqlMetrica|BASE_DINAMICA_ROWS|LOTES_ABERTOS_ROWS|RXP_ROWS|MOCK_ROWS|SELECT\s+\*|DATABASE_URL|API_PASSWORD/);}
    assert.equal(fetchCount,1);
  });
  return {passed:results.length,checks:results};
}
module.exports=run;
if(require.main===module) run().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error);process.exitCode=1;});
