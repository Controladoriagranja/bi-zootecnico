const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try{
    const page=await browser.newPage(),errors=[],calls=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>sessionStorage.setItem('granjabi_auth_token','synthetic-token'));
    let fail=false;
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.hostname.endsWith('workers.dev')){
        calls.push(url.pathname);
        return route.fulfill({status:fail?502:200,contentType:'application/json',body:JSON.stringify({atualizado_em:'2026-10-20T08:04:52-03:00',atualizacao_dados:{fontes:[{tabela:'zootecnico.mortalidade_peso_abertos',coluna:'carregado_em',carregado_em:'2026-10-20T08:04:52-03:00'}]}})});
      }
      try{
        const file=path.join(root,decodeURIComponent(url.pathname));
        const ext=path.extname(file);
        return route.fulfill({body:await fs.readFile(file),contentType:ext==='.js'?'application/javascript':ext==='.css'?'text/css':ext==='.html'?'text/html':undefined});
      }catch{return route.fulfill({status:404,body:''});}
    });
    await page.goto('http://bi.test/formulas.html');
    await page.waitForFunction(()=>document.querySelector('#ultimaAtualizacao')?.textContent==='20/10/2026 08:04');
    assert.deepEqual(calls,['/api/bi/formulas/atualizacao']);
    assert((await page.locator('#ultimaAtualizacao').getAttribute('title')).includes('mortalidade_peso_abertos'));
    fail=true;await page.reload();
    await page.waitForFunction(()=>document.querySelector('#ultimaAtualizacao')?.title.includes('Não foi possível'));
    assert.equal(await page.locator('#ultimaAtualizacao').innerText(),'—');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({page:'formulas',physicalLoad:true,metadataOnly:true,errorShowsDash:true,errors}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
