"""Autorizacao real de SQL sobre dados sinteticos locais; sem rede/banco de producao."""
from pathlib import Path
import sys, asyncio, json, importlib.util, ast, os
from contextlib import contextmanager
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('ACOMPANHAMENTO_TEST_OUT',ROOT/'outputs/acesso-tecnicos-acompanhamento-20261124'))
BASE=Path(os.environ.get('ACOMPANHAMENTO_TEST_BASE',ROOT/'outputs/correcao-acesso-acompanhamento-20261124/backend/api_zootecnico'))
sys.dont_write_bytecode=True
sys.path[:0]=[str(BASE),str(ROOT/'tests/.backend-test-deps')]
spec=importlib.util.spec_from_file_location('checked_access',Path(os.environ.get('ACOMPANHAMENTO_TEST_ACCESS',OUT/'api_zootecnico/zootecnico_acesso.py')))
access=importlib.util.module_from_spec(spec);sys.modules[spec.name]=access;spec.loader.exec_module(access)
from fastapi import HTTPException
from starlette.requests import Request
from starlette.responses import JSONResponse
from bi_generic.router import criar_router
import duckdb

raw=duckdb.connect(':memory:')
raw.execute("CREATE SCHEMA zootecnico")
raw.execute("CREATE MACRO BTRIM(v) AS trim(v)")
raw.execute("CREATE MACRO to_jsonb(v) AS to_json(v)")
raw.execute("""CREATE TABLE zootecnico.acompanhamento_lotes_criacao (
 granja TEXT, galpao TEXT, tecnico TEXT, idade_atual DOUBLE, idade_ultima_mortalidade DOUBLE,
 idade_ultimo_peso DOUBLE, unidade TEXT, empresa TEXT, lote TEXT, data_base DATE,
 chave_lote TEXT, carga_id TEXT, coletado_em TIMESTAMP)""")
for key,tech,company,day in [('cvb','CVB','1','2026-11-23'),('hrn','HRN','1','2026-11-23'),
 ('ego','EGO','1','2026-11-23'),('unknown','NEW','1','2026-11-23'),
 ('cvb','HRN','2','2026-11-23'),('cvb','HRN','1','2026-11-19')]:
 raw.execute("INSERT INTO zootecnico.acompanhamento_lotes_criacao VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
 ['14660','477',tech,18,17,14,'052',company,'0065',day,key,'load-'+day,day+' 14:00:00-03'])
class Cursor:
 def __init__(self,cursor):
  self.rows=[dict(zip([d[0] for d in cursor.description],r)) for r in cursor.fetchall()]
  for row in self.rows:
   if 'valores' in row:row['valores']=json.loads(row['valores'])
 def fetchone(self):return self.rows[0] if self.rows else None
 def fetchall(self):return self.rows
class Connection:
 connection=None
 from psycopg import adapters
 def execute(self,q,params=None,**kwargs):
  text=q if isinstance(q,str) else q.as_string()
  # Apenas compatibilidade do agregado JSON PostgreSQL no motor local.
  text=text.replace('jsonb_agg(valor ORDER BY valor)','to_json(list(valor ORDER BY valor))').replace('::jsonb','::JSON')
  return Cursor(raw.execute(text.replace('%s','?'),params or []))
@contextmanager
def bank():yield access.scoped_connection(Connection())
endpoints={r.name:r.endpoint for r in criar_router(bank).routes if r.name in ('filtros','detalhes')}
def request(action,params=''):
 return Request({'type':'http','path':'/api/bi/acompanhamento-mortalidades/'+action,'headers':[],'query_string':params.encode()})
def query(action,scope,params=''):
 marker=access.CURRENT.set(scope)
 try:return endpoints[action]('acompanhamento-mortalidades',request(action,params))
 finally:access.CURRENT.reset(marker)
source='acompanhamento_lotes_criacao'
general=access.Access(1,'todos')
own=access.Access(2,'proprio',((source,'CVB','t1'),))
team=access.Access(3,'equipe',((source,'CVB','t1'),(source,'HRN','t2')))
latest='data_base=2026-11-23'
for scope,expected,count in [(own,{'CVB'},1),(team,{'CVB','HRN'},3),(general,{'CVB','HRN','EGO','NEW'},5)]:
 result=query('detalhes',scope,latest)
 assert {r['tecnico'] for r in result['dados']}==expected
 assert result['total']==count,(scope,result)
 options=query('filtros',scope,latest)
 assert set(options['tecnico'])==expected
 assert all(r['data_base'].isoformat()=='2026-11-23' for r in result['dados'])
 assert result['atualizado_em'] is not None
assert query('detalhes',own,latest+'&tecnico=HRN')['total']==0
assert query('detalhes',team,latest+'&tecnico=EGO')['total']==0
assert query('detalhes',own,latest+'&tecnico=CVB&tecnico=HRN')['total']==1
assert query('detalhes',own,latest+'&tecnico=CVB%27+OR+1%3D1--')['total']==0
assert query('detalhes',access.Access(2,'proprio'),latest)['total']==0
assert all(not value for value in query('filtros',access.Access(2,'proprio'),latest).values())
assert query('detalhes',own,'data_base=2026-11-19')['total']==0 # outro responsavel historico
try:query('detalhes',access.Access(0,'none'),latest)
except HTTPException as e:assert e.status_code==403
else:raise AssertionError('Sem permissao recebeu dados')
# Alias duplicado para duas identidades nao deve ser aceito.
payload=dict(ok=True,allowed=True,resource='zootecnico',reportId=13,userId=2,mode='proprio',technicianIds=['t1'],aliases=[dict(fonte=source,valor='CVB',entidade_id='t1')])
assert access.validate_access(payload)==own
try:access.validate_access({**payload,'aliases':payload['aliases']*2})
except HTTPException as e:assert e.status_code==403
else:raise AssertionError('Alias ambiguo aceito')
# Conflito dentro da mesma carga/chave: nao revelar as linhas conflitantes.
raw.execute("INSERT INTO zootecnico.acompanhamento_lotes_criacao SELECT granja,galpao,'HRN',idade_atual,idade_ultima_mortalidade,idade_ultimo_peso,unidade,empresa,lote,data_base,chave_lote,carga_id,coletado_em FROM zootecnico.acompanhamento_lotes_criacao WHERE tecnico='CVB'")
assert query('detalhes',own,latest)['total']==0
async def check():
 for action in ('filtros','detalhes'):
  req=request(action)
  assert access.route_policy(req.url.path)=='scoped'
  async def handler(req):
   assert access.CURRENT.get()==own
   return JSONResponse({'ok':True})
  with patch.object(access,'resolve_access',return_value=own):
   assert (await access.dispatch(req,handler)).status_code==200
  assert access.CURRENT.get() is None
  with patch.object(access,'resolve_access',side_effect=HTTPException(403,'Negado')):
   assert (await access.dispatch(request(action),handler)).status_code==403
asyncio.run(check())
for file in [*OUT.glob('api_zootecnico/**/*.py'),*OUT.glob('central/api/*.py')]:ast.parse(file.read_text(encoding='utf-8-sig'))
print(json.dumps({'result':'PASS','actual_scoped_SQL':True,'own':True,'team':True,'general':True,'facets_scoped':True,'cross_technician_denied':True,'historical_owner':True,'same_key_other_company':True,'revocation':True,'conflicts_denied':True,'no_production_access':True}))
