"""Executa expressões geradas em DuckDB; não substitui validação PostgreSQL."""
from decimal import Decimal
from pathlib import Path
import csv
import json
import unittest
import duckdb
from test_backend_integration import s, BI_REGISTRY


class AcertoFormulaTests(unittest.TestCase):
    def setUp(self):
        self.db = duckdb.connect(':memory:')
        self.db.execute('''CREATE TABLE acerto(mort DOUBLE, aloj DOUBLE, qt_aves DOUBLE,
            ida DOUBLE, ps_med DOUBLE, pes_total DOUBLE, consumo_racao DOUBLE,
            iep DOUBLE, cac DOUBLE, vazio_sanitario DOUBLE,
            data_abate TIMESTAMP, integrado VARCHAR)''')
        self.db.execute("""INSERT INTO acerto VALUES
            (100,1000,900,40,2.5,2250,4000,300,1.5,6,'2026-10-02 23:59:59','A'),
            (100,2000,1900,50,3,5700,9000,400,1.7,18,'2026-10-03 00:00:00','B')""")

    def tearDown(self):
        self.db.close()

    def value(self, metric, where=''):
        # DuckDB defaults ::numeric to fixed scale; DOUBLE keeps source precision here.
        expression = s.metrica_expr(BI_REGISTRY['zootecnico']['metrics'][metric]).as_string().replace('::numeric','::DOUBLE')
        return self.db.execute('SELECT '+expression+' FROM acerto '+where).fetchone()[0]

    def test_ratio_sums_and_explicit_weights(self):
        expected = {'mortalidade':200/3000*100,'peso_medio':7950/2800,'idade':(900*40+1900*50)/2800,'gmd':(2250/900+5700/1900)/(40+50)*1000,
                    'ca':13000/7950,'iep':350,'cac':(1.5*1000+1.7*2000)/3000,'vazio':(6*900+18*1900)/2800,'aves_abatidas':2800}
        for metric, value in expected.items():
            self.assertAlmostEqual(self.value(metric),value,places=9, msg=metric)
        self.assertEqual(self.value('mortalidade',"WHERE integrado='A'"),10)

    def test_zero_and_missing_denominators_return_null(self):
        self.db.execute('DELETE FROM acerto')
        self.db.execute('INSERT INTO acerto(mort,aloj,qt_aves,ida,ps_med,pes_total,consumo_racao) VALUES (10,0,0,0,2,0,30)')
        for metric in ('mortalidade','peso_medio','idade','gmd','ca'):
            self.assertIsNone(self.value(metric),metric)
        self.db.execute('UPDATE acerto SET aloj=NULL, qt_aves=NULL, ida=NULL, pes_total=NULL')
        for metric in ('mortalidade','peso_medio','idade','gmd','ca'):
            self.assertIsNone(self.value(metric),metric)

    def test_missing_numerator_does_not_count_as_zero(self):
        self.db.execute("UPDATE acerto SET mort=NULL WHERE integrado='B'")
        self.assertAlmostEqual(self.value('mortalidade'),100/3000*100)

    def test_vazio_uncapped_uses_slaughtered_birds_valid_pairs(self):
        self.db.execute('DELETE FROM acerto')
        self.db.execute('INSERT INTO acerto(vazio_sanitario,qt_aves,aloj) VALUES (10,100,900),(20,300,100),(NULL,900,200),(30,NULL,500),(40,0,500)')
        self.assertAlmostEqual(self.value('vazio'),17.5)
        self.db.execute('UPDATE acerto SET qt_aves=0')
        self.assertIsNone(self.value('vazio'))

    def test_august_2026_user_report_new_rules(self):
        import openpyxl
        file=Path('C:/Users/vchaves/Downloads/relatorio (52).xlsx')
        if not file.exists(): self.skipTest('Relatório real disponível somente no ambiente do usuário')
        book=openpyxl.load_workbook(file,data_only=True,read_only=True)
        try:
            sheet=book.active
            header=next(i for i,row in enumerate(sheet.iter_rows(values_only=True),1) if row[0]=='Código')
            rows=[]
            for row in sheet.iter_rows(min_row=header+1,values_only=True):
                if str(row[0]).startswith('Totais'):break
                if row[0] is not None:
                    rows.append([row[i] for i in (12,11,16,14,17,18,20,24,23,10)])
        finally:book.close()
        self.assertEqual(len(rows),163)
        self.db.execute('DELETE FROM acerto')
        self.db.executemany('INSERT INTO acerto(mort,aloj,qt_aves,ida,ps_med,pes_total,consumo_racao,iep,cac,vazio_sanitario) VALUES (?,?,?,?,?,?,?,?,?,?)',rows)
        expected={'iep':321.56613496932516,'ca':1.794148136237481,'cac':1.740098472122556,
                  'gmd':65.7768143980939,'mortalidade':13.16643920340507,
                  'idade':47.127407793344965,'peso_medio':3.107290415982878,'vazio':16.364990369529746}
        actual={metric:self.value(metric) for metric in expected}
        for metric,value in expected.items():self.assertAlmostEqual(actual[metric],value,places=9,msg=metric)
        out=Path(__file__).resolve().parents[1]/'outputs/migracao-acerto/conferencia_agosto_2026.json'
        out.write_text(json.dumps({'fonte':file.name,'registros':len(rows),'regras':'acerto-2026-10-05','resultados':actual,'ambiente':'SQL gerado pelo backend executado em DuckDB local; PostgreSQL real pendente'},ensure_ascii=False,indent=2),encoding='utf-8')

    def test_final_date_includes_entire_day(self):
        parts, params=s.condicoes(BI_REGISTRY['zootecnico'],{},data_inicio='2026-10-02',data_fim='2026-10-02')
        where=s.where_sql(parts).as_string().replace('%s','?')
        rows=self.db.execute('SELECT integrado FROM acerto'+where,params).fetchall()
        self.assertEqual(rows,[('A',)])

    def test_workbook_sample(self):
        import openpyxl
        file=Path.home()/'Downloads'/'acerto lote(Recuperado Automaticamente).xlsx'
        sheet=openpyxl.load_workbook(file,data_only=False).active
        self.db.execute('DELETE FROM acerto')
        values=[sheet[x].value for x in ('N2','M2','T2','Q2','V2','W2','Y2')]
        self.db.execute('INSERT INTO acerto(mort,aloj,qt_aves,ida,ps_med,pes_total,consumo_racao) VALUES (?,?,?,?,?,?,?)',values)
        checks={'mortalidade':values[0]/values[1]*100,'peso_medio':values[5]/values[2],
                'idade':values[2]*values[3]/values[2], 'gmd':(values[5]/values[2])/values[3]*1000,'ca':values[6]/values[5]}
        results={metric:self.value(metric) for metric in checks}
        for metric,value in checks.items():self.assertAlmostEqual(results[metric],value,places=9)
        out=Path(__file__).resolve().parents[1]/'outputs'/'migracao-acerto'/'exemplo_conferido.json'
        out.write_text(json.dumps({'fonte':file.name,'aba':sheet.title,'linha':2,'campos':dict(zip(('mort','aloj','qt_aves','ida','ps_med','pes_total','consumo_racao'),values)),'resultados':results,'ambiente':'DuckDB local; pendente validar PostgreSQL'},ensure_ascii=False,indent=2),encoding='utf-8')


if __name__=='__main__':unittest.main(verbosity=2)
