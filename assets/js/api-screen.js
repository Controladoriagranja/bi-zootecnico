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
  function chart(id, labels, series, horizontal = false) {
    const el = element(id);
    if (!el || !window.echarts) return;
    let instance = charts.get(id);
    if (!instance) { el.textContent = ""; instance = echarts.init(el); charts.set(id, instance); }
    const style = getComputedStyle(document.documentElement);
    const colors = ["--primary","--accent"].map(key=>style.getPropertyValue(key).trim()).filter(Boolean);
    instance.setOption({color:colors,tooltip:{trigger:"axis",renderMode:"richText"},legend:{top:0},grid:{left:horizontal?160:60,right:30,top:45,bottom:45},
      xAxis: horizontal ? {type:"value"} : {type:"category",data:labels},
      yAxis: horizontal ? {type:"category",data:labels,inverse:true} : series.some(s=>s.yAxisIndex===1) ? [{type:"value"},{type:"value"}] : {type:"value"},
      series:series.map(s => ({type:"line",connectNulls:false,...s}))}, true);
  }
  function clearCharts() { charts.forEach(c => c.clear()); }
  window.addEventListener("resize", () => charts.forEach(c => c.resize()));
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
