const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
 try {
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}});
   await page.route('https://fixture.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><main id="indicadores"><a href="detalhes.html?indicador=ca&ano=2026&mes=11">Detalhes</a></main>'}));
   await page.goto('https://fixture.test/index.html');
   await page.addStyleTag({content:await fs.readFile(path.join(root,'assets/css/indicator-subreport.css'),'utf8')});
   await page.addScriptTag({content:await fs.readFile(path.join(root,'assets/js/indicator-subreport.js'),'utf8')});
   await page.locator('a').click();
   const dialog=page.locator('.indicator-subreport');
   assert.deepEqual(await dialog.locator('.subreport-actions button').allTextContents(),['Voltar à tela de Desempenho','Maximizar']);
   assert((await dialog.locator('iframe').getAttribute('src')).includes('ano=2026&mes=11'));
   await dialog.locator('.subreport-maximize').click();
   assert.equal(await dialog.locator('.subreport-maximize').textContent(),'Voltar');
   assert(await dialog.evaluate(d=>d.classList.contains('subreport-maximized')));
   await dialog.locator('.subreport-maximize').click();
   assert.equal(await dialog.locator('.subreport-maximize').textContent(),'Maximizar');
   await dialog.locator('.subreport-back').click();assert.equal(await dialog.evaluate(d=>d.open),false);
   await page.evaluate(()=>{
    const cond=document.createElement('dialog');cond.className='cg-cond-dialog';cond.innerHTML='<div class="cg-cond-actions"><button class="cg-cond-back">Voltar ao resumo</button><button class="cg-cond-close">Fechar</button></div>';document.body.append(cond);cond.showModal();
   });
   const buttons=page.locator('.cg-cond-actions button');
   await page.waitForFunction(()=>document.querySelector('.cg-cond-actions .subreport-maximize'));
   assert.deepEqual(await buttons.allTextContents(),['Voltar ao resumo','Voltar à tela de Desempenho','Maximizar']);
   await page.locator('.cg-cond-actions .subreport-maximize').click();
   assert.equal(await page.locator('.cg-cond-actions .subreport-maximize').textContent(),'Voltar');
   console.log(`PASS controles ${width}px: ordem, nomes, maximizar/restaurar, retorno e parametros`);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
