import json,threading,http.server,functools
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
metrics=[dict(id=k,nome=n,meta=t,valor=v,cor=c,desvio=d,decimais=dec,unidade=u,situacao=c)for k,n,t,v,c,d,dec,u in [('ca','CA',1.753,1.8,'verde',2.68,3,''),('mortalidade','Mortalidade',5,4.98,'amarelo',-.4,2,'%'),('peso_medio','Peso médio',2.9,2.88,'laranja',-.69,3,'kg'),('idade','Idade média',44.5,43,'vermelho',-3.37,2,'dias'),('gmd','GPD',65.56,None,'sem-dados',None,2,'g/dia')]]
errors=[]
try:
 with sync_playwright()as p:
  browser=p.chromium.launch(channel='chrome',headless=True)
  for width in [1500,390]:
   page=browser.new_page(viewport={'width':width,'height':1000});page.add_init_script("sessionStorage.setItem('granjabi_auth_token','test-only')")
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.route('**onrender.com/api/auth/me',lambda route:route.fulfill(json={'ok':True,'user':{'role':'admin'}}))
   def data(route):
    from urllib.parse import urlparse,parse_qs
    q=parse_qs(urlparse(route.request.url).query);mode=q['mapa_calor'][0];label='SEM45/26'if mode=='semana'else '02/11/2026'if mode=='dia'else '11/2026'
    route.fulfill(json={'ok':True,'admin':True,'inicio':'2026-11-01','fim':'2026-11-13','atualizado_em':'2026-11-13T07:00:00-03:00','periodos':[{'chave':'2026-11-02','rotulo':label,'lotes':25,'indicadores':metrics}]})
   page.route('**workers.dev/api/bi/zootecnico/resumo?*',data)
   page.goto(f'http://127.0.0.1:{server.server_port}/mapa-calor.html');page.wait_for_selector('.heat-tile')
   assert page.locator('.heat-tile').count()==5
   for mode in ['dia','semana','mes','corrente']:
    page.click('[data-mode="'+mode+'"]');page.wait_for_function("document.querySelector('#heatStatus').textContent.startsWith('Consulta concluída')")
    assert page.locator('#heatTable tbody tr').count()==1
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
   Path(r'C:/BI_Granja/Temp/heatmap-qa').mkdir(exist_ok=True);page.screenshot(path=f'C:/BI_Granja/Temp/heatmap-qa/{width}.png',full_page=True)
   print('OK',width,'cinco cores e quatro modos; sem overflow')
   page.route('**workers.dev/api/bi/zootecnico/resumo?*',lambda route:route.fulfill(status=403,json={'detail':'Admin'}));page.click('#heatRefresh');page.wait_for_selector('#heatStatus.heat-error');assert page.locator('#heatContent').is_hidden();print('OK bloqueio não-Admin')
   page.close()
  browser.close()
 assert not errors,errors
finally:server.shutdown()
