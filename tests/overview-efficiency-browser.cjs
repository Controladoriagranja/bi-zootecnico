/* Rede inteiramente simulada: nenhuma consulta ao servidor ou publicação. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'outputs/visao-geral-eficiencia-20261127');fs.mkdirSync(out,{recursive:true});
const raw=[['2026-11-02','10',99,100],['2026-11-03','10',189,200],['2026-11-02','111',98,100],['2026-11-03','111',49,50]].map(([data,unidade,aves_abatidas_liquidas,capacidade_nominal_aves])=>({data,unidade,aves_abatidas_liquidas,capacidade_nominal_aves}));
function overview(view,year=2026,month=11){
 const keys=view==='dia'?['2026-11-02','2026-11-03','2026-11-04']:view==='semana'?['2026-11-02','2026-11-09']:view==='mes'?Array.from({length:11},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}-01`):[`${year}-${String(month).padStart(2,'0')}-01`];
 return {ok:true,admin:true,inicio:view==='semana'||view==='mes'?`${year}-01-01`:`${year}-${String(month).padStart(2,'0')}-01`,fim:`${year}-11-26`,atualizado_em:'2026-11-27T08:00:00-03:00',periodos:keys.map(chave=>({chave,rotulo:chave,setores:['pcp_10','pcp_111','producao_frango'].map(id=>({id,nome:id==='pcp_111'?'PCP — Real Alimentos':id==='pcp_10'?'PCP — Ave Nova':'Produção de Frango',dias_com_abate:2,lotes:10,indicadores:(id==='producao_frango'?['ca']:['rendimento','condenacao','produtividade','aves_media','paradas','velocidade']).map(metric=>({id:metric,nome:metric,valor:metric==='produtividade'?999:70,meta:100,decimais:2,unidade:'%',cor:'vermelho',desvio:-30,situacao:'3% ou mais abaixo'}))}))}))};
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],calls=[];let failEfficiency=false;
  await page.clock.install({time:new Date('2026-11-27T12:00:00-03:00')});
  await page.addInitScript(()=>sessionStorage.setItem('granjabi_auth_token','synthetic-only'));
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname.endsWith('workers.dev')){
    calls.push(url);assert.equal(route.request().headers().authorization,'Bearer synthetic-only');let payload;
    if(url.pathname==='/api/pcp/comparativo/eficiencia-abate'){
     if(failEfficiency)return route.fulfill({status:404,contentType:'application/json',body:'{}'});
     payload={ok:true,contrato:'eficiencia-abate-v1',revisao_formulas:'eficiencia-capacidade-v3',dias:raw.filter(row=>row.data>=url.searchParams.get('inicio')&&row.data<=url.searchParams.get('fim'))};
    }else payload=overview(url.searchParams.get('mapa_calor'),Number(url.searchParams.get('ano')),Number(url.searchParams.get('mes')));
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
   }
   if(url.hostname!=='localhost')return route.fulfill({status:404,body:''});
   try{const name=decodeURIComponent(url.pathname.slice(1)),body=fs.readFileSync(path.join(root,name));return route.fulfill({status:200,contentType:name.endsWith('.html')?'text/html':name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'application/octet-stream',body});}
   catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto('http://localhost/visao-geral.html');
  const an=page.locator('[data-sector=pcp_10] [data-metric=eficiencia]'),ra=page.locator('[data-sector=pcp_111] [data-metric=eficiencia]');
  await an.waitFor().catch(async e=>{console.error(await page.locator('#heatStatus').textContent(),errors);throw e;});assert.match(await an.textContent(),/96,00/);assert.match(await an.getAttribute('class'),/laranja/);assert.match(await ra.textContent(),/98,00/);assert.match(await ra.getAttribute('class'),/verde/);
  assert.equal(await page.locator('[data-sector^=pcp_] [data-metric=produtividade]').count(),0);
  const cardCalls=calls.length;await page.locator('#heatPeriod').selectOption('2026-11-01',{force:true});assert.equal(calls.length,cardCalls);
  await an.click();await page.waitForFunction(()=>document.getElementById('metricHistoryStatus').textContent!=='Carregando histórico…');
  assert.match(await page.locator('#metricHistoryTitle').textContent(),/Eficiência.*mensal/);
  const link=new URL(await page.locator('#metricIndicatorLink').getAttribute('href'));
  assert.equal(link.pathname,'/BI-PCP/index.html');assert.equal(link.searchParams.get('relatorio'),'g5');assert.equal(link.searchParams.get('unidade'),'10');assert.equal(link.searchParams.get('origem'),'visao-geral');assert.equal(link.searchParams.get('data_fim'),'2026-11-26');
  assert.equal(new URLSearchParams(link.searchParams.get('retorno')).get('periodo'),'2026-11-01');
  assert.equal(await page.evaluate(()=>echarts.getInstanceByDom(document.getElementById('metricHistoryChart')).getOption().series[0].markLine.data[0].yAxis),98);
  await page.locator('#metricHistoryClose').click();await ra.click();assert.equal(new URL(await page.locator('#metricIndicatorLink').getAttribute('href')).searchParams.get('unidade'),'111');await page.locator('#metricHistoryClose').click();
  await page.locator('[data-mode=dia]').click();await page.waitForFunction(()=>document.getElementById('heatPeriod').options.length===3);await page.locator('#heatPeriod').selectOption('2026-11-02',{force:true});assert.match(await an.textContent(),/99,00/);
  await an.click();await page.waitForFunction(()=>!!echarts.getInstanceByDom(document.getElementById('metricHistoryChart')));
  const daily=await page.evaluate(()=>echarts.getInstanceByDom(document.getElementById('metricHistoryChart')).getOption().series[0].data);assert.equal(daily[1],99);assert.equal(daily[2],94.5);assert.equal(daily[3],null);
  const dayLink=new URL(await page.locator('#metricIndicatorLink').getAttribute('href'));assert.equal(dayLink.searchParams.get('data_inicio'),'2026-11-02');assert.equal(dayLink.searchParams.get('data_fim'),'2026-11-02');await page.locator('#metricHistoryClose').click();
  await page.locator('[data-mode=semana]').click();await page.waitForFunction(()=>document.getElementById('heatPeriod').options.length===2);await page.locator('#heatPeriod').selectOption('2026-11-02',{force:true});assert.match(await an.textContent(),/96,00/);
  await an.click();const weekLink=new URL(await page.locator('#metricIndicatorLink').getAttribute('href'));assert.equal(weekLink.searchParams.get('data_fim'),'2026-11-08');await page.locator('#metricHistoryClose').click();
  await page.goto('http://localhost/visao-geral.html?'+weekLink.searchParams.get('retorno'));await an.waitFor();
  assert.equal(await page.locator('#heatPeriod').inputValue(),'2026-11-02');assert.equal(await page.locator('#heatYear').inputValue(),'2026');assert.equal(await page.locator('#heatMonth').inputValue(),'11');
  assert.equal(await page.locator('[data-mode=semana]').getAttribute('aria-pressed'),'true');
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  for(const width of [768,390]){await page.setViewportSize({width,height:950});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,`viewport-${width}.png`),fullPage:true});}
  await page.locator('[data-theme-toggle]').click();assert.match(await an.textContent(),/96,00/);
  failEfficiency=true;await page.locator('#heatRefresh').click();await page.waitForFunction(()=>document.getElementById('heatStatus').textContent.includes('Eficiência indisponível'));
  assert.match(await an.textContent(),/—/);assert.match(await page.locator('[data-sector=pcp_10] [data-metric=rendimento]').textContent(),/70,00/);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',monthlyDailyWeekly:true,units10and111:true,target98:true,existingColors:true,chartAndNavigation:true,returnContext:true,noExtraRequestOnPeriodChange:true,otherIndicatorsSurviveFailure:true,viewports:[1440,768,390],errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
