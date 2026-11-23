/* Componentes reais das duas telas, API simulada. Sem acesso a producao. */
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'outputs/condenacoes-granja-fornecedor-20261123');
async function suite(browser,project,width){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.setContent('<!doctype html><body'+(path.basename(project)==='BI-PCP'?' class="pcp-report"':'')+'></body>');
  for(const f of ['assets/css/app.css','assets/css/pcp-condenacoes-period.css'])await page.addStyleTag({content:await fs.readFile(path.join(project,f),'utf8')});
  await page.addStyleTag({content:await fs.readFile(path.join(project,'assets/css/condenacoes-card.css'),'utf8').catch(()=>fs.readFile(path.join(project,'assets/css/pcp.css'),'utf8'))});
  await page.evaluate(()=>{window.APP_CONFIG={endpoints:{filtros:'/unused'}};window.ApiScreen={escape:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};});
  for(const f of ['filters.js','pcp-multiselect.js','pcp-table-sort.js','pcp-condenacoes-period.js','pcp-condenacoes.js'])await page.addScriptTag({content:await fs.readFile(path.join(project,'assets/js',f),'utf8')});
  await page.evaluate(()=>{
   const name='ATAIR AUGUSTO DOS SANTOS';
   const rows=[['30076',name,'PRISCILA'],['46697',name,'EDER'],['29168',name,'PRISCILA'],['30076','José, A & B','OUTRO']].map(([granja,fornecedor,tecnico],i)=>({granja,fornecedor,tecnico,grupo:'Campo',causa:'Aerossaculite',data:'2026-11-02',empresa:'Ave Nova',turno:'1',galpao:'G'+i,lote:'40',cidade:'Cidade',codigo:'390',condenacao:'Aerossaculite',tipo:'Parcial',ocorrencia:1,peso_total:10,peso_pesagem:1000,percentual:.01}));
   window.calls=[];
   const parse=(q,key)=>q[key]?JSON.parse(q[key]):[];
   const matches=(r,q,ignore)=>{
    const pairs=parse(q,'granja_fornecedores'),tech=parse(q,'tecnicos'),groups=parse(q,'grupos'),causes=parse(q,'condenacoes');
    return (ignore==='pair'||!pairs.length||pairs.some(([g,f])=>g===r.granja&&f===r.fornecedor))&&(ignore==='tech'||!tech.length||tech.includes(r.tecnico))&&(ignore==='group'||!groups.length||groups.includes(r.grupo))&&(ignore==='cause'||!causes.length||causes.includes(r.causa));
   };
   window.report=PcpCondenacoes.create(async(_,q)=>{
    calls.push(structuredClone(q));
    const eligible=rows.filter(r=>matches(r,q)),details=q.causa?eligible.filter(r=>r.causa===q.causa):[];
    return {ok:true,fornecedor_chave:'granja_fornecedor',data_limite:'2026-11-23',meses:['2026-11'],peso_vivo_kg:1000,peso_condenado_kg:eligible.length*10,percentual:eligible.length*.01,totais_mensais:{'2026-11':{kg:eligible.length*10,peso_vivo_kg:1000,percentual:eligible.length*.01}},
     opcoes_granja_fornecedores:rows.filter(r=>matches(r,q,'pair')).map(r=>({granja:r.granja,fornecedor:r.fornecedor})),opcoes_tecnicos:[...new Set(rows.filter(r=>matches(r,q,'tech')).map(r=>r.tecnico))],opcoes_grupos:['Campo'],opcoes_condenacoes:['Aerossaculite'],
     resumo:eligible.length?[{grupo:'Campo',causa:'Aerossaculite',tipo:'Parcial',kg:eligible.length*10,meses:{'2026-11':{kg:eligible.length*10,percentual:eligible.length*.01}}}]:[],detalhes:details,total_detalhes:details.length*2,pagina:q.pagina||1,por_pagina:200};
   });report.open({ano:'2026',mes:'11',visao:'geral'});
  });
  const idle=()=>page.waitForFunction(()=>document.querySelector('dialog').getAttribute('aria-busy')==='false');
  const change=async(id,values)=>{await page.evaluate(({id,values})=>{const s=document.getElementById(id);s.value=values.map(encodeURIComponent).join(',');s.dispatchEvent(new Event('change',{bubbles:true}));},{id,values});await idle();};
  await idle();
  assert.equal(await page.locator('#cgCondFornecedor').locator('..').evaluate(el=>el.firstChild.textContent),'Granja - Fornecedor');
  await page.locator('.cg-cond-summary button',{hasText:'Campo'}).click();await idle();
  await page.locator('.cg-cond-summary button',{hasText:'Aerossaculite'}).click();await idle();
  for(const code of ['30076','29168','46697'])assert.equal(await page.locator('.cg-cond-rows button',{hasText:code+' - ATAIR AUGUSTO DOS SANTOS'}).count(),1);
  await page.locator('.cg-cond-rows button',{hasText:'30076 - ATAIR AUGUSTO DOS SANTOS'}).click();await idle();
  assert.match(await page.locator('.cg-cond-detail h3').textContent(),/^30076 - ATAIR AUGUSTO DOS SANTOS/);
  const heads=await page.locator('.cg-cond-rows th').allTextContents();
  assert.equal(heads.length,15);assert.ok(heads.some(h=>h.startsWith('Código')));assert.ok(heads.some(h=>h.startsWith('Granja - Fornecedor')));assert.ok(!heads.some(h=>h.trim()==='Fornecedor'||h.trim()==='Granja'));
  assert.match(await page.locator('.cg-cond-rows tbody').textContent(),/390/);
  await page.screenshot({path:path.join(out,path.basename(project)+'-pesagens-'+width+'.png')});
  assert.ok(!(await page.locator('.cg-cond-rows tbody').textContent()).includes('46697'));
  let last=await page.evaluate(()=>calls.at(-1));assert.deepEqual(JSON.parse(last.granja_fornecedores),[['30076','ATAIR AUGUSTO DOS SANTOS']]);assert.equal(last.fornecedores,undefined);
  await page.locator('.cg-cond-rows').evaluate(el=>el.dispatchEvent(new Event('scroll')));
  await page.waitForFunction(()=>calls.at(-1).pagina===2);
  last=await page.evaluate(()=>calls.at(-1));assert.deepEqual(JSON.parse(last.granja_fornecedores),[['30076','ATAIR AUGUSTO DOS SANTOS']]);
  await page.waitForFunction(()=>document.querySelector('.cg-cond-rows').getAttribute('aria-busy')!=='true');
  await page.locator('.cg-cond-rows th').filter({hasText:/^Código/}).locator('button').click();await idle();
  assert.equal((await page.evaluate(()=>calls.at(-1))).ordenar,'codigo');
  await page.locator('.cg-cond-back').click();await idle();
  assert.ok(await page.locator('.cg-cond-rows button',{hasText:'46697 - ATAIR AUGUSTO DOS SANTOS'}).count()>=1);
  await page.locator('.cg-cond-rows button',{hasText:'46697 - ATAIR AUGUSTO DOS SANTOS'}).first().click();await idle();
  assert.match(await page.locator('.cg-cond-detail h3').textContent(),/^46697 - ATAIR/);
  assert.deepEqual(await page.locator('#cgCondTecnico option:not([value=""])').allTextContents(),['EDER']);
  await page.locator('.cg-cond-clear').click();await idle();
  assert.equal((await page.evaluate(()=>calls.at(-1))).granja_fornecedores,undefined);
  await page.locator('#cgCondFornecedorMulti button').click();
  await page.locator('#cgCondFornecedorMulti input[type=search]').fill('atair');
  assert.equal(await page.locator('#cgCondFornecedorMulti [data-filter-option]:visible input:not([data-all])').count(),3);
  await page.locator('#cgCondFornecedorMulti input[type=search]').fill('46697');
  assert.equal(await page.locator('#cgCondFornecedorMulti [data-filter-option]:visible input:not([data-all])').count(),1);
  await page.locator('#cgCondFornecedorMulti input[type=search]').fill('jose');
  assert.equal(await page.locator('#cgCondFornecedorMulti [data-filter-option]:visible input:not([data-all])').count(),1);
  const key=JSON.stringify(['30076','José, A & B']);
  await change('cgCondFornecedor',[key]);
  assert.deepEqual(JSON.parse((await page.evaluate(()=>calls.at(-1))).granja_fornecedores),[['30076','José, A & B']]);
  await page.locator('.cg-cond-clear').click();await idle();
  await change('cgCondTecnico',['EDER']);
  assert.deepEqual(await page.locator('#cgCondFornecedor option:not([value=""])').allTextContents(),['46697 - ATAIR AUGUSTO DOS SANTOS']);
  await page.locator('.cg-cond-clear').click();await idle();
  await change('cgCondFornecedor',[JSON.stringify(['30076','ATAIR AUGUSTO DOS SANTOS']),JSON.stringify(['46697','ATAIR AUGUSTO DOS SANTOS'])]);
  assert.equal(JSON.parse((await page.evaluate(()=>calls.at(-1))).granja_fornecedores).length,2);
  await page.locator('[data-cond-mode=semanal]').click();await idle();
  assert.ok((await page.evaluate(()=>calls.filter(c=>c.dias))).every(q=>JSON.parse(q.granja_fornecedores).length===2));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(out,path.basename(project)+'-'+width+'.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS '+path.basename(project)+' '+width+': paired clicks, search, multi, cascade, title, Code retained, sort, pagination, undo, clear, weekly');
 }finally{await page.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{for(const project of [root,path.resolve(root,'../BI-PCP')])for(const width of [390,1440])await suite(browser,project,width);
 assert.equal(await fs.readFile(path.join(root,'assets/js/pcp-condenacoes.js'),'utf8'),await fs.readFile(path.join(root,'../BI-PCP/assets/js/pcp-condenacoes.js'),'utf8'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
