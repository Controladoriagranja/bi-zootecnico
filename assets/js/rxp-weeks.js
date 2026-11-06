/* Semanas sao apenas grupos de datas ja aceitas pela API RxP; sem novo campo no banco. */
window.RxpWeekFilter = (() => {
  function week(day) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    const date = new Date(day + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== day) return null;
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay()+6)%7);
    const monday = date.toISOString().slice(0,10);
    const thursday = new Date(date); thursday.setUTCDate(thursday.getUTCDate()+3);
    const year = thursday.getUTCFullYear(), first = new Date(Date.UTC(year,0,4));
    first.setUTCDate(first.getUTCDate()-(first.getUTCDay()+6)%7);
    const number = 1 + Math.round((date-first)/604800000);
    const sunday = new Date(date); sunday.setUTCDate(sunday.getUTCDate()+6);
    const short = d => d.slice(8,10)+'/'+d.slice(5,7);
    return {key:monday,year,number,end:sunday.toISOString().slice(0,10),label:`Semana ${number} / ${year} · ${short(monday)}–${short(sunday.toISOString().slice(0,10))}`};
  }
  function attach(controller) {
    const normalize = controller.normalizeOptions.bind(controller);
    const render = controller.renderMultiOptions.bind(controller);
    const values = controller.values.bind(controller);
    let weeks = new Map();
    controller.normalizeOptions = (field,raw) => {
      const options = normalize(field,raw);
      if (field.id !== 'filtroSemana') return options;
      weeks = new Map();
      for (const option of options) {
        const info = week(option.value);
        if (!info) continue;
        if (!weeks.has(info.key)) weeks.set(info.key,{label:info.label,dates:[]});
        weeks.get(info.key).dates.push(option.value);
      }
      return [...weeks].sort(([a],[b])=>a.localeCompare(b)).map(([value,item])=>({value,label:item.label}));
    };
    controller.renderMultiOptions = (field,options,selected) => {
      // loadOptions preserva selecoes usando values(): converte datas de volta aos grupos semanais.
      if (field.id === 'filtroSemana' && selected !== undefined) {
        selected = [...new Set([].concat(selected).map(day=>week(day)?.key).filter(Boolean))];
      }
      return render(field,options,selected);
    };
    controller.values = () => {
      const result = values(), selected = result.data;
      if (!selected) return result;
      const dates = [...new Set(selected.flatMap(key=>weeks.get(key)?.dates || []))].filter(day=>
        (!result.ano?.length || result.ano.includes(day.slice(0,4))) &&
        (!result.mes?.length || result.mes.some(month=>Number(month)===Number(day.slice(5,7)))) &&
        (!result.dia?.length || result.dia.some(value=>Number(value)===Number(day.slice(8,10)))));
      if (dates.length) result.data = dates.sort(); else delete result.data;
      return result;
    };
  }
  return {attach,week};
})();
