const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const sandbox={window:{},document:{body:{dataset:{page:'formulas'}},querySelector(){return null;},getElementById(){return null;}},location:{pathname:'/formulas.html',search:''},URLSearchParams};vm.createContext(sandbox);
const source=fs.readFileSync('assets/js/formulas-registry.js','utf8');vm.runInContext(source,sandbox);const R=sandbox.window.FormulaRegistry;
test('registro único tem IDs estáveis, descrição padrão, passos, colunas reais e regras destacadas',()=>{
 assert.equal(R.entries.size,40);
 for(const [id,entry] of R.entries){assert.equal(id,entry.id);assert.ok(entry.title&&entry.formula);assert.equal(entry.description,'Cálculo aplicado aos componentes no contexto selecionado.');assert.ok(entry.steps.length&&entry.rules.length);for(const column of entry.columns)assert.match(column,/^[a-z0-9_]+\.[a-z0-9_]+$/);}
});
test('regras comprovadas não substituem ponderações por média simples nem alteram Vazio',()=>{
 assert.match(R.get('desempenho.vazio').formula,/BETWEEN 7 AND 20/);assert.match(R.get('desempenho.vazio').formula,/ELSE 14/);assert.match(R.get('desempenho.vazio').formula,/qt_aves/);
 assert.match(R.get('gpd.14').formula,/MEAN válido por lote/);assert.match(R.get('gpd.14').formula,/peso_14_dias − peso_7_dias/);
 assert.match(R.get('rxp.diferenca').rules.join(' '),/nunca substituir por Real − Programada/);
 assert.equal(R.get('rxp.diferenca').apiRule,'');assert.ok(R.get('desempenho.vazio').apiRule.includes('keep_between_inclusive'));
});
test('trechos públicos contêm somente lógica e não conexões ou endereços',()=>{
 assert.doesNotMatch(source,/https?:\/\/|192\.168\.|DATABASE_URL|API_PASSWORD|password\s*[:=]|senha\s*[:=]|[A-Z]:\\\\|\/var\/|\/home\//i);
});
test('fábrica de Lotes preserva semanas selecionadas e recebe a meta atual da API',()=>{
 R.updateLots([7,14],true);const item=R.get('lotes.mortalidade_semanal');assert.match(item.formula,/14 dias/);assert.doesNotMatch(item.formula,/35 dias/);assert.doesNotMatch(item.rules.join(' '),/meta fixa de 1%/);
});
