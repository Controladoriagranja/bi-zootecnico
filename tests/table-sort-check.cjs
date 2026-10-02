const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent('<table><thead><tr><th>Produtor</th><th class="num">Valor</th></tr></thead><tbody><tr data-sort-depth="0"><td>B</td><td class="num">1.200,50</td></tr><tr data-sort-depth="1"><td>Filho B</td><td class="num">10,00</td></tr><tr data-sort-depth="0"><td>A</td><td class="num">-20,00</td></tr><tr data-sort-depth="1"><td>Filho A</td><td class="num">2,00</td></tr><tr data-sort-depth="0"><td>C</td><td class="num">—</td></tr></tbody><tfoot><tr><td>Total</td><td>1.180,50</td></tr></tfoot></table>');
  await page.addScriptTag({content:await fs.readFile(path.join(__dirname,'../assets/js/table-sort.js'),'utf8')});
  await page.getByRole('button',{name:'Valor'}).click();
  const labels=()=>page.locator('tbody tr td:first-child').allTextContents();
  assert.deepEqual(await labels(),['A','Filho A','B','Filho B','C']);
  assert.equal(await page.locator('th').nth(1).getAttribute('aria-sort'),'ascending');
  await page.getByRole('button',{name:'Valor'}).click();
  assert.deepEqual(await labels(),['B','Filho B','A','Filho A','C']);
  assert.equal(await page.locator('tfoot').innerText(),'Total\t1.180,50');
  await page.evaluate(()=>document.querySelector('tbody').innerHTML='<tr><td>Z</td><td class="num">1,00</td></tr><tr><td>X</td><td class="num">3,00</td></tr>');
  await page.waitForFunction(()=>document.querySelector('tbody td').textContent==='X');
  await page.getByRole('button',{name:'Produtor'}).focus();await page.keyboard.press('Enter');
  assert.deepEqual(await labels(),['X','Z']);
  console.log('Ordenação: números PT-BR, negativos, nulos, hierarquia, totais, atualização e teclado passaram.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
