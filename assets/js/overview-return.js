"use strict";
(()=>{const q=new URLSearchParams(location.search);if(q.get('origem')!=='visao-geral')return;
const saved=new URLSearchParams(q.get('retorno')||''),safe=new URLSearchParams();for(const key of ['visao','ano','mes','periodo']){const value=saved.get(key);if(value&&/^[a-z0-9-]+$/.test(value))safe.set(key,value);}
if(window.parent!==window){window.addEventListener('load',()=>setTimeout(()=>window.parent.postMessage({type:'bi:overview-return',query:safe.toString()},location.origin),0));return;}
const a=document.createElement('a');a.textContent='← Voltar à Visão Geral';a.href='https://controladoriagranja.github.io/bi-zootecnico/visao-geral.html?'+safe.toString();a.className='overview-return';
a.style.cssText='position:fixed;top:4px;right:8px;z-index:1000;display:inline-flex;width:auto;align-items:center;justify-content:center;padding:7px 12px;margin:0;border:1px solid #cbd9e7;border-radius:6px;color:#173650;background:#fff;text-decoration:none;white-space:nowrap;font:600 11px Geist,Arial,sans-serif;line-height:16px;box-sizing:border-box';
document.body.append(a);const style=document.createElement('style');style.textContent='@media(max-width:480px){.overview-return{right:8px!important;padding:6px 8px!important;font-size:10px!important}}';document.head.append(style);
})();
