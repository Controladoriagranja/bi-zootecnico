/* Somente navegador local e API simulada. Nenhuma consulta ao ambiente real. */
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), assert = require('node:assert/strict');
const {chromium} = require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const git = 'C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe';
const baseline = file => cp.execFileSync(git,['show','0c54308:'+file],{cwd:root,stdio:['ignore','pipe','ignore']});
const meta = {arquivo:'zootecnico.vw_desempenho_acerto_portal',rules_version:'acerto-iep-mensal-2026-10-16',atualizado_em:'2026-11-18 08:05:00',periodo_recepcao:{data_inicio:'2026-10-01',data_fim:'2026-11-17'}};
const lots = [{produtor:'Atair',tecnico:'Lucas',galpao:'A'},{produtor:'Delcio',tecnico:'Lucas',galpao:'B'},{produtor:'Maria',tecnico:'Mariana',galpao:'C'}];
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
    const ranking=key=>[...new Set(eligible(q).map(r=>r[key]))].map(nome=>({nome,valor:1.979,lotes:1}));
    return {...meta,etapa:q.get('etapa'),indicador:{id,nome:id==='ca'?'CA':id==='mortalidade'?'% Mortalidade':'% Morte no Transporte',valor:1.979,unidade:id==='ca'?'':'%',casas_decimais:3},ranking_tecnicos:ranking('tecnico'),ranking_produtores:ranking('produtor'),ranking_contexto:{metodo:'ratio_sums',tecnicos:{valor_recomposto:1.979},produtores:{valor_recomposto:1.979}},evolucao:{...(id==='morte_transporte'?{agrupamento:'planta_de_abate',ano:Number(q.get('ano'))}:{}),meses:[{numero:1,nome:'janeiro'}],series:[{ano:2026,planta_de_abate:'AVE NOVA',valores:[1.979]}]}};
  }
  return {...meta,etapa:q.get('etapa'),cards,weekly,metas:{mortalidade_semanal:{valor:1,unidade:'%',comparacao:'<=',referencia_mes:'2026-11-01'}},groups:[{tipo_granja:'Integrada',produtor:'Atair',linhagem:'COBB',cards,weekly}],galpoes:[{produtor:'Atair',galpao:'A',idade_atual:35,linhagens:['COBB'],cards,weekly}],hierarchy:[{campo:'semana',valor:'42',cards,weekly,children:[]}]};
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],calls=[];
    page.setDefaultTimeout(12000);
    let oldVersion=false, delay=0, evolutionDelay=0, failFilters=false, emptyDetails=false;
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>sessionStorage.setItem('granjabi_auth_token','local-test-only'));
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.hostname.endsWith('workers.dev')) {
        calls.push({path:url.pathname,query:url.searchParams.toString()});
        if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
        if(evolutionDelay&&url.searchParams.get('etapa')==='evolucao')await new Promise(resolve=>setTimeout(resolve,evolutionDelay));
        const body=fixture(url);
        if(emptyDetails&&url.pathname.endsWith('/zootecnico/detalhes')){
          body.indicador.valor=null;body.ranking_tecnicos=[];body.ranking_produtores=[];body.evolucao.series=[];
        }
        return route.fulfill({status:failFilters&&url.pathname.endsWith('/filtros')?503:200,contentType:'application/json',body:JSON.stringify(body)}).catch(()=>{});
      }
      if(url.hostname!=='bi.test')return route.fulfill({status:404,body:''});
      const file=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
      try{
        let body=oldVersion?baseline(file):fs.readFileSync(path.join(root,file));
        if(file==='assets/js/detalhes.js')body=Buffer.from(`(() => {
          window.__detailDraws={rankings:0,evolution:0,clears:0};
          const ranking=ZooCharts.ranking,evolution=ZooCharts.evolution,init=ZooCharts.init;
          ZooCharts.ranking=(...args)=>{__detailDraws.rankings++;return ranking(...args)};
          ZooCharts.evolution=(...args)=>{__detailDraws.evolution++;return evolution(...args)};
          ZooCharts.init=(...args)=>{const chart=init(...args),clear=chart.clear.bind(chart);chart.clear=(...a)=>{__detailDraws.clears++;return clear(...a)};return chart;};
        })();\n`+body.toString());
        return route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/javascript'});
      }catch{return route.fulfill({status:404,body:''});}
    });
    const ready=async()=>{
      try{await page.waitForFunction(()=>document.querySelector('#dashboardAtualizando')?.classList.contains('hidden')&&document.querySelector('#kpiValor')?.textContent.trim()==='1,979',null,{timeout:12000});}
      catch(e){console.error({errors,message:await page.locator('#mensagemErro').innerText(),calls:calls.slice(-5)});throw e;}
    };
    const trigger=(kind,name)=>page.evaluate(({kind,name})=>{
      const chart=echarts.getInstanceByDom(document.getElementById('ranking'+kind));
      const index=chart.getOption().yAxis?.[0]?.data.indexOf(name)??-1;
      chart.trigger('click',{name,dataIndex:index,componentType:'series',seriesType:'bar'});
    },{kind,name});
    const click=async(kind,name)=>{await trigger(kind,name);await ready();};
    const state=()=>page.evaluate(()=>filters.values());
    const back=async()=>{await page.locator('[data-ranking-back]').first().click();await ready();};
    const initial='http://bi.test/detalhes.html?indicador=ca&ano=2026&mes=1&modelo=Dark%20house&status_acerto=Normal&tecnico=Lucas&tecnico=Mariana&produtor=Atair&produtor=Delcio&produtor=Maria';
    oldVersion=true;await page.goto(initial);await ready();let first=calls.length;
    await click('Tecnicos','Lucas');const stableClick=calls.slice(first);oldVersion=false;
    await page.goto(initial);await ready();const base=await state();
    assert.equal(await page.locator('[data-ranking-back]:visible').count(),0);
    const draws=()=>page.evaluate(()=>({...window.__detailDraws}));
    const firstDraws=await draws(),heightBefore=await page.locator('#rankingProdutores').locator('..').evaluate(el=>el.clientHeight);
    let start=calls.length;await click('Tecnicos','Lucas');
    const firstDelta=await draws();
    assert.equal(firstDelta.rankings-firstDraws.rankings,2,'Each ranking drawn once');
    assert.equal(firstDelta.evolution-firstDraws.evolution,1,'Evolution drawn once');
    assert.equal(firstDelta.clears-firstDraws.clears,0,'No clearing between responses');
    assert.equal(await page.locator('#rankingProdutores').locator('..').evaluate(el=>el.clientHeight),heightBefore,'Viewport height remains stable');
    assert.deepEqual(calls.slice(start),stableClick,'Same calls as the original click, including cascading option updates');
    assert.deepEqual((await state()).tecnico,['Lucas']);assert.deepEqual((await state()).produtor,['Atair','Delcio']);
    const technician=await state();await click('Produtores','Atair');assert.deepEqual((await state()).produtor,['Atair']);
    await back();assert.deepEqual(await state(),technician);
    start=calls.length;await back();assert.deepEqual(await state(),base);assert.equal(calls.length-start,3);
    assert.equal(await page.locator('[data-ranking-back]:visible').count(),0);
    // Delayed evolution must not redraw or clear fresh rankings.
    evolutionDelay=500;const beforePartial=await draws();await trigger('Tecnicos','Lucas');
    await page.waitForFunction(n=>window.__detailDraws.rankings===n+2,beforePartial.rankings);
    assert.equal((await draws()).evolution,beforePartial.evolution);
    assert.equal(await page.locator('#mortalityEvolutionCard').getAttribute('aria-busy'),'true');
    assert.equal(await page.locator('.details-top-grid [data-detail-region]').first().getAttribute('aria-busy'),'false');
    await ready();assert.equal((await draws()).rankings,beforePartial.rankings+2);
    evolutionDelay=0;await back();assert.deepEqual(await state(),base);
    // Rapid graph/return clicks must not add parallel transactions.
    delay=120;start=calls.length;await trigger('Tecnicos','Lucas');
    assert(await page.evaluate(()=>echarts.getInstanceByDom(document.querySelector('#rankingTecnicos')).getOption().series[0].data.length>0),'Old graph stays visible during options fetch');
    assert.equal((await page.locator('#kpiValor').innerText()).trim(),'1,979','Old KPI is retained and marked updating');
    assert(await page.locator('#apiFilterProgress').isVisible(),'Reuse Aplicando filtros');
    assert.equal(await page.locator('#dashboardAtualizando').innerText(),'','No duplicate loading indicator');
    await page.evaluate(()=>document.querySelector('[data-ranking-back]').click());
    await trigger('Tecnicos','Mariana');await trigger('Produtores','Atair');
    assert(await page.locator('[data-ranking-back]').first().isDisabled());await ready();
    assert.equal(calls.length-start,stableClick.length);delay=0;await back();assert.deepEqual(await state(),base);
    // Failed options load leaves a usable return, rather than a locked button.
    failFilters=true;await trigger('Tecnicos','Lucas');await page.locator('#mensagemErro').waitFor({state:'visible'});
    assert(await page.locator('[data-ranking-back]').first().isEnabled());failFilters=false;await back();assert.deepEqual(await state(),base);
    // Manual changes discard the graph navigation history.
    await click('Tecnicos','Lucas');await page.locator('#mes .checkbox-multiselect-trigger').click();await page.locator('#mes input[value="2"]').check();
    await page.locator('[data-ranking-back]').first().waitFor({state:'hidden'});await ready();
    await page.locator('h1').click();await click('Produtores','Atair');await page.locator('#indicador').selectOption('gmd');
    await page.locator('[data-ranking-back]').first().waitFor({state:'hidden'});await ready();
    // Single-year indicators use the same undo without changing their year selector.
    for(const indicator of ['mortalidade','morte_transporte']){
      await page.goto('http://bi.test/detalhes.html?indicador='+indicator+'&ano=2026&mes=1');await ready();const before=await state();
      await click('Tecnicos','Lucas');await back();assert.deepEqual(await state(),before);
    }
    await page.goto(initial);await ready();await click('Tecnicos','Lucas');
    for(const width of [360,390,768,1440])for(const theme of ['light','dark']){
      await page.setViewportSize({width,height:1000});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
      await page.waitForTimeout(80);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      for(const button of await page.locator('[data-ranking-back]').all()){
        const a=await button.boundingBox(),b=await button.locator('..').locator(':scope > .if-button').boundingBox();
        assert(a.x+a.width<=b.x+1||a.y+a.height<=b.y+1||b.y+b.height<=a.y+1,'Buttons do not overlap');
      }
      if(width===1440&&theme==='light')await page.locator('.details-top-grid').screenshot({path:path.join(root,'tests/frontend-previews/detail-ranking-return-20261118.png')});
    }
    await page.locator('[data-ranking-back]').last().click();await ready();assert.deepEqual(await state(),base);
    // An empty response removes old bars even though charts are merged for smooth updates.
    emptyDetails=true;await page.evaluate(()=>carregarDetalhes(false));
    assert.equal((await page.locator('#kpiValor').innerText()).trim(),'—');
    assert.equal(await page.evaluate(()=>echarts.getInstanceByDom(document.querySelector('#rankingTecnicos')).getOption().series[0].data.length),0);
    assert.equal(await page.evaluate(()=>echarts.getInstanceByDom(document.querySelector('#evolucaoChart')).getOption().series.length),0);
    emptyDetails=false;await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>carregarDetalhes(false));await ready();
    assert.equal(await page.evaluate(()=>echarts.getInstanceByDom(document.querySelector('#rankingTecnicos')).getOption().animation),false);
    await page.emulateMedia({reducedMotion:'no-preference'});
    // A/B on the seven published pages: identical initial request sequences.
    const pages=['index.html','detalhes.html?indicador=ca','lotes.html','historico.html','gpd-por-fase.html','diferenca-aves-abatidas.html','formulas.html'];
    const counts={};await page.setViewportSize({width:1440,height:1000});
    for(const old of [true,false]){
      oldVersion=old;const result={};
      for(const file of pages){
        const first=calls.length;await page.goto('http://bi.test/'+file);
        await page.waitForFunction(()=>document.querySelector('#apiFilterProgress')?.classList.contains('hidden'),null,{timeout:12000});
        if(file.startsWith('detalhes'))await ready();
        assert.equal(await page.locator('.alert-error:not(.hidden)').count(),0,file+': '+(await page.locator('.alert-error:not(.hidden)').allTextContents()).join(' '));
        result[file]=calls.slice(first).map(c=>c.path+'?'+c.query);
      }
      counts[old?'stable':'new']=result;
    }
    assert.deepEqual(counts.new,counts.stable);assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'PASS',undoLevels:2,multiSelectionRestored:true,rapidClicks:true,failedRequestRecovery:true,manualFilterAndIndicatorReset:true,singleYearIndicators:2,viewportChecks:8,pagesCompared:pages.length,initialRequestsUnchanged:true,rankingDrawsPerUpdate:2,evolutionDrawsPerUpdate:1,noIntermediateClears:true,stableViewport:true,errors}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
