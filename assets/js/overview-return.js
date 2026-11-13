"use strict";
(()=>{const q=new URLSearchParams(location.search);if(q.get('origem')!=='visao-geral')return;
const saved=new URLSearchParams(q.get('retorno')||''),safe=new URLSearchParams();for(const key of ['visao','ano','mes','periodo']){const value=saved.get(key);if(value&&/^[a-z0-9-]+$/.test(value))safe.set(key,value);}
const a=document.createElement('a');a.textContent='← Voltar para Visão Geral';a.href='https://controladoriagranja.github.io/bi-zootecnico/visao-geral.html?'+safe.toString();a.className='overview-return';
a.style.cssText='display:inline-flex;align-items:center;padding:9px 12px;margin:0 0 12px;border:1px solid #e6dfda;border-radius:7px;color:#7c1c2b;background:#fff;text-decoration:none;font:600 12px Geist,Arial,sans-serif';
const host=document.querySelector('.app-shell')||document.body;host.prepend(a);
})();
