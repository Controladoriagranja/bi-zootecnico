/* Navegador real, componentes reais e API simulada; nao consulta producao.
   node tests/condenacoes-drilldown-browser.cjs [caminho-do-projeto] */
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const supplier = 'Y, José & Filhos';
const technician = 'Técnico A';
const cause = 'X / contaminação';
const capturedRequests = [];

async function suite(browser, width) {
  const page = await browser.newPage({viewport: {width, height: 900}});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.setContent('<!doctype html><body'+(path.basename(root).toLowerCase()==='bi-pcp'?' class="pcp-report"':'')+'></body>');
    await page.addStyleTag({content: await fs.readFile(path.join(root, 'assets/css/app.css'), 'utf8')});
    const condCss = path.join(root, 'assets/css/condenacoes-card.css');
    const css = await fs.readFile(condCss, 'utf8').catch(() => fs.readFile(path.join(root, 'assets/css/pcp.css'), 'utf8'));
    await page.addStyleTag({content: css});
    await page.addStyleTag({content: await fs.readFile(path.join(root, 'assets/css/pcp-condenacoes-period.css'), 'utf8')});
    await page.evaluate(() => {
      window.APP_CONFIG = {endpoints: {filtros: '/unused'}};
      window.ApiScreen = {escape: v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]))};
    });
    for (const file of ['filters.js', 'pcp-multiselect.js', 'pcp-table-sort.js', 'pcp-condenacoes-period.js', 'pcp-condenacoes.js']) {
      await page.addScriptTag({content: await fs.readFile(path.join(root, 'assets/js', file), 'utf8')});
    }
    await page.evaluate(({supplier, technician, cause}) => {
      window.calls = [];
      window.empty = false;
      window.omitOptions = false;
      window.delay = false;
      window.pendingResponses = [];
      const data = [
        {grupo:'Grupo A', causa:cause, tipo:'Parcial', fornecedor:supplier, tecnico:technician, kg:5},
        {grupo:'Grupo A', causa:cause, tipo:'Total', fornecedor:supplier, tecnico:technician, kg:7},
        {grupo:'Grupo A', causa:'Outra', tipo:'Parcial', fornecedor:supplier, tecnico:technician, kg:20},
        {grupo:'Grupo A', causa:cause, tipo:'Parcial', fornecedor:'Z', tecnico:technician, kg:9},
        {grupo:'Grupo A', causa:cause, tipo:'Total', fornecedor:'Z', tecnico:technician, kg:11},
        {grupo:'Grupo B', causa:'Outra B', tipo:'Total', fornecedor:'Z', tecnico:'Outro', kg:30}
      ];
      window.report = PcpCondenacoes.create(async (_, q) => {
        calls.push(structuredClone(q));
        const filter = (key, value) => !q[key] || JSON.parse(q[key]).includes(value);
        const rows = empty ? [] : data.filter(d => filter('fornecedores', d.fornecedor) && filter('tecnicos', d.tecnico));
        // Reproduz a API atual: esse modo antigo ignora causa e tipo.
        const details = rows.filter(d => q.fornecedor_detalhado || ((!q.causa || d.causa === q.causa) && (!q.tipo || d.tipo === q.tipo)));
        const summary = new Map();
        for (const d of rows) {
          const key=JSON.stringify([d.grupo,d.causa,d.tipo]);
          const entry=summary.get(key)||{grupo:d.grupo,causa:d.causa,tipo:d.tipo,kg:0};
          entry.kg+=d.kg; summary.set(key,entry);
        }
        const result = {
          ok:true, meses:['2026-11'], peso_vivo_kg:1000,
          totais_mensais:{'2026-11':{peso_vivo_kg:1000}},
          opcoes_tecnicos:omitOptions ? [] : [technician,'Outro'],
          opcoes_fornecedores:omitOptions ? [] : [supplier,'Z'],
          resumo:[...summary.values()].map(d => ({...d, meses:{'2026-11':{kg:d.kg}}})),
          detalhes:details.map((d,i) => ({...d, empresa:'AN', granja:'Granja', galpao:'1', lote:String(i), data:'2026-11-10', datas:'10/11/2026', turno:'1', turnos:'1', condenacao:d.causa, peso_total:d.kg, peso_pesagem:1000, percentual:d.kg/1000})),
          total_detalhes:details.length * 3
        };
        if (delay) return new Promise(resolve => pendingResponses.push(() => resolve(result)));
        return result;
      });
      report.open({ano:'2026', mes:'11', dias:'2026-11-10', visao:'10'});
    }, {supplier, technician, cause});
    const idle = () => page.waitForFunction(() => document.querySelector('dialog').getAttribute('aria-busy') === 'false');
    const change = async (id, values) => {
      await page.evaluate(({id, values}) => {
        const select = document.getElementById(id);
        select.value = values.map(encodeURIComponent).join(',');
        select.dispatchEvent(new Event('change', {bubbles:true}));
      }, {id, values});
      await idle();
    };
    const last = () => page.evaluate(() => calls.at(-1));
    const assertContext = async (expectedSupplier = [supplier], type = 'Parcial') => {
      const q = await last();
      assert.equal(q.fornecedor_detalhado, undefined, 'Usar apenas o caminho compativel da API atual');
      assert.equal(q.causa, cause); assert.equal(q.tipo, type);
      assert.deepEqual(JSON.parse(q.fornecedores), expectedSupplier);
      assert.deepEqual(JSON.parse(q.tecnicos), [technician]);
      assert.equal(q.ano, '2026'); assert.equal(q.mes, '11');
      assert.equal(q.dias, '2026-11-10'); assert.equal(q.visao, '10');
      return q;
    };
    await idle();
    const toolbarLabels='.cg-cond-toolbar :is(.cg-cond-period,.cg-cond-view-filter,.cg-cond-filters)>label';
    const labels=await page.locator(toolbarLabels).evaluateAll(labels=>labels.map(label=>label.firstChild.textContent.trim()));
    assert.deepEqual(labels,['Ano','Mês','Semana','Visão','Grupo','Condenação','Técnico','Fornecedor']);
    const tops=await page.locator(toolbarLabels).evaluateAll(labels=>labels.map(label=>Math.round(label.getBoundingClientRect().top)));
    assert.equal(new Set(tops).size,1,'Todos os filtros na mesma linha');
    if(width<768) assert(await page.locator('.cg-cond-toolbar').evaluate(t=>t.scrollWidth>t.clientWidth));
    if(process.env.CONDENACOES_PREVIEW_DIR) {
      await fs.mkdir(process.env.CONDENACOES_PREVIEW_DIR,{recursive:true});
      await page.screenshot({path:path.join(process.env.CONDENACOES_PREVIEW_DIR,path.basename(root)+'-'+width+'.png')});
    }
    await change('cgCondGrupo', ['Grupo A']);
    await change('cgCondCausa', [cause]);
    await change('cgCondTecnico', [technician]);
    await change('cgCondFornecedor', [supplier, 'Z']);
    await page.locator('.cg-cond-summary tbody button').first().click(); await idle();
    // Mesma causa possui Total e Parcial: selecionar explicitamente Parcial.
    await page.locator('.cg-cond-summary tbody tr').filter({hasText:'Parcial'}).locator('button').click(); await idle();
    await assertContext([supplier, 'Z']);
    await page.locator('.cg-cond-rows .pcp-sort-button').nth(6).click(); await idle();
    assert.equal((await assertContext([supplier, 'Z'])).ordenar, 'peso_total');
    await page.evaluate(() => document.querySelector('.cg-cond-rows').dispatchEvent(new Event('scroll')));
    await page.waitForFunction(() => calls.at(-1).pagina >= 2);
    const parentPage = (await last()).pagina;
    await page.locator('.cg-cond-rows tbody button').filter({hasText:supplier}).first().click(); await idle();
    const leaf = await assertContext();
    assert.equal(leaf.fornecedor_detalhado, undefined);
    assert.equal(leaf.agrupado, path.basename(root).toLowerCase() !== 'bi-pcp');
    assert((await page.locator('.cg-cond-detail h3').textContent()).includes(cause));
    assert(!(await page.locator('.cg-cond-detail h3').textContent()).includes('Todas as condenações'));
    assert((await page.locator('.cg-cond-rows tbody tr').count()) >= 1);
    assert.deepEqual(await page.locator('.cg-cond-rows tbody tr').evaluateAll(rows => [...new Set(rows.map(r => r.cells[10].textContent))]), [cause]);
    // API sem opcoes nao deve remover selecoes ativas nem ampliar consulta seguinte.
    await page.evaluate(() => { omitOptions = true; });
    await page.locator('.cg-cond-rows .pcp-sort-button').nth(14).click(); await idle();
    assert.equal((await assertContext()).ordenar, 'peso_total');
    const selections = await page.evaluate(() => Object.fromEntries(['cgCondCausa','cgCondFornecedor','cgCondTecnico'].map(id => [id,document.getElementById(id).value])));
    assert.equal(decodeURIComponent(selections.cgCondCausa), cause);
    assert.equal(selections.cgCondFornecedor, [supplier,'Z'].map(encodeURIComponent).join(','));
    assert.equal(decodeURIComponent(selections.cgCondTecnico), technician);
    await page.evaluate(() => document.querySelector('.cg-cond-rows').dispatchEvent(new Event('scroll')));
    await page.waitForFunction(() => calls.at(-1).pagina >= 2);
    await assertContext();
    await page.locator('.cg-cond-back').click(); await idle();
    const back = await assertContext([supplier,'Z']);
    assert.equal(back.fornecedor_detalhado, undefined); assert.equal(back.ordenar, 'peso_total');
    await page.waitForFunction(target => calls.at(-1).pagina >= target, parentPage);
    // Trocar filtro no nivel mais profundo volta a lista e aplica o novo fornecedor.
    await page.locator('.cg-cond-rows tbody button').filter({hasText:supplier}).first().click(); await idle();
    await change('cgCondFornecedor', ['Z']);
    assert.equal((await assertContext(['Z'])).fornecedor_detalhado, undefined);
    assert((await page.locator('.cg-cond-rows tbody tr').count()) >= 1);
    // Resultado vazio conserva a selecao, inclusive causa/grupo ausentes da resposta.
    await page.evaluate(() => { empty = true; });
    await change('cgCondTecnico', [technician]);
    await assertContext(['Z']);
    assert.equal(await page.locator('.cg-cond-rows tbody tr').count(), 0);
    assert.equal(await page.evaluate(() => decodeURIComponent(document.getElementById('cgCondCausa').value)), cause);
    await page.evaluate(() => { empty = false; });
    await change('cgCondTecnico', [technician]);
    // Fechar/reabrir o mesmo contexto mantem filtros e condenacao.
    await page.locator('.cg-cond-close').click();
    await page.waitForFunction(() => !document.querySelector('dialog').open);
    await page.evaluate(() => report.open({ano:'2026',mes:'11',dias:'2026-11-10',visao:'10'})); await idle();
    await assertContext(['Z']);
    // Resposta antiga nao deve substituir o resultado de um filtro mais recente.
    await page.evaluate(({supplier}) => {
      delay = true;
      for (const value of [supplier,'Z']) {
        const s=document.getElementById('cgCondFornecedor'); s.value=encodeURIComponent(value); s.dispatchEvent(new Event('change'));
      }
      pendingResponses[1]();
    }, {supplier}); await idle();
    await page.evaluate(() => { pendingResponses[0](); delay=false; });
    await assertContext(['Z']);
    assert.equal(await page.locator('.cg-cond-rows tbody button').first().textContent(), 'Z');
    await page.locator('.cg-cond-back').click(); await idle();
    await page.locator('.cg-cond-summary tbody tr').filter({hasText:'Total'}).locator('button').click(); await idle();
    await assertContext(['Z'], 'Total');
    await page.locator('.cg-cond-rows tbody button').first().click(); await idle();
    await assertContext(['Z'], 'Total');
    // Periodo muda sem perder causa/tipo, fornecedor e tecnico no drill-down.
    await change('cgCondAno',['2026']); await change('cgCondMes',['11']);
    await page.locator('#cgCondSemana').selectOption('2026-11-09'); await idle();
    let period=await last();
    assert.equal(period.dias,'2026-11-09,2026-11-10,2026-11-11,2026-11-12,2026-11-13,2026-11-14,2026-11-15');
    assert.equal(period.causa,cause); assert.equal(period.tipo,'Total');
    assert.deepEqual(JSON.parse(period.fornecedores),['Z']); assert.deepEqual(JSON.parse(period.tecnicos),[technician]);
    await page.locator('.cg-cond-rows .pcp-sort-button').nth(14).click(); await idle();
    assert.equal((await last()).dias,period.dias);
    await page.locator('.cg-cond-back').click(); await idle();
    assert.equal((await last()).dias,period.dias);
    await change('cgCondMes',['10','11']);
    await page.locator('#cgCondSemana').selectOption('2026-10-26'); await idle();
    assert.equal((await last()).dias,'2026-10-26,2026-10-27,2026-10-28,2026-10-29,2026-10-30,2026-10-31,2026-11-01');
    await change('cgCondMes',['11']);
    assert.equal((await last()).dias,'2026-11-01','Semana limitada aos meses selecionados');
    await change('cgCondAno',['2024']); await change('cgCondMes',['2']);
    await page.locator('#cgCondSemana').selectOption('2024-02-26'); await idle();
    assert.equal((await last()).dias,'2024-02-26,2024-02-27,2024-02-28,2024-02-29');
    await change('cgCondAno',['2020','2021']); await change('cgCondMes',['12','1']);
    await page.locator('#cgCondSemana').selectOption('2020-12-28'); await idle();
    assert((await page.locator('#cgCondSemana option:checked').textContent()).startsWith('Semana 53'));
    assert.equal((await last()).dias,'2020-12-28,2020-12-29,2020-12-30,2020-12-31,2021-01-01,2021-01-02,2021-01-03');
    await page.locator('#cgCondSemana').selectOption(''); await idle();
    assert.equal((await last()).dias,undefined);
    // Menus continuam clicaveis dentro da subtela mesmo com a faixa deslocada.
    for(const id of ['cgCondAno','cgCondFornecedor']) {
      const trigger=page.locator('#'+id+'Multi .checkbox-multiselect-trigger');
      await trigger.click();
      const panel=page.locator('#'+id+'Multi .checkbox-multiselect-panel');
      assert(await panel.isVisible());
      const bounds=await panel.boundingBox(),dialogBounds=await page.locator('dialog').boundingBox();
      assert(bounds.x>=dialogBounds.x&&bounds.x+bounds.width<=dialogBounds.x+dialogBounds.width+1,JSON.stringify({id,bounds,dialogBounds}));
      await panel.locator('input[type=search]').fill(id==='cgCondAno'?'2026':'Z');
      assert(await panel.locator('[data-filter-option]:visible').count()>0);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('dialog').evaluate(d=>d.open),true);
      assert.equal(await panel.isVisible(),false);
    }
    // Novo periodo inicia contexto limpo, sem herdar condenacao de outro periodo.
    await page.evaluate(() => report.open({ano:'2025',mes:'10',visao:'111'})); await idle();
    const fresh=await last(); assert.equal(fresh.ano,'2025'); assert.equal(fresh.visao,'111');
    assert.equal(fresh.causa,undefined); assert.equal(fresh.fornecedores,undefined); assert.equal(fresh.tecnicos,undefined);
    assert.deepEqual(errors, []);
    capturedRequests.push(...await page.evaluate(() => calls));
    console.log(`PASS ${path.basename(root)} ${width}px: filtros, drill-down, ano/mes/semana, limites de mes/ano, ano bissexto, uma linha e menus dentro da subtela`);
  } finally { await page.close(); }
}
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', args:['--no-sandbox']});
  try {
    for (const width of [1440,390]) await suite(browser,width);
    if(process.env.CONDENACOES_REQUESTS_FILE) await fs.writeFile(process.env.CONDENACOES_REQUESTS_FILE,JSON.stringify(capturedRequests,null,2));
  }
  finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
