"""Contrato das rotas genericas com conexao simulada, sem acesso ao banco."""
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime
import sys, importlib.util, json, ast
from urllib.parse import urlencode

ROOT=Path(__file__).resolve().parents[1]
BACKEND=ROOT/'outputs/acompanhamento-lanc-mortalidades-20261123/backend-referencia/api_zootecnico'
sys.path.insert(0,str(ROOT/'tests/.backend-test-deps'))
spec=importlib.util.spec_from_file_location('bi_generic',BACKEND/'bi_generic/__init__.py',submodule_search_locations=[str(BACKEND/'bi_generic')])
pkg=importlib.util.module_from_spec(spec);sys.modules['bi_generic']=pkg;spec.loader.exec_module(pkg)
from bi_generic.router import criar_router
from bi_generic.registry import BI_REGISTRY
from bi_generic.table_rows import expression
from starlette.requests import Request
from fastapi import HTTPException

BI='acompanhamento-mortalidades';config=BI_REGISTRY[BI]
queries=[]
class Cursor:
 def __init__(self,rows):self.rows=rows
 def fetchall(self):return self.rows
 def fetchone(self):return self.rows[0]
class Connection:
 def execute(self,q,args=()):
  text=q.as_string();queries.append((text,list(args)))
  assert text.count('%s')==len(args),(text,args)
  assert '"zootecnico"."acompanhamento_lotes_criacao"' in text
  assert '"idade_atual" AS "idade"' in text
  assert '"idade_ultima_mortalidade" AS "idd_umo"' in text
  assert '"idade_ultimo_peso" AS "idd_ups"' in text
  assert '("idade" - "idd_umo") AS "dias_atraso"' in text
  assert '"idd_ups" < 35' in text and '> 8' in text
  if ' AS filtro' in text:return Cursor([{'filtro':key,'valores':['052'] if key=='unidade' else []}for key in config['filters']])
  if 'COUNT(*) AS total' in text:
   assert 'MAX("coletado_em") FROM source' in text
   return Cursor([{'total':244,'atualizado_em':datetime.fromisoformat('2026-11-19T17:33:57-03:00')}])
  return Cursor([{'granja':'14660','galpao':'477','tecnico':'HRN','idade':14,'idd_umo':14,'dias_atraso':0,'glp':'477','tec':'HRN','status_peso':''}])
@contextmanager
def bank():yield Connection()
endpoints={r.name:r.endpoint for r in criar_router(bank).routes if r.name in ('filtros','resumo','detalhes')}
def request(values):return Request({'type':'http','query_string':urlencode(values,doseq=True).encode()})
options=endpoints['filtros'](BI,request({'unidade':'052','tecnico':'HRN'}))
assert options['unidade']==['052'] and len(queries)==1
query,args=queries[-1];assert args.count('052')==len(config['filters'])-1
assert 'CURRENT_TIMESTAMP' not in query
queries.clear()
payload=endpoints['detalhes'](BI,request({'unidade':'052','granja':'14660','pagina':'2','tamanho':'100','ordenar':'dias_atraso','direcao':'desc'}))
assert len(queries)==2 and queries[-1][1][-2:]==[100,100]
assert payload['total']==244 and payload['total_paginas']==3
assert payload['atualizado_em']=='2026-11-19T17:33:57-03:00'
assert payload['dados'][0]['dias_atraso']==0
assert '052' in queries[-1][1] and '14660' in queries[-1][1]
for invalid in [{'pagina':'0'},{'ordenar':'DROP TABLE'},{'direcao':'sideways'},{'unknown':'x'}]:
 try:endpoints['detalhes'](BI,request(invalid))
 except HTTPException as e:assert e.status_code==422
 else:raise AssertionError(invalid)
for source in BACKEND.rglob('*.py'):ast.parse(source.read_text(encoding='utf-8-sig'))
assert config['columns']['idade']=='idade_atual'
assert config['computed']['status_peso']['required']==['idade','idd_ups']
print(json.dumps({'result':'PASS','source':'physical table','freshness':'MAX(coletado_em)','one_facet_statement':True,'bound_parameters':True,'pagination':True,'sort':True,'leading_zeros':True,'zero_preserved':True,'no_database_access':True}))
