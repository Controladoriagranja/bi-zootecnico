/* Navegador com API simulada; nao consulta servicos ou banco reais. */
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const records=Array.from({length:1205},(_,i)=>({id:i+1,fonte:i%2?'real':'ave',unidade:i%2?'REAL ALIMENTOS':'AVE NOVA',
  data:['2026-10-05','2026-11-02','2026-11-09','2026-11-16'][i%4],galpao:`G${String(i%385+1).padStart(2,'0')}`,produtor:'Produtor teste',tecnico:'Técnico teste',tipo_granja:'Integrada',modelo:'Dark house',lote:'1',
  programada:100+i%13,real:85+i%9,difQtdeRxP:i%20===0?50:-(1+i%11)}));
function cards(rows){const result=rows.reduce((a,r)=>({programada:a.programada+r.programada,real:a.real+r.real,diferenca:a.diferenca+r.difQtdeRxP,registrosComDiferenca:a.registrosComDiferenca+Number(r.difQtdeRxP!==0)}),{programada:0,real:0,diferenca:0,registrosComDiferenca:0});return {...result,difPercent:result.programada?result.diferenca/result.programada*100:null};}
function match(row,url,ignore){return ['ano','mes','dia','data','unidade','galpao','produtor','tecnico','tipo_granja','modelo'].every(key=>{
 const selected=url.searchParams.getAll(key);if(!selected.length||key===ignore)return true;
 const value=key==='ano'?row.data.slice(0,4):key==='mes'?String(Number(row.data.slice(5,7))):key==='dia'?String(Number(row.data.slice(8,10))):row[key];
 return selected.includes(value);
});}
const meta={rules_version:'rxp-2026-10-15',atualizado_em:'2026-11-06T08:00:00-03:00'};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('granjabi_auth_token','fixture-local'));
  let failRanking=false,empty=false,delayRanking=0;
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname.endsWith('workers.dev')){
    requests.push({path:url.pathname,params:Object.fromEntries(url.searchParams),dates:url.searchParams.getAll('data')});
    const rows=empty?[]:records.filter(r=>match(r,url));let body;
    if(url.pathname.endsWith('/filtros')){
     body=Object.fromEntries(['ano','mes','dia','data','unidade','galpao','produtor','tecnico','tipo_granja','modelo'].map(key=>[key,[...new Set(records.filter(r=>match(r,url,key)).map(r=>key==='ano'?r.data.slice(0,4):key==='mes'?String(Number(r.data.slice(5,7))):key==='dia'?String(Number(r.data.slice(8,10))):r[key]))].sort()]));
    }else if(url.pathname.endsWith('/detalhes')){
     const size=Number(url.searchParams.get('tamanho')||50),number=Number(url.searchParams.get('pagina')||1);
     if(size===500&&delayRanking)await new Promise(resolve=>setTimeout(resolve,delayRanking));
     if(size===500&&failRanking)return route.fulfill({status:503,body:'{}'});
     body={...meta,cards:cards(rows),dados:rows.slice((number-1)*size,number*size),total:rows.length,total_paginas:Math.ceil(rows.length/size),pagina:number};
    }else{
     body={...meta,cards:cards(rows),etapa:url.searchParams.get('etapa')||'completo',groups:[]};
     if(body.etapa==='grupos')body.groups=[...new Set(rows.map(r=>r.unidade))].map(unidade=>({unidade,cards:cards(rows.filter(r=>r.unidade===unidade))}));
     if(body.etapa==='mensal'){
      const bucket=items=>Object.fromEntries(['ave_nova','real_alimentos','total'].map(key=>[key,cards(key==='total'?items:items.filter(r=>r.unidade===(key==='ave_nova'?'AVE NOVA':'REAL ALIMENTOS')))]));
      body.monthly={rows:[...new Set(rows.map(r=>r.data.slice(0,7)))].sort().map(periodo=>({periodo,...bucket(rows.filter(r=>r.data.startsWith(periodo)))})),totals:bucket(rows)};
     }
    }
    return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
   }
   if(url.hostname!=='bi.test')return route.fulfill({status:404,body:''});
   const file=path.resolve(root,decodeURIComponent(url.pathname).replace(/^\//,''));assert(file.startsWith(root+path.sep));
   try{return route.fulfill({body:await fs.readFile(file),contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/javascript'});}catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto('http://bi.test/diferenca-aves-abatidas.html');
  const chart=()=>page.evaluate(()=>echarts.getInstanceByDom(document.querySelector('#rxpRankingChart')).getOption());
  const ready=()=>page.waitForFunction(()=>document.querySelector('#rxpRankingStatus').textContent.includes('galpões'));
  await ready();
  const weekly=()=>page.evaluate(()=>{
   const plot=echarts.getInstanceByDom(document.querySelector('#rxpWeeklyChart')).getOption(),axis=echarts.getInstanceByDom(document.querySelector('#rxpWeeklyAxis')).getOption();
   const scroll=document.querySelector('.rxp-weekly-scroll');
   return {labels:plot.xAxis[0].data,values:plot.series[0].data.map(d=>d?.value??d),scale:[plot.yAxis[0].min,plot.yAxis[0].max],axis:[axis.yAxis[0].min,axis.yAxis[0].max],pixels:[echarts.getInstanceByDom(document.querySelector('#rxpWeeklyChart')).convertToPixel({yAxisIndex:0},0),echarts.getInstanceByDom(document.querySelector('#rxpWeeklyAxis')).convertToPixel({yAxisIndex:0},0)],
    scroll:scroll.scrollLeft,end:scroll.scrollWidth-scroll.clientWidth,width:scroll.clientWidth,canvas:document.querySelector('#rxpWeeklyChart').clientWidth,axisX:document.querySelector('#rxpWeeklyAxis').getBoundingClientRect().x};
  });
  let weeks=await weekly();assert.equal(weeks.labels.length,47);assert.equal(weeks.values[41],0);
  assert.equal(weeks.values[44],cards(records.filter(r=>r.data==='2026-11-02')).diferenca);
  assert.deepEqual(weeks.scale,weeks.axis);assert(Math.abs(weeks.canvas/weeks.labels.length-weeks.width/4)<1);assert(Math.abs(weeks.scroll-weeks.end)<2);
  assert(Math.abs(weeks.pixels[0]-weeks.pixels[1])<1,'Eixo fixo e colunas alinhados na vertical');
  await page.locator('.rxp-weekly-scroll').evaluate(el=>el.scrollLeft=0);assert.equal((await weekly()).axisX,weeks.axisX);
  await page.locator('.rxp-weekly-scroll').evaluate(el=>el.scrollLeft=el.scrollWidth-el.clientWidth);
  await page.locator('.rxp-weekly-card').scrollIntoViewIfNeeded();
  await page.evaluate(()=>echarts.getInstanceByDom(document.querySelector('#rxpWeeklyChart')).dispatchAction({type:'showTip',seriesIndex:0,dataIndex:46}));
  const weekTip=page.getByText('Semana 47 / 2026',{exact:true});await weekTip.waitFor({state:'visible'});
  await page.waitForTimeout(300);
  const tipRect=await weekTip.locator('..').boundingBox();assert(tipRect.x>=0&&tipRect.x+tipRect.width<=1441&&tipRect.y>=0&&tipRect.y+tipRect.height<=1001,'Tooltip semanal cabe na janela');
  assert.equal(await weekTip.evaluate(el=>Boolean(el.closest('#rxpWeeklyChart'))),false,'Tooltip fora do scroll');
  await page.evaluate(()=>echarts.getInstanceByDom(document.querySelector('#rxpWeeklyChart')).dispatchAction({type:'hideTip'}));
  await page.evaluate(()=>scrollTo(0,0));
  const groups=[...new Set(records.map(r=>r.galpao))].map(galpao=>({galpao,...cards(records.filter(r=>r.galpao===galpao))}));
  const descending=groups.toSorted((a,b)=>Math.abs(b.diferenca)-Math.abs(a.diferenca)||a.galpao.localeCompare(b.galpao,'pt-BR',{numeric:true}));
  let option=await chart();assert.equal(option.series[0].data.length,15);
  assert.deepEqual(option.yAxis[0].data,descending.slice(0,15).map(r=>r.galpao));
  assert.deepEqual(option.series[0].data.map(d=>d.value),descending.slice(0,15).map(r=>r.diferenca));
  assert.equal(requests.filter(r=>r.path.endsWith('/detalhes')&&r.params.tamanho==='500').length,3);
  const previewFolder=path.join(root,'tests/frontend-previews/rxp-ranking-20261106');await fs.mkdir(previewFolder,{recursive:true});
  await page.waitForTimeout(350);await page.screenshot({path:path.join(previewFolder,'pagina-desktop.png'),fullPage:true});
  assert.equal(await page.locator('#filtroGalpao').count(),1);
  assert(await page.evaluate(()=>document.querySelector('#filtroSemana').compareDocumentPosition(document.querySelector('#filtroDia'))&Node.DOCUMENT_POSITION_FOLLOWING));
  const tooltip=await page.evaluate(()=>echarts.getInstanceByDom(document.querySelector('#rxpRankingChart')).getOption().tooltip[0].formatter([{dataIndex:0}]));
  assert(tooltip.includes('Qtde Programada:')&&tooltip.includes('Qtde Real:')&&tooltip.includes('Dif %:')&&tooltip.includes('Dif Qtde RxP:'));
  const firstValue=descending[0].diferenca;assert.notEqual(firstValue,descending[0].real-descending[0].programada);
  const heightBeforeAll=await page.locator('.rxp-comparison-grid').evaluate(el=>el.getBoundingClientRect().height);
  await page.locator('#rxpRankingAll').click();assert.equal((await chart()).series[0].data.length,385);
  assert.equal(await page.locator('.rxp-comparison-grid').evaluate(el=>el.getBoundingClientRect().height),heightBeforeAll,'385 galpoes nao esticam a linha');
  assert(await page.locator('.rxp-ranking-viewport').evaluate(el=>el.scrollHeight>el.clientHeight));
  assert.equal((await chart()).yAxis[0].type,'category');assert.equal((await chart()).xAxis[0].type,'value');
  await page.locator('.rxp-ranking-card').scrollIntoViewIfNeeded();
  await page.locator('.rxp-ranking-viewport').evaluate(el=>el.scrollTop=el.scrollHeight-el.clientHeight);
  const lastBarn=(await chart()).yAxis[0].data.at(-1);
  await page.evaluate(()=>echarts.getInstanceByDom(document.querySelector('#rxpRankingChart')).dispatchAction({type:'showTip',seriesIndex:0,dataIndex:384}));
  const rankTip=page.getByText('Galpão '+lastBarn,{exact:true});await rankTip.waitFor({state:'visible'});await page.waitForTimeout(300);
  const rankTipRect=await rankTip.locator('..').boundingBox();assert(rankTipRect.x>=0&&rankTipRect.x+rankTipRect.width<=1441&&rankTipRect.y>=0&&rankTipRect.y+rankTipRect.height<=1001);
  await page.evaluate(()=>echarts.getInstanceByDom(document.querySelector('#rxpRankingChart')).dispatchAction({type:'hideTip'}));
  await page.locator('#rxpRankingAscending').click();assert.equal((await chart()).yAxis[0].data[0],groups.toSorted((a,b)=>Math.abs(a.diferenca)-Math.abs(b.diferenca)||a.galpao.localeCompare(b.galpao,'pt-BR',{numeric:true}))[0].galpao);
  await page.locator('#rxpRankingMetric').selectOption('real');
  await page.locator('#rxpRankingDescending').click();assert.equal(Math.max(...groups.map(r=>r.real)),(await chart()).series[0].data[0].value);
  assert.equal(requests.filter(r=>r.path.endsWith('/detalhes')&&r.params.tamanho==='500').length,3,'Trocar metrica/ordem nao refaz consulta');
  await page.locator('#filtroSemana .checkbox-multiselect-trigger').click();
  await page.locator('#filtroSemana input[value="2026-11-02"]').check();
  await ready();
  await page.locator('#filtroSemana input[value="2026-11-16"]').check();
  await ready();
  assert.equal(await page.locator('#filtroSemana .checkbox-multiselect-label').innerText(),'2 selecionados');
  const selectedRows=records.filter(r=>['2026-11-02','2026-11-16'].includes(r.data));
  assert.equal(await page.locator('#kpiDiferenca').innerText(),cards(selectedRows).diferenca.toLocaleString('pt-BR'));
  const filtered=requests.filter(r=>r.path.endsWith('/resumo')).at(-1);assert.deepEqual(filtered.dates,['2026-11-02','2026-11-16']);assert(!('semana' in filtered.params));
  weeks=await weekly();assert.equal(weeks.values[45],0);assert(Math.abs(weeks.scroll-weeks.end)<2);
  await page.locator('h1').click();await page.locator('#visaoMensalRxp').click();
  await page.waitForFunction(()=>document.querySelector('#tabelaMensalRxp').textContent.includes('novembro'));
  assert.deepEqual(requests.filter(r=>r.params.etapa==='mensal').at(-1).dates,['2026-11-02','2026-11-16']);
  assert.equal(await page.locator('.abate-monthly-table tbody td').first().evaluate(el=>getComputedStyle(el).position),'sticky');
  assert.equal(await page.locator('#tabelaMensalRxpTotal th').count(),7);
  const monthlyHeights=await page.locator('.rxp-left-stack, .rxp-ranking-card').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
  assert.equal(monthlyHeights[0],monthlyHeights[1],'Ranking acompanha a pilha Comparativo + Semanal');
  const monthlyBody=await page.locator('#tabelaMensalRxp').innerHTML();
  await page.locator('#tabelaMensalRxp').evaluate(el=>{const row=el.firstElementChild.outerHTML;el.innerHTML=Array(12).fill(row).join('');});
  await page.waitForTimeout(100);
  const expanded=await page.locator('.rxp-left-stack, .rxp-ranking-card').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
  assert(expanded[0]>monthlyHeights[0]);assert.equal(expanded[0],expanded[1],'Doze linhas mensais expandem o ranking junto');
  await page.locator('#tabelaMensalRxp').evaluate((el,html)=>el.innerHTML=html,monthlyBody);
  await page.waitForTimeout(100);
  assert(await page.locator('.rxp-ranking-controls').evaluate(el=>Boolean(el.closest('.rxp-ranking-heading'))));
  const preview=path.join(root,'tests/frontend-previews/rxp-ranking-20261106');await fs.mkdir(preview,{recursive:true});
  await page.waitForTimeout(350);
  await page.locator('.rxp-comparison-grid').screenshot({path:path.join(preview,'mensal-desktop.png')});
  await page.setViewportSize({width:390,height:1000});
  await page.locator('#comparativoMensalRxp').evaluate(el=>el.scrollLeft=180);
  const sticky=await page.locator('.abate-monthly-table tbody td').first().evaluate(el=>({cell:el.getBoundingClientRect().x,wrap:el.closest('.abate-table-wrap').getBoundingClientRect().x}));
  assert(Math.abs(sticky.cell-sticky.wrap)<3);
  await page.locator('.rxp-comparison-grid').screenshot({path:path.join(preview,'mensal-mobile.png')});
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('#visaoUnidadeRxp').click();await page.locator('[data-rxp-unit="-1"]').click();
  await page.waitForFunction(()=>document.querySelector('#rxpPage').textContent.includes('Página'));
  assert.deepEqual(requests.filter(r=>r.path.endsWith('/detalhes')&&r.params.tamanho==='50').at(-1).dates,['2026-11-02','2026-11-16']);
  await page.locator('#modalAbateFechar').click();
  await page.locator('#filtroGalpao .checkbox-multiselect-trigger').click();await page.locator('#filtroGalpao input[value="G02"]').check();await ready();
  assert.equal((await chart()).yAxis[0].data.length,1);
  await page.locator('h1').click();
  const out=path.join(root,'tests/frontend-previews/rxp-ranking-20261106');await fs.mkdir(out,{recursive:true});
  for(const width of [1440,1100,1099,768,390])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:1000});await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.dispatchEvent(new Event('dashboard:theme-changed'));},theme);
   const rects=await page.locator('.rxp-left-stack, .rxp-ranking-card').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));
   if(width>=1100){assert.equal(rects[0].y,rects[1].y);assert(Math.abs(rects[0].width/rects[1].width-65/35)<0.02);assert.equal(rects[0].height,rects[1].height,'Ranking acompanha a pilha esquerda');}else assert(rects[1].y>rects[0].y);
   const header=await page.locator('.rxp-ranking-heading').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,wrap:getComputedStyle(el).flexWrap}));assert.equal(header.wrap,'nowrap');assert(header.scroll<=header.width+1,`Cabecalho sem overflow ${width}`);
   const kpis=await page.locator('.rxp-kpi-groups .abate-kpi-card').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})));
   assert.equal(kpis[0].y,kpis[1].y);assert.equal(kpis[2].y,kpis[3].y);if(width<1100)assert(kpis[2].y>kpis[0].y);
   if(width<1100)assert.equal(rects[1].height,420);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Sem overflow da pagina ${width}/${theme}`);
   await page.waitForTimeout(300);
   const latestWindow=await weekly();assert(Math.abs(latestWindow.scroll-latestWindow.end)<2,`Quatro semanas recentes apos resize ${width}/${theme}`);
   await page.locator('.rxp-comparison-grid').screenshot({path:path.join(out,`${width}-${theme}.png`)});
  }
  await page.setViewportSize({width:1440,height:1000});await page.locator('#limparFiltrosAbate').click();await ready();
  assert.equal(await page.locator('#filtroSemana .checkbox-multiselect-label').innerText(),'Todos');assert.equal((await chart()).yAxis[0].data.length,385);
  failRanking=true;await page.locator('#filtroAno .checkbox-multiselect-trigger').click();await page.locator('#filtroAno input[value="2026"]').check();
  await page.locator('#rxpRankingRetry').waitFor({state:'visible'});assert.equal(await page.locator('#rxpRankingStatus').innerText(),'Ranking indisponível');
  failRanking=false;await page.locator('#rxpRankingRetry').click();await ready();
  empty=true;await page.locator('#limparFiltrosAbate').click();
  await page.waitForFunction(()=>document.querySelector('#rxpRankingMessage').textContent==='Sem dados para os filtros selecionados');
  assert.equal((await chart()).series[0].data.length,0);
  assert.equal(await page.locator('#rxpWeeklyMessage').innerText(),'Sem dados para os filtros selecionados');
  const calendar=await page.evaluate(()=>{
   const acc=RxpWeeklyChart.create();
   RxpWeeklyChart.add(acc,{data:'2025-06-01',programada:100,real:50,difQtdeRxP:-9999});
   RxpWeeklyChart.add(acc,{data:'2026-11-06',programada:100,real:90,difQtdeRxP:-7});
   RxpWeeklyChart.render(acc);
   const option=echarts.getInstanceByDom(document.querySelector('#rxpWeeklyChart')).getOption();
   const first=RxpWeeklyChart.create();RxpWeeklyChart.add(first,{data:'2026-01-01',programada:100,real:99,difQtdeRxP:-1});RxpWeeklyChart.render(first);
   return {year:document.querySelector('#rxpWeeklyYear').textContent,previousYearExcluded:option.series[0].data[21].value,latest:option.series[0].data[44].value,firstWeeks:echarts.getInstanceByDom(document.querySelector('#rxpWeeklyChart')).getOption().xAxis[0].data};
  });
  assert.deepEqual(calendar,{year:'2026',previousYearExcluded:0,latest:-7,firstWeeks:['S1','','','']});
  assert.deepEqual(errors,[]);
  const isolated=await browser.newPage();await isolated.setContent('<div id="filtroSemana" class="checkbox-multiselect"></div>');
  await isolated.addScriptTag({content:'window.APP_CONFIG={endpoints:{filtros:"/filtros"}};'});
  await isolated.addScriptTag({content:await fs.readFile(path.join(root,'assets/js/filters.js'),'utf8')});
  await isolated.addScriptTag({content:await fs.readFile(path.join(root,'assets/js/rxp-weeks.js'),'utf8')});
  const longSelection=await isolated.evaluate(async()=>{
   const dates=Array.from({length:500},(_,i)=>new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10));
   const field={id:'filtroSemana',apiKey:'data',multi:true,search:true};
   const control=new FilterController({fields:[field],includeDependentRefresh:false,optionsProvider:async()=>({data:dates})});
   control.register();RxpWeekFilter.attach(control);await control.loadOptions();
   const input=document.querySelector('[data-all]');input.checked=true;input.dispatchEvent(new Event('change'));
   const before=control.values().data.length;await control.loadOptions();
   return {before,after:control.values().data.length,datesUnique:new Set(control.values().data).size};
  });
  assert.deepEqual(longSelection,{before:500,after:500,datesUnique:500});await isolated.close();
  console.log(JSON.stringify({resultado:'OK',paginacaoCompleta:1205,galpoes:385,barrasHorizontais:true,semanasMultiplas:true,selecaoLongaDatas:500,semanalOrigem:true,eixoYfixo:true,quatroColunas:true,galpaoPreservado:true,origemDiferencaPreservada:true,top15Todos:true,metricasOrdenacao:true,modalMensalFiltrados:true,larguras:5,temas:2,falhaRetry:true,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
