const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const meta={rules_version:'acerto-iep-mensal-2026-10-16',arquivo:'zootecnico.vw_desempenho_acerto_portal',atualizado_em:'2026-11-06T10:00:00-03:00'};
const weekly=[7,14,21,28,35].map(idade=>({idade,mortes:10,mortalidade:1,mortalidade_sem_descartes:.8,descarte_percent:.2,peso:100*idade}));
const cards={lotes:1,aves:1000,mortes:50,mortalidade:5,peso:2100,peso_atual:3,peso_pinto:44.6,peso_abate_final:2.919,vezes_maior:3};
const rxp={programada:100,real:90,diferenca:-10,difPercent:-10,registrosComDiferenca:1};
const phases=['07','14','21','28','35','35_abate'].map(id=>({id,nome:id==='35_abate'?'Abate':'Peso '+Number(id)+' dias'}));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(()=>sessionStorage.setItem('granjabi_auth_token','synthetic-formulas-token'));
 let requests=0;
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname.endsWith('workers.dev')){
   requests++;let body;
   if(u.pathname.endsWith('/filtros'))body={ano:['2026'],mes:[10],dia:['2'],produtor:['Produtor teste'],tipo_granja:['Integrada'],modelo:['Modelo'],galpao:['A'],tecnico:['Técnico'],linhagem:['COBB'],mist_linha:['Pura'],tipo_linhagem:['pura'],periodo_dias:['7']};
   else if(u.pathname.includes('/formulas/'))body=meta;
   else if(u.pathname.includes('/gpd-fases/'))body={...meta,rules_version:'gpd-dinamica-2026-10-23-v1',agrupamento:'semana',cards:{lotes:1},fases:phases,periodos:[{inicio:'2026-10-05',ano_semana:2026,semana:41,lotes:1,fases:Object.fromEntries(phases.map(p=>[p.id,{valor:60,lotes:1}]))}],totais:Object.fromEntries(phases.map(p=>[p.id,{valor:60,lotes:1}]))};
   else if(u.pathname.includes('/zootecnico/')){
    const ids=['iep','ca','cac','gmd','mortalidade','idade','peso_medio','vazio','morte_transporte','aves_abatidas'];
    if(u.pathname.endsWith('/resumo'))body={...meta,anos:[2026],meses:Array.from({length:12},(_,i)=>({numero:i+1,nome:String(i+1)})),meses_carregados:u.searchParams.getAll('mes_carga').map(Number),totais_incluidos:u.searchParams.get('incluir_totais')!=='0',indicadores:Object.fromEntries(ids.map(id=>[id,{id,nome:id,unidade:'',casas_decimais:2,por_ano:{2026:Array(12).fill(60)},totais:{2026:60}}]))};
    else body={...meta,etapa:u.searchParams.get('etapa')||'completo',indicador:{id:'gmd',nome:'GPD',valor:60,unidade:'g/dia',casas_decimais:2},ranking_tecnicos:[{nome:'Técnico',valor:60}],ranking_produtores:[{nome:'Produtor teste',valor:60}],evolucao:{meses:[{numero:10,nome:'outubro'}],series:[{ano:2026,valores:[60]}]}};
   }else if(u.pathname.includes('/rxp/'))body=u.pathname.endsWith('/resumo')?{...meta,realizados_ate:'2026-11-05',etapa:u.searchParams.get('etapa')||'completo',cards:rxp,groups:[{unidade:'AVE NOVA',cards:rxp}]}:{...meta,realizados_ate:'2026-11-05',cards:rxp,pagina:1,total:1,total_paginas:1,dados:[{id:1,fonte:'ave',unidade:'AVE NOVA',produtor:'Produtor teste',galpao:'A',data:'2026-10-02',lote:'1',programada:100,real:90,difQtdeRxP:-10,difPercent:-10}]};
   else body={...meta,cards,weekly,metas:{mortalidade_semanal:{valor:1}},groups:[{tipo_granja:'Integrada',produtor:'Produtor teste',linhagem:'COBB',cards,weekly}],galpoes:[{produtor:'Produtor teste',galpao:'A',idade_atual:35,linhagens:['COBB'],cards,weekly}],hierarchy:[{campo:'semana',valor:'40',cards,weekly,children:[]}]};
   return route.fulfill({json:body});
  }
  try{const file=path.resolve(root,decodeURIComponent(u.pathname).replace(/^\//,''));assert.ok(file.startsWith(root+path.sep));const ext=path.extname(file);return route.fulfill({body:await fs.readFile(file),contentType:ext==='.html'?'text/html':ext==='.js'?'application/javascript':ext==='.css'?'text/css':undefined});}catch{return route.fulfill({status:404,body:''});}
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const snapshot=()=>page.evaluate(()=>JSON.stringify([...document.querySelectorAll('[_echarts_instance_]')].map(el=>echarts.getInstanceByDom(el)?.getOption().series?.map(s=>s.data))));
 try{
  for(const name of ['index','detalhes','lotes','historico','diferenca-aves-abatidas','gpd-por-fase','formulas']){
   await page.goto('http://bi.test/'+name+'.html'+(name==='detalhes'?'?indicador=gmd&ano=2026':''));
   await page.waitForFunction(()=>window.FormulaRegistry&&document.querySelector('button[data-formula-id]'));
   if(name!=='formulas')await page.waitForFunction(()=>document.querySelector('#apiFilterProgress')?.classList.contains('hidden')||document.body.innerText.includes('Produtor teste')||document.querySelector('#phaseBody tr'));
   await page.waitForTimeout(300);
   const broken=await page.locator('button[data-formula-id]').evaluateAll(buttons=>buttons.flatMap(b=>b.dataset.formulaId.split(/\s+/).filter(id=>!FormulaRegistry.get(id))));assert.deepEqual(broken,[]);
   const old=await page.locator('[id^=formulaModal],#phaseFormula,[data-lotes-formula],[data-rxp-formula],[data-info-metric],#formulaIndicador').count();assert.equal(old,0,name+' sem interfaces antigas');
   const buttons=page.locator('button[data-formula-id]:visible'),total=await buttons.count();assert.ok(total>0,name);
   const values=await snapshot(),network=requests;
   for(let i=0;i<total;i++){
    const b=buttons.nth(i),id=await b.evaluate(el=>(FormulaRegistry.resolveIds?.(el.dataset.formulaId)||el.dataset.formulaId).split(' ')[0]);await b.click();
    const modal=page.locator('#indicatorFormulaDialog');assert.ok(await modal.isVisible());assert.equal(await modal.locator('h2').textContent(),'Fórmulas do relatório');
    assert.equal(await modal.locator('.if-selected').getAttribute('data-formula-section'),id);
    assert.equal(await modal.locator('.if-reference[open]').count(),0);assert.ok(await modal.locator('.if-metric').count()>1);
    assert.equal(await modal.locator('.if-label').filter({hasText:'DESCRIÇÃO'}).count(),await modal.locator('.if-metric').count());
    assert.equal(await modal.locator('.if-rules').count(),await modal.locator('.if-metric').count());
    assert.equal(await modal.evaluate(el=>el.querySelector('.if-dialog-content').scrollHeight>el.querySelector('.if-dialog-content').clientHeight),true);
    await page.keyboard.press('Escape');assert.equal(await modal.isVisible(),false);assert.ok(await b.evaluate(el=>el===document.activeElement));
   }
   assert.equal(await page.locator('#indicatorFormulaDialog').count(),1);assert.equal(await snapshot(),values,'Fx não muda séries');assert.equal(requests,network,'Fx não consulta API');
   await buttons.first().focus();await page.keyboard.press('Enter');await page.locator('.if-close').click();await buttons.first().focus();await page.keyboard.press('Space');
   await page.locator('#indicatorFormulaDialog').evaluate(el=>{const r=el.getBoundingClientRect();el.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left-5,clientY:r.top-5}));});assert.equal(await page.locator('#indicatorFormulaDialog').isVisible(),false);
   fs.mkdir(path.join(root,'artifacts/fx'),{recursive:true});
   for(const width of [1440,390])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:900});await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);await buttons.first().click();
    const modal=page.locator('#indicatorFormulaDialog'),box=await modal.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
    assert.equal(await modal.evaluate(el=>el.scrollWidth>el.clientWidth),false);assert.ok(await modal.locator('.if-close').isVisible());
    await page.screenshot({path:path.join(root,'artifacts/fx',name+'-'+width+'-'+theme+'.png')});await page.keyboard.press('Escape');
   }
   await page.setViewportSize({width:1440,height:1000});
   if(name==='detalhes'){
    await page.locator('#mortalityLotsDialog').evaluate(el=>el.showModal());await page.locator('#mortalityLotsDialog .if-button').click();await page.keyboard.press('Escape');assert.ok(await page.locator('#mortalityLotsDialog').evaluate(el=>el.open));await page.locator('#mortalityLotsDialog').evaluate(el=>el.close());
   }
   if(name==='lotes'){
    await page.locator('[data-lotes-view=galpoes]').click();await page.locator('[data-barn]').first().click();assert.equal(await page.locator('#galpaoDrawerResumo .if-button').count(),4);await page.locator('#galpaoDrawerResumo .if-button').last().click();await page.keyboard.press('Escape');assert.ok(await page.locator('#galpaoDrawer').isVisible());await page.locator('#galpaoDrawerFechar').click();
   }
   if(name==='diferenca-aves-abatidas'){
    await page.locator('[data-rxp-unit]').first().click();await page.locator('#tabelaProdutoresAbate').getByText('Produtor teste').waitFor();assert.equal(await page.locator('.abate-modal-summary .if-button').count(),4);await page.locator('.abate-modal-summary .if-button').last().click();await page.keyboard.press('Escape');assert.ok(await page.locator('#modalAbate').isVisible());await page.locator('#modalAbateFechar').click();
   }
   console.log('PASS fx/modal: '+name+' ('+total+' botões visíveis; desktop/mobile; claro/escuro)');
  }
  assert.deepEqual(errors,[]);console.log('PASS componente único, sem consultas/alteração de séries, teclado, foco, fundo, regras destacadas e modais aninhados.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
