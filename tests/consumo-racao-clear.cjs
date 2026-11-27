const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/js/consumo-racao.js'),'utf8');
const start=source.indexOf("E('limparFeedFiltros').onclick=")+"E('limparFeedFiltros').onclick=".length;
const end=source.indexOf("\n  for(const id of ['feedStart'",start);
const controls={feedStart:{value:'2026-11-20'},feedEnd:{value:'2026-11-21'}};
let phase='fase_final',cleared=false,rendered=false,emitted=false;
const context={snapshot:{period:{inicio:'2026-10-13',fim:'2026-11-26'}},E:id=>controls[id],
filters:{clear(){cleared=true;},async loadOptions(options){assert.equal(options.preserve,false);}},
FeedPhase:{set(value){phase=value;emitted=true;}},async render(){assert.equal(phase,'consumo_total');rendered=true;},fail(error){throw error;}};
const handler=vm.runInNewContext('('+source.slice(start,end).trim().replace(/;$/,'')+')',context);
handler().then(()=>{assert.equal(cleared,true);assert.equal(rendered,true);assert.equal(emitted,true);assert.equal(controls.feedStart.value,'2026-10-13');assert.equal(controls.feedEnd.value,'2026-11-26');console.log('PASS: actual Clear filters handler resets selected phase to Total, resets dates and rerenders.');}).catch(error=>{console.error(error);process.exitCode=1;});
