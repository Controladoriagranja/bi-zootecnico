/* API simulada: nenhum acesso ao backend ou banco. */
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const {chromium} = require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}}), errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('granjabi_auth_token', 'local-test'));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname.endsWith('workers.dev')) {
        requests.push({path:url.pathname, params:Object.fromEntries(url.searchParams)});
        const filters = {ano:['2025','2026'],mes:[1,2],semana:['1','2'],tipo_granja:['Integrada'],modelo:['Dark house'],produtor:['Atair','Delcio'],tecnico:['Lucas','Mariana'],galpao:['626B']};
        const rows = (key, names) => names.filter(name => !url.searchParams.has(key) || url.searchParams.getAll(key).includes(name)).map(nome => ({nome,valor:1.979,lotes:2}));
        const body = url.pathname.endsWith('/filtros') ? filters : {
          arquivo:'zootecnico.vw_desempenho_acerto_portal',rules_version:'acerto-iep-mensal-2026-10-16',
          etapa:url.searchParams.get('etapa'),atualizado_em:'2026-11-18 08:05:00',
          indicador:{id:'ca',nome:'CA',valor:1.979,unidade:'',casas_decimais:3},
          ranking_tecnicos:rows('tecnico',['Lucas','Mariana']),ranking_produtores:rows('produtor',['Atair','Delcio']),
          ranking_contexto:{metodo:'ratio_sums',tecnicos:{valor_recomposto:1.979},produtores:{valor_recomposto:1.979}},
          evolucao:{meses:[{numero:1,nome:'janeiro'}],series:[{ano:2026,valores:[1.979]}]}
        };
        return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
      }
      if (url.hostname !== 'bi.test') return route.fulfill({status:404,body:''});
      const file = path.resolve(root, decodeURIComponent(url.pathname).replace(/^\//,''));
      assert(file.startsWith(root + path.sep));
      try { return route.fulfill({body:await fs.readFile(file),contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/javascript'}); }
      catch { return route.fulfill({status:404,body:''}); }
    });
    const ready = async () => {
      try { await page.waitForFunction(() => document.querySelector('#dashboardAtualizando').classList.contains('hidden') && document.querySelector('#kpiValor').textContent.trim() === '1,979',null,{timeout:10000}); }
      catch(error) { console.error({errors,requests,message:await page.locator('#mensagemErro').innerText(),value:await page.locator('#kpiValor').innerText()});throw error; }
    };
    const clickBar = async (kind, name) => {
      await page.evaluate(({kind,name}) => {
        const chart = echarts.getInstanceByDom(document.getElementById('ranking'+kind));
        const dataIndex = chart.getOption().yAxis[0].data.indexOf(name);
        if (dataIndex < 0) throw Error('Missing bar: '+name);
        chart.trigger('click',{name,dataIndex,componentType:'series',seriesType:'bar'});
      }, {kind,name});
      await ready();
    };
    const last = () => requests.filter(r => !r.path.endsWith('/filtros')).at(-1).params;
    await page.goto('http://bi.test/detalhes.html?indicador=ca&ano=2026&mes=1&modelo=Dark%20house&status_acerto=Normal');
    await ready();
    assert.equal(await page.locator('[data-ranking-clear]:visible').count(),0);
    await clickBar('Tecnicos','Lucas');
    assert.equal(last().tecnico,'Lucas');
    assert.equal(await page.locator('[data-ranking-clear]:visible').count(),2);
    assert.equal(await page.locator('[data-ranking-selection],.ranking-selection-chip').count(),0);
    await clickBar('Produtores','Atair');
    assert.equal(last().produtor,'Atair'); assert.equal(last().tecnico,'Lucas');
    await clickBar('Tecnicos','Lucas');
    await ready(); assert(!last().tecnico); assert.equal(last().produtor,'Atair');
    await page.locator('[data-ranking-clear]').last().click(); await ready();
    assert(!last().tecnico && !last().produtor);
    assert.equal(last().ano,'2026'); assert.equal(last().mes,'1'); assert.equal(last().modelo,'Dark house'); assert.equal(last().status_acerto,'Normal');
    assert.equal(await page.locator('[data-ranking-clear]:visible').count(),0);
    await clickBar('Tecnicos','Lucas'); await clickBar('Tecnicos','Lucas'); assert(!last().tecnico);
    // Existing dropdown selection must survive narrowing and clearing the graphs.
    await page.goto('http://bi.test/detalhes.html?indicador=ca&ano=2026&mes=1&tecnico=Lucas&tecnico=Mariana&produtor=Atair&produtor=Delcio'); await ready();
    await clickBar('Tecnicos','Lucas'); await clickBar('Produtores','Atair');
    assert.deepEqual(await page.evaluate(() => filters.values().tecnico),['Lucas','Mariana']);
    await page.locator('[data-ranking-clear]').first().click(); await ready();
    assert.deepEqual(new URL(page.url()).searchParams.getAll('tecnico'),['Lucas','Mariana']);
    assert.deepEqual(new URL(page.url()).searchParams.getAll('produtor'),['Atair','Delcio']);
    await clickBar('Tecnicos','Lucas');
    // Manual filters replace the graph drilldown, retaining the entered selections.
    await page.locator('#mes .checkbox-multiselect-trigger').click();
    await page.locator('#mes input[value="2"]').check();
    await page.locator('[data-ranking-clear]').first().waitFor({state:'hidden'}); await ready();
    assert.equal(await page.locator('[data-ranking-clear]:visible').count(),0);
    await page.locator('h1').click(); await clickBar('Tecnicos','Lucas');
    for (const width of [390,768,1440]) for (const theme of ['light','dark']) {
      await page.setViewportSize({width,height:1000});
      await page.evaluate(theme => document.documentElement.dataset.theme=theme,theme);
      await page.waitForTimeout(100);
      assert(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth+1),'No viewport overflow');
      for (const button of await page.locator('[data-ranking-clear]').all()) {
        assert(await button.isVisible());
        const a = await button.boundingBox(), fx = await button.locator('..').locator(':scope > .if-button').boundingBox();
        assert(a.x+a.width<=fx.x+1 || a.y+a.height<=fx.y+1 || fx.y+fx.height<=a.y+1,'Clear and formula buttons do not overlap');
      }
      if (width===1440 && theme==='light') await page.locator('.details-top-grid').screenshot({path:path.join(root,'tests/frontend-previews/ranking-selecao-20261118.png')});
    }
    await page.locator('[data-ranking-clear]').first().click(); await ready();
    assert.equal(await page.locator('[data-ranking-clear]:visible').count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: no selection tags; chart toggle, clear from both cards, preserved base filters, manual filter updates, formulas, 3 widths and both themes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
