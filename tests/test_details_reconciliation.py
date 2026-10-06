"""Executa as queries reais do endpoint com mais de 20 grupos e nomes ausentes."""
import unittest
import duckdb
from test_backend_integration import r, s, BI_REGISTRY, bank, request

class Result:
    def __init__(self, cursor):
        names=[column[0] for column in cursor.description]
        self.rows=[dict(zip(names,row)) for row in cursor.fetchall()]
    def fetchall(self):return self.rows
    def fetchone(self):return self.rows[0] if self.rows else None

class Database:
    def __init__(self):
        self.db=duckdb.connect(':memory:')
        self.queries=[]
        self.db.execute('CREATE SCHEMA zootecnico')
        self.db.execute('''CREATE TABLE zootecnico.vw_desempenho_acerto(
          data_abate TIMESTAMP,carregado_em TIMESTAMP,integrado VARCHAR,tecnico_exibicao VARCHAR,
          mort DOUBLE,aloj DOUBLE,qt_aves DOUBLE,ida DOUBLE,pes_total DOUBLE,consumo_racao DOUBLE,
          iep DOUBLE,cac DOUBLE,vazio_sanitario DOUBLE,mort_transporte_2 VARCHAR,cac_ref VARCHAR)''')
        for i in range(25):
            self.db.execute("INSERT INTO zootecnico.vw_desempenho_acerto VALUES ('2026-07-10','2026-10-06',?,?,?,?,?,?,?,?,?,?,?,?,?)",
              [None if i==24 else f'Produtor {i}',None if i==23 else f'Técnico {i%3}',
               i+10,(i+1)*100,(i+1)*80,40+i/10,(i+1)*240,(i+1)*400,
               300+i,None if i==2 else 1.7+i/100,None if i==4 else 10+i,'1.5','1.8'])
    def execute(self,q,values=None):
        query=q.as_string().replace('::numeric','::DOUBLE').replace('%s','?').replace('BTRIM(', 'TRIM(')
        self.queries.append(query)
        return Result(self.db.execute(query,values or []))

class DetailsReconciliationTests(unittest.TestCase):
    def test_progressive_summary_keeps_full_totals_and_skips_repeated_totals(self):
        conn=Database()
        try:
            router=r.criar_router(lambda:bank(conn))
            endpoint=next(route.endpoint for route in router.routes if route.path.endswith('/{bi}/resumo'))
            complete=endpoint('zootecnico',request([('ano','2026')]))
            first=endpoint('zootecnico',request([('ano','2026'),('mes_carga','1'),('mes_carga','2')]))
            self.assertEqual(first['anos'],[2026])
            self.assertEqual(first['indicadores']['aves_abatidas']['totais'],complete['indicadores']['aves_abatidas']['totais'])
            self.assertIsNone(first['indicadores']['aves_abatidas']['por_ano']['2026'][6])
            before=len(conn.queries)
            july=endpoint('zootecnico',request([('ano','2026'),('mes_carga','7'),('mes_carga','8'),('incluir_totais','0')]))
            self.assertEqual(len(conn.queries)-before,1)
            self.assertEqual(july['indicadores']['aves_abatidas']['por_ano']['2026'][6],complete['indicadores']['aves_abatidas']['por_ano']['2026'][6])
        finally:conn.db.close()

    def test_progressive_details_matches_complete_without_repeating_rankings(self):
        conn=Database()
        try:
            router=r.criar_router(lambda:bank(conn))
            endpoint=next(route.endpoint for route in router.routes if route.path.endswith('/{bi}/detalhes'))
            params=[('indicador','ca'),('ano','2026')]
            complete=endpoint('zootecnico',request(params))
            main=endpoint('zootecnico',request(params+[('etapa','principal')]))
            self.assertEqual(main['indicador'],complete['indicador'])
            self.assertEqual(main['ranking_produtores'],complete['ranking_produtores'])
            self.assertEqual(main['evolucao']['series'],[])
            before=len(conn.queries)
            evolution=endpoint('zootecnico',request(params+[('etapa','evolucao')]))
            self.assertEqual(len(conn.queries)-before,1)
            self.assertEqual(evolution['evolucao'],complete['evolucao'])
        finally:conn.db.close()

    def test_every_metric_recomposes_complete_groups_and_keeps_performance_value(self):
        conn=Database()
        try:
            router=r.criar_router(lambda:bank(conn))
            endpoint=next(route.endpoint for route in router.routes if route.path.endswith('/{bi}/detalhes'))
            for metric in BI_REGISTRY['zootecnico']['metric_order']:
                with self.subTest(metric=metric):
                    result=endpoint('zootecnico',request([('indicador',metric),('ano','2026'),('mes','7')]))
                    expected=conn.execute(s.sql.SQL('SELECT {} AS valor FROM zootecnico.vw_desempenho_acerto').format(s.metrica_expr(BI_REGISTRY['zootecnico']['metrics'][metric]))).fetchone()['valor']
                    self.assertAlmostEqual(result['indicador']['valor'],expected,places=8)
                    self.assertEqual(len(result['ranking_produtores']),25)
                    self.assertEqual(result['ranking_contexto']['produtores']['lotes'],25)
                    for kind in ('tecnicos','produtores'):
                        context=result['ranking_contexto'][kind]
                        self.assertEqual(context['sem_identificacao'],1)
                        self.assertAlmostEqual(context['valor_recomposto'],expected,places=8)
                    if metric=='aves_abatidas':
                        for kind in ('tecnicos','produtores'):
                            self.assertEqual(sum(row['valor'] for row in result['ranking_'+kind]),expected)
            self.assertTrue(any('WITH grupos' in q for q in conn.queries))
            self.assertFalse(any('LIMIT 20' in q for q in conn.queries))
        finally:conn.db.close()

if __name__=='__main__':unittest.main()
