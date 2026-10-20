/* Carga sem fuso e relogio de Sao Paulo; offsets explicitos sao convertidos uma vez. */
(() => {
  const intl=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',
    year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const pad=value=>String(value).padStart(2,'0');
  function instantBR(date){
    if(!Number.isFinite(date.getTime()))return '—';
    const parts=Object.fromEntries(intl.formatToParts(date).map(part=>[part.type,part.value]));
    return `${parts.day}/${parts.month}/${parts.year.padStart(4,'0')} ${parts.hour}:${parts.minute}`;
  }
  function formatarDataHoraBR(value){
    if(value instanceof Date)return instantBR(value);
    if(typeof value!=='string')return '—';
    const match=/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:?\d{2})?$/i.exec(value.trim());
    if(!match)return '—';
    const [,ys,ms,ds,hs,mins,ss='0',fraction='',offset]=match;
    const [year,month,day,hour,minute,second]=[ys,ms,ds,hs,mins,ss].map(Number);
    if(year<1||month<1||month>12||day<1||hour>23||minute>59||second>59)return '—';
    const check=new Date(0);
    check.setUTCFullYear(year,month-1,day);check.setUTCHours(hour,minute,second,Number(fraction.slice(0,3).padEnd(3,'0')));
    if(check.getUTCFullYear()!==year||check.getUTCMonth()!==month-1||check.getUTCDate()!==day)return '—';
    if(!offset)return `${pad(day)}/${pad(month)}/${ys} ${pad(hour)}:${pad(minute)}`;
    let delta=0;
    if(offset.toUpperCase()!=='Z'){
      const raw=offset.slice(1).replace(':',''),oh=Number(raw.slice(0,2)),om=Number(raw.slice(2));
      if(oh>23||om>59)return '—';
      delta=(oh*60+om)*(offset[0]==='+'?1:-1);
    }
    return instantBR(new Date(check.getTime()-delta*60000));
  }
  function exibirAtualizacaoDados(element,data){
    if(!element)return;
    element.textContent=formatarDataHoraBR(data?.atualizado_em);
    const meta=data?.atualizacao_dados,cache=meta?.cache;
    const sources=(meta?.fontes||[]).map(source=>`${source.tabela}.${source.coluna}: ${formatarDataHoraBR(source.carregado_em)}`);
    element.title=sources.join('\n');
    let badge=element.parentElement.querySelector('[data-update-lag]');
    if(!cache?.base_principal_defasada){badge?.remove();return;}
    if(!badge){badge=document.createElement('span');badge.dataset.updateLag='';badge.className='update-stale';element.after(badge);}
    badge.textContent='Cache pendente';
    badge.title=`A origem tem carga posterior a base preservada no cache (${formatarDataHoraBR(cache.carga_base_preservada_em)}). Os valores da tela ainda dependem de atualizar o cache.`;
  }
  window.formatarDataHoraBR=formatarDataHoraBR;
  window.exibirAtualizacaoDados=exibirAtualizacaoDados;
})();
