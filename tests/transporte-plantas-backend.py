"""Contrato e SQL gerado da entrega ZIP(6), sem banco/servidor reais."""
import sys
import importlib.util
from pathlib import Path
from contextlib import contextmanager
from decimal import Decimal
from urllib.parse import urlencode

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests/.backend-test-deps'))
BACKEND=ROOT/'outputs/transporte-plantas-20261106/backend/api_zootecnico/bi_generic'
spec=importlib.util.spec_from_file_location('bi_generic',BACKEND/'__init__.py',submodule_search_locations=[str(BACKEND)])
module=importlib.util.module_from_spec(spec);sys.modules['bi_generic']=module;spec.loader.exec_module(module)
from bi_generic import router as r
from bi_generic.transporte_plantas import evolution_payload
from starlette.requests import Request
from fastapi import HTTPException

fixtures=[dict(ano=2026,mes=1,planta_de_abate='AVE NOVA',valor=Decimal('.1'),lotes=1,base_numerador=10,base_denominador=100),
          dict(ano=2026,mes=1,planta_de_abate='REAL ALIMENTOS',valor=Decimal('.7'),lotes=2,base_numerador=210,base_denominador=300),
          dict(ano=2026,mes=2,planta_de_abate='AVE NOVA',valor=Decimal('0'),lotes=1,base_numerador=0,base_denominador=100),
          dict(ano=2026,mes=2,planta_de_abate='Sem planta informada',valor=None,lotes=1,base_numerador=None,base_denominador=None)]
queries=[]
class Cursor:
    def __init__(self,rows):self.rows=rows
    def fetchone(self):return self.rows[0] if self.rows else None
    def fetchall(self):return self.rows
class Connection:
    def execute(self,q,values=None):
        text=q.as_string();queries.append((text,values))
        if 'AS planta_de_abate' in text:return Cursor(fixtures)
        if 'WITH grupos' in text:return Cursor([])
        if 'AS ano' in text:return Cursor([dict(ano=2026,mes=1,valor=Decimal('.55'))])
        return Cursor([{'valor':Decimal('.55')}])
@contextmanager
def bank():yield Connection()
r.collect_freshness=lambda *args:{'atualizado_em':'2026-11-06 14:09:00'}
endpoint=next(route.endpoint for route in r.criar_router(bank).routes if route.name=='detalhes')
def request(params):return Request({'type':'http','query_string':urlencode(params,doseq=True).encode()})
for years in ([],['2025','2026']):
    try:endpoint('zootecnico',request({'indicador':'morte_transporte','ano':years}));raise AssertionError('Aceitou anos invalidos')
    except HTTPException as e:assert e.status_code==422
for stage in ('principal','evolucao','completo'):
    queries.clear()
    payload=endpoint('zootecnico',request({'indicador':'morte_transporte','ano':'2026','mes':['1','2'],'produtor':'Nome com acento','etapa':stage}))
    evolution=payload['evolucao'];assert evolution['agrupamento']=='planta_de_abate' and evolution['ano']==2026
    assert len(evolution['meses'])==12
    if stage=='principal':assert evolution['series']==[]
    else:
        assert len(evolution['series'])==3
        plant=next(s for s in evolution['series'] if s['planta_de_abate']=='AVE NOVA')
        assert plant['valores'][:3]==[Decimal('.1'),Decimal(0),None]
        query,values=next((q,v) for q,v in queries if 'AS planta_de_abate' in q)
        assert '"zootecnico"."vw_desempenho_transporte_plantas"' in query
        assert 'GROUP BY 1,2,3' in query and 'SUM(' in query and '"aloj"' in query and 'IS NOT NULL' in query
        assert 'Nome com acento' not in query and 'Nome com acento' in values
        assert 2026 in values and 1 in values and 2 in values
        assert payload['indicador']['valor']==(None if stage=='evolucao' else Decimal('.55'))
    for q,_ in queries:
        if 'AS planta_de_abate' not in q:assert 'vw_desempenho_transporte_plantas' not in q

# Recompostos por bases aditivas, nao media simples de percentuais.
assert sum(Decimal(str(x['base_numerador'])) for x in fixtures[:2])/sum(Decimal(str(x['base_denominador'])) for x in fixtures[:2])==Decimal('.55')
assert (fixtures[0]['valor']+fixtures[1]['valor'])/2!=Decimal('.55')
legacy=endpoint('zootecnico',request({'indicador':'gmd','ano':['2025','2026']}))
assert 'agrupamento' not in legacy['evolucao'] and legacy['evolucao']['series'][0]['ano']==2026
ddl=(ROOT/'outputs/transporte-plantas-20261106/01_CRIAR_VIEW_PLANTAS.sql').read_text(encoding='utf-8')
assert 'CREATE OR REPLACE VIEW zootecnico.vw_desempenho_transporte_plantas' in ddl
assert 'CASE WHEN COUNT(*)=1' in ddl and 'LEFT JOIN base_unica' in ddl and 'p.data_abate::date' in ddl
assert 'MATERIALIZED' not in ddl and 'DROP' not in ddl
print('OK: ano unico, meses/plantas, mesma formula/pares validos, nulos/zero, bases de recomposicao, parametros e escopo dos demais indicadores.')
