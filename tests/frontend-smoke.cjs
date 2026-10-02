const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const weekly=[7,14,21,28,35].map(idade=>({idade,mortes:10,mortalidade:1,mortalidade_sem_descartes:0.8,descarte_percent:0.2,peso:100*idade}));
const cards={lotes:1,aves:1000,mortes:50,mortalidade:5,peso:2100,peso_atual:3};
const rxpCards={programada:100,real:90,diferenca:-10,registrosComDiferenca:1,difPercent:-10};
const meta={rules_version:'acerto-2026-10-02',arquivo:'zootecnico.vw_desempenho_acerto',atualizado_em:'2026-10-02T12:00:00'};
async function main(){
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const results=[];
  try{
    for(const name of ['index','detalhes','lotes','historico','diferenca-aves-abatidas']){
      const page=await browser.newPage({viewport:{width:1365,height:900}}),errors=[],requests=[];
      let scenario='normal';
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>sessionStorage.setItem('granjabi_auth_token','isolated-synthetic-token'));
      await page.route('**/*',async route=>{
        const u=new URL(route.request().url());
        if(u.hostname.endsWith('workers.dev')){
          requests.push(u.pathname);
          if(scenario==='failure'&&!u.pathname.endsWith('/filtros')){
            await route.fulfill({status:503,contentType:'application/json',body:'{"detail":"internal database failure"}'});return;
          }
          let body;
          if(u.pathname.endsWith('/filtros'))body={ano:['2026'],mes:[10],produtor:['Produtor teste'],tipo_granja:['Integrada'],modelo:['Modelo teste'],tecnico:['Técnico teste'],galpao:['A'],mist_linha:['Pura'],tipo_linhagem:['pura'],periodo_dias:['7']};
          else if(u.pathname.includes('/zootecnico/')){
            const metric={id:'gmd',nome:'GPD',valor:60,unidade:'g/dia',casas_decimais:2};
            body=u.pathname.endsWith('/resumo')?{...meta,anos:[2026],meses:[{numero:10,nome:'outubro'}],indicadores:{gmd:{...metric,por_ano:{2026:Array(12).fill(60)},totais:{2026:60}}}}:{...meta,indicador:metric,ranking_tecnicos:[{nome:'Técnico teste',valor:60}],ranking_produtores:[{nome:'Produtor teste',valor:60}],evolucao:{meses:Array.from({length:12},(_,i)=>({numero:i+1,nome:String(i+1)})),series:[{ano:2026,valores:Array(12).fill(60)}]}};
          }else if(u.pathname.includes('/rxp/')){
            body=u.pathname.endsWith('/resumo')?{...meta,cards:rxpCards,groups:[{unidade:'AVE NOVA',cards:rxpCards}]}:{...meta,cards:rxpCards,pagina:1,total:1,total_paginas:1,dados:[{id:1,fonte:'ave',unidade:'AVE NOVA',produtor:'Produtor teste',tecnico:'Técnico teste',galpao:'A',data:'2026-10-02',lote:'1',programada:100,real:90,difQtdeRxP:-10,difPercent:-10}]};
          }else body={...meta,cards,weekly,groups:[{tipo_granja:'Integrada',produtor:'Produtor teste',linhagem:'COBB',cards,weekly}],galpoes:[{produtor:'Produtor teste',galpao:'A',cards,weekly}],hierarchy:[{campo:'semana',valor:'40',cards,weekly,children:[{campo:'produtor',valor:'Produtor teste',cards,weekly,children:[]}]}]};
          if(scenario==='empty'&&!u.pathname.endsWith('/filtros')){
            if(u.pathname.includes('/zootecnico/')){
              if(body.indicadores){for(const metric of Object.values(body.indicadores)){metric.por_ano={2026:Array(12).fill(null)};metric.totais={2026:null};}}
              else {body.indicador.valor=null;body.ranking_tecnicos=[];body.ranking_produtores=[];body.evolucao.series=[];}
            }else {body.cards=Object.fromEntries(Object.keys(body.cards).map(k=>[k,k==='peso'||k==='peso_atual'||k==='difPercent'||k==='mortalidade'?null:0]));body.groups=[];body.weekly=[];body.galpoes=[];body.hierarchy=[];body.dados=[];body.total=0;}
          }
          await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});return;
        }
        const relative=decodeURIComponent(u.pathname).replace(/^\//,'');
        try{const file=path.resolve(root,relative||'index.html');if(!file.startsWith(root+path.sep))throw Error('path');const content=await fs.readFile(file);const ext=path.extname(file);await route.fulfill({body:content,contentType:ext==='.html'?'text/html':ext==='.js'?'application/javascript':ext==='.css'?'text/css':undefined});}catch{await route.fulfill({status:404,body:''});}
      });
      await page.goto(`http://bi.test/${name}.html`);
      await page.waitForFunction(name=>name==='historico'
        ? document.querySelector('#historyKpis strong')?.textContent==='1'
        : document.body.innerText.includes('Produtor teste')||document.body.innerText.includes('60,00')||document.body.innerText.includes('AVE NOVA'),name);
      if(name==='lotes'){await page.locator('#tabGalpoes').click();await page.locator('[data-barn]').first().click();assert(await page.locator('#galpaoDrawer').isVisible());}
      if(name==='historico'){await page.locator('[data-history-node]').first().click();assert((await page.locator('#historyTableBody').innerText()).includes('Produtor teste'));}
      if(name==='diferenca-aves-abatidas'){await page.locator('[data-rxp-unit]').first().click();await page.locator('#tabelaProdutoresAbate').getByText('Produtor teste').waitFor();}
      assert.deepEqual(errors,[],name+': '+errors.join('; '));
      assert(requests.some(p=>p.endsWith(name==='detalhes'?'/detalhes':'/resumo')),name);
      const out=path.join(root,'tests','frontend-previews');await fs.mkdir(out,{recursive:true});await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
      if(name==='lotes'){await page.locator('#galpaoDrawerFechar').click();await page.locator('#tabProdutores').click();}
      if(name==='diferenca-aves-abatidas')await page.locator('#modalAbateFechar').click();
      const clearId={index:'limparFiltros',detalhes:'limparFiltrosDetalhes',lotes:'limparFiltrosLotes',historico:'limparFiltrosHistorico','diferenca-aves-abatidas':'limparFiltrosAbate'}[name];
      const errorId={index:'mensagemErro',detalhes:'mensagemErro',lotes:'mensagemErroLotes',historico:'mensagemErroHistorico','diferenca-aves-abatidas':'erroRxp'}[name];
      scenario='failure';await page.locator('#'+clearId).click();await page.locator('#'+errorId).waitFor({state:'visible'});
      assert(!(await page.locator('#'+errorId).innerText()).includes('internal database failure'));
      if(name==='index')assert(!(await page.locator('#indicadores').isVisible()));
      if(name==='detalhes')assert.equal(await page.locator('#kpiValor').innerText(),'—');
      if(name==='lotes')assert.equal(await page.locator('#cardsLotes .lotes-reference-value').first().innerText(),'—');
      if(name==='historico')assert.equal(await page.locator('#historyKpis strong').first().innerText(),'—');
      if(name==='diferenca-aves-abatidas')assert.equal(await page.locator('#kpiProgramada').innerText(),'—');
      scenario='empty';await page.locator('#'+clearId).click();
      await page.locator('#'+errorId).waitFor({state:'hidden'});
      if(['lotes','historico','diferenca-aves-abatidas'].includes(name))await page.getByText(/Nenhum (lote|registro) para os filtros/).waitFor();
      else if(name==='index')await page.locator('#indicadores').waitFor({state:'visible'});
      else await page.locator('#dashboardAtualizando').waitFor({state:'hidden'});
      assert.deepEqual(errors,[],name);
      results.push({page:name,requests:requests.length,errors,apiFailureClearsValues:true,emptyResponse:true});await page.close();
    }
  }finally{await browser.close();}
  console.log(JSON.stringify(results,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
