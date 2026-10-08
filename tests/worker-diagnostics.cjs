const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../outputs/worker-diagnostico/worker.js'),'utf8').replace('export default','globalThis.worker =');
async function run(mode){
  const logs=[];let calls=0;
  const scope={URL,Headers,Request,Response,TextEncoder,btoa,Date,console:{error:item=>logs.push(item)},
    fetch:async()=>new Response(JSON.stringify({ok:true,user:{email:'synthetic@example.test'}}),{status:200})};
  vm.createContext(scope);vm.runInContext(code,scope);
  const env={API_USER:'synthetic-user',API_PASSWORD:'synthetic-password',PRIVATE_API:{fetch:async req=>{
    calls++;assert.equal(new URL(req.url).pathname,'/api/bi/zootecnico/filtros');
    assert.equal(req.headers.get('Origin'),null);assert.equal(req.headers.get('Authorization'),'Basic '+btoa('synthetic-user:synthetic-password'));
    if(mode==='throw')throw Object.assign(new Error('synthetic VPC failure'),{code:'TEST_VPC'});
    return new Response(mode==='upstream'?'unavailable':'{"ok":true}',{status:mode==='upstream'?503:200});
  }}};
  const request=new Request('https://example.test/api/bi/zootecnico/filtros',{headers:{Origin:'https://controladoriagranja.github.io',Authorization:'Bearer synthetic-token','cf-ray':'test-ray'}});
  const response=await scope.worker.fetch(request,env);
  assert.equal(calls,1);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://controladoriagranja.github.io');
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert(!JSON.stringify(logs).includes('synthetic-password'));assert(!JSON.stringify(logs).includes('synthetic-token'));
  if(mode==='throw'){
    assert.equal(response.status,502);assert.deepEqual(await response.json(),{detail:'API interna indisponível'});
    assert.equal(logs[0].event,'private_api_fetch_failed');assert.equal(logs[0].error_code,'TEST_VPC');assert.equal(logs[0].binding_available,true);
  }else if(mode==='upstream'){assert.equal(response.status,503);assert.equal(logs[0].event,'private_api_upstream_error');}
  else{assert.equal(response.status,200);assert.equal(logs.length,0);}
}
(async()=>{for(const mode of ['ok','throw','upstream'])await run(mode);console.log('Worker: sucesso, falha VPC, erro upstream, autenticação e CORS conferidos.');})().catch(error=>{console.error(error);process.exitCode=1;});
