/** Renderização dos contratos analíticos da API, sem cálculos zootécnicos. */
window.ApiScreen = (() => {
  const charts = new Map();
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const number = (value, decimals = 0) => value == null || !Number.isFinite(Number(value)) ? "—" : Number(value).toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const element = id => document.getElementById(id);
  function message(id, text, error = false) {
    const el = element(id);
    el.textContent = text;
    el.classList.remove("hidden");
    el.classList.toggle("alert-error", error);
    el.classList.toggle("alert-warning", !error);
    el.setAttribute("role", error ? "alert" : "status");
  }
  function cards(id, data, specifications, className) {
    element(id).innerHTML = specifications.map(([key, label, decimals = 0, suffix = ""]) => `<article class="card ${className}"><span>${escape(label)}</span><strong>${number(data?.[key], decimals)}${data?.[key]==null?"":escape(suffix)}</strong></article>`).join("");
  }
  function drawChart(record) {
    const {instance,labels,series,horizontal,element:el}=record;
    const css=getComputedStyle(document.documentElement), c=name=>css.getPropertyValue(name).trim();
    const primary=c("--primary"), accent=c("--accent"), muted=c("--muted-foreground"), border=c("--border"), text=c("--foreground");
    const narrow=el.clientWidth<500;
    const axis={type:"value",axisLabel:{color:muted,fontSize:10,formatter:v=>number(v,Number.isInteger(v)?0:1)},splitLine:{lineStyle:{color:border,opacity:.6}},axisTick:{show:false},axisLine:{show:false}};
    const percent=series.some(s=>s.yAxisIndex===1);
    const readable={color:text,backgroundColor:c('--card'),fontSize:12,fontWeight:600,padding:[3,4],borderRadius:4,distance:12};
    function referenceSeries(s,i) {
      const base={type:'line',connectNulls:false,smooth:false,symbol:'circle',symbolSize:5,lineStyle:{width:2,color:i?accent:primary},itemStyle:{color:i?accent:primary,borderRadius:s.type==='bar'?horizontal?5:[4,4,0,0]:0},barMaxWidth:horizontal?24:42,
        tooltip:{valueFormatter:v=>number(v,s.name.includes('Qtde')?0:2)+(s.name.includes('%')?'%':'')},...s};
      if(horizontal)return {...base,label:{show:true,position:'right',color:text,formatter:p=>p.value==null?'':number(p.value,2)+'%'},labelLayout:{hideOverlap:true}};
      if(el.id==='chartMortalidade')return i===0?{...base,itemStyle:{color:primary,borderRadius:[8,8,2,2]},label:{show:true,position:'insideTop',distance:6,color:'#fff',backgroundColor:'rgba(0,0,0,.55)',padding:[3,3],borderRadius:3,fontSize:11,fontWeight:700,formatter:p=>p.value==null?'':number(p.value)},labelLayout:{hideOverlap:true}}:
        {...base,symbolSize:8,smooth:.32,lineStyle:{color:accent,width:3},label:{show:true,position:'top',...readable,color:'#211b1d',backgroundColor:accent,formatter:p=>p.value==null?'':number(p.value,2)+'%'},labelLayout:{hideOverlap:true,moveOverlap:'shiftY'}};
      if(el.id==='chartPesoSemanal')return {...base,barMaxWidth:54,itemStyle:{color:primary,borderRadius:[10,10,3,3]},label:{show:true,position:'top',...readable,formatter:p=>p.value==null?'':number(p.value,2)},labelLayout:{hideOverlap:true}};
      if(el.id==='chartCrescimento')return {...base,smooth:.42,symbolSize:7,lineStyle:{color:primary,width:4,cap:'round'},areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:echarts.color.modifyAlpha(primary,.42)},{offset:1,color:echarts.color.modifyAlpha(primary,.06)}]}},label:{show:true,position:'top',...readable,formatter:p=>p.value==null?'':number(p.value,2)},labelLayout:{hideOverlap:true,moveOverlap:'shiftY'}};
      if(el.id==='chartGalpaoDetalhe')return {...base,smooth:.25,symbolSize:7,lineStyle:{color:primary,width:3},label:{show:true,position:'top',color:text,formatter:p=>p.value==null?'':number(p.value,2)+'%'},labelLayout:{hideOverlap:true}};
      return base;
    }
    instance.resize();
    instance.setOption({animationDuration:350,textStyle:{fontFamily:getComputedStyle(document.body).fontFamily},color:[primary,accent],
      tooltip:{trigger:"axis",confine:true,renderMode:"richText",backgroundColor:c("--card"),borderColor:border,textStyle:{color:text},axisPointer:{type:horizontal?"shadow":"line"}},
      legend:{show:true,top:0,textStyle:{color:muted,fontSize:11}},
      grid:{left:horizontal?(narrow?94:124):(narrow?46:48),right:horizontal?58:percent?48:28,top:horizontal?36:el.id==='chartCrescimento'?42:34,bottom:el.id==='chartCrescimento'?46:42},
      xAxis:horizontal?{...axis,min:0,axisLabel:{...axis.axisLabel,formatter:v=>number(v,Number.isInteger(v)?0:1)+"%"}}:{type:"category",data:labels,boundaryGap:series.some(s=>s.type==="bar"),...(el.id==='chartCrescimento'?{name:'Idade',nameLocation:'middle',nameGap:30,nameTextStyle:{color:muted,fontSize:10}}:{}),axisLine:{lineStyle:{color:border}},axisTick:{show:false},axisLabel:{color:muted,fontSize:narrow?10:11,interval:0,hideOverlap:narrow,formatter:v=>narrow?String(v).replace(' dias','d'):v}},
      yAxis:horizontal?{type:"category",data:labels,inverse:true,axisLine:{show:false},axisTick:{show:false},axisLabel:{color:text,fontSize:11,width:narrow?78:110,overflow:"truncate"}}:percent?[axis,{...axis,position:"right",axisLabel:{...axis.axisLabel,formatter:v=>number(v,1)+"%"},splitLine:{show:false}}]:axis,
      series:series.map(referenceSeries)},true);
  }
  function chart(id, labels, series, horizontal = false, onClick = null) {
    const el = element(id);
    if (!el || !window.echarts) return;
    let record=charts.get(id);
    if (!record) { el.textContent=""; record={instance:echarts.init(el,null,{renderer:'svg'}),element:el}; charts.set(id,record); observer?.observe(el); }
    Object.assign(record,{labels,series,horizontal,active:true});
    record.instance.off("click");
    if(onClick)record.instance.on("click",onClick);
    drawChart(record);
    requestAnimationFrame(()=>record.instance.resize());
  }
  function clearCharts() { charts.forEach(r => {r.active=false;r.instance.clear();r.instance.off("click");}); }
  const observer=typeof ResizeObserver==="undefined"?null:new ResizeObserver(entries=>entries.forEach(e=>{const r=[...charts.values()].find(r=>r.element===e.target);if(r?.active)drawChart(r);}));
  window.addEventListener("resize", () => charts.forEach(r => {if(r.active)drawChart(r);}));
  document.addEventListener("dashboard:theme-changed",()=>charts.forEach(r=>{if(r.active)drawChart(r);}));
  function connect({bi, fields, errorId, clearId, render, clear, context = () => ({}), onOptions = null}) {
    let requestId = 0, abort;
    const endpoint = action => `/api/bi/${bi}/${action}`;
    const filters = new FilterController({fields:fields.map(([id,apiKey])=>({id,apiKey,multi:true,search:true})),
      filtersEndpoint:endpoint("filtros"), contextProvider:context, includeDependentRefresh:false, optionsObserver:onOptions,
      onChange:() => refresh()});
    filters.register();
    async function refresh() {
      const id = ++requestId;
      abort?.abort(); abort = new AbortController();
      clear(); clearCharts();
      element(errorId).classList.add("hidden");
      try {
        await filters.loadOptions({preserve:true});
        if (id !== requestId) return;
        const params = {...filters.values(),...context()};
        const data = await apiGet(endpoint("resumo"),params,{signal:abort.signal});
        if (id !== requestId) return;
        if (!data.rules_version || !data.cards || !Array.isArray(data.groups)) throw new Error("A API retornou um contrato incompatível.");
        render(data, params);
        element(errorId).classList.add("hidden");
      } catch (error) {
        if (error.name !== "AbortError" && id === requestId) { clear(); message(errorId,error.message,true); }
      }
    }
    element(clearId)?.addEventListener("click",()=>{filters.clear(); refresh();});
    refresh();
    return {filters,refresh,endpoint};
  }
  return {escape,number,element,message,cards,chart,connect};
})();
