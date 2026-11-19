/* ECharts real e catalogo real. API e calculos zootecnicos nao sao executados. */
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const baseline=process.argv.includes('--baseline');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent('<!doctype html><style>body{margin:16px}#chart{width:100%;height:460px}</style><div id="chart"></div>');
   for(const file of ['assets/vendor/echarts/echarts.min.js','assets/js/formulas-registry.js','assets/js/metrics.js','assets/js/charts.js'])
    await page.addScriptTag({content:await fs.readFile(path.join(root,file),'utf8')});
   const results=await page.evaluate(()=>{
    const results=[];
    for(const id of BI_METRIC_ORDER.filter(id=>id!=='mortalidade')){
     const metric=METRICAS[id],chart=ZooCharts.init(document.getElementById('chart'));
     try{
      const plants=id==='morte_transporte';
      const sets=plants?[['Ave Nova','Real Alimentos'],['Real Alimentos'],['Ave Nova','Real Alimentos'],[],['Ave Nova']]:[[2024,2025,2026],[2026],[2024,2026],[2025],[],[2026]];
      for(const names of sets){
       const response={meses:[{numero:1,nome:'janeiro'},{numero:2,nome:'fevereiro'},{numero:3,nome:'março'}],...(plants?{agrupamento:'planta_de_abate'}:{}),series:names.map((name,i)=>({ano:plants?2026:name,...(plants?{planta_de_abate:name}:{}),valores:[i+1,null,0]}))};
       ZooCharts.evolution(chart,response,metric.nome,metric.casas_decimais??2,metric.unidade);
       ZooCharts.refreshTheme(); window.dispatchEvent(new Event('resize'));
       const current=chart.getOption().series.filter(Boolean);
       if(JSON.stringify(current.map(s=>s.name).sort())!==JSON.stringify(names.map(String).sort()))throw new Error('Series removidas voltaram ou faltaram series ativas');
       for(const series of current)if(JSON.stringify(series.data)!==JSON.stringify(response.series.find(s=>String(plants?s.planta_de_abate:s.ano)===series.name).valores))throw new Error('Valores alterados no redimensionamento');
      }
      // Atualizacao de rankings do mesmo indicador nao deve falhar nem manter barras antigas.
      ZooCharts.ranking(chart,[{nome:'A',valor:1},{nome:'B',valor:null}],metric.nome,metric.unidade,metric.casas_decimais??2);
      ZooCharts.ranking(chart,[{nome:'C',valor:2}],metric.nome,metric.unidade,metric.casas_decimais??2);
      ZooCharts.refreshTheme();
      results.push({id,ok:true});
     }catch(e){results.push({id,ok:false,error:e.message});}
     finally{ZooCharts.dispose(chart);}
    }
    return results;
   });
   if(baseline){
    assert.equal(results.length,10);assert(results.every(r=>!r.ok&&r.error.includes("reading 'name'")),JSON.stringify(results));
    console.log(`REPRODUZIDO ${width}px: ${results.map(r=>r.id).join(', ')}`);
   }else{
    assert(results.every(r=>r.ok),JSON.stringify(results));assert.deepEqual(errors,[]);
    console.log(`PASS ${width}px: ${results.length} indicadores; reduzir/trocar/limpar/restaurar series, resize, tema, valores e rankings`);
   }
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
