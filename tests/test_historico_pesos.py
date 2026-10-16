"""View SQL em DuckDB e contrato real da API; PostgreSQL de producao pendente."""
from datetime import date
from decimal import Decimal
from pathlib import Path
import sys
import unittest

from test_backend_integration import a, BI_REGISTRY, bank, request
import duckdb

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from preparar_historico_pesos import view_sql, data_segura


class Cursor:
    def __init__(self, cursor):
        fields = [col[0] for col in cursor.description]
        self.rows = [dict(zip(fields, row)) for row in cursor.fetchall()]

    def fetchall(self):
        return self.rows


class Connection:
    def __init__(self, db):
        self.db = db

    def execute(self, query, values=None):
        return Cursor(self.db.execute(query.as_string().replace('%s', '?'), values or []))


class HistoryWeightsTests(unittest.TestCase):
    def setUp(self):
        self.config = BI_REGISTRY['historico-abertos']
        self.db = duckdb.connect(':memory:')
        self.db.execute('CREATE SCHEMA zootecnico')
        self.db.execute('CREATE MACRO btrim(v) AS trim(v)')
        columns = set(self.config['columns'].values()) - {'ps_abate_historico', 'vezes_maior_historico', 'recepcao_dia_cache'}
        columns.update({'periodo_fim','data_recepcao'})
        defs = ','.join('"'+col+'" '+('BIGINT' if col == 'id' else 'DATE' if col == 'periodo_fim' else 'VARCHAR') for col in sorted(columns))
        self.db.execute('CREATE TABLE zootecnico.mortalidade_peso_abertos('+defs+')')
        self.db.execute('''CREATE TABLE zootecnico.mortalidade_peso_fechados(
            id BIGINT, periodo_fim DATE, codigo_granja VARCHAR, galp VARCHAR,
            num_lote VARCHAR, data_recepcao VARCHAR, ps_abate VARCHAR)''')
        self.db.execute('''INSERT INTO zootecnico.mortalidade_peso_abertos
            (id,periodo_fim,codigo_granja,galp,num_lote,data_recepcao,ps_pinto,
             aves_inicia,qtde_mort_sem_07,peso_med_35,nome_granja,semana_ano) VALUES
            (1,'2026-08-30','3930','266','91','2026-08-26','40','500','50','1000','A','35'),
            (31614,'2026-08-31','3930','266','91','2026-08-26','44.6','1000','5','1900','A','35'),
            (31612,'2026-08-31','1950','12F','158','2026-08-26','44.805','2000','10','2000','B','35'),
            (4,'2026-08-31','999','X','1','2026-08-26','50','3000','15','2100','B','35')''')
        self.db.execute('''INSERT INTO zootecnico.mortalidade_peso_fechados VALUES
            (1,'2026-09-30','3930','266','91','26/08/2026','2'),
            (78413,'2026-10-16','3930','266','91','2026-08-26 00:00:00','2.7'),
            (78414,'2026-10-16','3930','266','91','2026-08-26 00:00:00','2.919'),
            (78421,'2026-10-16','1950','12F','158','26/08/2026','2,336'),
            (10,'2026-10-16','999','X','2','2026-08-26','9'),
            (11,'2026-10-16','999','X','1','2026-08-25','9'),
            (12,'2026-10-16','998','X','1','2026-08-26','9'),
            (13,'2026-10-16','999','Y','1','2026-08-26','9')''')
        # DuckDB defaults NUMERIC to fixed scale; DOUBLE emulates PG numeric
        # precision for these decimal fixtures. Production SQL remains NUMERIC.
        self.db.execute(view_sql().replace('::numeric', '::DOUBLE').replace(
            "INTERVAL '1 month - 1 day'", "(INTERVAL '1 month' - INTERVAL '1 day')"))
        date_sql=data_segura('v.data_recepcao').replace("INTERVAL '1 month - 1 day'", "(INTERVAL '1 month' - INTERVAL '1 day')")
        self.db.execute('CREATE VIEW zootecnico.vw_historico_lotes_criacao_portal AS SELECT v.*, '+date_sql+' AS recepcao_dia_cache FROM zootecnico.vw_historico_lotes_criacao v')
        self.conn = Connection(self.db)

    def tearDown(self):
        self.db.close()

    def payload(self, params=None):
        return a.query_payload(self.config, request(params or [('ano','2026')]), lambda:bank(self.conn), 'resumo')

    def test_view_preserves_rows_and_latest_closed_snapshot(self):
        rows = self.db.execute('SELECT id,id_fechado_historico,ps_abate_historico FROM zootecnico.vw_historico_lotes_criacao ORDER BY id').fetchall()
        self.assertEqual(len(rows),4)
        self.assertEqual(rows[-1],(31614,78414,2.919))
        self.assertEqual(rows[1],(4,None,None))
        result=self.payload()
        self.assertEqual(result['cards']['lotes'],3)
        self.assertEqual(result['cards']['aves'],6000)
        self.assertEqual(result['cards']['mortes'],30)
        self.assertEqual(result['cards']['mortalidade'],Decimal('0.5'))

    def test_user_samples_units_and_display_rounding(self):
        rows=self.db.execute('SELECT id,vezes_maior_historico FROM zootecnico.vw_historico_lotes_criacao WHERE id IN (31614,31612) ORDER BY id').fetchall()
        self.assertEqual([round(r[1],1) for r in rows],[52.1,65.4])
        self.assertAlmostEqual(rows[1][1],2.919*1000/44.6,places=10)

    def test_group_and_total_average_individual_ratios_not_ratio_of_averages(self):
        result=self.payload(); cards=result['cards']
        expected=(2.919*1000/44.6+2.336*1000/44.805)/2
        self.assertAlmostEqual(float(cards['vezes_maior']),expected,places=10)
        self.assertAlmostEqual(float(cards['peso_pinto']),(44.6+44.805+50)/3,places=10)
        self.assertAlmostEqual(float(cards['peso_abate_final']),(2.919+2.336)/2,places=10)
        self.assertNotAlmostEqual(float(cards['vezes_maior']),float(cards['peso_abate_final']/cards['peso_pinto']*1000),places=2)
        week=result['hierarchy'][0]
        self.assertEqual(week['cards'],cards)
        self.assertEqual(len(week['children']),2)
        producer=week['children'][1]
        self.assertAlmostEqual(float(producer['cards']['vezes_maior']),2.336*1000/44.805,places=10)

    def test_missing_match_remains_and_filter_recomputes_every_level(self):
        result=self.payload([('ano','2026'),('produtor','B'),('galpao','X')])
        self.assertEqual(result['cards']['aves'],3000)
        self.assertEqual(result['cards']['peso_pinto'],50)
        self.assertIsNone(result['cards']['peso_abate_final'])
        self.assertIsNone(result['cards']['vezes_maior'])
        self.assertEqual(result['hierarchy'][0]['cards'],result['cards'])
        self.assertEqual(result['hierarchy'][0]['children'][0]['children'][0]['cards'],result['cards'])

    def test_invalid_dates_incomplete_keys_and_zero_weights_do_not_link_or_divide(self):
        self.db.execute("UPDATE zootecnico.mortalidade_peso_abertos SET ps_pinto='0' WHERE id=31614")
        self.assertIsNone(self.db.execute('SELECT vezes_maior_historico FROM zootecnico.vw_historico_lotes_criacao WHERE id=31614').fetchone()[0])
        for day in ('invalid','2026-02-30','0000-01-01','2026-13-01'):
            self.db.execute('UPDATE zootecnico.mortalidade_peso_abertos SET data_recepcao=? WHERE id=31614',[day])
            self.assertIsNone(self.db.execute('SELECT id_fechado_historico FROM zootecnico.vw_historico_lotes_criacao WHERE id=31614').fetchone()[0])
        self.db.execute("UPDATE zootecnico.mortalidade_peso_abertos SET data_recepcao='2026-08-26', codigo_granja='' WHERE id=31614")
        self.assertIsNone(self.db.execute('SELECT id_fechado_historico FROM zootecnico.vw_historico_lotes_criacao WHERE id=31614').fetchone()[0])

    def test_old_weight_card_and_other_sources_unchanged(self):
        result=self.payload()
        self.assertEqual(result['cards']['peso_atual'],2)
        self.assertNotEqual(float(result['cards']['peso_abate_final']),2)
        self.assertEqual(BI_REGISTRY['lotes-abertos']['table'],'mortalidade_peso_abertos')
        self.assertEqual(BI_REGISTRY['historico-fechados']['table'],'mortalidade_peso_fechados')
        self.assertNotIn('mean_fields',BI_REGISTRY['lotes-abertos'])
        self.assertNotIn('mean_fields',BI_REGISTRY['historico-fechados'])

    def test_missing_barn_is_retained_and_filterable_after_identity_dedup(self):
        self.db.execute('UPDATE zootecnico.mortalidade_peso_abertos SET galp=NULL WHERE id=4')
        result=self.payload([('ano','2026'),('galpao','Não informado')])
        self.assertEqual(result['cards']['lotes'],1)
        self.assertEqual(result['cards']['aves'],3000)
        self.assertIsNone(result['cards']['peso_abate_final'])
        self.assertEqual(result['hierarchy'][0]['children'][0]['children'][0]['valor'],'Não informado')

    def test_materialized_history_snapshot_keeps_same_totals_and_hierarchy(self):
        before=self.payload()
        script=(ROOT/'outputs/consolidacao-20261016/02_caches_materializados.sql').read_text(encoding='utf-8')
        script=script[:script.index('-- O indice unico')]
        script=script.replace('CREATE MATERIALIZED VIEW IF NOT EXISTS','CREATE TABLE').replace('WITH DATA;',';').replace('::numeric','::DOUBLE').replace("INTERVAL '1 month - 1 day'", "(INTERVAL '1 month' - INTERVAL '1 day')")
        self.db.execute(script)
        self.db.execute('CREATE UNIQUE INDEX cache_id ON zootecnico.mv_historico_lotes_criacao_portal(id)')
        self.db.execute('DROP VIEW zootecnico.vw_historico_lotes_criacao_portal')
        self.db.execute('CREATE VIEW zootecnico.vw_historico_lotes_criacao_portal AS SELECT * FROM zootecnico.mv_historico_lotes_criacao_portal')
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM zootecnico.mv_historico_lotes_criacao_portal').fetchone()[0],3)
        after=self.payload()
        for key in ('cards','weekly','hierarchy','galpoes'): self.assertEqual(before[key],after[key],key)


if __name__ == '__main__':
    unittest.main(verbosity=2)
