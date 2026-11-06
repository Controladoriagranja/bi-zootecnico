/* Navegador local com API simulada. Nenhum acesso a banco/servico publicado. */
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>sessionStorage.setItem('granjabi_auth_token','teste-local'));
  let empty=false,legacy=false;
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname.endsWith('workers.dev')){
    const params=Object.fromEntries(url.searchParams);requests.push({path:url.pathname,params,years:url.searchParams.getAll('ano')});
    let body;
    if(url.pathname.endsWith('/filtros'))body={ano:['2026','2025','2024','2023'],mes:[1,2,3,4,5,6,7,8,9,10,11,12],semana:['1','2'],produtor:['Ademir'],tecnico:['Tecnico'],galpao:['616A'],tipo_granja:['Integrada'],modelo:['Dark house'],status_acerto:['Normal']};
    else{
     assert.equal(url.searchParams.getAll('ano').length,1,'Cada consulta tem um ano');
     const year=Number(params.ano),main=params.etapa==='principal';
     const values=[.12,.5,0,null,.25,.33,.45,.2,.48,.4,.2,null];
     body={arquivo:'zootecnico.vw_desempenho_acerto_portal',rules_version:'acerto-iep-mensal-2026-10-16',atualizado_em:'2026-11-06 14:09:00',etapa:params.etapa,
      indicador:{id:'morte_transporte',nome:'% Morte no Transporte',valor:empty?null:.4,unidade:'%',casas_decimais:2},
      ranking_tecnicos:empty?[]:[{nome:'Tecnico',valor:.4,lotes:5}],ranking_produtores:empty?[]:[{nome:'Ademir',valor:.4,lotes:5}],
      ranking_contexto:{metodo:'weighted_avg',tecnicos:{grupos:1,valor_recomposto:.4},produtores:{grupos:1,valor_recomposto:.4}},
      evolucao:{agrupamento:'planta_de_abate',ano:year,meses:['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'].map((nome,i)=>({nome,numero:i+1})),
       series:empty||main?[]:[{planta_de_abate:'AVE NOVA',valores:values.map(v=>v==null?null:v*(year===2025?2:1))},{planta_de_abate:'REAL ALIMENTOS',valores:[.3,.2,.5,.8,.4,.6,.3,.2,.1,.3,.4,.2]}]}};
     if(legacy)delete body.evolucao.agrupamento;
    }
    return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
   }
   if(url.hostname!=='bi.test')return route.fulfill({status:404,body:''});
   const file=path.resolve(root,decodeURIComponent(url.pathname).replace(/^\//,''));assert(file.startsWith(root+path.sep));
   try{return route.fulfill({body:await fs.readFile(file),contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/javascript'});}catch{return route.fulfill({status:404,body:''});}
  });
  const ready=async()=>{try{await page.waitForFunction(()=>document.querySelector('#apiFilterProgress')?.classList.contains('hidden')&&document.querySelector('#dashboardAtualizando').classList.contains('hidden')&&document.querySelector('#kpiValor').textContent.trim()!=='—'&&echarts.getInstanceByDom(document.querySelector('#evolucaoChart')).getOption().series?.length===2);}catch(error){console.error({errors,message:await page.locator('#mensagemErro').innerText(),requests});throw error;}};
  await page.goto('http://bi.test/detalhes.html?indicador=morte_transporte&ano=2025&ano=2026');await ready();
  const chart=()=>page.evaluate(()=>echarts.getInstanceByDom(document.querySelector('#evolucaoChart')).getOption());
  assert.equal(await page.locator('#anoTransporte').count(),1);assert.equal(await page.locator('#ano').count(),0);
  assert.equal(await page.locator('#anoTransporte').inputValue(),'2026');assert.equal(await page.locator('#anoTransporte option[value=""]').count(),0);
  assert.equal(new URL(page.url()).searchParams.getAll('ano').length,1);
  let options=await chart();assert.deepEqual(options.series.map(s=>s.name),['AVE NOVA','REAL ALIMENTOS']);assert.equal(options.series[0].data[2],0);assert.equal(options.series[0].data[3],null);assert.equal(options.xAxis[0].data.length,12);
  assert(options.series.every(s=>s.type==='bar'&&!s.stack));
  assert.equal(await page.evaluate(()=>echarts.getInstanceByDom(document.querySelector('#evolucaoChart')).getOption().series[0].label.formatter({value:.1234})),'0,12%');
  await page.locator('#anoTransporte').selectOption('2025');await ready();options=await chart();assert.equal(options.series[0].data[0],.24);
  assert(requests.filter(r=>!r.path.endsWith('/filtros')).slice(-2).every(r=>r.years[0]==='2025'));
  await page.locator('#produtor .checkbox-multiselect-trigger').click();await page.locator('#produtor input[value="Ademir"]').check();await ready();
  assert(requests.filter(r=>!r.path.endsWith('/filtros')).slice(-2).every(r=>r.params.produtor==='Ademir'&&r.years[0]==='2025'));
  await page.locator('h1').click();
  const out=path.join(root,'tests/frontend-previews/transporte-plantas-20261106');await fs.mkdir(out,{recursive:true});
  for(const width of [1440,768,390])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:1000});await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.dispatchEvent(new Event('dashboard:theme-changed'));},theme);
   await page.waitForTimeout(300);options=await chart();
   assert.deepEqual(options.series.map(s=>s.name),['AVE NOVA','REAL ALIMENTOS']);assert(options.series.every(s=>s.label.show));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Pagina sem overflow');
   if(width===390){assert.equal(options.dataZoom[0].end,25);await page.evaluate(()=>echarts.getInstanceByDom(document.querySelector('#evolucaoChart')).dispatchAction({type:'dataZoom',start:75,end:100}));assert.equal((await chart()).dataZoom[0].start,75);}
   await page.locator('#mortalityEvolutionCard').screenshot({path:path.join(out,`${width}-${theme}.png`)});
  }
  await page.setViewportSize({width:1440,height:1000});await page.locator('#limparFiltrosDetalhes').click();await ready();assert.equal(await page.locator('#anoTransporte').inputValue(),'2026');
  empty=true;await page.locator('#limparFiltrosDetalhes').click();await page.waitForFunction(()=>document.querySelector('#dashboardAtualizando').classList.contains('hidden'));assert.equal((await chart()).series.length,0);assert.equal((await page.locator('#kpiValor').innerText()).trim(),'—');
  empty=false;legacy=true;await page.locator('#limparFiltrosDetalhes').click();await page.locator('#mensagemErro').waitFor({state:'visible'});assert((await page.locator('#mensagemErro').innerText()).includes('Atualize o backend'));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({resultado:'OK',anoUnico:true,urlAnosMultiplos:true,trocaAno:true,filtrosCompartilhados:true,duasPlantasPorMes:true,nulosZero:true,temas:2,larguras:3,rolagem:true,backendAntigoDetectado:true,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
