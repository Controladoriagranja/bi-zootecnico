"""Data global das fontes fisicas; backend isolado baseado no ZIP atual do usuario."""
from pathlib import Path
from datetime import datetime, timezone
from contextlib import contextmanager
import importlib.util
import sys
import unittest
import ast
from zipfile import ZipFile

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests/.backend-test-deps'))
BACKEND=ROOT/'outputs/atualizacao-dados-20261020/backend-corrigido'
spec=importlib.util.spec_from_file_location('bi_generic',BACKEND/'bi_generic/__init__.py',submodule_search_locations=[str(BACKEND/'bi_generic')])
package=importlib.util.module_from_spec(spec);sys.modules['bi_generic']=package;spec.loader.exec_module(package)
from bi_generic.freshness import collect_freshness, SPECS, CATALOG, as_local
from bi_generic.registry import BI_REGISTRY
from bi_generic import router,analytics,gpd_fases
from starlette.requests import Request
from urllib.parse import urlencode
import duckdb


class Result:
    def __init__(self,cursor=None):
        fields=[c[0] for c in cursor.description] if cursor else []
        self.rows=[dict(zip(fields,row)) for row in cursor.fetchall()] if cursor else []
        # information_schema do DuckDB usa TIMESTAMP; PostgreSQL usa o nome abaixo.
        for row in self.rows:
            if row.get('data_type')=='TIMESTAMP':row['data_type']='timestamp without time zone'
    def fetchall(self):return self.rows
    def fetchone(self):return self.rows[0] if self.rows else None


class Connection:
    def __init__(self,db,metadata_only=False):self.db=db;self.calls=[];self.metadata_only=metadata_only
    def execute(self,query,values=None):
        query=query.as_string() if hasattr(query,'as_string') else query
        self.calls.append(query)
        if self.metadata_only and ' AS data_carga FROM ' not in query:return Result()
        return Result(self.db.execute(query.replace('%s','?'),values or []))


def request(params=[]):return Request({'type':'http','method':'GET','path':'/','query_string':urlencode(params).encode(),'headers':[]})
@contextmanager
def bank(conn):yield conn


class FreshnessTests(unittest.TestCase):
    def setUp(self):
        self.db=duckdb.connect();self.db.execute('CREATE SCHEMA zootecnico');self.db.execute('CREATE MACRO btrim(v) AS trim(v)')
        loads={'acerto_lote_resultado_geral':'2026-10-19 19:18:42.43278',
          'mortalidade_peso_abertos':'2026-10-20 09:00:46.778145','mortalidade_peso_fechados':'2026-10-20 08:05:00',
          'lotes_planejados_abate_ave_nova':'2026-10-20 07:00:00','lotes_planejados_abate_real_alimentos':'2026-10-19 21:00:00',
          'snapshot_acerto':'2026-10-16 14:09:12.860716','snapshot_historico':'2026-10-16 17:00:00'}
        for table,day in loads.items():
            self.db.execute(f'CREATE TABLE zootecnico.{table} (carregado_em TIMESTAMP)')
            self.db.execute(f'INSERT INTO zootecnico.{table} VALUES (?)',[day])
        for view,source in [('vw_desempenho_acerto_portal','snapshot_acerto'),('vw_desempenho_acerto','acerto_lote_resultado_geral'),
                            ('vw_desempenho_acerto_completo','acerto_lote_resultado_geral'),
                            ('vw_historico_lotes_criacao_portal','snapshot_historico'),('vw_historico_lotes_criacao','mortalidade_peso_abertos')]:
            self.db.execute(f'CREATE VIEW zootecnico.{view} AS SELECT * FROM zootecnico.{source}')
        self.conn=Connection(self.db)

    def tearDown(self):self.db.close()

    def test_physical_source_not_cache_and_no_filters(self):
        meta=collect_freshness(self.conn,SPECS['zootecnico'])
        self.assertEqual(meta['atualizado_em'],'2026-10-19T19:18:42-03:00')
        cache=meta['atualizacao_dados']['cache']
        self.assertTrue(cache['base_principal_defasada'])
        self.assertEqual(cache['carga_base_preservada_em'],'2026-10-16T14:09:12-03:00')
        self.assertNotIn(' WHERE ',self.conn.calls[0])

    def test_two_sources_choose_oldest_max_and_empty_is_unknown(self):
        self.assertEqual(collect_freshness(self.conn,SPECS['historico-abertos'])['atualizado_em'],'2026-10-20T08:05:00-03:00')
        self.assertEqual(collect_freshness(self.conn,SPECS['gpd-fases'])['atualizado_em'],'2026-10-19T19:18:42-03:00')
        self.db.execute('DELETE FROM zootecnico.mortalidade_peso_fechados')
        self.assertIsNone(collect_freshness(self.conn,SPECS['historico-abertos'])['atualizado_em'])

    def test_all_screens_have_explicit_physical_sources(self):
        for screen in ('zootecnico','gpd-fases','lotes-abertos','historico-abertos','rxp'):
            self.assertEqual(BI_REGISTRY[screen]['freshness'],SPECS[screen])
            self.assertTrue(all(not source['table'].startswith(('vw_','mv_')) for source in SPECS[screen]['sources']))

    def test_aggregation_functions_identical_to_received_zip(self):
        with ZipFile(Path.home()/'Downloads/api_zootecnico(2).zip') as zipped:
            for file,names in [('analytics.py',('number','weekly','stats','groups','hierarchy')),
                               ('gpd_fases.py',('key','latest_closed','phase_bases','aggregate','build_payload'))]:
                old=ast.parse(zipped.read('api_zootecnico/bi_generic/'+file).decode('utf-8-sig'))
                new=ast.parse((BACKEND/'bi_generic'/file).read_text(encoding='utf-8-sig'))
                for name in names:
                    find=lambda tree:next(node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name==name)
                    self.assertEqual(ast.dump(find(old)),ast.dump(find(new)),name)

    def test_timezone_and_null_validation_no_now_fallback(self):
        self.assertEqual(as_local(datetime(2026,10,20,8,5)).isoformat(),'2026-10-20T08:05:00-03:00')
        self.assertEqual(as_local(datetime(2026,10,20,11,5,tzinfo=timezone.utc)).isoformat(),'2026-10-20T08:05:00-03:00')
        for value in [None,'bad','2026-02-30 08:00','2026-10-20']:
            self.assertIsNone(as_local(value))

    def test_memo_reuses_source_query_and_raw_cache_stays_separate(self):
        memo={}
        a=collect_freshness(self.conn,CATALOG['vw_desempenho_acerto'],memo)
        b=collect_freshness(self.conn,CATALOG['vw_desempenho_acerto_completo'],memo)
        self.assertEqual(a,b);self.assertEqual(len(self.conn.calls),1)
        collect_freshness(self.conn,CATALOG['vw_desempenho_acerto_portal'],memo)
        self.assertEqual(len(self.conn.calls),2)

    def test_summary_details_gpd_and_cohort_publish_global_metadata(self):
        conn=Connection(self.db,metadata_only=True)
        routes=router.criar_router(lambda:bank(conn)).routes
        summary=next(r.endpoint for r in routes if r.path.endswith('/{bi}/resumo'))
        details=next(r.endpoint for r in routes if r.path.endswith('/{bi}/detalhes'))
        for response in [summary('zootecnico',request([('ano','2023'),('mes','1')])),
                         details('zootecnico',request([('indicador','gmd'),('ano','2023')])),
                         summary('gpd-fases',request([('ano','2023')])),
                         analytics.query_payload(BI_REGISTRY['historico-abertos'],request(),lambda:bank(conn),'resumo')]:
            self.assertIn('atualizacao_dados',response)
            self.assertIn('-03:00',response['atualizado_em'])
        response=summary('zootecnico',request([('incluir_totais','0')]))
        self.assertIsNone(response['atualizado_em'])

    def test_portal_listing_preserves_count_and_exposes_source_and_cache(self):
        portal_spec=importlib.util.spec_from_file_location('portal_current',BACKEND/'portal_router.py')
        portal=importlib.util.module_from_spec(portal_spec);portal_spec.loader.exec_module(portal)
        routes=portal.criar_router_portal(lambda:bank(self.conn)).routes
        modulos=next(r.endpoint for r in routes if r.path.endswith('/modulos'))
        result=modulos()
        tables=next(m['tabelas'] for m in result['modulos'] if m['id']=='zootecnico')
        row=next(t for t in tables if t['tabela']=='vw_desempenho_acerto_portal')
        self.assertEqual(row['registros'],1)
        self.assertEqual(row['ultima_carga'],'2026-10-19T19:18:42-03:00')
        self.assertEqual(row['ultima_carga_snapshot'],'2026-10-16T14:09:12-03:00')
        self.assertTrue(row['atualizacao_dados']['cache']['base_principal_defasada'])


if __name__=='__main__':unittest.main()
