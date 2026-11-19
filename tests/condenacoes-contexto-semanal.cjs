/* Componentes reais e API de leitura simulada, com pesos diferentes por dia. */
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><body'+(path.basename(root).toLowerCase()==='bi-pcp'?' class="pcp-report"':'')+'></body>');
  for(const file of ['app.css',path.basename(root).toLowerCase()==='bi-pcp'?'pcp.css':'condenacoes-card.css','pcp-condenacoes-period.css'])await page.addStyleTag({content:await fs.readFile(path.join(root,'assets/css',file),'utf8')});
  await page.evaluate(()=>{window.APP_CONFIG={endpoints:{filtros:'/unused'}};window.ApiScreen={escape:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};});
  for(const file of ['filters.js','pcp-multiselect.js','pcp-table-sort.js','pcp-condenacoes-period.js','pcp-condenacoes.js'])await page.addScriptTag({content:await fs.readFile(path.join(root,'assets/js',file),'utf8')});
  await page.evaluate(()=>{
   window.calls=[];window.failure=false;window.pending=0;window.maxPending=0;
   const rows=[
    {data:'2026-10-31',grupo:'Apanha',causa:'Lesão',fornecedor:'Produtor Y',tipo:'Parcial',kg:5},
    {data:'2026-11-01',grupo:'Apanha',causa:'Lesão',fornecedor:'Produtor Y',tipo:'Total',kg:7},
    {data:'2026-11-02',grupo:'Apanha',causa:'Lesão',fornecedor:'Produtor Z',tipo:'Parcial',kg:9},
    {data:'2026-11-03',grupo:'Apanha',causa:'Outra',fornecedor:'Produtor Y',tipo:'Parcial',kg:2},
    {data:'2026-11-09',grupo:'Apanha',causa:'Lesão',fornecedor:'Produtor Y',tipo:'Total',kg:3},
    {data:'2026-11-09',grupo:'Campo',causa:'Sanidade',fornecedor:'Produtor Z',tipo:'Total',kg:11}
   ];
   const live={'2026-10-31':100,'2026-11-01':300,'2026-11-02':200,'2026-11-03':100,'2026-11-09':400};
   const api=async(_,q,options)=>{
    calls.push(structuredClone(q));pending++;maxPending=Math.max(maxPending,pending);
    try{
     await new Promise(r=>setTimeout(r,5));
     if(options.signal.aborted)throw new DOMException('Cancelled','AbortError');
     if(failure&&q.dias)throw Error('Falha semanal');
     const accepted=d=>q.ano.split(',').includes(d.slice(0,4))&&q.mes.split(',').map(Number).includes(Number(d.slice(5,7)))&&(!q.dias||q.dias.split(',').includes(d));
     const base=rows.filter(r=>accepted(r.data)&&(!q.fornecedores||JSON.parse(q.fornecedores).includes(r.fornecedor)));
     const months=[...new Set([...Object.keys(live).filter(accepted),...base.map(r=>r.data)].map(d=>d.slice(0,7)))].sort();
     const totalLive=Object.entries(live).filter(([d])=>accepted(d)).reduce((s,[,kg])=>s+kg,0),groups=new Map();
     for(const r of base){const key=JSON.stringify([r.grupo,r.causa,r.tipo]);if(!groups.has(key))groups.set(key,{grupo:r.grupo,causa:r.causa,tipo:r.tipo,kg:0,meses:{}});const x=groups.get(key),m=r.data.slice(0,7);x.kg+=r.kg;x.meses[m]={kg:(x.meses[m]?.kg||0)+r.kg};}
     const selected=base.filter(r=>!q.causa||q.causa===r.causa);
     let details=selected.map(r=>({...r,empresa:'Ave Nova',granja:'1',galpao:'1',lote:'1',condenacao:r.causa,peso_total:r.kg,peso_pesagem:live[r.data],percentual:r.kg/live[r.data],turno:'1'}));
     if(q.agrupado){const g=new Map();for(const r of details){if(!g.has(r.fornecedor))g.set(r.fornecedor,{...r,peso_total:0});g.get(r.fornecedor).peso_total+=r.peso_total;}details=[...g.values()];}
     if(q.ordenar)details.sort((a,b)=>(q.ordenar==='data'?a.data.localeCompare(b.data):a.peso_total-b.peso_total)*(q.direcao==='desc'?-1:1));
     const total=details.length;details=details.slice(((q.pagina||1)-1)*2,(q.pagina||1)*2);
     return {ok:true,data_limite:'2026-11-18',meses:months,resumo:[...groups.values()],peso_vivo_kg:totalLive,peso_condenado_kg:base.reduce((s,r)=>s+r.kg,0),totais_mensais:Object.fromEntries(months.map(m=>[m,{peso_vivo_kg:Object.entries(live).filter(([d])=>accepted(d)&&d.startsWith(m)).reduce((s,[,kg])=>s+kg,0)}])),opcoes_fornecedores:['Produtor Y','Produtor Z'],opcoes_tecnicos:[],detalhes:details,total_detalhes:total};
    }finally{pending--;}
   };
   window.report=PcpCondenacoes.create(api);report.open({ano:'2026',mes:'10,11',visao:'geral'});
  });
  const idle=()=>page.waitForFunction(()=>document.querySelector('dialog').getAttribute('aria-busy')==='false');await idle();
  const selected=id=>page.locator('#'+id).evaluate(s=>s.value);
  const change=async(id,list)=>{await page.locator('#'+id).evaluate((s,list)=>{s.value=list.map(encodeURIComponent).join(',');s.dispatchEvent(new Event('change'));},list);await idle();};
  const mode=async value=>{await page.locator('[data-cond-mode="'+value+'"]').click();await idle();};
  const summary=page.locator('.cg-cond-summary');
  const total=async()=>summary.locator('tbody tr').last().locator('td').last().textContent();
  assert.equal(await total(),'37,00');assert((await summary.locator('thead').textContent()).includes('10/2026'));
  await page.evaluate(()=>{document.querySelector('[data-cond-mode="semanal"]').click();document.querySelector('[data-cond-mode="mensal"]').click();});
  await idle();
  assert.equal(await page.locator('[data-cond-mode="mensal"]').getAttribute('aria-pressed'),'true');
  assert((await summary.locator('thead').textContent()).includes('10/2026'));
  await mode('semanal');
  assert.equal(await total(),'37,00');
  assert.equal(await summary.locator('thead th').count(),11);
  assert((await summary.locator('thead').textContent()).includes('Semana 44'));
  assert((await summary.locator('thead').textContent()).includes('Semana 46'));
  assert.equal(await summary.locator('tbody tr').last().locator('td').nth(-2).textContent(),'3,36%');
  assert((await page.evaluate(()=>calls.filter(q=>q.dias).map(q=>q.dias.split(',').length))).every(n=>n<=7));
  // Multisselecoes do pai sao restauradas ao voltar de cada nivel.
  await change('cgCondGrupo',['Apanha','Campo']);await change('cgCondCausa',['Lesão','Outra']);await change('cgCondFornecedor',['Produtor Y','Produtor Z']);
  await summary.locator('tbody button').filter({hasText:'Apanha'}).click();await idle();
  assert.equal(decodeURIComponent(await selected('cgCondGrupo')),'Apanha');
  if(process.env.CONDENACOES_PREVIEW_DIR){await fs.mkdir(process.env.CONDENACOES_PREVIEW_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.CONDENACOES_PREVIEW_DIR,path.basename(root)+'-contexto-semanal-'+width+'.png')});}
  await summary.locator('tbody button').filter({hasText:'Lesão'}).click();await idle();
  assert.equal(decodeURIComponent(await selected('cgCondCausa')),'Lesão');
  await page.locator('.cg-cond-rows tbody button').filter({hasText:'Produtor Y'}).click();await idle();
  assert.equal(decodeURIComponent(await selected('cgCondFornecedor')),'Produtor Y');
  assert((await page.locator('.cg-cond-rows thead').textContent()).startsWith('Data'));
  assert.equal(await page.locator('.cg-cond-rows tbody tr').first().locator('td').first().textContent(),'31/10/2026');
  const callsBefore=await page.evaluate(()=>calls.length);await mode('mensal');assert.equal(await page.evaluate(()=>calls.length),callsBefore);
  assert((await page.locator('.cg-cond-rows thead').textContent()).includes('Tipo'));
  await page.locator('.cg-cond-rows').evaluate(h=>h.dispatchEvent(new Event('scroll')));
  await page.waitForFunction(()=>calls.at(-1).pagina===2);
  await page.waitForFunction(()=>document.querySelectorAll('.cg-cond-rows tbody tr').length===3);
  assert.equal(await page.locator('.cg-cond-rows tbody tr').last().locator('td').first().textContent(),'09/11/2026');
  assert.equal(decodeURIComponent(await selected('cgCondGrupo')),'Apanha');assert.equal(decodeURIComponent(await selected('cgCondCausa')),'Lesão');
  await page.locator('.cg-cond-back').click();await idle();
  assert.equal(await selected('cgCondFornecedor'),['Produtor Y','Produtor Z'].map(encodeURIComponent).join(','));
  await page.locator('.cg-cond-back').click();await idle();
  assert.equal(await selected('cgCondCausa'),['Lesão','Outra'].map(encodeURIComponent).join(','));
  assert((await summary.locator('thead').textContent()).includes('11/2026'));
  await mode('semanal');assert((await summary.locator('thead').textContent()).includes('Semana 44'));
  await page.locator('.cg-cond-back').click();await idle();
  assert.equal(await selected('cgCondGrupo'),['Apanha','Campo'].map(encodeURIComponent).join(','));
  // Repetir com outro grupo e outro produtor: nada especifico de Apanha/Y.
  await change('cgCondCausa',[]);
  await summary.locator('tbody button').filter({hasText:'Campo'}).click();await idle();
  assert.equal(decodeURIComponent(await selected('cgCondGrupo')),'Campo');
  await summary.locator('tbody button').filter({hasText:'Sanidade'}).click();await idle();
  await page.locator('.cg-cond-rows tbody button').filter({hasText:'Produtor Z'}).click();await idle();
  assert.equal(decodeURIComponent(await selected('cgCondCausa')),'Sanidade');assert.equal(decodeURIComponent(await selected('cgCondFornecedor')),'Produtor Z');
  assert.equal(await page.locator('.cg-cond-rows tbody tr').first().locator('td').first().textContent(),'09/11/2026');
  // A semana na fronteira dos meses usa somente os dias realmente selecionados.
  const periods=await page.evaluate(()=>PcpCondPeriod.weeks({ano:'2026',mes:'11'},'2026-11-18'));
  assert.deepEqual(periods[0].days,['2026-11-01']);assert.deepEqual(periods.at(-1).days,['2026-11-16','2026-11-17','2026-11-18']);
  await page.locator('.cg-cond-back').click();await idle();await page.locator('.cg-cond-back').click();await idle();
  await page.evaluate(()=>{failure=true;});
  await change('cgCondMes',['11']);
  assert(await page.locator('.cg-cond-status').isVisible());
  assert.equal(await summary.locator('tbody').count(),0,'Falha semanal nao pode virar zero nem dado antigo');
  await page.evaluate(()=>{failure=false;});
  await mode('mensal');assert.equal(await total(),'11,00');
  await mode('semanal');assert.equal(await total(),'11,00');
  assert.equal(decodeURIComponent(await selected('cgCondGrupo')),'Campo');
  assert.deepEqual(errors,[]);assert((await page.evaluate(()=>maxPending))<=4);
  console.log(`PASS ${path.basename(root)} ${width}px: mensal/semanal ponderado, filtros visiveis, dois grupos/causas/produtores, multisselecao restaurada e ultimo nivel diario com paginacao`);
  await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
