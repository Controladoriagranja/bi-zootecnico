"""Valida retomada e integridade do robô sem conectar Agrosys/PostgreSQL."""
from contextlib import redirect_stdout, redirect_stderr
from datetime import date, datetime, timezone
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, Mock, MagicMock
from types import SimpleNamespace
import pandas as pd
from openpyxl import Workbook

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('robo_acerto',ROOT/'outputs/robo-acerto/acerto_lote_resultado_geral_incremental.py')
robo=importlib.util.module_from_spec(spec)
spec.loader.exec_module(robo)


class Sql:
    def __init__(self, value): self.value=value
    @classmethod
    def SQL(cls, value): return cls(value)
    @classmethod
    def Placeholder(cls): return cls('%s')
    @classmethod
    def Identifier(cls, value): return cls('"'+value+'"')
    def join(self, values): return Sql(self.value.join(v.value for v in values))
    def format(self, *values): return Sql(self.value.format(*(v.value for v in values)))


class RobotTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.folder=Path(self.tmp.name)
        self.args=robo.argumentos(['--estado',str(self.folder/'state.json')])
        self.state=robo.carregar_estado(self.args.estado)

    def workbook(self, rows, name='acerto_unidade_52_01-01-2023_ate_31-01-2023.xlsx'):
        wb=Workbook(); sheet=wb.active
        sheet.append(['Codigo','Integrado','Gal','Lote','Dt Aloj','Data Abate','IEP','Mort','Aloj'])
        for row in rows: sheet.append(row)
        target=self.folder/name;wb.save(target);wb.close()
        return target

    def month(self, start, end):
        return {'chave':start.strftime('%Y-%m'),'nome':'teste','inicio':start,'fim':end}

    def quiet(self):
        return redirect_stdout(io.StringIO())

    def test_initial_coverage_has_no_gaps_from_2023(self):
        periods=robo.listar_periodos(self.args,self.state,date(2026,10,2))
        self.assertEqual(len(periods),46)
        self.assertEqual(periods[0]['inicio'],date(2023,1,1))
        self.assertEqual(periods[-1]['fim'],date(2026,10,2))
        for a,b in zip(periods,periods[1:]):
            self.assertEqual((b['inicio']-a['fim']).days,1)
        chunks=list(robo.dividir_intervalo(date(2024,2,1),date(2024,3,2),7))
        self.assertEqual(chunks[-1],(date(2024,3,1),date(2024,3,2)))
        self.assertTrue(any(end==date(2024,2,29) for _,end in chunks))
        self.assertEqual(sum((b-a).days+1 for a,b in chunks),31)

    def test_resume_detects_holes_even_with_later_month_present(self):
        for p in robo.listar_periodos(self.args,self.state,date(2026,10,2)):
            self.state['periodos'][p['chave']]={'status':'confirmado','completo':True,
                'inicio':p['inicio'].isoformat(),'fim':p['fim'].isoformat(),'conferido_em':'2026-10-02T12:00:00+00:00'}
        del self.state['periodos']['2024-02']
        self.state['periodos']['2023-05']['status']='erro'
        self.state['periodos']['2023-06']['conferido_em']='2026-09-01T12:00:00+00:00'
        periods=robo.listar_periodos(self.args,self.state,date(2026,10,2))
        self.assertEqual([p['chave'] for p in periods],['2023-05','2023-06','2024-02','2026-09','2026-10'])

    def test_manual_interval_is_split_and_never_marks_partial_month_complete(self):
        args=robo.argumentos(['--estado',str(self.args.estado),'--inicio','15/01/2023','--fim','10/02/2023'])
        periods=robo.listar_periodos(args,self.state,date(2026,10,2))
        self.assertEqual(len(periods),2)
        with self.quiet(),patch.object(robo,'criar_agrosys',return_value=Mock()),patch.object(robo,'carregar_extrator',return_value=Mock()),patch.object(robo,'processar_alvo',return_value={'registros':1}):
            self.assertEqual(robo.executar_periodos(args,self.state,periods),0)
        self.assertFalse(self.state['periodos']['2023-01']['completo'])
        self.assertFalse(self.state['periodos']['2023-02']['completo'])
        next_run=robo.listar_periodos(self.args,self.state,date(2026,10,2))
        self.assertEqual(next_run[0]['inicio'],date(2023,1,1))

    def test_failed_window_stays_pending_and_later_month_continues(self):
        self.args.tentativas=2
        periods=[self.month(date(2023,1,1),date(2023,1,31)),self.month(date(2023,2,1),date(2023,2,28))]
        def process(ag,extrator,name,start,end,keep):
            if start==date(2023,1,8): raise RuntimeError('synthetic interruption')
            return {'registros':1,'inicio':start.isoformat(),'fim':end.isoformat()}
        with self.quiet(),redirect_stderr(io.StringIO()),patch.object(robo,'criar_agrosys',return_value=Mock()),patch.object(robo,'carregar_extrator',return_value=Mock()),patch.object(robo,'processar_alvo',side_effect=process) as fake:
            self.assertEqual(robo.executar_periodos(self.args,self.state,periods),1)
        saved=robo.carregar_estado(self.args.estado)
        self.assertEqual(saved['periodos']['2023-01']['status'],'erro')
        self.assertEqual(saved['periodos']['2023-02']['status'],'confirmado')
        self.assertEqual(sum(c.args[3]==date(2023,1,8) for c in fake.call_args_list),2)

    def test_atomic_checkpoint_preserves_previous_file_on_replace_failure(self):
        robo.salvar_estado(self.args.estado,self.state)
        previous=self.args.estado.read_bytes()
        self.state['periodos']['2023-01']={'status':'erro'}
        with patch.object(robo.os,'replace',side_effect=OSError('synthetic disk failure')):
            with self.assertRaises(OSError): robo.salvar_estado(self.args.estado,self.state)
        self.assertEqual(self.args.estado.read_bytes(),previous)
        self.assertEqual(list(self.folder.glob('*.tmp')),[])

    def test_checkpoint_lock_rejects_concurrent_process(self):
        target=self.folder/'state.lock'
        with robo.trava_execucao(target):
            with self.assertRaises(RuntimeError):
                with robo.trava_execucao(target): pass
        with robo.trava_execucao(target): pass

    def test_plan_does_not_load_runtime_or_touch_checkpoint(self):
        with self.quiet(),patch.object(robo,'carregar_runtime',side_effect=AssertionError('runtime forbidden')):
            self.assertEqual(robo.main(['--estado',str(self.args.estado),'--planejar']),0)
        self.assertFalse(self.args.estado.exists())

    def test_parser_keeps_rows_and_validates_abate_range(self):
        row=[770,'Produtor','238B',50,datetime(2022,12,1),datetime(2023,1,9),300,100,1000]
        target=self.workbook([row,['Total',None,None,None,None,None,None,100,1000]])
        with self.quiet(): df=robo.ler_acerto_lote(target)
        self.assertEqual(len(df),1)
        robo.validar_intervalo_abate(df,date(2023,1,1),date(2023,1,31))
        with self.assertRaises(ValueError): robo.validar_intervalo_abate(df,date(2023,1,10),date(2023,1,31))
        changed=df.copy();changed['Unidade_Extracao']='99'
        with self.assertRaises(ValueError): robo.validar_intervalo_abate(changed,date(2023,1,1),date(2023,1,31))

    def test_agrosys_uppercase_excel_line_break_in_header(self):
        self.assertEqual(robo.header_key('Data_x000D_\nAbate'),'data abate')
        self.assertEqual(robo.header_key('Vazio_x000D_\nSanitário'),'vazio sanitario')
        self.assertEqual(robo.normalize_text(pd.Series(['Nome_x000D_\nTeste'])).iloc[0],'Nome Teste')

    def test_parser_never_discards_detail_after_a_total(self):
        row=[770,'Produtor','238B',50,datetime(2022,12,1),datetime(2023,1,9),300,100,1000]
        target=self.workbook([row,['Total'],[771,'Outro','G',1,datetime(2022,12,2),datetime(2023,1,10),300,100,1000]])
        with self.assertRaisesRegex(ValueError,'após o primeiro total'): robo.ler_acerto_lote(target)

    def test_empty_official_table_valid_but_broken_file_not_success(self):
        target=self.workbook([])
        with self.quiet(): df=robo.ler_acerto_lote(target,permitir_vazio=True)
        self.assertTrue(df.empty)
        robo.validar_intervalo_abate(df,date(2023,1,1),date(2023,1,31))
        with self.assertRaises(ValueError): robo.ler_acerto_lote(target)
        wb=Workbook();wb.active.append(['Erro no Agrosys']);bad=self.folder/'bad.xlsx';wb.save(bad);wb.close()
        with self.assertRaisesRegex(ValueError,'Cabeçalho'): robo.ler_acerto_lote(bad,permitir_vazio=True)

    def test_duplicate_or_incomplete_identity_stops_import(self):
        row=[770,'Produtor','238B',50,datetime(2022,12,1),datetime(2023,1,9),300,100,1000]
        target=self.workbook([row,row])
        with self.assertRaisesRegex(ValueError,'Chave repetida'): robo.ler_acerto_lote(target)
        row[2]=None;target=self.workbook([row])
        with self.assertRaisesRegex(ValueError,'incompleta'): robo.ler_acerto_lote(target)

    def test_identity_is_stable_but_hash_changes_with_original_metric(self):
        target=self.workbook([[770,'Produtor','238B',50,datetime(2022,12,1),datetime(2023,1,9),300,100,1000]])
        with self.quiet(): df=robo.ler_acerto_lote(target)
        library=Mock(nomes_unicos=lambda names:[robo.header_key(n).replace(' ','_') for n in names])
        _,_,first=robo.preparar_dados(df,library,date(2023,1,1),date(2023,1,31),target.name)
        df.loc[0,'Mort']=101
        _,_,second=robo.preparar_dados(df,library,date(2023,1,1),date(2023,1,31),target.name)
        self.assertEqual(first[0][0],second[0][0])
        self.assertNotEqual(first[0][1],second[0][1])

    def test_postgres_receipt_rejects_missing_key_or_changed_hash(self):
        cursor=Mock();cursor.fetchall.return_value=[('a','hash-a'),('b','hash-b')]
        lines=[['a','hash-a'],['b','hash-b']]
        receipt=robo.conferir_gravacao(cursor,Sql.SQL('target'),lines,Sql)
        self.assertEqual(receipt['registros'],2)
        for returned in ([('a','hash-a')],[('a','hash-a'),('b','wrong')]):
            cursor.fetchall.return_value=returned
            with self.assertRaises(RuntimeError):robo.conferir_gravacao(cursor,Sql.SQL('target'),lines,Sql)

    def test_database_mismatch_rolls_back_before_commit(self):
        target=self.workbook([[770,'Produtor','238B',50,datetime(2022,12,1),datetime(2023,1,9),300,100,1000]])
        with self.quiet():df=robo.ler_acerto_lote(target)
        conn=MagicMock();conn.autocommit=True;cur=conn.cursor.return_value.__enter__.return_value
        cur.fetchall.return_value=[]
        library=Mock(SCHEMA_DADOS='zootecnico',conectar=lambda:conn,
                     nomes_unicos=lambda names:[robo.header_key(n).replace(' ','_') for n in names])
        modules={'banco_zootecnico':library,'psycopg2':SimpleNamespace(sql=Sql),
                 'psycopg2.extras':SimpleNamespace(execute_batch=Mock())}
        with patch.dict('sys.modules',modules):
            with self.assertRaisesRegex(RuntimeError,'Carga revertida'):
                robo.gravar_banco(df,date(2023,1,1),date(2023,1,31),target.name)
        conn.commit.assert_not_called();conn.rollback.assert_called_once();conn.close.assert_called_once()
        self.assertFalse(conn.autocommit)
        self.assertEqual(library.finalizar_carga.call_args.args[2],'ERRO')

    def test_failed_workbook_is_preserved_before_temporary_cleanup(self):
        row=[770,'Produtor','238B',50,datetime(2022,12,1),datetime(2023,1,9),300,100,1000]
        source=self.workbook([row])
        def extract(**kwargs):
            destination=kwargs['pasta']/source.name;destination.write_bytes(source.read_bytes());return destination
        with self.quiet(),patch.object(robo,'PASTA_ROBO',self.folder),patch.object(robo,'extrair_periodo',side_effect=extract),patch.object(robo,'gravar_banco',side_effect=RuntimeError('synthetic database outage')):
            with self.assertRaises(RuntimeError):robo.processar_alvo(Mock(),Mock(),'teste',date(2023,1,1),date(2023,1,31))
        files=list((self.folder/'acerto_lote_falhas').glob('*.xlsx'))
        self.assertEqual(len(files),1)
        self.assertEqual(files[0].read_bytes(),source.read_bytes())

if __name__=='__main__':unittest.main(verbosity=2)
