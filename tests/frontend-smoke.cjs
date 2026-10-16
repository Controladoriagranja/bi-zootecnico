const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const projectRoot = path.resolve(__dirname,'..');
const root = path.resolve(process.env.BI_FRONTEND_ROOT || projectRoot);
const weekly=[7,14,21,28,35].map(idade=>({idade,mortes:10,mortalidade:1,mortalidade_sem_descartes:0.8,descarte_percent:0.2,peso:100*idade}));
const cards={lotes:1,aves:1000,mortes:50,mortalidade:5,peso:2100,peso_atual:3,peso_pinto:44.6,peso_abate_final:2.919,vezes_maior:2.919*1000/44.6};
const rxpCards={programada:100,real:90,diferenca:-10,registrosComDiferenca:1,difPercent:-10};
const meta={rules_version:'acerto-iep-mensal-2026-10-16',arquivo:'zootecnico.vw_desempenho_acerto_portal',atualizado_em:'2026-10-02T12:00:00',periodo_recepcao:{data_inicio:'2026-08-23',data_fim:'2026-10-07',coluna:'data_recepcao'}};
async function main(){
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const results=[];
  try{
    for(const name of ['index','detalhes','lotes','historico','diferenca-aves-abatidas'].filter(name=>!process.env.BI_SCREEN||process.env.BI_SCREEN===name)){
      const page=await browser.newPage({viewport:{width:1365,height:900}}),errors=[],requests=[],queries=[];
      let scenario='normal',delayMs=0;
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>sessionStorage.setItem('granjabi_auth_token','isolated-synthetic-token'));
      await page.route('**/*',async route=>{
        const u=new URL(route.request().url());
        if(u.hostname.endsWith('workers.dev')){
          requests.push(u.pathname);
          queries.push({path:u.pathname,params:Object.fromEntries(u.searchParams),lists:Object.fromEntries([...new Set(u.searchParams.keys())].map(k=>[k,u.searchParams.getAll(k)]))});
          if(delayMs)await new Promise(resolve=>setTimeout(resolve,delayMs));
          if((scenario==='failure'&&!u.pathname.endsWith('/filtros'))||(scenario==='optionsFailure'&&u.pathname.endsWith('/filtros'))){
            await route.fulfill({status:503,contentType:'application/json',body:'{"detail":"internal database failure"}'});return;
          }
          let body;
          if(u.pathname.endsWith('/filtros'))body={ano:['2097.47','2090','2026','2025','2023','2022'],mes:[7,10],dia:['2','15'],produtor:['Produtor teste'],tipo_granja:['Integrada'],modelo:['Modelo teste'],tecnico:['Técnico teste'],galpao:['A'],linhagem:['COBB'],mist_linha:['Pura'],tipo_linhagem:['pura'],periodo_dias:['7']};
          else if(u.pathname.includes('/zootecnico/')){
            const metric={id:'gmd',nome:'GPD',valor:60,unidade:'g/dia',casas_decimais:2};
            body=u.pathname.endsWith('/resumo')?{...meta,anos:[2026],meses:[{numero:10,nome:'outubro'}],indicadores:{gmd:{...metric,por_ano:{2026:Array(12).fill(60)},totais:{2026:60}}}}:{...meta,indicador:metric,ranking_tecnicos:[{nome:'Técnico teste',valor:60}],ranking_produtores:[{nome:'Produtor teste',valor:60}],evolucao:{meses:Array.from({length:12},(_,i)=>({numero:i+1,nome:String(i+1)})),series:[{ano:2026,valores:Array(12).fill(60)}]}};
          }else if(u.pathname.includes('/rxp/')){
            body=u.pathname.endsWith('/resumo')?{...meta,cards:rxpCards,groups:[{unidade:'AVE NOVA',cards:rxpCards}]}:{...meta,cards:rxpCards,pagina:1,total:1,total_paginas:1,dados:[{id:1,fonte:'ave',unidade:'AVE NOVA',produtor:'Produtor teste',tecnico:'Técnico teste',galpao:'A',data:'2026-10-02',lote:'1',programada:100,real:90,difQtdeRxP:-10,difPercent:-10}]};
          }else body={...meta,cards,weekly,metas:{mortalidade_semanal:{valor:1,unidade:'%',comparacao:'<=',referencia_mes:'2026-10-01'}},groups:[{tipo_granja:'Integrada',produtor:'Produtor teste',linhagem:'COBB',cards,weekly}],galpoes:[{produtor:'Produtor teste',galpao:'A',idade_atual:35,linhagens:['COBB'],cards,weekly}],hierarchy:[{campo:'semana',valor:'40',cards,weekly,children:[{campo:'produtor',valor:'Produtor teste',cards,weekly,children:[]}]}]};
          if(u.pathname.includes('/rxp/')&&u.pathname.endsWith('/filtros'))body.ano=['2026','2025','2023'];
          if(u.pathname.includes('/rxp/')&&u.pathname.endsWith('/resumo')){
            body.etapa=u.searchParams.get('etapa')||'completo';
            if(body.etapa==='principal')body.groups=[];
            if(body.etapa==='mensal'){
              const count=(programada,real)=>({programada,real});
              body.monthly={rows:[
                {periodo:'2025-10',ave_nova:count(20,15),real_alimentos:count(10,5),total:count(30,20)},
                {periodo:'2026-10',ave_nova:count(40,40),real_alimentos:count(30,30),total:count(70,70)}
              ],totals:{ave_nova:count(60,55),real_alimentos:count(40,35),total:count(100,90)}};
            }

          }
          if(name==='detalhes'&&body.indicador){
            body.ranking_produtores=Array.from({length:25},(_,i)=>({nome:i===0?'Produtor teste':`Produtor ${i}`,valor:60}));
            body.ranking_contexto={metodo:'ratio_sums',visible_rows:20,tecnicos:{grupos:1,lotes:25,sem_identificacao:0,valor_recomposto:60},produtores:{grupos:25,lotes:25,sem_identificacao:0,valor_recomposto:60}};
          }
          if(scenario==='empty'&&!u.pathname.endsWith('/filtros')){
            if(u.pathname.includes('/zootecnico/')){
              if(body.indicadores){for(const metric of Object.values(body.indicadores)){metric.por_ano={2026:Array(12).fill(null)};metric.totais={2026:null};}}
              else {body.indicador.valor=null;body.ranking_tecnicos=[];body.ranking_produtores=[];body.evolucao.series=[];}
            }else {body.cards=Object.fromEntries(Object.keys(body.cards).map(k=>[k,k==='peso'||k==='peso_atual'||k==='difPercent'||k==='mortalidade'?null:0]));body.groups=[];body.weekly=[];body.galpoes=[];body.hierarchy=[];body.dados=[];body.total=0;}
          }
          if(u.pathname.includes('/zootecnico/')&&body.indicadores){
            body.meses_carregados=u.searchParams.getAll('mes_carga').map(Number);
            body.totais_incluidos=u.searchParams.get('incluir_totais')!=='0';
            body.meses=Array.from({length:12},(_,i)=>({numero:i+1,nome:String(i+1)}));
            for(const metric of Object.values(body.indicadores)){
              metric.por_ano['2026']=metric.por_ano['2026'].map((value,i)=>body.meses_carregados.includes(i+1)?value:null);
              if(!body.totais_incluidos)metric.totais={'2026':null};
            }
          }
          if(u.pathname.includes('/zootecnico/')&&body.indicador){
            body.etapa=u.searchParams.get('etapa')||'completo';
            if(body.etapa==='principal')body.evolucao.series=[];
          }
          if(name==='lotes'&&body.cards){
            if(scenario==='targetChanged')body.metas.mortalidade_semanal.valor=2.5;
            if(scenario==='targetMissing')body.metas={};
            if(scenario==='targetSingleWeek')body.weekly=[{...weekly[0],mortalidade:0.2}];
          }
          await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});return;
        }
        const relative=decodeURIComponent(u.pathname).replace(/^\//,'');
        try{const file=path.resolve(root,relative||'index.html');if(!file.startsWith(root+path.sep))throw Error('path');const content=await fs.readFile(file);const ext=path.extname(file);await route.fulfill({body:content,contentType:ext==='.html'?'text/html':ext==='.js'?'application/javascript':ext==='.css'?'text/css':undefined});}catch{await route.fulfill({status:404,body:''});}
      });
      await page.goto(`http://bi.test/${name}.html${name==='detalhes'?'?indicador=gmd&ano=2026&mes=7&produtor=Produtor+teste':''}`);
      await page.waitForFunction(name=>name==='historico'
        ? document.querySelector('#historyKpis strong')?.textContent==='1'
        : document.body.innerText.includes('Produtor teste')||document.body.innerText.includes('60,00')||document.body.innerText.includes('AVE NOVA'),name);
      if(name==='index'){
        assert.equal(await page.locator('#linhagem .checkbox-multiselect-trigger').count(),1);
        await page.waitForFunction(()=>document.querySelector('#apiFilterProgress')?.classList.contains('hidden'));
        const julyLink=page.locator('a.metric-value-link[href*="ano=2026"][href*="mes=7"]').first();
        const target=new URL(await julyLink.getAttribute('href'),'http://bi.test/');
        assert.equal(target.searchParams.get('ano'),'2026');
        assert.deepEqual(target.searchParams.getAll('mes'),['7']);
        assert.equal(target.searchParams.get('indicador'),'gmd');
      }
      if(name==='detalhes'){
        await page.waitForFunction(()=>document.querySelector('#apiFilterProgress')?.classList.contains('hidden'));
        const initialQueries=queries.filter(q=>q.path.endsWith('/detalhes')||q.path.endsWith('/filtros'));
        assert(initialQueries.length>=3);
        assert(initialQueries.every(q=>q.params.ano==='2026'&&q.params.mes==='7'&&q.params.produtor==='Produtor teste'),'URL deve preservar o contexto em filtros, principal e evolução');
        assert.equal(await page.locator('#mes .checkbox-multiselect-label').innerText(),'julho');
        await page.waitForFunction(()=>document.querySelector('#rankingProdutores')?.clientHeight>500);
        assert((await page.locator('#contextoRankingProdutores').innerText()).includes('25 produtores'));
        assert((await page.locator('#conferenciaRankingProdutores').innerText()).includes('Total recomposto: 60,00'));
        const viewport=page.locator('#rankingProdutores').locator('..');
        assert(await viewport.evaluate(el=>el.scrollHeight>el.clientHeight));
        await viewport.evaluate(el=>el.scrollTop=el.scrollHeight);
        assert(await viewport.evaluate(el=>el.scrollTop>0));
        await viewport.evaluate(el=>el.scrollTop=0);
      }
      if(name==='lotes'){
        assert.equal(await page.locator('#periodoRecepcaoLotes').innerText(),'23/08/26 a 07/10/26');
        const appearance=await page.evaluate(()=>{
          const option=id=>echarts.getInstanceByDom(document.getElementById(id)).getOption();
          return {growth:option('chartCrescimento').series[0],weight:option('chartPesoSemanal').series[0],mortality:option('chartMortalidade').series[0]};
        });
        assert.equal(appearance.growth.areaStyle.color.type,'linear');
        assert.equal(appearance.growth.areaStyle.color.colorStops.length,2);
        assert.equal(appearance.growth.label.show,true);
        assert.equal(appearance.weight.type,'bar');assert.equal(appearance.weight.label.show,true);
        assert.equal(appearance.mortality.label.fontWeight,700);
        const target=await page.evaluate(()=>echarts.getInstanceByDom(document.getElementById('chartMortalidade')).getOption().series.find(s=>s.name==='Meta (1%)'));
        assert(target,'A meta deve vir da resposta da API');
        assert.equal(target.yAxisIndex,1);
        assert.equal(target.lineStyle.type,'dashed');
        assert(target.data.every(value=>value===1));
        assert.equal(target.markLine.data[0].yAxis,1);
        scenario='targetChanged';await page.locator('#limparFiltrosLotes').click();
        await page.waitForFunction(()=>echarts.getInstanceByDom(document.getElementById('chartMortalidade')).getOption()?.series?.some(s=>s.name==='Meta (2,5%)'));
        scenario='targetMissing';await page.locator('#limparFiltrosLotes').click();
        await page.waitForFunction(()=>echarts.getInstanceByDom(document.getElementById('chartMortalidade')).getOption()?.series?.length===2);
        scenario='targetSingleWeek';await page.locator('#limparFiltrosLotes').click();
        await page.waitForFunction(()=>{const s=echarts.getInstanceByDom(document.getElementById('chartMortalidade')).getOption()?.series;return s?.length===3&&s[2].data.length===1;});
        assert.equal(await page.evaluate(()=>echarts.getInstanceByDom(document.getElementById('chartMortalidade')).getOption().series[2].markLine.data[0].yAxis),1);
        scenario='normal';await page.locator('#limparFiltrosLotes').click();
        await page.waitForFunction(()=>{const s=echarts.getInstanceByDom(document.getElementById('chartMortalidade')).getOption()?.series;return s?.length===3&&s[2].data.length===5&&s[2].name==='Meta (1%)';});
        assert.equal(await page.locator('#tabelaLotesFoot th').count(),5);
        await fs.mkdir(path.join(projectRoot,'tests/frontend-previews'),{recursive:true});
        await page.screenshot({path:path.join(projectRoot,'tests/frontend-previews/lotes-visual.png'),fullPage:true});
        await page.locator('#tabGalpoes').click();
        const style=await page.evaluate(()=>({color:echarts.getInstanceByDom(document.querySelector('#chartGalpoesRanking')).getOption().series[0].itemStyle.color,primary:getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),bar:echarts.getInstanceByDom(document.querySelector('#chartGalpoesRanking')).getOption().series[0].barMaxWidth}));
        assert.equal(style.color,style.primary);assert.equal(style.bar,24);
        await page.locator('[data-barn]').first().click();assert(await page.locator('#galpaoDrawer').isVisible());
        assert((await page.locator('#galpaoDrawerResumo').innerText()).includes('35 dias'));
        assert((await page.locator('#galpaoDrawerResumo').innerText()).includes('COBB'));
      }
      if(name==='historico'){
        assert.equal(await page.locator('#history-filter-originalLineage .checkbox-multiselect-trigger').count(),1);
        const weightHeaders=['Peso do pintinho (g)','Peso de abate (kg)','Vezes maior'];
        assert.deepEqual((await page.locator('#historyTableHead th').allTextContents()).slice(4,7).map(v=>v.replace(/[↕↑↓]/g,'').trim()),weightHeaders);
        assert.equal(await page.locator('#historyTableHead th').count(),22);
        const newCells=page.locator('#historyTableBody tr').first().locator('td');
        assert.equal(await newCells.nth(3).innerText(),'5,00%');
        assert.equal(await page.locator('#historyTableFoot tr th').nth(2).innerText(),'5,00%');
        assert.equal(await newCells.nth(4).innerText(),'44,600');
        assert.equal(await newCells.nth(5).innerText(),'2,919');
        assert.equal(await newCells.nth(6).innerText(),'65,4×');
        assert.equal(await page.locator('#historyTableFoot tr th').nth(5).innerText(),'65,4×');
        await page.locator('[data-history-view="weight"]').click();
        assert.equal(await page.locator('#historyTableHead th').count(),12);
        assert.equal(await page.locator('#historyTableBody tr').first().locator('td').nth(6).innerText(),'65,4×');
        await page.locator('[data-history-view="mortality"]').click();
        assert.equal(await page.locator('h1').innerText(),'Histórico de Lotes em Criação');
        assert(requests.some(p=>p.includes('/historico-abertos/')));
        assert(!requests.some(p=>p.includes('/historico-fechados/')));
        assert.equal(await page.locator('#historyTableHead .history-col-combined').count(),5);
        assert.equal(await page.locator('#historyKpis [data-historico-formula]').count(),4);
        assert.equal(await page.locator('#historyTableBody .history-level-0').count(),1);
        assert.deepEqual(await page.locator('[data-history-year]').allTextContents(),['2026','2025','2023']);
        assert.equal(await page.locator('[data-history-year].active').innerText(),'2026');
        await page.locator('[data-history-node]').first().click();assert((await page.locator('#historyTableBody').innerText()).includes('Produtor teste'));
        assert.equal(await page.locator('#historyTableBody .history-level-1 td').nth(3).innerText(),'5,00%');
      }
      if(name==='diferenca-aves-abatidas'){
        await page.waitForFunction(()=>document.querySelector('#apiFilterProgress')?.classList.contains('hidden'));
        assert.deepEqual(queries.filter(q=>q.path.endsWith('/rxp/resumo')).map(q=>q.params.etapa),['principal','grupos']);
        for(const [host,values] of [['filtroAno',['2026','2025']],['filtroMes',['7','10']],['filtroDia',['2','15']]]){
          await page.locator('#'+host+' .checkbox-multiselect-trigger').click();
          for(const value of values){
            await page.locator('#'+host+' input[value="'+value+'"]').check();
            await page.waitForFunction(()=>document.querySelector('#apiFilterProgress')?.classList.contains('hidden'));
          }
          assert.equal(await page.locator('#'+host+' .checkbox-multiselect-label').innerText(),'2 selecionados');
          await page.locator('#'+host+' input[data-all]').check();
          await page.waitForFunction(()=>document.querySelector('#apiFilterProgress')?.classList.contains('hidden'));
          await page.locator('#'+host+' input[data-all]').uncheck();
          await page.waitForFunction(()=>document.querySelector('#apiFilterProgress')?.classList.contains('hidden'));
          assert.equal(await page.locator('#'+host+' .checkbox-multiselect-label').innerText(),'Todos');
          await page.locator('#'+host+' input[data-all]').check();
          await page.waitForFunction(()=>document.querySelector('#apiFilterProgress')?.classList.contains('hidden'));
        }
        await page.locator('h1').click();
        await page.screenshot({path:path.join(projectRoot,'tests/frontend-previews/rxp-filtros-desktop.png'),fullPage:true});
        assert.equal(await page.locator('#tabelaUnidadesAbateTotal th').count(),7);
        assert.equal(await page.locator('#tabelaUnidadesAbate .abate-diff-pill.is-negative').innerText(),'-10');
        await page.locator('[data-rxp-unit]').first().click();await page.locator('#tabelaProdutoresAbate').getByText('Produtor teste').waitFor();
        const detailQuery=queries.filter(q=>q.path.endsWith('/rxp/detalhes')).at(-1);
        assert.deepEqual(detailQuery.lists.ano,['2026','2025','2023']);assert.deepEqual(detailQuery.lists.mes,['7','10']);assert.deepEqual(detailQuery.lists.dia,['2','15']);
        assert.equal(await page.locator('#tabelaProdutoresAbate td[data-label]').count(),12);
        assert.equal(await page.locator('#tabelaProdutoresAbate td[data-label="Produtor"] strong').innerText(),'Produtor teste');
        assert.equal(await page.locator('#tabelaProdutoresAbate td[data-label="Data"]').innerText(),'02/10/2026');
        await page.setViewportSize({width:390,height:844});
        await page.screenshot({path:path.join(projectRoot,'tests/frontend-previews/rxp-mobile.png'),fullPage:true});
        await page.setViewportSize({width:1365,height:900});
        await page.locator('#modalAbateFechar').click();
        const beforeMonth=queries.filter(q=>q.params.etapa==='mensal').length;
        await page.locator('#visaoMensalRxp').click();
        await page.waitForFunction(()=>document.querySelectorAll('#tabelaMensalRxp tr').length===2);
        assert.equal(await page.locator('#visaoMensalRxp').getAttribute('aria-pressed'),'true');
        assert.equal(await page.locator('#comparativoUnidadeRxp').isVisible(),false);
        assert.deepEqual(await page.locator('#tabelaMensalRxp tr').first().locator('td').allTextContents(),['outubro / 2025','20','15','10','5','30','20']);
        assert.deepEqual(await page.locator('#tabelaMensalRxpTotal th').allTextContents(),['Total','60','55','40','35','100','90']);
        const monthlyQuery=queries.filter(q=>q.params.etapa==='mensal').at(-1);
        assert.deepEqual(monthlyQuery.lists.ano,detailQuery.lists.ano);
        assert.deepEqual(monthlyQuery.lists.mes,detailQuery.lists.mes);
        assert.deepEqual(monthlyQuery.lists.dia,detailQuery.lists.dia);
        const sortMonth=page.locator('#comparativoMensalRxp thead th').first().locator('button');
        await sortMonth.click();await sortMonth.click();
        assert.equal(await page.locator('#tabelaMensalRxp tr').first().locator('td').first().innerText(),'outubro / 2026');
        await page.screenshot({path:path.join(projectRoot,'tests/frontend-previews/rxp-mensal-desktop.png'),fullPage:true});
        await page.setViewportSize({width:390,height:844});
        await page.screenshot({path:path.join(projectRoot,'tests/frontend-previews/rxp-mensal-mobile.png'),fullPage:true});
        await page.setViewportSize({width:1365,height:900});
        await page.locator('#visaoUnidadeRxp').click();await page.locator('#visaoMensalRxp').click();
        assert.equal(queries.filter(q=>q.params.etapa==='mensal').length,beforeMonth+1,'Altern?ncia reaproveita os dados do contexto');
        await page.locator('#filtroDia .checkbox-multiselect-trigger').click();
        await page.locator('#filtroDia input[value="2"]').uncheck();
        await page.waitForFunction(()=>document.querySelector('#apiFilterProgress')?.classList.contains('hidden'));
        assert.equal(queries.filter(q=>q.params.etapa==='mensal').length,beforeMonth+2,'New filters invalidate monthly cache');
        assert.deepEqual(queries.filter(q=>q.params.etapa==='mensal').at(-1).lists.dia,['15']);
        await page.locator('h1').click();

        await page.locator('#visaoUnidadeRxp').click();

      }
      assert.deepEqual(errors,[],name+': '+errors.join('; '));
      assert(requests.some(p=>p.endsWith(name==='detalhes'?'/detalhes':'/resumo')),name);
      const out=path.join(projectRoot,'tests','frontend-previews');await fs.mkdir(out,{recursive:true});await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
      if(name==='lotes'){await page.locator('#galpaoDrawerFechar').click();await page.locator('#tabProdutores').click();}
      if(name==='diferenca-aves-abatidas'&&await page.locator('#modalAbateFechar').isVisible())await page.locator('#modalAbateFechar').click();
      const clearId={index:'limparFiltros',detalhes:'limparFiltrosDetalhes',lotes:'limparFiltrosLotes',historico:'limparFiltrosHistorico','diferenca-aves-abatidas':'limparFiltrosAbate'}[name];
      const errorId={index:'mensagemErro',detalhes:'mensagemErro',lotes:'mensagemErroLotes',historico:'mensagemErroHistorico','diferenca-aves-abatidas':'erroRxp'}[name];
      const producerId={index:'produtor',detalhes:'produtor',lotes:'produtor',historico:'history-filter-producer','diferenca-aves-abatidas':'filtroProdutor'}[name];
      if(name==='detalhes'){
        await page.locator('#'+clearId).click();
        await page.waitForFunction(()=>document.querySelector('#apiFilterProgress')?.classList.contains('hidden'));
      }
      const previousQueries=queries.length;
      await page.locator('#'+producerId+' .checkbox-multiselect-trigger').click();
      await page.locator('#'+producerId+' input[type="checkbox"][value="Produtor teste"]').check();
      await page.waitForFunction(()=>document.querySelector('#apiFilterProgress')?.classList.contains('hidden'));
      assert(queries.slice(previousQueries).some(q=>q.path.endsWith(name==='detalhes'?'/detalhes':'/resumo')&&q.params.produtor==='Produtor teste'),name+': filtro produtor enviado');
      await page.locator('h1').click();
      delayMs=400;await page.locator('#'+clearId).click();
      await page.locator('#apiFilterProgress').waitFor({state:'visible'});
      assert.equal(await page.locator('#apiFilterProgress').innerText(),'Aplicando filtros…');
      assert.equal(await page.locator('#apiFilterProgress').evaluate(el=>getComputedStyle(el).position),'fixed');
      await page.locator('#'+clearId).click();
      await page.locator('#apiFilterProgress').waitFor({state:'hidden'});delayMs=0;
      if(name==='lotes'){
        await page.locator('#tabGalpoes').click();
        await page.locator('[data-theme-toggle]').first().click();
        const colors=await page.evaluate(()=>({chart:echarts.getInstanceByDom(document.querySelector('#chartGalpoesRanking')).getOption().series[0].itemStyle.color,primary:getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()}));
        assert.equal(colors.chart,colors.primary);
        await page.setViewportSize({width:390,height:844});
        await page.waitForFunction(()=>echarts.getInstanceByDom(document.querySelector('#chartGalpoesRanking')).getWidth()===document.querySelector('#chartGalpoesRanking').clientWidth);
        assert.equal(await page.evaluate(()=>echarts.getInstanceByDom(document.querySelector('#chartGalpoesRanking')).getOption().grid[0].left),94);
        await page.screenshot({path:path.join(out,'lotes-mobile.png'),fullPage:true});
        await page.setViewportSize({width:1365,height:900});
        await page.locator('#tabProdutores').click();
      }
      scenario='failure';await page.locator('#'+clearId).click();await page.locator('#'+errorId).waitFor({state:'visible'});
      await page.locator('#apiFilterProgress').waitFor({state:'hidden'});
      assert(!(await page.locator('#'+errorId).innerText()).includes('internal database failure'));
      if(name==='index')assert(!(await page.locator('#indicadores').isVisible()));
      if(name==='detalhes')assert.equal(await page.locator('#kpiValor').innerText(),'—');
      if(name==='lotes')assert.equal(await page.locator('#cardsLotes .lotes-reference-value').first().innerText(),'—');
      if(name==='historico')assert.equal(await page.locator('#historyKpis strong').first().innerText(),'—');
      if(name==='diferenca-aves-abatidas')assert.equal(await page.locator('#kpiProgramada').innerText(),'—');
      scenario='optionsFailure';await page.locator('#'+clearId).click();
      await page.locator('#apiFilterProgress').waitFor({state:'hidden'});
      await page.locator('#'+errorId).waitFor({state:'visible'});
      assert(!(await page.locator('#'+errorId).innerText()).includes('internal database failure'));
      scenario='empty';await page.locator('#'+clearId).click();
      await page.locator('#'+errorId).waitFor({state:'hidden'});
      if(['lotes','historico','diferenca-aves-abatidas'].includes(name))await page.getByText(/Nenhum (lote|registro) para os filtros/).waitFor();
      else if(name==='index')await page.locator('#indicadores').waitFor({state:'visible'});
      else await page.locator('#dashboardAtualizando').waitFor({state:'hidden'});
      assert.deepEqual(errors,[],name);
      results.push({page:name,requests:requests.length,errors,producerFilter:true,filterProgress:true,filterApiFailure:true,apiFailureClearsValues:true,emptyResponse:true});await page.close();
    }
  }finally{await browser.close();}
  console.log(JSON.stringify(results,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
