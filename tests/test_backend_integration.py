"""Testes do backend de trabalho; sem banco ou serviço de produção."""
import importlib.util
from pathlib import Path
from datetime import date, timedelta
from decimal import Decimal
from contextlib import contextmanager
import sys
import unittest
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT / "tests" / ".backend-test-deps"))
BACKEND = ROOT.parent / "_backend-zootecnico-referencia"
spec=importlib.util.spec_from_file_location("bi_generic",BACKEND / "__init__.py",submodule_search_locations=[str(BACKEND)])
module=importlib.util.module_from_spec(spec);sys.modules["bi_generic"]=module;spec.loader.exec_module(module)
from bi_generic import analytics as a, sql_utils as s, router as r
from bi_generic.registry import BI_REGISTRY
from starlette.requests import Request
from fastapi import HTTPException


def request(params=None):
    return Request({"type":"http","method":"GET","path":"/","query_string":urlencode(params or [],doseq=True).encode(),"headers":[]})

class Cursor:
    def __init__(self,rows): self.rows=rows
    def fetchall(self): return self.rows
    def fetchone(self): return self.rows[0] if self.rows else None

class Connection:
    def __init__(self,tables): self.tables=tables;self.queries=[]
    def execute(self,q,values=None):
        query=q.as_string();self.queries.append((query,values))
        for table,rows in self.tables.items():
            if '"'+table+'"' in query: return Cursor(rows)
        raise AssertionError(query)

@contextmanager
def bank(conn): yield conn

class BackendTests(unittest.TestCase):
    def test_registry_sources(self):
        self.assertEqual(BI_REGISTRY['historico-fechados']['table'],'mortalidade_peso_fechados')
        self.assertEqual(len(BI_REGISTRY['rxp']['sources']),2)
        for metric in BI_REGISTRY['zootecnico']['metrics'].values():
            if metric['aggregation']=='weighted_avg': self.assertEqual(metric['null_policy'],'valid_pairs')
        self.assertEqual(BI_REGISTRY['zootecnico']['date_column'],'data_de_abate')
    def test_numeric_safe(self):
        for v in ('1.234,56','nan','1e2','',None): self.assertIsNone(a.number(v))
        self.assertEqual(a.number(' -12,5 '),Decimal('-12.5'))
    def test_dates_safe(self):
        self.assertEqual(a.as_date('29/02/2024'),date(2024,2,29))
        self.assertEqual(a.as_date('2026-09-09T00:00:00'),date(2026,9,9))
        for v in ('31/02/2026','2026-13-01','0000-01-01','bad'): self.assertIsNone(a.as_date(v))
    def test_invalid_interval(self):
        for args in ([('data_inicio','2026-02-30')],[('data_inicio','2026-10-02'),('data_fim','2026-10-01')],[('data_inicio','2026-01-01'),('data_inicio','2026-01-02')]):
            with self.assertRaises(HTTPException) as cm: r.validar_periodo(request(args))
            self.assertEqual(cm.exception.status_code,422)
    def test_vazio_sql_valid_pairs(self):
        q=s.metrica_expr(BI_REGISTRY['zootecnico']['metrics']['vazio']).as_string()
        for part in ('< 7','> 18','THEN 14','IS NOT NULL'): self.assertIn(part,q)
    def test_calendar_sql_guarded(self):
        q=s.date_texto('data_de_abate').as_string()
        self.assertIn('make_date',q);self.assertIn('BETWEEN 1 AND 12',q);self.assertIn('EXTRACT(day',q)
    def test_or_and_parameterized(self):
        parts,values=s.condicoes(BI_REGISTRY['zootecnico'],{'produtor':['A','B'],'tecnico':['T']},data_inicio='2026-01-01')
        q=s.where_sql(parts).as_string()
        self.assertIn('IN (%s, %s)',q);self.assertIn(' AND ',q)
        self.assertNotIn("'A'",q);self.assertIn('A',values);self.assertIn(date(2026,1,1),values)
    def test_same_filter_ignored_in_facet(self):
        parts,values=s.condicoes(BI_REGISTRY['zootecnico'],{'produtor':['A'],'tecnico':['T']},ignorar='produtor')
        self.assertNotIn('A',values);self.assertIn('T',values)
    def test_weight_general_is_mean_of_means(self):
        c=BI_REGISTRY['lotes-abertos'];rows=[{'idade':21,'aves':100,'peso7':100,'peso14':300},{'idade':7,'aves':200,'peso7':200}]
        result=a.stats(rows,c,[7,14]);self.assertEqual(result['peso'],Decimal(225))
    def test_week_eligibility(self):
        c=BI_REGISTRY['lotes-abertos'];rows=[{'idade':7,'aves':100,'mort7':1,'disc7':1,'mort14':99},{'idade':14,'aves':300,'mort7':3,'mort14':6}]
        p=a.weekly(rows,c,[14])[0];self.assertEqual(p['mortes'],6);self.assertEqual(p['mortalidade'],2)
    def test_zero_denominator(self):
        self.assertIsNone(a.ratio(10,0,100));self.assertIsNone(a.mean([]));self.assertEqual(a.mean([Decimal(0)]),0)
    def test_history_weight_fallback(self):
        c=BI_REGISTRY['historico-fechados'];rows=[{'peso_abate':Decimal('2'),'aves':100},{'peso35':Decimal('1000'),'aves':100}]
        self.assertEqual(a.stats(rows,c,c['weeks'])['peso_atual'],Decimal('1.5'))
    def test_history_excludes_week42(self):
        c=BI_REGISTRY['historico-fechados'];row={'aves':100,'mort35':1,'mort42':90}
        self.assertEqual(a.stats([row],c,c['weeks'])['mortes'],1)
    def test_latest_snapshot_before_filter(self):
        c=BI_REGISTRY['lotes-abertos'];arrival=date(2026,9,20)
        rows=[{'id':1,'codigo':'A','lote':'1','galpao':'G','recepcao':arrival,'versao':date(2026,9,21),'aves':100},{'id':2,'codigo':'A','lote':'1','galpao':'G','recepcao':arrival,'versao':date(2026,9,22),'aves':200}]
        conn=Connection({'mortalidade_peso_abertos':rows})
        result=a.prepare_rows(conn,c,date(2026,10,1));self.assertEqual(len(result),1);self.assertEqual(result[0]['aves'],200)
    def test_incomplete_keys_remain_distinct(self):
        c=BI_REGISTRY['lotes-abertos'];rows=[{'id':i,'recepcao':'2026-09-20','aves':100} for i in [1,2]]
        self.assertEqual(len(a.prepare_rows(Connection({'mortalidade_peso_abertos':rows}),c,date(2026,10,1))),2)
    def test_filters_or_and(self):
        row={'produtor':'A','tecnico':'T','idade':21};c=BI_REGISTRY['lotes-abertos']
        self.assertTrue(a.match(row,{'produtor':['A','B'],'tecnico':['T']},c))
        self.assertFalse(a.match(row,{'produtor':['A','B'],'tecnico':['OTHER']},c))
    def test_rxp_uses_official_difference(self):
        c=BI_REGISTRY['rxp'];rows=[{'programada':100,'real':90,'difQtdeRxP':-3},{'programada':0,'real':0,'difQtdeRxP':None}]
        result=a.stats(rows,c,[]);self.assertEqual(result['diferenca'],-3);self.assertEqual(result['difPercent'],-3);self.assertEqual(result['registrosComDiferenca'],1)
    def test_technician_latest_and_ambiguous_name(self):
        spec=BI_REGISTRY['rxp']['technician_lookup']
        history=[{'cod_prod':'A','produtor':'Nome','tecnico':'Old','data_de_abate':'2026-01-01','id':1},{'cod_prod':'A','produtor':'Nome','tecnico':'New','data_de_abate':'2026-09-01','id':2},{'cod_prod':'B','produtor':'Nome','tecnico':'Other','data_de_abate':'2026-09-01','id':3}]
        rows=[{'codigo':'A','produtor':'Nome'},{'codigo':'X','produtor':'Nome'}];a.bind_technicians(rows,history,spec)
        self.assertEqual(rows[0]['tecnico'],'New');self.assertEqual(rows[1]['tecnico_vinculo'],'sem_vinculo')
    def test_both_sources_pagination_totals_no_union(self):
        c=BI_REGISTRY['rxp'];rows=[{'id':1,'data':'2026-09-01','produtor':'A','galpao':'G','lote':'1','codigo':'1','programada':'100','real':'90','difQtdeRxP':'-3'}]
        conn=Connection({'lotes_planejados_abate_ave_nova':[dict(rows[0])],'lotes_planejados_abate_real_alimentos':[dict(rows[0])],'base_dinamica':[]})
        result=a.query_payload(c,request([('tamanho','1')]),lambda:bank(conn),'detalhes')
        self.assertEqual(result['total'],2);self.assertEqual(len(result['dados']),1);self.assertEqual(result['cards']['programada'],200)
        self.assertEqual(set(result['fontes']),{x['table'] for x in c['sources']})
        self.assertFalse(any('UNION' in q or 'JOIN' in q for q,_ in conn.queries))
    def test_invalid_page_sort_filter(self):
        c=BI_REGISTRY['rxp'];conn=Connection({x['table']:[] for x in c['sources']} | {'base_dinamica':[]})
        for p in ([('tamanho','501')],[('pagina','0')],[('ordenar','injected')],[('unknown','x')]):
            with self.assertRaises(HTTPException) as cm:a.query_payload(c,request(p),lambda:bank(conn),'detalhes')
            self.assertEqual(cm.exception.status_code,422)
    def test_hierarchy_totals_not_double_counted(self):
        c=BI_REGISTRY['historico-fechados'];rows=[{'semana':'1','produtor':'A','galpao':str(i),'aves':100,'mort7':1} for i in [1,2]]
        tree=a.hierarchy(rows,c['hierarchy'],c,c['weeks']);self.assertEqual(tree[0]['cards']['aves'],200);self.assertEqual(len(tree[0]['children'][0]['children']),2)

if __name__=='__main__':unittest.main(verbosity=2)
