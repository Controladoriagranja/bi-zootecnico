const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ctx={};ctx.window=ctx;vm.createContext(ctx);
for(const file of ['data','metas','selection','ranking'])vm.runInContext(fs.readFileSync(path.join(root,`assets/js/consumo-racao-${file}.js`),'utf8'),ctx);
const M=ctx.ConsumoRacaoMetas,R=ctx.ConsumoRacaoRanking;
const total=(rows,metas,integrated=null)=>R.aggregate(rows,metas,integrated,'consumo_total');
const metas=Object.values(M.mapping).flat().map(code=>({code,date:'2026-01-01',value:1}));
const row=(codigo,galpao,birds,total,date='2026-11-01')=>({codigo,integrado:`Integrado ${codigo}`,galpao,qtde_aves:birds,consumo_total:total,fase_pre_menos_inicial:total===null?null:total/5,fase_inicial:total===null?null:total/5,fase_crescimento:total===null?null:total*2/5,fase_final:total===null?null:total/5,data:date});
const rows=[row('A','1',10,60),row('A','2',90,405),row('B','1',20,110),row('A','3',0,100),row('A','4',20,null),row('C','1',10,50,'2025-01-01')];
const all=total(rows,metas);
assert.equal(all.excluded,3);assert.equal(all.groups.length,2);
const a=all.groups.find(g=>g.key==='A'),b=all.groups.find(g=>g.key==='B');
assert.equal(a.actual,465);assert.equal(a.expected,500);assert.equal(a.birds,100);
assert.equal(a.kgPerBird,-.35);assert.equal(a.tonnes,-.035);assert.equal(b.kgPerBird,.5);
assert.notEqual(a.kgPerBird,(1-.5)/2); // ratio of sums, not simple average
const drill=total(rows,metas,'A');assert.equal(drill.groups.length,2);assert.equal(drill.excluded,2);
assert.equal(drill.groups.find(g=>g.key==='1').actual,60); // B's same galpao must not enter A
assert.ok(Math.abs(drill.groups.reduce((s,g)=>s+g.tonnes,0)-a.tonnes)<1e-12);
assert.equal(total(rows,[]).groups.length,0);
const newer=metas.concat(metas.map(m=>({...m,date:'2026-11-01',value:2})));
assert.equal(total([row('D','1',10,100)],newer).groups[0].expected,100);
console.log('PASS: signed deviations, weighted base, tonnes, drilldown isolation, missing inputs and effective targets.');

// Exercise the real UI handlers with a minimal DOM/chart adapter, without network calls.
const events={},elements=new Map(),clicks={},zr={};let option;
function el(id){if(!elements.has(id))elements.set(id,{style:{},hidden:false,textContent:'',dataset:{},replaceChildren(...items){this.children=items;},setAttribute(){},contains(target){return target.inside===true;}});return elements.get(id);}
const phases=['fase_pre_menos_inicial','fase_inicial','fase_crescimento','fase_final','consumo_total'].map(value=>({...el('phase-'+value),dataset:{rankingPhase:value}}));
el('feedRanking').querySelectorAll=()=>phases;
el('feedRanking').querySelector=()=>el('ranking-scroll');
const chart={convertToPixel(){return 220;},resize(){},clear(){option=null;},setOption(value){option=value;},off(){},on(name,fn){clicks[name]=fn;},getZr(){return {off(){},on(name,fn){zr[name]=fn;}};}};
Object.assign(ctx,{document:{body:{},getElementById:el,querySelector:()=>null,dispatchEvent:event=>events[event.type]?.(event),addEventListener:(name,fn)=>events[name]=fn},
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},Option:function(label,value){this.label=label;this.value=value;},getComputedStyle:()=>({fontFamily:'sans-serif',getPropertyValue:()=> '#B36B00'}),
  matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}},echarts:{init:()=>chart}});
vm.runInContext(fs.readFileSync(path.join(root,'assets/js/consumo-racao-ranking.js'),'utf8'),ctx);
const supply=()=>events['feed:ranking-data']({detail:{rows,metas}});
assert.equal(ctx.FeedPhase.get(),'consumo_total');
phases[0].onclick();
supply();assert.equal(option.series[0].data.length,2);
assert.equal(option.yAxis.data[0],'B - Integrado B');
assert.equal(option.series[0].data[0].value,1.1);
assert.equal(option.series[0].markLine.data[0].xAxis,1);
assert.equal(option.series[0].markLine.lineStyle.color,'#000000');
assert.match(option.series[0].label.formatter({dataIndex:0}),/1,100/);
el('feedRankingOrder').onclick();assert.equal(option.yAxis.data[0],'A - Integrado A');
assert.equal(option.xAxis.axisLabel.formatter(.1234567),'0,123');
assert.equal(el('feedRankingMeta').textContent,'Meta: 1,000 kg/ave');
assert.equal(el('feedRankingMeta').style.left,'220px');
phases[2].onclick();assert.equal(option.series[0].markLine.data[0].xAxis,2);
phases[4].onclick();assert.equal(option.series[0].markLine.data[0].xAxis,5);
assert.equal(option.series[0].data.length,2);assert.equal(option.series[0].data[0].value,4.65);
events['feed:ranking-data']({detail:{rows:[],metas:[]}});assert.equal(option,null);assert.equal(el('feedRankingEmpty').hidden,false);
const actualMetas=metas.map(m=>({...m,value:m.code.includes('_fpi_')?.220:1}));
const exact=row('E','1',100,110); // pre-initial 22 kg / 100 birds = .220
const below=row('F','1',100,100),above=row('G','1',100,120);
const pre=R.aggregate([exact,below,above],actualMetas);
assert.equal(pre.groups.length,3);assert.equal(pre.groups[0].goal,.220);
assert.ok(Math.abs(pre.groups[0].kgPerBird)<1e-12);
assert.equal(R.ordered(pre.groups)[0].key,'G');assert.equal(R.ordered(pre.groups,false)[0].key,'F');
assert.equal(R.gradient(0,-1,1,'#00843d','#B36B00','#d12838'),'#00843d');
assert.equal(R.gradient(1,-1,1,'#00843d','#B36B00','#d12838'),'#d12838');
assert.equal(R.gradient(-1,-1,1,'#00843d','#B36B00','#d12838'),'#d12838');
// Total must use the normalized existing total even if individual phase values differ.
const existing=row('T','1',10,123);existing.fase_pre_menos_inicial=900;
assert.equal(total([existing],metas).groups[0].actual,123);
events['feed:ranking-data']({detail:{rows:[exact,below,above],metas:actualMetas}});
phases[0].onclick();assert.equal(option.series[0].markLine.data[0].xAxis,.220);assert.equal(option.series[0].data.length,3);
const changed=actualMetas.concat(actualMetas.map(m=>({...m,date:'2026-11-02',value:2})));
const later={...above,data:'2026-11-03'};
events['feed:ranking-data']({detail:{rows:[exact,later],metas:changed}});assert.equal(option,null);assert.match(el('feedRankingEmpty').textContent,/metas vigentes diferentes/);
console.log('PASS: all producers, phase switching, real bar lengths, signed order, .220 kg target, growth/total targets, existing total, gradient endpoints, drilldown/reset, mixed targets and empty state.');

assert.equal(R.gradient(.5,-1,1,'#00843d','#B36B00','#d12838'),'#b36b00');
assert.equal(R.gradient(.25,-1,1,'#00843d','#B36B00','#d12838'),R.gradient(-.25,-1,1,'#00843d','#B36B00','#d12838'));
console.log('PASS: absolute-distance gradient is symmetric, target green, halfway amber, extremes red; three decimal axes and fixed meta marker.');

// Reproduce all producers -> one lineage/producer -> empty -> all.
phases[0].onclick();
events['feed:ranking-data']({detail:{rows:[exact,below,above],metas:actualMetas}});
const oldLabel=option.series[0].label.formatter, oldTooltip=option.tooltip.formatter;
const oldLastLabel=oldLabel({dataIndex:2});
el('ranking-scroll').scrollTop=900;
events['feed:ranking-data']({detail:{rows:[exact],metas:actualMetas}});
assert.equal(option.series[0].data.length,1);assert.equal(option.yAxis.data.length,1);
assert.equal(oldLabel({dataIndex:2}),oldLastLabel);assert.doesNotThrow(()=>oldTooltip({dataIndex:2}));
assert.equal(el('ranking-scroll').scrollTop,0);assert.equal(el('feedRankingChart').style.height,'300px');
assert.equal(option.animation,false);
assert.match(option.series[0].label.formatter({dataIndex:0}),/0,220/);
events['feed:ranking-data']({detail:{rows:[],metas:actualMetas}});
assert.equal(option,null);assert.equal(el('feedRankingMeta').hidden,true);
events['feed:ranking-data']({detail:{rows:[exact,below,above],metas:actualMetas}});
assert.equal(option.series[0].data.length,3);
console.log('PASS: filter shrink/empty/restore, stable old callbacks, no stale bars, scroll reset and marker refresh.');
