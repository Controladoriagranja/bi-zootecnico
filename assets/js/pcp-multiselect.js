"use strict";
window.PcpMulti=(()=>{
 const values=v=>String(v??'').split(',').filter(Boolean);
 const includes=(v,item)=>!v||values(v).includes(String(item));
 function enhance(root){root.querySelectorAll('select:not([data-pcp-multi])').forEach(select=>{
  if(select.type==='select-multiple'||select.closest('.hidden'))return;
  select.dataset.pcpMulti='true';const initial=select.value;select.multiple=true;
  const host=document.createElement('div');host.id=select.id+'Multi';host.className='checkbox-multiselect pcp-select-multi';select.after(host);select.hidden=true;
  const field={id:host.id,apiKey:select.id,multi:true,search:true};let selected=values(initial);
  const controller=new FilterController({fields:[field],includeDependentRefresh:false,onChange:()=>{
   selected=[...controller.getState(field).selected];for(const o of select.options)o.selected=selected.includes(o.value);
   select.dispatchEvent(new Event('change',{bubbles:true}));
  }});controller.register();
  function sync(){const options=[...select.options].filter(o=>o.value).map(o=>({value:o.value,label:o.textContent}));for(const o of select.options)o.selected=selected.includes(o.value);controller.renderMultiOptions(field,options,selected);const search=controller.getState(field).search;if(search?.value)search.dispatchEvent(new Event('input'));}
  Object.defineProperty(select,'value',{configurable:true,get:()=>selected.join(','),set:v=>{selected=values(v);sync();}});
  select.pcpMulti={controller,field,sync};new MutationObserver(sync).observe(select,{childList:true,subtree:true});sync();
 });}
 return {enhance,values,includes};
})();
