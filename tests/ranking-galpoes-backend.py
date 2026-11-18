"""Contrato e SQL composto da base atual recebida, com conexao simulada; nao acessa banco."""
import sys, importlib.util, ast, zipfile, json, os
from pathlib import Path
from contextlib import contextmanager
from urllib.parse import urlencode
from decimal import Decimal

ROOT=Path(__file__).resolve().parents[1]
DELIVERY=ROOT/os.environ.get('BI_RANKING_DELIVERY','outputs/ranking-galpoes-20261118-v2')
BASE_ZIP=Path(os.environ.get('BI_RANKING_BASE_ZIP',r'C:\Users\vchaves\Downloads\api_zootecnico.zip'))
BACKEND=DELIVERY/'backend-referencia/api_zootecnico'
sys.path.insert(0,str(ROOT/'tests/.backend-test-deps'))
spec=importlib.util.spec_from_file_location('bi_generic',BACKEND/'bi_generic/__init__.py',submodule_search_locations=[str(BACKEND/'bi_generic')])
module=importlib.util.module_from_spec(spec);sys.modules['bi_generic']=module;spec.loader.exec_module(module)
from bi_generic import router as api
from bi_generic.principal_contexto import query_principal_once
from psycopg import sql
from starlette.requests import Request

queries=[]
def group(name,n,d,**extra):
    return dict(nome=name,valor=Decimal(n)/Decimal(d) if d else None,lotes=1,
        base_numerador=n,base_denominador=d,valor_recomposto=Decimal('1.5'),sem_identificacao=False,**extra)
barns=[group('626B',50,100,galpao='626B',produtor='Atair'),group('626B',400,200,galpao='626B',produtor='Delcio')]
class Cursor:
    def __init__(self,rows):self.rows=rows
    def fetchall(self):return self.rows
    def fetchone(self):return self.rows[0] if self.rows else None
class Connection:
    def execute(self,query,args=None):
        text=query.as_string();args=list(args or []);queries.append((text,args))
        assert text.count('%s')==len(args),(text.count('%s'),len(args))
        if 'WITH "detalhes_contexto_principal" AS MATERIALIZED' in text:
            sections={'kpi':[{'valor':Decimal('1.5')}],'tecnicos':[group('Lucas',450,300)],'produtores':[group('Atair',50,100),group('Delcio',400,200)]}
            if "SELECT 'galpoes'" in text:sections['galpoes']=barns
            return Cursor([{'parte':key,'dados':row,'ordem':i} for key,rows in sections.items() for i,row in enumerate(rows)])
        if 'AS planta_de_abate' in text:return Cursor([{'ano':2026,'mes':1,'planta_de_abate':'AVE NOVA','valor':Decimal('1.5'),'lotes':2,'base_numerador':450,'base_denominador':300}])
        if 'AS ano' in text:return Cursor([{'ano':2026,'mes':1,'valor':Decimal('1.5')}])
        raise AssertionError('Unexpected query: '+text[:160])
@contextmanager
def bank():yield Connection()
api.collect_freshness=lambda *_:{'atualizado_em':'2026-11-18 08:05:00'}
endpoint=next(route.endpoint for route in api.criar_router(bank).routes if route.name=='detalhes')
filters={'ano':['2026'],'mes':['1'],'semana':['2'],'produtor':['Nome com acento'],'galpao':['626B'],'modelo':['Dark house'],'tipo_granja':['Integrada'],'tecnico':['Lucas'],'status_acerto':['Normal']}
def request(values):return Request({'type':'http','query_string':urlencode(values,doseq=True).encode()})

for metric in api.BI_REGISTRY['zootecnico']['metrics']:
    queries.clear()
    payload=endpoint('zootecnico',request({**filters,'indicador':metric,'etapa':'principal'}))
    assert len(queries)==1,'One statement for KPI and all three rankings'
    query,args=queries[0]
    assert query.count('WITH "detalhes_contexto_principal" AS MATERIALIZED')==1
    assert 'GROUP BY 1,2,3,4' in query and 'AS produtor' in query and 'AS galpao' in query
    assert '"galpao_exibicao"' in query and '"integrado"' in query
    assert args.count('626B')==4 and args.count('Nome com acento')==4
    assert payload['filtros']['galpao']==['626B'] and payload['filtros']['produtor']==['Nome com acento']
    result=payload['ranking_galpoes']
    assert len(result)==2 and len({x['nome'] for x in result})==2
    assert [x['galpao'] for x in result]==['626B','626B']
    assert {x['produtor'] for x in result}=={'Atair','Delcio'}
    assert result[0]['base_numerador']==50 and result[1]['base_denominador']==200
    assert payload['ranking_contexto']['galpoes']['valor_recomposto']==Decimal('1.5')
    assert payload['ranking_contexto']['metodo']==api.BI_REGISTRY['zootecnico']['metrics'][metric]['aggregation']
    if metric=='iep':assert 'bases_componentes' in result[0]
    if metric=='mortalidade':assert '_mt_registro_incluido' in query

# Completo retains evolution, and evolucao performs no ranking query.
for stage in ['completo','evolucao']:
    queries.clear();payload=endpoint('zootecnico',request({**filters,'indicador':'ca','etapa':stage}))
    assert len(queries)==(2 if stage=='completo' else 1)
    if stage=='evolucao':assert payload['ranking_galpoes']==[] and not any("SELECT 'galpoes'" in q for q,_ in queries)
    assert payload['evolucao']['series'][0]['valores'][0]==Decimal('1.5')

# Blank groups are retained for totals and marked as unidentified.
barns.append({**group('Galpao nao informado',0,0,produtor=None,galpao=None),'sem_identificacao':True})
payload=endpoint('zootecnico',request({**filters,'indicador':'ca','etapa':'principal'}))
assert payload['ranking_galpoes'][-1]['sem_identificacao'] and payload['ranking_contexto']['galpoes']['sem_identificacao']==1
barns.pop()

# Existing users of the shared helper keep the original three-section contract.
legacy=query_principal_once(Connection(),sql.Identifier('source'),[],[],sql.SQL('SUM(value)'),sql.SQL('SELECT 1 AS valor,1 AS nome'),sql.SQL('SELECT 1 AS valor,1 AS nome'))
assert len(legacy)==3

# Every file from the input ZIP is preserved except the two intended changes.
with zipfile.ZipFile(BASE_ZIP) as z:
    changed=[]
    for name in z.namelist():
        p=Path(name)
        if p.suffix not in ('.py','.json') or '__pycache__' in p.parts:continue
        actual=DELIVERY/'backend-referencia'/p
        if z.read(name)!=actual.read_bytes():changed.append(p.as_posix())
    assert sorted(changed)==['api_zootecnico/bi_generic/principal_contexto.py','api_zootecnico/bi_generic/router.py'],changed
for source in BACKEND.rglob('*.py'):ast.parse(source.read_text(encoding='utf-8-sig'))
print(json.dumps({'result':'PASS','metrics':len(api.BI_REGISTRY['zootecnico']['metrics']),'same_filters':True,'single_context':True,'distinct_producers_same_barn':True,'additive_components':True,'blank_groups':True,'changed_backend_files':2,'database_access':False}))
