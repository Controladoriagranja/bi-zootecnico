"""IEP real de setembro e preservacao dos lotes com cadastro incompleto."""
from datetime import datetime
from decimal import Decimal
from pathlib import Path
import sys
import unittest

from test_backend_integration import a, s, r, BI_REGISTRY, bank, request
from test_details_reconciliation import Result
import duckdb

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from conferir_relatorio_iep import read_report, totals, REPORT


class MonthlyIndexTests(unittest.TestCase):
    def setUp(self):
        if not REPORT.exists(): self.skipTest('Relatorio real de setembro nao disponivel')
        self.rows=read_report()
        self.db=duckdb.connect(':memory:')
        self.db.execute('CREATE SCHEMA zootecnico')
        self.db.execute('CREATE MACRO btrim(x) AS trim(x)')
        fields={k for row in self.rows for k in row} - {'excel_row'}
        self.fields=['chave_lote','carregado_em']+sorted(fields)
        text={'chave_lote','codigo','integrado','tecnico','gal','lote','linh'}
        defs=','.join('"'+key+'" '+('VARCHAR' if key in text else 'TIMESTAMP' if key in {'data_abate','carregado_em'} else 'DOUBLE') for key in self.fields)
        self.db.execute('CREATE TABLE zootecnico.acerto_lote_resultado_geral('+defs+')')
        for row in self.rows:
            data={**row,'chave_lote':str(row['excel_row']),'carregado_em':datetime(2026,10,16)}
            data['data_abate']=datetime.fromisoformat(row['data_abate'].replace('Z','+00:00')).replace(tzinfo=None)
            self.db.execute('INSERT INTO zootecnico.acerto_lote_resultado_geral VALUES ('+','.join('?' for _ in self.fields)+')',[data[key] for key in self.fields])
        self.db.execute('''CREATE VIEW zootecnico.vw_desempenho_acerto AS
            SELECT a.*, 'Acertado' AS status_acerto, 'Integrada' AS tipo_granja,
              'Convencional Forrado' AS modelo, tecnico AS tecnico_exibicao,
              NULL::VARCHAR AS mort_transporte_2, NULL::VARCHAR AS cac_ref
            FROM zootecnico.acerto_lote_resultado_geral a
            WHERE NOT (codigo='24516' AND gal='522' AND lote='52')''')
        complete=(ROOT/'outputs/consolidacao-20261016/01_base_desempenho_completa.sql').read_text(encoding='utf-8')
        self.db.execute(complete)
        self.db.execute('CREATE VIEW zootecnico.vw_desempenho_acerto_portal AS SELECT * FROM zootecnico.vw_desempenho_acerto_completo')
        self.router=r.criar_router(lambda:bank(self))
        self.summary=next(route.endpoint for route in self.router.routes if route.path.endswith('/{bi}/resumo'))
        self.details=next(route.endpoint for route in self.router.routes if route.path.endswith('/{bi}/detalhes'))

    def execute(self,query,values=None):
        return Result(self.db.execute(query.as_string().replace('::numeric','::DOUBLE').replace('%s','?'),values or []))

    def tearDown(self):
        if hasattr(self,'db'): self.db.close()

    def test_actual_report_and_month_endpoint_reproduce_342_07(self):
        expected=totals(self.rows)
        self.assertEqual(len(self.rows),159)
        self.assertEqual(expected['iep'].quantize(Decimal('0.01')),Decimal('342.07'))
        response=self.summary('zootecnico',request([('ano','2026'),('mes','9')]))
        for metric,key in [('iep','iep'),('gmd','gpd'),('mortalidade','mortalidade_percent'),('ca','ca')]:
            value=response['indicadores'][metric]['por_ano']['2026'][8]
            self.assertAlmostEqual(float(value),float(expected[key]),places=9)
        self.assertEqual(round(response['indicadores']['iep']['totais']['2026'],2),342.07)

    def test_old_exclusion_is_removed_without_fabricating_type(self):
        result=self.db.execute("SELECT COUNT(*),MIN(tipo_granja) FROM zootecnico.vw_desempenho_acerto_portal WHERE codigo='24516' AND gal='522' AND lote='52'").fetchone()
        self.assertEqual(result,(1,'Não informado'))
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM zootecnico.vw_desempenho_acerto_portal').fetchone()[0],159)
        old=totals([row for row in self.rows if row['codigo']!='24516'])
        self.assertEqual(round(old['iep'],2),Decimal('342.02'))

    def test_missing_barn_is_display_label_not_join_key_or_exclusion(self):
        self.db.execute("UPDATE zootecnico.acerto_lote_resultado_geral SET gal=NULL WHERE codigo='24516'")
        result=self.db.execute("SELECT gal,galpao_exibicao FROM zootecnico.vw_desempenho_acerto_portal WHERE codigo='24516'").fetchone()
        self.assertEqual(result,(None,'Não informado'))
        response=self.summary('zootecnico',request([('ano','2026'),('mes','9'),('galpao','Não informado')]))
        self.assertGreater(response['indicadores']['aves_abatidas']['totais']['2026'],0)

    def test_index_reconciles_all_technicians_and_producers(self):
        result=self.details('zootecnico',request([('indicador','iep'),('ano','2026'),('mes','9')]))
        self.assertEqual(round(result['indicador']['valor'],2),342.07)
        for kind in ('tecnicos','produtores'):
            self.assertEqual(result['ranking_contexto'][kind]['lotes'],159)
            self.assertAlmostEqual(result['ranking_contexto'][kind]['valor_recomposto'],result['indicador']['valor'],places=8)
            rows=result['ranking_'+kind]
            parts={key:sum(row['bases_componentes'][key]['numerador'] for row in rows)/sum(row['bases_componentes'][key]['denominador'] for row in rows)
                   for key in ('gmd','mortalidade','ca')}
            rebuilt=parts['gmd']/1000*(100-parts['mortalidade'])/parts['ca']*100
            self.assertAlmostEqual(rebuilt,result['indicador']['valor'],places=8)

    def test_lineage_filter_uses_same_lots_and_formula(self):
        selected=[row for row in self.rows if row['linh']=='ROSS']
        self.assertTrue(selected)
        response=self.summary('zootecnico',request([('ano','2026'),('mes','9'),('linhagem','ROSS')]))
        self.assertAlmostEqual(float(response['indicadores']['iep']['totais']['2026']),float(totals(selected)['iep']),places=9)

    def test_other_year_month_and_annual_context_are_not_fixed_to_september(self):
        row=self.rows[0]
        data={**row,'chave_lote':'outro_ano','carregado_em':datetime(2026,10,16),'data_abate':datetime(2025,1,20)}
        self.db.execute('INSERT INTO zootecnico.acerto_lote_resultado_geral VALUES ('+','.join('?' for _ in self.fields)+')',[data[key] for key in self.fields])
        result=self.summary('zootecnico',request([('ano','2025'),('mes','1')]))
        expected=float(totals([row])['iep'])
        self.assertAlmostEqual(result['indicadores']['iep']['por_ano']['2025'][0],expected,places=9)
        self.assertNotAlmostEqual(expected,342.07,places=2)
        detail=self.details('zootecnico',request([('indicador','iep'),('ano','2025'),('mes','1')]))
        self.assertAlmostEqual(detail['indicador']['valor'],expected,places=9)
        annual=self.summary('zootecnico',request([('ano','2026')]))
        self.assertEqual(round(annual['indicadores']['iep']['totais']['2026'],2),342.07)


if __name__=='__main__': unittest.main(verbosity=2)
