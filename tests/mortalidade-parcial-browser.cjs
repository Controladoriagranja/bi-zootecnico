/* Apresentacao real com ECharts e resposta representativa do incidente. Sem API/banco. */
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const fields=['1','2','3','4','5','35_abate'];
const good=(date,week)=>({inicio:date,mes:10,semana:week,lotes:10,vinculados:10,valido:true,faixas:Object.fromEntries(fields.map((f,i)=>[f,[.5,.5,1,1,1,5][i]])),total:9,total_dinamica:9,soma_faixas:9,diferenca:0,problemas:[]});
const bad={inicio:'2026-10-26',mes:10,semana:44,lotes:23,vinculados:22,valido:false,
 faixas:Object.fromEntries(fields.map((f,i)=>[f,[.9122685816876122,1.014577618192699,1.6154547509807833,1.0175862756832237,.9457694128598976,3.500061107786422][i]])),
 total:9.345950366327877,total_dinamica:9.005717747190637,soma_faixas:9.005717747190637,diferenca:-.3402326191372383,
 problemas:[{lote:'a2b88a14772de6a8e752a0169a93f633a8b5398be80bd4bd923c3dbcf398ae94',motivo:'sem_vinculo_base_dinamica'},{motivo:'total_divergente_ou_ausente'}]};
const payload={rules_version:'mortalidade-faixas-2026-10-26-v1',ano:2026,agrupamento:'semanal',valido:false,tolerancia_pp:.01,
 faixas:fields.map((id,i)=>({id,nome:i<5?`%MT ${(i+1)*7}`:'%MT35_ABATE'})),periodos:[good('2026-10-12',42),good('2026-10-19',43),bad],consolidado:bad};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<html><body><article id="card"><h2>Mortalidade semanal · 2026</h2><div id="mortalityWeekNav"><button id="mortalityWeeksPrevious">Anterior</button><span id="mortalityWeeksRange"></span><button id="mortalityWeeksNext">Proxima</button><button id="mortalityWeeksLatest">Ultimas</button></div><div id="evolucaoChart" style="height:480px;width:100%"></div><div id="mortalityLegend"></div><details id="mortalityReview"><summary>Ver avisos e conferência</summary><div id="mortalityPartialNotice" role="status"></div><div id="mortalityAudit"></div></details></article></body></html>');
  await page.addStyleTag({content:'.hidden{display:none!important}body{margin:20px;font:14px Arial;background:var(--card);color:var(--foreground)}:root{--card:white;--foreground:#211b1d;--muted-foreground:#766d70;--border:#ddd}[data-theme=dark]{--card:#19191b;--foreground:#eee;--muted-foreground:#aaa;--border:#444}#mortalityPartialNotice{padding:12px;margin:12px 0;background:#bd9a2420;border-radius:10px}table{border-collapse:collapse}th,td{padding:8px;border:1px solid var(--border)}.mortality-audit-scroll{overflow:auto}'});
  await page.addScriptTag({path:path.join(root,'assets/vendor/echarts/echarts.min.js')});
  await page.addScriptTag({path:path.join(root,'assets/js/mortalidade-chart.js')});
  await page.evaluate(data=>{window.incident=data;window.instance=echarts.init(document.querySelector('#evolucaoChart'),null,{renderer:'svg'});MortalityChart.draw(instance,data);},payload);
  const option=()=>page.evaluate(()=>instance.getOption());let o=await option();
  assert.equal(o.series.length,7);assert.equal(o.series[0].data[0].value,.5);assert.equal(o.series[0].data[2].value,bad.faixas['1']);assert.equal(o.series[6].data[2],bad.total_dinamica);assert.equal(o.series[6].data[0],9);
  assert.equal(await page.evaluate(()=>JSON.stringify(incident)),JSON.stringify(payload),'Nao altera payload/calculos recebidos');
  assert(!(await page.locator('#mortalityWeekNav').getAttribute('class')||'').includes('hidden'));
  const tooltip=await page.evaluate(()=>instance.getOption().tooltip[0].formatter([{dataIndex:2,seriesName:'Total',value:incident.periodos[2].total_dinamica}]));assert(tooltip.includes('22 de 23')&&tooltip.includes('Parcial'));
  await page.evaluate(()=>{window.selection=null;MortalityChart.setLotOpener(value=>window.selection=value);instance.trigger('click',{componentType:'series',seriesType:'bar',seriesIndex:0,dataIndex:2});});
  assert.equal((await page.evaluate(()=>selection)).period.inicio,'2026-10-26');
  assert.equal(await page.locator('#mortalityReview').evaluate(el=>el.open),false);assert.equal(await page.locator('#mortalityPartialNotice').isVisible(),false);
  await page.locator('#mortalityReview > summary').click();assert.equal(await page.locator('#mortalityPartialNotice').isVisible(),true);
  assert((await page.locator('#mortalityPartialNotice').innerText()).includes('Resultado parcial'));
  assert(!(await page.locator('#mortalityAudit').innerText()).includes('Gráfico interrompido'));
  const below=await page.locator('#evolucaoChart,#mortalityPartialNotice').evaluateAll(nodes=>nodes[1].getBoundingClientRect().y>=nodes[0].getBoundingClientRect().bottom);assert(below,'Aviso abaixo do grafico');
  await page.locator('#mortalityReview > summary').click();assert.equal(await page.locator('#mortalityPartialNotice').isVisible(),false);
  await page.evaluate(()=>{MortalityChart.draw(instance,{...incident,agrupamento:'mensal'});});o=await option();assert.equal(o.series[6].data[2],bad.total_dinamica);assert.equal(o.dataZoom.length,0);
  const out=path.join(root,'tests/frontend-previews/mortalidade-parcial-20261106');await fs.mkdir(out,{recursive:true});
  for(const width of [1280,390])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:1000});await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;MortalityChart.draw(instance,incident);},theme);await page.waitForTimeout(250);
   assert.equal((await option()).series.length,7);await page.screenshot({path:path.join(out,`${width}-${theme}.png`),fullPage:true});
  }
  await page.evaluate(()=>{const data=structuredClone(incident);data.periodos[2].problemas=[{motivo:'percentual_fora_de_0_a_100'}];data.periodos[2].faixas['1']=150;MortalityChart.draw(instance,data);});o=await option();assert(o.series.slice(0,6).every(s=>s.data[2].value===null));assert.equal(o.series[0].data[0].value,.5);assert.equal(o.series[6].data[2],bad.total);
  await page.evaluate(()=>{const data=structuredClone(incident);data.valido=true;data.consolidado=null;data.periodos=data.periodos.slice(0,2);MortalityChart.draw(instance,data);});assert.equal(await page.locator('#mortalityPartialNotice').isVisible(),false);assert.equal(await page.locator('#mortalityAudit').isVisible(),false);
  await page.evaluate(()=>{MortalityChart.clear();});assert.equal(await page.locator('#mortalityPartialNotice').isVisible(),false);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({resultado:'OK',mensalSemanal:true,periodosValidosPreservados:true,vinteDoisDeVinteTres:true,linhaMesmaBaseDasFaixas:true,originaisPreservados:true,avisoAbaixo:true,recolhidoPorPadrao:true,expandirRecolher:true,navegacaoClique:true,faixaInseguraNula:true,temas:2,larguras:2,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
