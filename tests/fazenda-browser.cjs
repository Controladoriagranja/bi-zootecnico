/* Somente navegador local e API simulada. Nenhuma consulta ao ambiente real. */
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), assert = require('node:assert/strict');
const {chromium} = require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const git = 'C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe';
const baseline = file => cp.execFileSync(git,['show','0c54308:'+file],{cwd:root,stdio:['ignore','pipe','ignore']});
const meta = {arquivo:'zootecnico.vw_desempenho_acerto_portal',rules_version:'acerto-iep-mensal-2026-10-16',atualizado_em:'2026-11-18 08:05:00',periodo_recepcao:{data_inicio:'2026-10-01',data_fim:'2026-11-17'}};
const lots = [{produtor:'Atair',tecnico:'Lucas',galpao:'626B'},{produtor:'Delcio',tecnico:'Lucas',galpao:'626B'},{produtor:'Maria',tecnico:'Mariana',galpao:'C'}];
const cards = {lotes:3,aves:3000,mortes:30,mortalidade:1,peso:2100,peso_atual:2.1,peso_pinto:44,peso_abate_final:3,vezes_maior:4};
const weekly = [7,14,21,28,35].map(idade=>({idade,mortes:6,mortalidade:1,mortalidade_sem_descartes:.8,descarte_percent:.2,peso:idade*70}));
const eligible = (q,except='') => lots.filter(row=>Object.keys(row).every(key=>key===except||!q.has(key)||q.getAll(key).includes(row[key])));
function fixture(url) {
  const q=url.searchParams, endpoint=url.pathname;
  if(endpoint.endsWith('/filtros')) return {ano:['2025','2026'],mes:[1,2],semana:['1','2'],tipo_granja:['Integrada'],modelo:['Dark house'],status_acerto:['Normal'],linhagem:['COBB'],mist_linha:['Pura'],tipo_linhagem:['pura'],...Object.fromEntries(['produtor','tecnico','galpao'].map(key=>[key,[...new Set(eligible(q,key).map(r=>r[key]))]]))};
  if(endpoint.includes('/pcp/'))return {ok:true,percentual:.01,totais_mensais:{}};
  if(endpoint.includes('/formulas/'))return meta;
  if(endpoint.includes('/gpd-fases/'))return {...meta,rules_version:'gpd-dinamica-2026-10-23-v1',cards,groups:[],agrupamento:q.get('agrupamento')||'semana',fases:[{id:'7',nome:'0–7 dias'}],periodos:[],totais:{7:{valor:20,lotes:3}}};
  if(endpoint.includes('/rxp/'))return {...meta,cards:{programada:100,real:90,diferenca:-10,registrosComDiferenca:1},data_referencia:'2026-11-18',pagina:1,total:1,total_paginas:1,dados:[{id:1,fonte:'ave',unidade:'AVE NOVA',data:'2026-11-17',produtor:'Atair',tecnico:'Lucas',galpao:'A',lote:'1',programada:100,real:90,difQtdeRxP:-10}]};
  if(endpoint.includes('/zootecnico/')) {
    if(endpoint.endsWith('/resumo'))return {...meta,anos:[2026],meses:Array.from({length:12},(_,i)=>({numero:i+1,nome:String(i+1)})),meses_carregados:q.getAll('mes_carga').map(Number),indicadores:{ca:{id:'ca',nome:'CA',unidade:'',casas_decimais:3,por_ano:{2026:Array(12).fill(1.979)},totais:{2026:1.979}}}};
    const id=q.get('indicador')||'ca';
    if(id==='mortalidade'&&q.get('etapa')==='evolucao') {
      const point={faixas:{1:.2,2:.2,3:.2,4:.1,5:.1,'35_abate':.2},total:1,total_dinamica:1,soma_faixas:1,valido:true,lotes:3,vinculados:3,problemas:[]};
      return {rules_version:'mortalidade-faixas-2026-10-26-v1',ano:Number(q.get('ano')),agrupamento:q.get('agrupamento'),unidade:'%',valido:true,tolerancia_pp:.01,faixas:['1','2','3','4','5','35_abate'].map(id=>({id,nome:id})),periodos:[{...point,inicio:'2026-01-05',semana:2,mes:1}],consolidado:point,fonte_total:'mesma configuração, expressão mort/aloj e filtros do Desempenho',fonte_faixas:'zootecnico.base_dinamica; percentuais ponderados por aves_alojadas'};
    }
    const scores={Lucas:2.1,Mariana:1.8,Atair:2.2,Delcio:1.9,Maria:1.8};
    const ranking=key=>[...new Set(eligible(q).map(r=>r[key]))].map(nome=>({nome,valor:scores[nome],lotes:1}));
    const ranking_galpoes=eligible(q).map(row=>({nome:row.galpao+' · '+row.produtor,produtor:row.produtor,galpao:row.galpao,valor:scores[row.produtor],lotes:1}));
    return {...meta,etapa:q.get('etapa'),indicador:{id,nome:id==='ca'?'CA':id==='mortalidade'?'% Mortalidade':'% Morte no Transporte',valor:1.979,unidade:id==='ca'?'':'%',casas_decimais:3},ranking_tecnicos:ranking('tecnico'),ranking_produtores:ranking('produtor'),ranking_galpoes,ranking_contexto:{metodo:'ratio_sums',tecnicos:{valor_recomposto:1.979},produtores:{valor_recomposto:1.979},galpoes:{valor_recomposto:1.979}},evolucao:{...(id==='morte_transporte'?{agrupamento:'planta_de_abate',ano:Number(q.get('ano'))}:{}),meses:[{numero:1,nome:'janeiro'}],series:[{ano:2026,planta_de_abate:'AVE NOVA',valores:[1.979]}]}};
  }
  return {...meta,etapa:q.get('etapa'),cards,weekly,metas:{mortalidade_semanal:{valor:1,unidade:'%',comparacao:'<=',referencia_mes:'2026-11-01'}},groups:[{tipo_granja:'Integrada',produtor:'Atair',linhagem:'COBB',cards,weekly}],galpoes:[{produtor:'Atair',galpao:'A',idade_atual:35,linhagens:['COBB'],cards,weekly}],hierarchy:[{campo:'semana',valor:'42',cards,weekly,children:[]}]};
}

const farmRows=[{codigo:'29363',integrado:'DELCIO JOSE DOS SA',tecnico:'MAX',galpao:'57A'}, {codigo:'30084',integrado:'DELCIO JOSE DOS SA',tecnico:'LAS',galpao:'240A'}, {codigo:'40000',integrado:'L\u00daCIA',tecnico:'LAS',galpao:'240B'}];
const legacyFixture=fixture;
fixture=function(url){
 const q=url.searchParams, result=legacyFixture(url);
 const matches=(row,except)=>['fazenda','tecnico','galpao'].every(k=>k===except||!q.has(k)||q.getAll(k).includes(row[k==='fazenda'?'codigo':k]));
 if(url.pathname.endsWith('/zootecnico/filtros')) {
  result.fazenda=farmRows.filter(r=>matches(r,'fazenda')).map(r=>({valor:r.codigo,nome:r.codigo+' - '+r.integrado}));
  for(const key of ['tecnico','galpao'])result[key]=[...new Set(farmRows.filter(r=>matches(r,key)).map(r=>r[key]))];
 }
 if(url.pathname.endsWith('/zootecnico/detalhes')&&!q.has('agrupamento')) {
  const rows=farmRows.filter(r=>matches(r));
  result.dimensao_produtor='fazenda';
  result.ranking_produtores=rows.map(r=>({nome:r.codigo+' - '+r.integrado,codigo:r.codigo,integrado:r.integrado,valor:1.7,lotes:1}));
  result.ranking_tecnicos=[...new Set(rows.map(r=>r.tecnico))].map(nome=>({nome,valor:1.7,lotes:1}));
  result.ranking_galpoes=rows.map(r=>({nome:r.galpao+' \u00b7 '+r.codigo+' - '+r.integrado,codigo:r.codigo,produtor:r.codigo,galpao:r.galpao,valor:1.7,lotes:1}));
 }
 return result;
};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),calls=[],errors=[];
 try{
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('granjabi_auth_token','local-test-only'));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname.endsWith('workers.dev')){calls.push({path:url.pathname,query:url.searchParams.toString()});return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture(url))});}
   if(url.hostname!=='bi.test')return route.fulfill({status:404,body:''});
   const file=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
   try{return route.fulfill({status:200,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream',body:fs.readFileSync(path.join(root,file))});}catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto('http://bi.test/index.html');
  await page.waitForFunction(()=>filters.multiState.get('fazenda')?.options.length===3);
  assert.equal(await page.locator('#produtor').count(),0);
  assert.equal(await page.locator('#fazenda').locator('..').locator('span').first().textContent(),'Fazenda');
  await page.locator('#fazenda button').click();
  await page.locator('#fazenda input[type=search]').fill('delcio');
  assert.equal(await page.locator('#fazenda [data-filter-option]:visible input:not([data-all])').count(),2);
  await page.locator('#fazenda input[value="29363"]').check();
  await page.waitForFunction(()=>filters.multiState.get('tecnico').options.length===1);
  assert.deepEqual(await page.evaluate(()=>filters.multiState.get('tecnico').options.map(x=>x.value)),['MAX']);
  assert.deepEqual(await page.evaluate(()=>filters.values().fazenda),['29363']);
  await page.locator('#fazenda input[type=search]').fill('30084');
  assert.equal(await page.locator('#fazenda [data-filter-option]:visible input:not([data-all])').count(),1);
  assert.equal(await page.locator('#fazenda input[value="29363"]').isChecked(),true);
  await page.locator('#fazenda input[type=search]').fill('lucia');
  assert.equal(await page.locator('#fazenda [data-filter-option]:visible input:not([data-all])').count(),1);
  await page.locator('#fazenda input[type=search]').fill('');
  await page.locator('#fazenda [data-all]').check();
  assert.equal((await page.evaluate(()=>filters.values().fazenda)).length,3);
  await page.evaluate(()=>filters.set('fazenda',['29363']));
  const href=await page.evaluate(()=>detailUrl('ca',2026,11));
  assert.equal(new URL(href,'http://bi.test').searchParams.get('fazenda'),'29363');
  await page.goto('http://bi.test/'+href);
  await page.waitForFunction(()=>detalhesData?.dimensao_produtor==='fazenda');
  assert.deepEqual(await page.evaluate(()=>filters.values().fazenda),['29363']);
  assert.deepEqual(await page.evaluate(()=>detailRankings.tecnicos.rows.map(r=>r.nome)),['MAX']);
  assert.equal(await page.locator('#rankingProdutores').locator('xpath=ancestor::article').locator('h2').textContent(),'Fazendas');
  const back=await page.locator('#voltarDashboard').getAttribute('href');
  assert.equal(new URL(back,'http://bi.test').searchParams.get('fazenda'),'29363');
  for(const metric of ['ca','cac','gmd','mortalidade','idade','peso_medio','vazio','morte_transporte','cac_ref','aves_abatidas','iep']) {
   await page.goto('http://bi.test/detalhes.html?indicador='+metric+'&ano=2026&mes=11&fazenda=30084');
   await page.waitForFunction(()=>detalhesData?.dimensao_produtor==='fazenda');
   assert.deepEqual(await page.evaluate(()=>filters.values().fazenda),['30084']);
   assert.deepEqual(await page.evaluate(()=>detailRankings.tecnicos.rows.map(r=>r.nome)),['LAS']);
  }
  await page.goto('http://bi.test/detalhes.html?indicador=ca&ano=2026&mes=11');
  await page.waitForFunction(()=>detailRankings.produtores.rows.length===3);
  await page.locator('[data-ranking-sort="produtores"]').click();
  await page.evaluate(()=>{
    const i=detailRankings.produtores.rows.findIndex(r=>r.codigo==='29363');
    echarts.getInstanceByDom(document.getElementById('rankingProdutores')).trigger('click',{dataIndex:i});
  });
  await page.waitForFunction(()=>filters.values().fazenda?.[0]==='29363' && document.getElementById('dashboardAtualizando').classList.contains('hidden'));
  assert.deepEqual(await page.evaluate(()=>detailRankings.tecnicos.rows.map(r=>r.nome)),['MAX']);
  await page.locator('[data-ranking-back]').first().click();
  await page.waitForFunction(()=>!filters.values().fazenda && detailRankings.produtores.rows.length===3 && !document.querySelector('[data-ranking-back]').disabled);
  await page.evaluate(()=>{
    const i=detailRankings.galpoes.rows.findIndex(r=>r.codigo==='30084');
    echarts.getInstanceByDom(document.getElementById('rankingGalpoes')).trigger('click',{dataIndex:i});
  });
  await page.waitForFunction(()=>filters.values().fazenda?.[0]==='30084' && document.getElementById('dashboardAtualizando').classList.contains('hidden'));
  assert.deepEqual(await page.evaluate(()=>filters.values().galpao),['240A']);
  await page.locator('#limparFiltrosDetalhes').click();
  await page.waitForFunction(()=>!filters.values().fazenda && !filters.values().galpao && detailRankings.produtores.rows.length===3);
  await page.goto('http://bi.test/'+back);
  await page.waitForFunction(()=>dashboardData?.indicadores);
  assert.deepEqual(await page.evaluate(()=>filters.values().fazenda),['29363']);
  for(const width of [390,768,1440]) {
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.locator('#fazenda').count());
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  await page.evaluate(()=>document.documentElement.dataset.theme='dark');
  await page.screenshot({path:path.join(root,'outputs/filtro-fazenda-20261123/fazenda-mobile.png'),fullPage:false});
  const condCalls=calls.filter(c=>c.path.includes('/pcp/'));
  assert.ok(condCalls.length>0);assert.ok(condCalls.every(c=>!new URLSearchParams(c.query).has('fazenda')&&!new URLSearchParams(c.query).has('produtor')));
  assert.ok(calls.filter(c=>c.path.endsWith('/zootecnico/resumo')&&new URLSearchParams(c.query).has('fazenda')).length>0);
  assert.ok(calls.filter(c=>c.path.includes('/zootecnico/')).every(c=>!new URLSearchParams(c.query).has('produtor')));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',codeAndNameSearch:true,accentInsensitive:true,selectionPreserved:true,selectAllContext:true,cascade:true,metrics:11,navigation:true,condenacaoUnchanged:true,viewports:3,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});