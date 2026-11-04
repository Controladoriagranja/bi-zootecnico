const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
const ctx={window:{},document:{addEventListener(){},getElementById(){return null}},APP_CONFIG:{endpoints:{filtros:'/filtros'}},AbortController,console};
vm.runInNewContext(fs.readFileSync(root+'/assets/js/filters.js','utf8')+'\nthis.FC=FilterController',ctx);
function state(){
  const all={addEventListener(){}}, label={textContent:''};
  return {selected:new Set(),options:[],host:{classList:{remove(){}}},button:{querySelector:()=>label,classList:{toggle(){}},setAttribute(){}},list:{querySelector:()=>all,querySelectorAll:()=>[]}};
}
async function run(){
  let fixed=true, changes=[];
  const c=new ctx.FC({fields:[{apiKey:'status_acerto',id:'status',multi:true}],onChange:p=>changes.push(p),optionsProvider:async()=>({status_acerto:fixed?[]:['Manual','Não Manual'],filtros_fixos:fixed?{status_acerto:['Não Manual']}: {}})});
  const s=state();c.multiState.set('status_acerto',s);
  c.buildMulti=()=>s;
  await c.loadOptions();
  assert.equal(s.button.disabled,true);assert.deepEqual(Array.from(s.selected),['Não Manual']);
  assert.deepEqual(Array.from(c.values().status_acerto),['Não Manual']);
  c.set('status_acerto',['Manual']);assert.deepEqual(Array.from(c.values().status_acerto),['Não Manual']);
  c.clear();assert.deepEqual(Array.from(s.selected),['Não Manual']);assert.equal(s.button.disabled,true);
  // Mesmo quando outro código tenta alterar o estado, o parâmetro efetivo é fixo.
  s.selected=new Set(['Manual']);await c.emitChange();
  assert.deepEqual(Array.from(changes.at(-1).status_acerto),['Não Manual']);
  fixed=false;await c.loadOptions();assert.equal(s.button.disabled,false);
  c.set('status_acerto',['Manual']);assert.deepEqual(Array.from(c.values().status_acerto),['Manual']);
  c.clear();assert.equal(c.values().status_acerto,undefined);
  // Metadado recebido pelo transporte, sem ler claims do token ou nome da conta.
  let header='nao_manual';
  const transport={console,URL,AbortController,DOMException,sessionStorage:{getItem:()=> 'token-simulado'},APP_CONFIG:{API_URL:'https://offline.invalid/api',endpoints:{filtros:'/filtros',desempenho:'/resumo',detalhes:'/detalhes'}},fetch:async()=>({ok:true,status:200,headers:{get:()=>header},json:async()=>({status_acerto:['Não Manual']})})};
  vm.runInNewContext(fs.readFileSync(root+'/assets/js/api.js','utf8')+'\nthis.get=requestApi',transport);
  const restricted=await transport.get('/filtros');assert.deepEqual(Array.from(restricted.filtros_fixos.status_acerto),['Não Manual']);
  header=null;const general=await transport.get('/filtros');assert.equal(Object.keys(general.filtros_fixos).length,0);
  console.log('PASS: seleção obrigatória, trava, limpeza, tentativa Manual, retorno geral/equipe e metadado HTTP.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
