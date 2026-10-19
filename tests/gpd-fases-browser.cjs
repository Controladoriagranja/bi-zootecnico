const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(process.env.BI_FRONTEND_ROOT||path.join(__dirname,'..'));
const phases=[['07','0–7 dias'],['14','7–14 dias'],['21','14–21 dias'],['28','21–28 dias'],['35','28–35 dias'],['35_abate','35 dias–abate']].map(([id,nome])=>({id,nome}));
function payload(unit,empty=false){
 const periods=empty?[]:Array.from({length:unit==='dia'?7:5},(_,j)=>({inicio:new Date(Date.UTC(2026,8,7+j*(unit==='dia'?1:7))).toISOString().slice(0,10),semana:37+j,ano_semana:2026,lotes:2,
  fases:Object.fromEntries(phases.map((p,i)=>[p.id,{valor:i===5&&j===2?null:[18,40,72,88,93,85][i]+j%3,lotes:i===5&&j===2?0:2}]))}));
 return {rules_version:'gpd-fases-2026-10-19',cards:{lotes:empty?0:10,com_vinculo:empty?0:10,sem_vinculo:0},groups:[],fases:phases,agrupamento:unit,periodos:periods,
  totais:Object.fromEntries(phases.map((p,i)=>[p.id,{valor:empty?null:[19,41,73,89,94,86][i],lotes:empty?0:i===5?8:10}])),atualizado_em:'2026-10-19 10:00:00'};
}
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1365,height:1000}}),errors=[],queries=[];
  let scenario='normal';page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('granjabi_auth_token','synthetic-token'));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname.endsWith('workers.dev')){
    queries.push({path:u.pathname,params:Object.fromEntries(u.searchParams)});
    if(scenario==='failure'&&u.pathname.endsWith('/resumo'))return route.fulfill({status:503,body:'{}'});
    const body=u.pathname.endsWith('/filtros')?{ano:['2026','2025'],mes:[9,10],status_acerto:['Fechado'],tipo_granja:['Integrada'],modelo:['Modelo'],produtor:['Produtor teste'],galpao:['A'],tecnico:['Tecnico'],tipo_linhagem:['pura'],linhagem:['COBB']}:payload(u.searchParams.get('agrupamento')||'semana',scenario==='empty');
    return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
   }
   try{
    const file=path.resolve(root,decodeURIComponent(u.pathname).replace(/^\//,''));
    assert(file.startsWith(root+path.sep));const body=await fs.readFile(file);const ext=path.extname(file);
    return route.fulfill({body,contentType:ext==='.html'?'text/html':ext==='.js'?'application/javascript':ext==='.css'?'text/css':undefined});
   }catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto('http://bi.test/gpd-por-fase.html');
  await page.waitForFunction(()=>document.querySelectorAll('#phaseBody tr').length===6);
  assert.equal(await page.locator('#phaseFilters .checkbox-multiselect').count(),10);
  assert.equal(await page.locator('h1').innerText(),'GPD por Fase');
  assert((await page.locator('.page-header p').innerText()).includes('Lotes fechados'));
  const getChart=()=>page.evaluate(()=>echarts.getInstanceByDom(document.querySelector('#phaseChart')).getOption());
  let chart=await getChart();assert.equal(chart.series.length,6);assert.equal(chart.xAxis[0].data.length,5);
  assert.equal(chart.series[5].data[2],null);assert.equal(chart.series[5].connectNulls,false);
  assert.equal(await page.locator('#phaseCoverage').isVisible(),true);
  await page.locator('#phaseFormulaOpen').click();await page.locator('#phaseFormula').waitFor({state:'visible'});
  assert((await page.locator('#phaseFormula').innerText()).includes('sem descontar'));
  assert((await page.locator('#phaseFormula').innerText()).includes('zootecnico.mortalidade_peso_fechados'));
  assert((await page.locator('#phaseFormula').innerText()).includes('zootecnico.vw_desempenho_acerto_portal'));
  await page.screenshot({path:path.join(__dirname,'frontend-previews/gpd-fases-formula.png'),fullPage:true});
  await page.keyboard.press('Escape');assert.equal(await page.locator('#phaseFormula').isVisible(),false);
  await page.locator('#phaseHead th').last().getByRole('button').click();
  assert.equal((await page.locator('#phaseBody tr th').allTextContents())[0].trim(),'0–7 dias');
  await page.locator('#phaseHead th').last().getByRole('button').click();
  assert.equal((await page.locator('#phaseBody tr th').allTextContents())[0].trim(),'28–35 dias');
  await fs.mkdir(path.join(__dirname,'frontend-previews'),{recursive:true});
  await page.screenshot({path:path.join(__dirname,'frontend-previews/gpd-fases-desktop.png'),fullPage:true});
  await page.locator('[data-phase-unit="dia"]').click();
  await page.waitForFunction(()=>document.querySelector('#phaseContext').textContent.startsWith('Dia'));
  chart=await getChart();assert.equal(chart.xAxis[0].data.length,7);
  assert(queries.filter(q=>q.path.endsWith('/resumo')).some(q=>q.params.agrupamento==='dia'));
  await page.locator('#phase-filter-produtor .checkbox-multiselect-trigger').click();
  await page.locator('#phase-filter-produtor input[value="Produtor teste"]').check();
  await page.waitForFunction(()=>document.querySelector('#apiFilterProgress').classList.contains('hidden'));
  assert(queries.some(q=>q.params.produtor==='Produtor teste'&&q.params.agrupamento==='dia'));
  await page.locator('h1').click();
  await page.locator('[data-phase-unit="semana"]').click();
  await page.waitForFunction(()=>document.querySelector('#phaseContext').textContent.startsWith('Semana'));
  assert(queries.filter(q=>q.path.endsWith('/resumo')).at(-1).params.produtor==='Produtor teste');
  await page.locator('[data-theme-toggle]').click();
  chart=await getChart();assert.equal(chart.series[0].lineStyle.color,'#d6729c');
  await page.screenshot({path:path.join(__dirname,'frontend-previews/gpd-fases-dark.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>echarts.getInstanceByDom(document.querySelector('#phaseChart')).getWidth()===document.querySelector('#phaseChart').clientWidth);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(__dirname,'frontend-previews/gpd-fases-mobile.png'),fullPage:true});
  scenario='failure';await page.locator('#phaseClear').click();await page.locator('#phaseError').waitFor({state:'visible'});
  assert.equal(await page.locator('#phaseBody tr').count(),0);
  assert.equal((await getChart()).series?.length||0,0);
  scenario='empty';await page.locator('#phaseClear').click();await page.locator('#phaseError').waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.querySelector('#phaseContext').textContent.includes('0 lotes'));
  assert.equal((await getChart()).xAxis[0].data.length,0);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({page:'gpd-por-fase',series:6,filters:10,dayWeek:true,producerPreserved:true,missingWeights:true,sort:true,formula:true,dark:true,mobile:true,failureClearsData:true,empty:true,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
