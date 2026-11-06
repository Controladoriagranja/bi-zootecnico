"""Confere a API de entrega com os TXT e XLSX fornecidos, sem banco ou servidor."""
from pathlib import Path
from collections import defaultdict
from datetime import date
from decimal import Decimal
from contextlib import contextmanager
from urllib.parse import urlencode
import importlib.util
import sys
import re
import json

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests/.backend-test-deps'))
BACKEND=ROOT/'outputs/rxp-versoes-20261106/backend/api_zootecnico/bi_generic'
spec=importlib.util.spec_from_file_location('bi_generic',BACKEND/'__init__.py',submodule_search_locations=[str(BACKEND)])
module=importlib.util.module_from_spec(spec);sys.modules['bi_generic']=module;spec.loader.exec_module(module)
from bi_generic import analytics as a
from bi_generic.registry import BI_REGISTRY
from bi_generic.rxp_snapshots import latest_rows
from starlette.requests import Request
from openpyxl import load_workbook

c=BI_REGISTRY['rxp']
attachments=Path('C:/Users/vchaves/.codex/attachments')
inputs=[('lotes_planejados_abate_ave_nova','0f720691-d2f2-4968-b2ee-06815fcf7406'),
        ('lotes_planejados_abate_real_alimentos','87c36183-5652-41c0-8217-31c1fa1b6091')]
tables={}
for table,folder in inputs:
    lines=(attachments/folder/'Pasted text.txt').read_text(encoding='utf-8-sig').splitlines()
    start=next(i for i,line in enumerate(lines) if line.startswith('id\t'))
    header=lines[start].split('\t')
    tables[table]=[dict(zip(header,line.split('\t'))) for line in lines[start+1:]
                   if line.split('\t')[0].isdigit() and len(line.split('\t'))==len(header)]
fields=header[7:]
source=[]
footers={}
for filename in ['relatorio (26).xlsx','relatorio (27).xlsx']:
    book=load_workbook(Path('C:/Users/vchaves/Downloads')/filename,read_only=True,data_only=True)
    for rownum,row in enumerate(book.active.iter_rows(values_only=True),1):
        if rownum>=9 and re.match(r'^2026-\d{2}-\d{2}',str(row[0])):
            values=list(row[:15])+list(row[16:])  # P e coluna vazia do exportador Agrosys.
            assert len(values)==len(fields)
            source.append({**dict(zip(fields,values)),'_file':filename,'_row':rownum})
        if str(row[0]).startswith('Total ->'):
            footers[(filename,str(row[0]).replace('Total ->','').strip())]=[Decimal(str(row[i])) for i in [18,20,21]]
    book.close()
def clean(value):return None if value is None or str(value).strip() in ('','NULL') else str(value).strip()
for row in source:
    for field in fields:row[field]=clean(row[field])
def number(row,key):return Decimal(str(row.get(key) or 0))
def sums(rows,keys=('programada','real','difQtdeRxP')):
    return [sum((number(row,key) for row in rows),Decimal(0)) for key in keys]
def fetch(conn,config,table=None,*args,**kwargs):
    return [{alias:clean(raw.get(column)) for alias,column in config['columns'].items()} for raw in tables.get(table,[])]
a.fetch_rows=fetch
a.collect_freshness=lambda *args:{'atualizado_em':'2026-11-06 01:29:36.243551'}
a.bind_technicians=lambda *args:None
class Cursor:
    def fetchall(self):return []
class Connection:
    def execute(self,*args):return Cursor()
@contextmanager
def bank():yield Connection()
def query(action,**params):
    request=Request({'type':'http','query_string':urlencode(params,doseq=True).encode()})
    return a.query_payload(c,request,bank,action)
rows=a.prepare_rows(None,c,date(2026,11,6),lookup_technicians=False)
assert len(rows)==275 and sum(len(v) for v in tables.values())==315
for unit in ['AVE NOVA','REAL ALIMENTOS']:
    october=[row for row in rows if row['unidade']==unit and row['data'].startswith('2026-10')]
    assert sums(october)==footers[('relatorio (26).xlsx',unit)]
    expected=[row for row in source if row['destino']==unit and row['data'].startswith('2026-10')]
    assert sums(october)==sums(expected,('qtde_programada','qtde_real','dif_qtde_rxp'))
    barn=[row for row in rows if row['unidade']==unit and row['galpao']=='626B']
    assert len(barn)==1
    assert sums(barn)==([Decimal(3762),Decimal(3762),Decimal(0)] if unit=='AVE NOVA' else [Decimal(36463),Decimal(35904),Decimal(-559)])
    assert int(barn[0]['id'])==(77961 if unit=='AVE NOVA' else 59737)

for stage in ['principal','grupos','mensal','completo']:
    result=query('resumo',ano='2026',mes='10',etapa=stage)
    assert [result['cards'][key] for key in ['programada','real','diferenca']]==[4648051,4565894,-82157]
    assert result['rules_version']=='rxp-ultima-carga-20261106-v1'
    if stage=='mensal':assert result['monthly']['totals']['total']['diferenca']==-82157
details=query('detalhes',galpao='626B',tamanho='1')
assert details['total']==2 and details['total_paginas']==2
assert query('detalhes',galpao='626B',unidade='REAL ALIMENTOS')['cards']['diferenca']==-559

# Igualar a populacao da regra D-1: reais positivos ate 05/11. Nao atualizar valores das 01h.
d1=[row for row in rows if row['data']<='2026-11-05' and row['real'] is not None and row['real']>0]
assert sums([row for row in d1 if row['unidade']=='AVE NOVA'])==[3173808,3121720,-52088]
assert sums([row for row in d1 if row['unidade']=='REAL ALIMENTOS'])==[2220970,2184240,-36730]
source_map={tuple(row[field] for field in c['snapshot_dedup']['keys']):row for row in source}
different=[]
for row in rows:
    identity=tuple(str(row.get(field) or '').strip() if field not in c['snapshot_dedup']['dates'] else str(row[field])[:10] for field in c['snapshot_dedup']['keys'])
    # Exportacao da API normaliza data; a planilha traz hora 00:00:00.
    target=next(raw for key,raw in source_map.items() if tuple(str(raw[field])[:10] if field in c['snapshot_dedup']['dates'] else str(raw[field] or '').strip() for field in c['snapshot_dedup']['keys'])==identity)
    if row['real']!=Decimal(target['qtde_real']):different.append((row['galpao'],row['data'],str(row['real']),target['qtde_real']))
assert len(different)==7
assert [row for row in different if row[1]<='2026-11-05']==[('240C','2026-11-05','6915','10677')]

# Versao nova zerada deve retirar a antiga realizada, antes de filtros.
sample=dict(rows[0]);sample.update(fonte='test',id=1,atualizado='2026-11-03 08:00:00',real=100)
new={**sample,'id':2,'atualizado':'2026-11-06 01:00:00','real':0,'produtor':'Novo nome'}
chosen=latest_rows([sample,new],c['snapshot_dedup'])
assert chosen==[new] and not [row for row in chosen if row['real']>0]
assert not [row for row in chosen if row['produtor']==sample['produtor']]
# Linhas na mesma carga e retiradas em outro turno/fonte permanecem distintas.
same_batch={**new,'id':3,'real':50}
assert latest_rows([sample,new,same_batch],c['snapshot_dedup'])==[new,same_batch]
other_turn={**new,'turno':'Segundo'};other_source={**new,'fonte':'outra'}
assert len(latest_rows([new,other_turn,other_source],c['snapshot_dedup']))==3
missing={**new,'alojamento':None};assert len(latest_rows([missing,{**missing,'id':9}],c['snapshot_dedup']))==2
# Ausencia da configuracao deixa outras fontes/metricas sem a regra nova.
assert all('snapshot_dedup' not in config for name,config in BI_REGISTRY.items() if name!='rxp')
legacy=dict(c);legacy.pop('snapshot_dedup');assert len(a.prepare_rows(None,legacy,date(2026,11,6),lookup_technicians=False))==315
result={'resultado':'OK','linhas_originais':315,'versoes_atuais':275,'versoes_antigas_retiradas':40,
        'outubro_conferido':{'AVE NOVA':[2723067,2674897,-48170],'REAL ALIMENTOS':[1924984,1890997,-33987]},
        'galpao_626B_conferido':True,'d1_preservado':True,'diferencas_de_horario_preservadas':different,
        'facetas_cards_mensal_paginacao':True,'chaves_incompletas_preservadas':True,'mesma_carga_preservada':True,'banco_executado':False}
(ROOT/'outputs/rxp-versoes-20261106/VALIDACAO_PLANILHAS.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
fixture=query('detalhes',data_fim='2026-11-05',tamanho='500',ordenar='id',direcao='asc')
fixture['data_referencia']='2026-11-06'
fixture_path=ROOT/'outputs/rxp-versoes-20261106/_validacao/api_d1.json'
fixture_path.parent.mkdir(parents=True,exist_ok=True)
fixture_path.write_text(json.dumps(fixture,default=str,ensure_ascii=False),encoding='utf-8')
print(json.dumps(result,ensure_ascii=True))
