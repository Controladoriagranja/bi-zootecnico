/* Navegador real, nenhuma API/banco real. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'outputs/acompanhamento-lanc-mortalidades-20261123');
const audit=JSON.parse(fs.readFileSync(path.join(out,'inspecao-planilha.json'),'utf8'));
const vm=require('node:vm');
const fields=['data_base','unidade','tecnico','granja','galpao','lote','dias_atraso','status_peso'];
const apiRows=Array.from({length:244},(_,i)=>({chave_lote:'fixture-'+i,granja:i%2?'14660':'13886',galpao:String(i+1),tecnico:i%2?'HRN':'CVB',idade:14,idd_umo:i%3?14:null,dias_atraso:i%3?0:null,glp:String(i+1),tec:i%2?'HRN':'CVB',status_peso:i%5?'':'PESO ATRASADO',data_base:'2026-11-19',unidade:'052',lote:'0065'}));
apiRows.push({...apiRows[0],chave_lote:'older-fixture',data_base:'2026-10-31',tecnico:'OLD'});
(async()=>{
 const boundaryRows=[
  {idade_atual:43,idade_ultima_mortalidade:39,idade_ultimo_peso:35},
  {idade_atual:42,idade_ultima_mortalidade:37,idade_ultimo_peso:34},
  {idade_atual:43,idade_ultima_mortalidade:37,idade_ultimo_peso:34},
  {idade_atual:null,idade_ultima_mortalidade:37,idade_ultimo_peso:34},
  {idade_atual:10,idade_ultima_mortalidade:12,idade_ultimo_peso:null}
 ].map((r,i)=>({...r,example_id:String(i),granja:'1'}));
 const sandbox={window:{}};
 const adapter=fs.readFileSync(path.join(root,'assets/js/acompanhamento-mortalidades-data.js'),'utf8').replace(/const rawRows = .*;\r?\n/,`const rawRows = ${JSON.stringify(boundaryRows)};\n`);
 vm.runInNewContext(adapter,sandbox);
 const boundaries=await sandbox.window.LancMortalidadesData.query({},{order:'example_id'});
 assert.deepEqual(Array.from(boundaries.dados,r=>r.status_peso),['','','PESO ATRASADO',null,null]);
 assert.deepEqual(Array.from(boundaries.dados,r=>r.dias_atraso),[4,5,6,null,-2]);
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];let mode='404';const apiCalls=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname.endsWith('workers.dev')){
    apiCalls.push(u.pathname+u.search);
    if(mode!=='api')return route.fulfill({status:Number(mode),contentType:'application/json',body:JSON.stringify({detail:'BI indisponivel'})});
    const q=u.searchParams,selected=(ignore)=>apiRows.filter(r=>fields.every(k=>k===ignore||!q.has(k)||q.getAll(k).includes(String(r[k]??''))));
    if(u.pathname.endsWith('/filtros'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(Object.fromEntries(fields.map(k=>[k,[...new Set(selected(k).map(r=>r[k]).filter(v=>v!=null&&v!=='').map(String))]])))});
    const data=selected(),n=Number(q.get('pagina')||1),size=Number(q.get('tamanho')||100);
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({rules_version:'acompanhamento-lancamentos-20261123-v1',dados:data.slice((n-1)*size,n*size),total:data.length,pagina:n,total_paginas:Math.ceil(data.length/size),atualizado_em:'2026-11-19T17:33:57-03:00'})});
   }
   if(u.hostname!=='bi.test')return route.fulfill({status:404,body:''});
   const file=decodeURIComponent(u.pathname).replace(/^\//,'');
   try{return route.fulfill({status:200,contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'application/octet-stream',body:fs.readFileSync(path.join(root,file))});}catch{return route.fulfill({status:404,body:''});}
  });
  const url='http://bi.test/acompanhamento-mortalidades.html';
  await page.goto(url);await page.waitForFunction(()=>document.getElementById('lancCount').textContent.startsWith('219'));
  assert.deepEqual((await page.locator('#lancHead button').allTextContents()).map(t=>t.replace(/[↑↓↕]/g,'').trim()),['GRANJA','GALPAO','TÉCNICO','IDADE','IDD UMO','DIAS ATRASO MORT.','GLP','TÉC','STATUS PESO']);
  assert.equal(await page.locator('#lancUpdated').textContent(),'—');
  const all=await page.evaluate(()=>LancMortalidadesData.query({},{size:500}));
  assert.equal(all.dados.length,219);
  for(const source of audit.records){
   const row=all.dados.find(r=>r.example_id==='excel:'+source.excel_row);
   assert.equal(row.dias_atraso,source.values.AJ);
   assert.equal(row.glp,String(source.values.C));assert.equal(row.tec,source.values.F);
   assert.equal(row.status_peso||'',source.values.AM||'');
  }
  assert.equal(all.dados.filter(r=>r.status_peso==='PESO ATRASADO').length,16);
  const highlighted=await page.locator('#lancRows tr').evaluateAll(rows=>rows.filter(r=>r.children[5].classList.contains('lanc-delay')).length);
  const shown=all.dados.slice(0,100).filter(r=>r.dias_atraso>4).length;assert.equal(highlighted,shown);
  await page.locator('#lancFormulaMount button').click();
  await page.locator('#indicatorFormulaDialog').waitFor({state:'visible'});
  assert.equal(await page.locator('#indicatorFormulaDialog [data-formula-section]').count(),4);
  assert.match(await page.locator('#indicatorFormulaDialog').textContent(),/IDADE − IDD UMO/);
  await page.locator('#indicatorFormulaDialog .if-close').click();
  await page.locator('#lanc_granja button').click();
  await page.locator('#lanc_granja input[type=search]').fill('29168');
  assert.equal(await page.locator('#lanc_granja [data-filter-option]:visible input:not([data-all])').count(),1);
  await page.locator('#lanc_granja input[value="29168"]').check();
  await page.waitForFunction(()=>[...document.querySelectorAll('#lancRows tr')].every(r=>r.children[0].textContent==='29168'));
  await page.locator('#limparLancFiltros').click();await page.waitForFunction(()=>document.getElementById('lancCount').textContent.startsWith('219'));
  await page.locator('#lancNext').click();await page.waitForFunction(()=>document.getElementById('lancPage').textContent==='2 / 3');
  await page.locator('#lancPrevious').click();await page.waitForFunction(()=>document.getElementById('lancPage').textContent==='1 / 3');
  await page.screenshot({path:path.join(out,'exemplo-desktop.png'),fullPage:true});
  for(const width of [390,768]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const before=await page.locator('#lancRows tr:first-child td:first-child').boundingBox();
   await page.locator('.lanc-table-scroll').evaluate(el=>el.scrollLeft=400);
   const after=await page.locator('#lancRows tr:first-child td:first-child').boundingBox();assert.ok(Math.abs(before.x-after.x)<=1);
   await page.screenshot({path:path.join(out,'exemplo-'+width+'.png'),fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>document.documentElement.dataset.theme='dark');
  await page.screenshot({path:path.join(out,'exemplo-escuro.png'),fullPage:true});
  // Sessao presente, mas novo registry ausente: identificar o exemplo, sem fingir banco.
  await page.evaluate(()=>sessionStorage.setItem('granjabi_auth_token','local-test-only'));await page.reload();
  await page.waitForFunction(()=>document.getElementById('lancSource').textContent.includes('registry'));
  mode='api';await page.reload();await page.waitForFunction(()=>document.getElementById('lancCount').textContent.startsWith('244'));
  assert.equal(await page.locator('#lanc_data_base input[value="2026-11-19"]').isChecked(),true);
  assert.equal(await page.locator('#lanc_data_base input[value="2026-10-31"]').isChecked(),false);
  assert.ok(apiCalls.filter(u=>u.includes('/detalhes')).every(u=>new URL(u,'http://bi.test').searchParams.get('data_base')==='2026-11-19'));
  assert.equal(await page.locator('#lanc_tecnico input[value="OLD"]').count(),0);
  assert.equal(await page.locator('#lancUpdated').textContent(),'19/11/2026 17:33');
  assert.ok(!(await page.locator('#lancSource').textContent()).includes('exemplo'));
  assert.equal((await page.locator('#lanc_data_base input[value="2026-11-19"]').locator('..').textContent()).trim(),'19/11/2026');
  assert.equal(await page.locator('#lancRows tr:nth-child(1) td:nth-child(6)').textContent(),'—');
  assert.equal(await page.locator('#lancRows tr:nth-child(2) td:nth-child(6)').textContent(),'0');
  await page.locator('#lancNext').click();await page.waitForFunction(()=>document.getElementById('lancPage').textContent==='2 / 3');
  await page.locator('#lancPrevious').click();await page.waitForFunction(()=>document.getElementById('lancPage').textContent==='1 / 3');
  assert.equal(await page.locator('#lancPrevious').isDisabled(),true);
  mode='403';apiCalls.length=0;await page.reload();await page.locator('#lancError').waitFor({state:'visible'});
  assert.equal(await page.locator('#lancPrevious').isDisabled(),true);assert.equal(await page.locator('#lancNext').isDisabled(),true);
  assert.equal(await page.locator('#lancTable').getAttribute('aria-busy'),null);
  assert.ok(!(await page.locator('#lancCount').textContent()).includes('Carregando'));
  const deniedCalls=apiCalls.length;await page.evaluate(()=>{document.getElementById('lancPrevious').click();document.getElementById('lancNext').click();});
  assert.equal(apiCalls.length,deniedCalls);assert.ok(!apiCalls.some(u=>u.includes('/detalhes')));
  mode='503';await page.reload();await page.locator('#lancError').waitFor({state:'visible'});
  assert.ok(!(await page.locator('#lancSource').textContent()).includes('Dados de exemplo'));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',columns:9,excelRowsChecked:219,weightDelayed:16,formulaModal:4,filters:true,pagination:true,viewports:[390,768,1440],stickyFirstColumn:true,themes:2,realApiMode:true,exampleFallbackOnly404:true,freshness:'19/11/2026 17:33',zeroAndNull:true,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
