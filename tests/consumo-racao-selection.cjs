const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const changes=[],ctx={document:{dispatchEvent:event=>changes.push(event.detail.phase)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}}};ctx.window=ctx;vm.createContext(ctx);
for(const file of ['data','selection','stacked'])vm.runInContext(fs.readFileSync(path.join(__dirname,`../assets/js/consumo-racao-${file}.js`),'utf8'),ctx);
const S=ctx.FeedPhase,columns=[{key:'data'},{key:'consumo_total'},{key:'consumo_ave'},...ctx.ConsumoRacaoData.phases.map(p=>({key:p.key,phase:p.key}))];
assert.equal(S.get(),'consumo_total');assert.deepEqual(Array.from(S.columns(columns),c=>c.key),['data','consumo_total','consumo_ave']);
for(const phase of ctx.ConsumoRacaoData.phases){S.set(phase.key);assert.equal(S.get(),phase.key);assert.deepEqual(Array.from(S.columns(columns),c=>c.key),['data',phase.key]);}
S.set('invalid');assert.equal(changes.length,4);S.set('consumo_total');assert.equal(changes.at(-1),'consumo_total');
const partial={data:'2026-11-02',qtde_aves:100,consumo_total:null,fase_pre_menos_inicial:22,fase_inicial:null,fase_crescimento:200,fase_final:180};
const periods=ctx.ConsumoRacaoStacked.periods([partial],'dia','perBird','fase_pre_menos_inicial');
assert.equal(periods.length,1);assert.equal(periods[0].total,.22);
assert.equal(ctx.ConsumoRacaoStacked.periods([partial],'dia','total','consumo_total').length,0);
const html=fs.readFileSync(path.join(__dirname,'../consumo-medio-racao.html'),'utf8'),main=fs.readFileSync(path.join(__dirname,'../assets/js/consumo-racao.js'),'utf8');
assert.ok(!html.includes('feedLineageTable'));assert.ok(!main.includes('renderLineages'));
assert.match(main,/metric='total'/);assert.match(html,/data-ranking-phase="consumo_total" aria-pressed="true"/);
assert.match(main,/phaseChart\.on\('click'/);assert.match(main,/phaseChart\.on\('legendselectchanged'/);
console.log('PASS: shared Total default, phase events, filtered detail columns, isolated phase aggregation, chart hooks and lineage removal.');
