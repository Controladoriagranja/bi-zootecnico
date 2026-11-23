"""SQL real instrumentado; nenhuma conexao externa."""
import sys, types, importlib.util, json
from pathlib import Path
from datetime import date
from contextlib import contextmanager

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests/.backend-test-deps'))
from fastapi import HTTPException
access=types.ModuleType('pcp_paradas');access.acesso_autorizado=lambda _:True
sys.modules['pcp_paradas']=access
source=ROOT/'outputs/condenacoes-granja-fornecedor-20261123/backend-referencia/api_zootecnico/pcp_condenacoes.py'
spec=importlib.util.spec_from_file_location('cond_pairs',source)
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
name='ATAIR AUGUSTO DOS SANTOS'
catalog=[dict(granja=g,fornecedor=f,tecnico=t,condenacao=c,tipo='Parcial') for g,f,t,c in [
 ('30076',name,'PRISCILA','Aerossaculite'),('46697',name,'EDER','Aerossaculite'),
 ('29168',name,'PRISCILA','Aerossaculite'),('30076','Outro fornecedor','OUTRO','Outra')]]
class Cursor:
 def __init__(self,rows):self.rows=rows
 def fetchall(self):return self.rows
 def fetchone(self):return self.rows[0]
class Connection:
 def __init__(self):self.calls=[]
 def execute(self,query,args=()):
  self.calls.append((query,list(args)))
  assert query.count('%s')==len(args),(query,args)
  if query.startswith('SET LOCAL'):return Cursor([])
  if 'SELECT DISTINCT tecnico,fornecedor,granja' in query:return Cursor(catalog)
  if ' GROUP BY 1,2,3,4' in query and 'sum(ocorrencia)' in query:
   return Cursor([dict(data=date(2026,11,2),empresa='Ave Nova',condenacao='Aerossaculite',tipo='Parcial',kg=10,ocorrencias=1)])
  if 'diario_industria' in query:return Cursor([dict(data=date(2026,11,2),empresa='Ave Nova',turno_codigo='1',secao='Recepção de Aves Vivas',kg=1000)])
  if query.startswith('SELECT count'):return Cursor([{'n':1}])
  return Cursor([])
def run(**overrides):
 conn=Connection()
 @contextmanager
 def bank():yield conn
 endpoint=next(r.endpoint for r in module.criar_router(bank,lambda:date(2026,11,23)).routes)
 params=dict(request=object(),ano='2026',mes='11',dias='2026-11-02',visao='10',causa='Aerossaculite',tipo=None,pagina=1,ordenar='granja_fornecedor',direcao='asc',agrupado=False,fornecedor_detalhado=False,tecnicos=None,fornecedores=None,granja_fornecedores=json.dumps([['30076',name]]),grupos=None,condenacoes=None)
 params.update(overrides)
 return endpoint(**params),conn.calls
for grouped in [False,True]:
 for page in [1,2,4]:
  result,calls=run(agrupado=grouped,pagina=page)
  for query,args in calls:
   if 'SELECT DISTINCT' in query or 'diario_industria' in query or query.startswith('SET LOCAL'):continue
   assert 'granja IS NOT DISTINCT FROM %s AND fornecedor IS NOT DISTINCT FROM %s' in query
   assert '30076' in args and name in args and '46697' not in args
  details=[(q,a) for q,a in calls if ' LIMIT 200 OFFSET ' in q]
  assert details[-1][1][-1]==(page-1)*200
  assert result['fornecedor_chave']=='granja_fornecedor'
  assert result['peso_condenado_kg']==10 and result['peso_vivo_kg']==1000 and result['percentual']==.01
pair_options=module.catalog_options(catalog,[],[],[],[],[])
assert len(pair_options['opcoes_granja_fornecedores'])==4
selected=module.catalog_options(catalog,[],[],[['30076',name]],[],[])
assert selected['opcoes_tecnicos']==['PRISCILA']
selected=module.catalog_options(catalog,['EDER'],[],[],[],[])
assert selected['opcoes_granja_fornecedores']==[{'granja':'46697','fornecedor':name}]
group=module.classify('Aerossaculite','Parcial')[0]
selected=module.catalog_options(catalog,[],[],[],[group],['Aerossaculite'])
assert {r['granja'] for r in selected['opcoes_granja_fornecedores']}=={'30076','46697','29168'}
_,calls=run(granja_fornecedores=json.dumps([['30076',name],['46697','Outro fornecedor']]))
query,args=next((q,a) for q,a in calls if 'sum(ocorrencia)' in q)
assert args[args.index('30076'):args.index('30076')+4]==['30076',name,'46697','Outro fornecedor']
assert ' OR (granja IS NOT DISTINCT FROM %s AND fornecedor IS NOT DISTINCT FROM %s)' in query
for bad in ['invalid','{}','["30076"]','[["30076"]]','[[1,"X"]]']:
 try:run(granja_fornecedores=bad)
 except HTTPException as e:assert e.status_code==422
 else:raise AssertionError(bad)
run(granja_fornecedores=json.dumps([[None,name]]))
run(granja_fornecedores=json.dumps([['30076',"X'); DROP TABLE foo; --"]]))
run(granja_fornecedores=None,fornecedores=json.dumps([name])) # cliente antigo
print('PASS: paired bindings, no cross-product, cascade, pagination, sort, null, injection binding, legacy; formulas preserved; no database access')
