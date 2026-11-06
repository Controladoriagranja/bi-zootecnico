/* Somente apresentacao: agrega os mesmos registros ja conferidos pelo ranking. */
window.RxpWeeklyChart = (() => {
  const E=ApiScreen.element,N=ApiScreen.number,H=ApiScreen.escape;
  let state=null,chart,axis,previousWidth=0;
  const scroll=E('rxpWeeklyChart').parentElement;
  const labels=day=>day.slice(8,10)+'/'+day.slice(5,7);
  function tooltipPosition(element,point,size) {
    const bounds=element.getBoundingClientRect(),[width,height]=size.contentSize;
    const clamp=(value,min,max)=>Math.max(min,Math.min(value,Math.max(min,max)));
    return [clamp(point[0]+12,8-bounds.left,innerWidth-bounds.left-width-8),
      clamp(point[1]+12,8-bounds.top,innerHeight-bounds.top-height-8)];
  }
  function create() { return {weeks:new Map(),latestDay:'',latest:null}; }
  function add(acc,row) {
    const day=String(row.data??'').slice(0,10),info=RxpWeekFilter.week(day);
    if(!info)return;
    if(day>acc.latestDay){acc.latestDay=day;acc.latest=info;}
    if(!acc.weeks.has(info.key))acc.weeks.set(info.key,{...info,programada:0,real:0,diferenca:0});
    const group=acc.weeks.get(info.key);
    // Dif Qtde RxP vem da origem; nao substituir por real - programada.
    group.programada+=Number(row.programada??0);group.real+=Number(row.real??0);group.diferenca+=Number(row.difQtdeRxP??0);
  }
  function range(weeks) {
    let min=Math.min(0,...weeks.map(w=>w.diferenca)),max=Math.max(0,...weeks.map(w=>w.diferenca));
    min=min<0?min*1.15:0;max=max>0?max*1.15:0;
    if(min===max)max=1;
    const raw=(max-min)/4,base=10**Math.floor(Math.log10(raw)),fraction=raw/base;
    const step=Math.max(1,([1,2,2.5,5,10].find(n=>n>=fraction)||10)*base);
    return {min:Math.floor(min/step)*step,max:Math.ceil(max/step)*step,interval:step};
  }
  function draw(reset=false) {
    if(!state||!scroll.clientWidth)return;
    const width=scroll.clientWidth,oldIndex=previousWidth?scroll.scrollLeft/(previousWidth/4):0;
    const changedWidth=Math.abs(width-previousWidth)>1;
    // Quatro colunas por viewport, inclusive quando ha semanas sem registros.
    const slots=[...state.weeks];while(slots.length<4)slots.push(null);
    const element=E('rxpWeeklyChart');element.style.width=slots.length*width/4+'px';
    if(!chart)chart=echarts.init(element,null,{renderer:'svg'});
    if(!axis)axis=echarts.init(E('rxpWeeklyAxis'),null,{renderer:'svg'});
    chart.resize();axis.resize();
    const css=getComputedStyle(document.documentElement),color=name=>css.getPropertyValue(name).trim();
    const text=color('--foreground'),muted=color('--muted-foreground'),border=color('--border'),negative=color('--destructive');
    const scale=range(state.weeks),yAxis={type:'value',...scale,axisLabel:{color:muted,fontSize:10,formatter:value=>N(value)},axisTick:{show:false},axisLine:{show:false},splitLine:{show:false}};
    axis.setOption({animation:false,grid:{left:0,right:3,top:34,bottom:64,containLabel:true},xAxis:{show:false,type:'category'},yAxis,series:[]},true);
    chart.setOption({animationDuration:250,textStyle:{fontFamily:getComputedStyle(document.body).fontFamily},
      aria:{enabled:true},
      tooltip:{trigger:'axis',appendToBody:true,confine:false,position:(point,params,dom,rect,size)=>tooltipPosition(element,point,size),axisPointer:{type:'shadow'},backgroundColor:color('--card'),borderColor:border,textStyle:{color:text},
        formatter:points=>{
          const row=slots[points[0]?.dataIndex];if(!row)return '';
          return `<strong>Semana ${row.number} / ${state.year}</strong><br>${H(labels(row.key))}–${H(labels(row.end))}<br>Qtde Programada: ${N(row.programada)}<br>Qtde Real: ${N(row.real)}<br>Dif %: ${row.programada?N(row.diferenca/row.programada*100,2)+'%':'—'}<br>Dif Qtde RxP: ${N(row.diferenca)}`;
        }},
      grid:{left:0,right:0,top:34,bottom:64},
      xAxis:{type:'category',boundaryGap:true,data:slots.map(w=>w?'S'+w.number:''),axisTick:{show:false},axisLine:{lineStyle:{color:border}},axisLabel:{interval:0,color:muted,fontSize:10,lineHeight:16,
        formatter:(_,index)=>slots[index]?'S'+slots[index].number+'\n'+labels(slots[index].key)+'–'+labels(slots[index].end):''}},
      yAxis:{...yAxis,axisLabel:{show:false},splitLine:{show:true,lineStyle:{color:border,opacity:.6}}},
      series:[{name:'Dif Qtde RxP',type:'bar',barMaxWidth:48,data:slots.map(w=>w?{value:w.diferenca,itemStyle:{color:w.diferenca<0?negative:color('--primary'),borderRadius:w.diferenca<0?[0,0,5,5]:[5,5,0,0]},label:{position:w.diferenca<0?'bottom':'top',color:w.diferenca<0?negative:text}}:null),
        label:{show:true,fontSize:11,formatter:p=>p.value==null?'':N(p.value)},labelLayout:{hideOverlap:true}}]},true);
    previousWidth=width;
    scroll.scrollLeft=reset||changedWidth?(slots.length-4)*width/4:oldIndex*width/4;
  }
  function render(acc) {
    const message=E('rxpWeeklyMessage'),plot=E('rxpWeeklyChart').closest('.rxp-weekly-plot');
    if(!acc.latest){state=null;chart?.clear();axis?.clear();E('rxpWeeklyYear').textContent='';message.textContent='Sem dados para os filtros selecionados';message.classList.remove('hidden');plot.classList.add('hidden');return;}
    const year=acc.latest.year,first=RxpWeekFilter.week(`${year}-01-04`).key,weeks=[];
    for(let index=0;index<acc.latest.number;index++){
      const day=new Date(first+'T00:00:00Z');day.setUTCDate(day.getUTCDate()+index*7);
      const info=RxpWeekFilter.week(day.toISOString().slice(0,10));
      weeks.push(acc.weeks.get(info.key)||{...info,programada:0,real:0,diferenca:0});
    }
    state={year,weeks};E('rxpWeeklyYear').textContent=String(year);message.classList.add('hidden');plot.classList.remove('hidden');draw(true);
  }
  function clear(error='') {
    state=null;chart?.clear();axis?.clear();E('rxpWeeklyYear').textContent='';
    E('rxpWeeklyMessage').textContent=error||'Carregando semanas…';E('rxpWeeklyMessage').classList.remove('hidden');
    E('rxpWeeklyChart').closest('.rxp-weekly-plot').classList.toggle('hidden',Boolean(error));
  }
  new ResizeObserver(()=>draw()).observe(scroll);
  document.addEventListener('dashboard:theme-changed',()=>draw());
  return {create,add,render,clear,tooltipPosition};
})();
