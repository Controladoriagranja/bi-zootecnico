/* Ordenação visual das linhas carregadas, preservando totais e hierarquia. */
(() => {
  const states = new WeakMap();
  const collator = new Intl.Collator('pt-BR', {numeric:true, sensitivity:'base'});
  function value(row, index) {
    const cell=row.cells[index];
    const text=(cell?.textContent||'').replace(/^[+−]\s*/, '').trim();
    if(!text || text==='—')return null;
    if(cell?.classList.contains('num')) {
      const number=Number(text.replace(/\./g,'').replace(',','.').replace(/[^\d.e+-]/g,''));
      return Number.isFinite(number)?number:null;
    }
    const date=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
    if(date)return `${date[3]}-${date[2]}-${date[1]}`;
    return text;
  }
  function sort(table, state) {
    for(const body of table.tBodies) {
      const rows=Array.from(body.rows);
      if(rows.some(r=>r.cells.length!==table.tHead.rows[0].cells.length))continue;
      const roots=[], stack=[];
      for(const row of rows) {
        const node={row,children:[]}, depth=Number(row.dataset.sortDepth||0);
        stack.length=depth;
        (depth && stack[depth-1]?stack[depth-1].children:roots).push(node);
        stack[depth]=node;
      }
      const compare=(a,b)=>{
        const x=value(a.row,state.index),y=value(b.row,state.index);
        if(x==null)return y==null?0:1;
        if(y==null)return -1;
        return (typeof x==='number'&&typeof y==='number'?x-y:collator.compare(String(x),String(y)))*state.direction;
      };
      const ordered=[];
      function visit(nodes){nodes.sort(compare);for(const n of nodes){ordered.push(n.row);visit(n.children);}}
      visit(roots);
      if(ordered.some((r,i)=>r!==rows[i]))body.append(...ordered);
    }
  }
  function enhance() {
    document.querySelectorAll('table').forEach(table=>{
      if(!table.tHead)return;
      const headers=Array.from(table.tHead.rows[0]?.cells||[]);
      headers.forEach((th,index)=>{
        if(th.querySelector('button')||th.classList.contains('action'))return;
        const button=document.createElement('button');button.type='button';
        button.className='table-sort-button'+(th.classList.contains('num')?' num':'');
        const label=document.createElement('span');label.textContent=th.textContent.trim();
        const icon=document.createElement('span');icon.className='sort-icon';icon.setAttribute('aria-hidden','true');
        button.append(label,icon);th.replaceChildren(button);
        button.addEventListener('click',()=>{
          const old=states.get(table);
          states.set(table,{index,direction:old?.index===index?-old.direction:1});
          enhance();
        });
        button.dataset.genericSort=String(index);
      });
      const state=states.get(table);
      headers.forEach((th,index)=>{
        const button=th.querySelector('[data-generic-sort]');if(!button)return;
        const active=state?.index===index;
        th.setAttribute('aria-sort',active?(state.direction===1?'ascending':'descending'):'none');
        button.querySelector('.sort-icon').textContent=active?(state.direction===1?'↑':'↓'):'↕';
      });
      if(state)sort(table,state);
    });
  }
  const observer=new MutationObserver(records=>{
    if(records.some(r=>r.type==='childList'&&(r.target.closest?.('table')||Array.from(r.addedNodes).some(n=>n.nodeType===1&&(n.matches('table')||n.querySelector('table'))))))run();
  });
  function run(){observer.disconnect();enhance();observer.observe(document.body,{childList:true,subtree:true});}
  run();
})();
