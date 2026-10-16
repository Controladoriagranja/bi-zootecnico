"""Metas de mortalidade vindas do banco, sem alterar somas ou percentuais."""
from datetime import date
from decimal import Decimal
from pathlib import Path
import unittest

from test_backend_integration import a, BI_REGISTRY, Cursor, bank, request
from test_details_reconciliation import Result
import duckdb

ROOT=Path(__file__).resolve().parents[1]


class MetaStore:
    def __init__(self, db): self.db=db; self.queries=[]
    def execute(self, query, params=None):
        text=query.as_string(); self.queries.append((text,params))
        if '"mortalidade_peso_abertos"' in text:
            return Cursor([{'id':1,'codigo':'1','lote':'1','galpao':'G','recepcao':a.datetime.now(a.ZoneInfo('America/Sao_Paulo')).date(),
                            'versao':date(2026,10,1),'produtor':'A','aves':'1000','mort7':'10','disc7':'2'}])
        return Result(self.db.execute(text.replace('%s','?'),params or []))


class MortalityTargetsTests(unittest.TestCase):
    def setUp(self):
        self.config=BI_REGISTRY['lotes-abertos']
        self.db=duckdb.connect(':memory:')
        self.db.execute('CREATE SCHEMA zootecnico')
        self.db.execute('CREATE SEQUENCE metas_id_seq')
        self.db.execute("""CREATE TABLE zootecnico.metas(
            id BIGINT PRIMARY KEY DEFAULT nextval('metas_id_seq'),
            indicador_codigo VARCHAR,indicador_nome VARCHAR,tela VARCHAR,
            tabela_origem VARCHAR,coluna_origem VARCHAR,valor_meta DECIMAL(15,4),
            unidade VARCHAR,comparacao VARCHAR,referencia_mes DATE,observacao VARCHAR,
            ativo BOOLEAN DEFAULT TRUE,criado_em TIMESTAMPTZ DEFAULT NOW(),atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(indicador_codigo,referencia_mes))""")
        self.insert=(ROOT/'outputs/metas-mortalidade/01_criar_e_inserir_meta.sql').read_text(encoding='utf-8').split('INSERT INTO',1)[1]
        self.insert='INSERT INTO'+self.insert
        self.db.execute(self.insert)
        self.db.execute("UPDATE zootecnico.metas SET referencia_mes='2026-10-01'")
        self.conn=MetaStore(self.db)

    def tearDown(self): self.db.close()

    def test_seed_is_one_percent_not_fraction_and_upsert_is_repeatable(self):
        self.db.execute('DELETE FROM zootecnico.metas')
        self.db.execute(self.insert); self.db.execute(self.insert)
        row=self.db.execute('SELECT COUNT(*),MIN(valor_meta),MIN(unidade),MIN(comparacao) FROM zootecnico.metas').fetchone()
        self.assertEqual(row,(1,Decimal('1'),'%','<='))

    def test_server_reads_real_value_and_ignores_future_or_other_screen(self):
        value=a.fetch_targets(self.conn,self.config,date(2026,10,16))['mortalidade_semanal']
        self.assertEqual(value['valor'],1)
        self.assertEqual(value['fonte'],'zootecnico.metas')
        self.assertEqual(value['referencia_mes'],'2026-10-01')
        self.db.execute("INSERT INTO zootecnico.metas(indicador_codigo,indicador_nome,tela,valor_meta,unidade,comparacao,referencia_mes) SELECT indicador_codigo,indicador_nome,tela,9,unidade,comparacao,DATE '2026-11-01' FROM zootecnico.metas")
        self.assertEqual(a.fetch_targets(self.conn,self.config,date(2026,10,16))['mortalidade_semanal']['valor'],1)
        self.assertEqual(a.fetch_targets(self.conn,self.config,date(2026,11,16))['mortalidade_semanal']['valor'],9)
        self.db.execute("UPDATE zootecnico.metas SET tela='outra'")
        self.assertEqual(a.fetch_targets(self.conn,self.config,date(2026,10,16)),{})

    def test_change_inactive_and_no_record_do_not_fall_back_to_fixed_one_percent(self):
        self.db.execute('UPDATE zootecnico.metas SET valor_meta=2.5')
        self.assertEqual(a.fetch_targets(self.conn,self.config,date(2026,10,16))['mortalidade_semanal']['valor'],Decimal('2.5'))
        self.db.execute('UPDATE zootecnico.metas SET ativo=FALSE')
        self.assertEqual(a.fetch_targets(self.conn,self.config,date(2026,10,16)),{})
        self.db.execute('DELETE FROM zootecnico.metas')
        self.assertEqual(a.fetch_targets(self.conn,self.config,date(2026,10,16)),{})

    def test_zero_is_a_valid_target_and_wrong_units_are_not_plotted_as_percent(self):
        self.db.execute('UPDATE zootecnico.metas SET valor_meta=0')
        self.assertEqual(a.fetch_targets(self.conn,self.config,date(2026,10,16))['mortalidade_semanal']['valor'],0)
        self.db.execute("UPDATE zootecnico.metas SET unidade='kg'")
        self.assertEqual(a.fetch_targets(self.conn,self.config,date(2026,10,16)),{})

    def test_endpoint_includes_target_without_changing_existing_totals(self):
        self.db.execute("UPDATE zootecnico.metas SET referencia_mes=DATE_TRUNC('month',CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date")
        result=a.query_payload(self.config,request(),lambda:bank(self.conn),'resumo')
        self.assertEqual(result['metas']['mortalidade_semanal']['valor'],1)
        cards=result['cards']
        self.db.execute('UPDATE zootecnico.metas SET valor_meta=2.5')
        changed=a.query_payload(self.config,request(),lambda:bank(self.conn),'resumo')
        self.assertEqual(changed['cards'],cards)
        self.assertEqual(changed['weekly'],result['weekly'])
        self.assertEqual(changed['metas']['mortalidade_semanal']['valor'],Decimal('2.5'))
        self.conn.queries.clear()
        a.query_payload(self.config,request(),lambda:bank(self.conn),'filtros')
        self.assertFalse(any('"metas"' in query for query,_ in self.conn.queries))
        self.assertNotIn('targets',BI_REGISTRY['historico-abertos'])
        self.assertNotIn('targets',BI_REGISTRY['zootecnico'])


if __name__=='__main__': unittest.main(verbosity=2)
