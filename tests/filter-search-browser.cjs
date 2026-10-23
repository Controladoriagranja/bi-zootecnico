const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

async function main() {
  const browser = await chromium.launch({headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="produtor" class="checkbox-multiselect"></div>');
    await page.addStyleTag({content: await fs.readFile(path.join(root, 'assets/css/app.css'), 'utf8')});
    await page.addScriptTag({content: await fs.readFile(path.join(root, 'assets/js/filters.js'), 'utf8')});
    await page.evaluate(() => {
      window.APP_CONFIG = {endpoints: {filtros: '/filtros'}};
      window.opcoesTeste = ['MARIA LÚCIA', 'ANA', 'LUCIA SOUZA'];
      window.controleTeste = new FilterController({fields: [{id: 'produtor', apiKey: 'produtor', multi: true, search: true}],
        includeDependentRefresh: false, optionsProvider: async () => ({produtor: window.opcoesTeste})});
      controleTeste.register();
      return controleTeste.loadOptions();
    });
    const trigger = page.locator('#produtor .checkbox-multiselect-trigger');
    const search = page.locator('#produtor input[type=search]');
    const visible = () => page.locator('#produtor [data-filter-option]:not(.checkbox-option-all):visible').allTextContents();
    await trigger.click();
    await page.locator('#produtor input[value="ANA"]').check();
    await search.fill('luCiA');
    assert.deepEqual((await visible()).map(s => s.trim()), ['MARIA LÚCIA', 'LUCIA SOUZA']);
    assert(await page.locator('#produtor input[value="ANA"]').isChecked());
    await search.fill('aria lu');
    assert.deepEqual((await visible()).map(s => s.trim()), ['MARIA LÚCIA']);
    await search.fill('nao existe');
    assert.deepEqual(await visible(), []);
    await search.fill('lucia');
    // Atualizacao de opcoes em cascata deve reaplicar a busca que esta digitada.
    await page.evaluate(async () => {
      opcoesTeste = ['MARIA LÚCIA', 'ANA'];
      await controleTeste.loadOptions();
    });
    assert.deepEqual((await visible()).map(s => s.trim()), ['MARIA LÚCIA']);
    await page.locator('#produtor [data-all]').check();
    assert.deepEqual(await page.evaluate(() => controleTeste.values().produtor.sort()), ['ANA', 'MARIA LÚCIA']);
    await page.locator('#produtor [data-all]').uncheck();
    assert.deepEqual(await page.evaluate(() => controleTeste.values()), {});
    await page.evaluate(() => {
      const input = document.querySelector('input[type=search]');
      input.value = ''; input.dispatchEvent(new Event('search'));
    });
    assert.equal((await visible()).length, 2);
    for (const width of [390, 768, 1440]) for (const theme of ['light', 'dark']) {
      await page.setViewportSize({width, height: 900});
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      await search.fill('lucia');
      assert.equal((await visible()).length, 1, `${width}/${theme}`);
      await search.fill('');
      assert.equal((await visible()).length, 2);
    }
    await page.close();

    const details = await browser.newPage();
    const requests = [];
    const errors = [];
    details.on('pageerror', error => errors.push(error.message));
    await details.addInitScript(() => sessionStorage.setItem('granjabi_auth_token', 'fixture-local'));
    await details.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname.endsWith('workers.dev')) {
        requests.push({path: url.pathname, query: Object.fromEntries(url.searchParams)});
        const body = url.pathname.endsWith('/filtros')
          ? {ano: ['2026'], mes: [10], tipo_granja: ['Integrada', 'Própria'], modelo: ['Dark House', 'Convencional'], produtor: ['MARIA LÚCIA'], tecnico: ['JOÃO'], galpao: ['616A']}
          : {arquivo: 'zootecnico.vw_desempenho_acerto_portal', rules_version: 'acerto-iep-mensal-2026-10-16',
             atualizado_em: '2026-10-23T08:00:00-03:00', indicador: {id: 'gmd', nome: 'GPD', valor: 60, unidade: 'g/dia', casas_decimais: 2},
             ranking_tecnicos: [], ranking_produtores: [], evolucao: {meses: [], series: []}};
        return route.fulfill({contentType: 'application/json', body: JSON.stringify(body)});
      }
      if (url.hostname !== 'bi.test') return route.fulfill({status: 404, body: ''});
      const file = path.resolve(root, decodeURIComponent(url.pathname).replace(/^\//, ''));
      assert(file.startsWith(root + path.sep));
      try {
        const body = await fs.readFile(file);
        return route.fulfill({body, contentType: file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'application/javascript'});
      } catch { return route.fulfill({status: 404, body: ''}); }
    });
    await details.goto('http://bi.test/detalhes.html?indicador=gmd&ano=2026&tipo_granja=Integrada&modelo=Dark+House');
    await details.waitForFunction(() => document.querySelector('#modelo .checkbox-multiselect-label')?.textContent === 'Dark House');
    await details.waitForFunction(() => !document.querySelector('#dashboardAtualizando')?.classList.contains('hidden') === false);
    assert.equal(await details.locator('#tipoGranja .checkbox-multiselect-label').innerText(), 'Integrada');
    assert(requests.some(r => r.path.endsWith('/detalhes') && r.query.tipo_granja === 'Integrada' && r.query.modelo === 'Dark House'));
    await details.locator('#modelo .checkbox-multiselect-trigger').click();
    await details.locator('#modelo input[value="Dark House"]').uncheck();
    await details.waitForFunction(() => !new URL(location.href).searchParams.has('modelo'));
    assert(requests.some(r => r.path.endsWith('/filtros') && r.query.tipo_granja === 'Integrada' && !r.query.modelo));
    assert(requests.some(r => r.path.endsWith('/detalhes') && r.query.tipo_granja === 'Integrada' && !r.query.modelo));
    await details.locator('#tipoGranja .checkbox-multiselect-trigger').click();
    await details.locator('#tipoGranja input[type=search]').fill('propria');
    assert.equal(await details.locator('#tipoGranja [data-filter-option]:not(.checkbox-option-all):visible').count(), 1);
    await details.locator('#tipoGranja input[value="Própria"]').check();
    await details.locator('#limparFiltrosDetalhes').click();
    await details.waitForFunction(() => !new URL(location.href).searchParams.has('tipo_granja'));
    assert(!new URL(details.url()).searchParams.has('modelo'));
    assert.deepEqual(errors, []);
    await details.close();
    console.log('OK: busca parcial sem acentos/caixa, selecoes preservadas, cascata/re-render, limpar busca, selecionar tudo no contexto completo, 3 larguras/2 temas e filtros editaveis/URL do Detalhamento. Rede e API simuladas.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
