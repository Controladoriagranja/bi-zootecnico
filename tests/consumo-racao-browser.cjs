/* Navegador real, fonte e servidor simulados; nenhuma chamada externa ou carga. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {chromium}=require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'outputs/consumo-medio-racao-20261126');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/consumo-racao-demo.js'),'utf8'),sandbox);
const fixture=JSON.parse(JSON.stringify(sandbox.window.ConsumoRacaoDemo));delete fixture.demonstracao;fixture.atualizado_em='2026-11-26T08:04:00-03:00';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],calls=[];let mode='pending';
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname.endsWith('workers.dev')){
    calls.push({url:route.request().url(),headers:route.request().headers()});
    if(url.pathname==='/api/portal/fabrica_racao/dados/metas'){
     const dados=[['fpi',.22],['fin',1],['fci',1],['fc2',1],['fab',1.9]].map(([phase,valor_meta])=>({indicador_codigo:`plano_0001_${phase}_cons_ave`,ativo:true,tela:'consumo-medio-racao',unidade:'kg/ave',tabela_origem:'fabrica_racao.consumo_medio_racao',referencia_mes:'2026-01-01',valor_meta}));
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({esquema:'fabrica_racao',tabela:'metas',dados,total:5,pagina:1,tamanho:500,total_paginas:1})});
    }
    if(mode.startsWith('portal')){
     const all=mode==='portal-empty'?[]:fixture.dados.map(row=>({...row,chave_hash:row.registro_id,importado_em:'2026-11-26T09:02:36.703746-03:00'}));
     const pagina=Number(url.searchParams.get('pagina')),tamanho=32;
     assert.equal(url.pathname,'/api/portal/fabrica_racao/dados/consumo_medio_racao');assert.equal(url.searchParams.get('tamanho'),'500');
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({esquema:'fabrica_racao',tabela:'consumo_medio_racao',colunas:Object.keys(fixture.dados[0]).concat(['chave_hash','importado_em']),dados:all.slice((pagina-1)*tamanho,pagina*tamanho),total:all.length,pagina,tamanho,total_paginas:Math.ceil(all.length/tamanho)})});
    }
    if(mode==='403')return route.fulfill({status:403,contentType:'application/json',body:'{"detail":"Negado"}'});
    if(mode==='503')return route.fulfill({status:503,contentType:'application/json',body:'{"detail":"Indisponivel"}'});
    if(mode==='loading')await new Promise(resolve=>setTimeout(resolve,700));
    const payload=mode==='empty'?{...fixture,total_registros:0,dados:[]}:mode==='partial'?{...fixture,completo:false}:fixture;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
   }
   if(url.hostname!=='localhost')return route.fulfill({status:404,body:''});
   const file=decodeURIComponent(url.pathname).replace(/^\//,'');
   try{let body=fs.readFileSync(path.join(root,file));
    if(file==='assets/js/consumo-racao-config.js'&&!mode.startsWith('portal'))body=Buffer.from(`window.ConsumoRacaoConfig=Object.freeze({mode:'${mode==='pending'?'pending':'api'}',snapshotEndpoint:'/api/test-only/consumo',requestParams:{},maxRecords:10000,contractVersion:'consumo-racao-snapshot-v1'});`);
    return route.fulfill({status:200,contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'application/octet-stream',body});
   }catch{return route.fulfill({status:404,body:''});}
  });
  const url='http://localhost/consumo-medio-racao.html';
  await page.goto(url);await page.waitForFunction(()=>document.getElementById('feedState').dataset.state==='pending');
  assert.equal(calls.length,0);assert.equal(await page.locator('#feedTotal').textContent(),'—');assert.equal(await page.locator('#feedDemo').isVisible(),false);
  assert.equal(await page.locator('#limparFeedFiltros').isDisabled(),true);
  const links=await page.locator('.side-nav-link').allTextContents();assert.match(links.at(-2),/Consumo Médio de Ração/);assert.match(links.at(-1),/Fórmulas/);
  await page.goto(url+'?demo=1');await page.waitForFunction(()=>document.getElementById('feedRecords').textContent==='64',{},{timeout:8000}).catch(async error=>{console.error(await page.locator('#feedState').textContent(),errors);throw error;});
  assert.equal(calls.length,0);assert.equal(await page.locator('#feedDemo').isVisible(),true);
  assert.equal(await page.locator('#feed_nutricao,#feed_sexo').count(),0);
  assert.doesNotMatch(await page.locator('#feedDetailTable thead').textContent(),/Nutrição|Sexo/);
  assert.match(await page.locator('#feedPerBird').textContent(),/,\d{3}$/);
  assert.match(await page.locator('#feedTotal').textContent(),/,\d{3}$/);
  const decimals=await page.locator('#feedLineages tr:first-child td').allTextContents();
  assert.ok(decimals.slice(1,6).every(value=>value==='—'||/,\d{3}$/.test(value)));
  const fieldTops=await page.locator('#feedFilters>.filter-field').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().top));
  assert.equal(fieldTops.length,6);assert.ok(fieldTops.every(top=>Math.abs(top-fieldTops[0])<1));
  assert.ok((await page.locator('.feed-kpi').first().boundingBox()).height<110);
  const headers=page.locator('#feedLineageTable thead th');
  assert.equal(await headers.locator('button').count(),8);
  const totalsBefore=await page.locator('#feedLineageTotal').textContent(),callsBeforeSort=calls.length;
  for(let index=0;index<8;index++){
   const button=headers.nth(index).locator('button');
   if(await headers.nth(index).getAttribute('aria-sort')!=='none')await button.click();
   for(let step=0;step<2;step++){
    await button.click();const direction=await headers.nth(index).getAttribute('aria-sort');
    const values=await page.locator(`#feedLineages tr td:nth-child(${index+1})`).allTextContents();
    const valid=values.filter(value=>value!=='—').map(value=>index===0?value:Number(value.replaceAll('.','').replace(',','.')));
    const expected=[...valid].sort((a,b)=>(index===0?a.localeCompare(b,'pt-BR',{numeric:true}):a-b)*(direction==='ascending'?1:-1));
    assert.deepEqual(valid,expected);
   }
  }
  assert.equal(await page.locator('#feedLineageTotal').textContent(),totalsBefore);assert.equal(calls.length,callsBeforeSort);
  assert.equal(await page.locator('#feedUpdated').textContent(),'—');assert.equal(await page.locator('#feedDetailRows tr').count(),25);
  assert.ok(await page.locator('#feedPhasesChart canvas').count());assert.ok(await page.locator('#feedEvolutionChart canvas').count());
  await page.locator('#feedNext').click();assert.equal(await page.locator('#feedPage').textContent(),'2 / 3');
  await page.locator('#feedPrev').click();assert.equal(await page.locator('#feedPage').textContent(),'1 / 3');
  await page.locator('#feedPageSize').selectOption('50');assert.equal(await page.locator('#feedDetailRows tr').count(),50);
  await page.locator('#feed_fazenda button').click();await page.locator('#feed_fazenda input[type=search]').fill('aguas');
  assert.equal(await page.locator('#feed_fazenda [data-filter-option]:visible input:not([data-all])').count(),1);
  await page.locator('#feed_fazenda input[value="DEMO01"]').check();await page.waitForFunction(()=>document.getElementById('feedRecords').textContent==='16');
  assert.equal(await page.locator('#feed_linhagens input[value="HUBBARD"]').count(),0);
  assert.match(await page.locator('#feedDetailRows tr:first-child td:nth-child(2)').textContent(),/DEMO01/);
  await page.locator('#limparFeedFiltros').click();await page.waitForFunction(()=>document.getElementById('feedRecords').textContent==='64');
  await page.locator('#feedStart').fill('2026-11-20');await page.locator('#feedStart').dispatchEvent('change');
  await page.waitForFunction(()=>Number(document.getElementById('feedRecords').textContent)<64);
  assert.match(await page.locator('#feedPeriod').textContent(),/20\/11\/2026/);
  await page.locator('#limparFeedFiltros').click();await page.waitForFunction(()=>document.getElementById('feedRecords').textContent==='64');
  await page.locator('[data-feed-metric=total]').click();assert.match(await page.locator('#feedPhaseSubtitle').textContent(),/Consumo total/);
  await page.locator('[data-feed-period=semana]').click();assert.equal(await page.locator('[data-feed-period=semana]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-feed-period=mes]').click();
  await page.locator('[data-formula-mount="feed.ratio"] button').click();await page.locator('#indicatorFormulaDialog').waitFor({state:'visible'});
  assert.match(await page.locator('#indicatorFormulaDialog').textContent(),/MESMOS registros/);assert.match(await page.locator('#indicatorFormulaDialog').textContent(),/Cons\/Dia/);
  await page.locator('#indicatorFormulaDialog .if-close').click();
  await page.waitForFunction(()=>['feedPhasesChart','feedEvolutionChart'].every(id=>echarts.getInstanceByDom(document.getElementById(id))?.getWidth()===document.getElementById(id).clientWidth));
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  await page.locator('[data-theme-toggle]').click();await page.screenshot({path:path.join(out,'dark.png'),fullPage:true});
  for(const width of [768,390]){
   await page.setViewportSize({width,height:950});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const before=await page.locator('#feedDetailRows tr:first-child td:first-child').boundingBox();await page.locator('.feed-detail-scroll').evaluate(el=>el.scrollLeft=600);
   const after=await page.locator('#feedDetailRows tr:first-child td:first-child').boundingBox();assert.ok(Math.abs(before.x-after.x)<1);
   if(width===390){await page.locator('.mobile-filter-toggle').click();await page.locator('#feed_linhagens button').click();await page.locator('#feed_linhagens input[value=ROSS]').check();
    await page.locator('.mobile-filter-apply').click();await page.waitForFunction(()=>Number(document.getElementById('feedRecords').textContent)<64);
    if(await page.locator('.mobile-filter-toggle').getAttribute('aria-expanded')==='true')await page.locator('.mobile-filter-toggle').click();}
   await page.screenshot({path:path.join(out,'viewport-'+width+'.png'),fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>sessionStorage.setItem('granjabi_auth_token','synthetic-test-only'));
  mode='loading';await page.goto(url);await page.waitForFunction(()=>document.getElementById('feedState').dataset.state==='loading');assert.equal(await page.locator('#feedNext').isDisabled(),true);
  await page.waitForFunction(()=>document.getElementById('feedRecords').textContent==='64');assert.equal(await page.locator('#feedUpdated').textContent(),'26/11/2026 08:04');assert.equal(await page.locator('#feedDemo').isVisible(),false);
  assert.equal(calls.at(-1).headers.authorization,'Bearer synthetic-test-only');assert.equal(calls.at(-1).headers['cache-control'],undefined);
  for(const next of ['empty','partial','403','503']){mode=next;await page.reload();await page.waitForFunction(expected=>document.getElementById('feedState').dataset.state===expected,next==='empty'?'empty':'error');
   assert.equal(await page.locator('#feedDemo').isVisible(),false);assert.equal(await page.locator('#feedNext').isDisabled(),true);
   if(next==='empty')assert.equal(await page.locator('#feedRecords').textContent(),'0');else assert.equal(await page.locator('#feedTotal').textContent(),'—');}
  mode='loading';await page.reload();await page.waitForFunction(()=>document.getElementById('feedRecords').textContent==='64');
  await page.evaluate(()=>{sessionStorage.setItem('granjabi_auth_token','changed-session');window.dispatchEvent(new Event('focus'));});
  await page.waitForFunction(()=>document.getElementById('feedState').dataset.state==='error');assert.equal(await page.locator('#feedTotal').textContent(),'—');
  mode='portal';const beforePortal=calls.length;await page.reload();await page.waitForFunction(()=>document.getElementById('feedRecords').textContent==='64');
  await page.waitForFunction(()=>document.getElementById('feedTargetsStatus').textContent.includes('amarelo'));
  assert.equal(calls.length-beforePortal,3);assert.equal(await page.locator('#feedUpdated').textContent(),'26/11/2026 09:02');assert.equal(await page.locator('#feedDemo').isVisible(),false);
  assert.ok(await page.locator('#feedLineages td[class*=feed-target-]').count());assert.ok(await page.locator('#feedDetailRows td[class*=feed-target-]').count());
  assert.match(await page.locator('#feedLineages tr:first-child td:nth-child(4)').getAttribute('class'),/feed-target-/);
  assert.match(await page.locator('#feedLineages tr:first-child td:nth-child(6)').getAttribute('class'),/feed-target-/);
  const target=page.locator('#feedLineages td[class*=feed-target-]').first();const background=await target.evaluate(el=>getComputedStyle(el).backgroundColor);
  await page.screenshot({path:path.join(out,'metas-tema-1.png'),fullPage:true});
  await page.locator('[data-theme-toggle]').click();assert.notEqual(await target.evaluate(el=>getComputedStyle(el).backgroundColor),background);
  await page.screenshot({path:path.join(out,'metas-tema-2.png'),fullPage:true});
  mode='portal-empty';await page.reload();await page.waitForFunction(()=>document.getElementById('feedState').dataset.state==='empty');assert.equal(await page.locator('#feedRecords').textContent(),'0');assert.equal(await page.locator('#feedUpdated').textContent(),'—');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',states:['pending','loading','ready','empty','error'],cascadingFilters:true,nameSearch:true,dateFilter:true,pagination:true,charts:true,mobileFilters:true,viewports:[1440,768,390],themes:2,existingAuthentication:true,noDemoFallback:true,sessionCleared:true,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
