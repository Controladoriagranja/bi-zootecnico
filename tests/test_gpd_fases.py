"""Calculo e consultas reais em banco isolado; nao usa o banco de producao."""
from datetime import date
from decimal import Decimal as D
import unittest
from test_backend_integration import BI_REGISTRY, bank, request, r
from bi_generic import gpd_fases as g
from fastapi import HTTPException
import duckdb


def acerto(code='1',birds=100,age=45,weight=3.1,day='2026-09-01'):
    return dict(chave_lote=code,codigo=code,gal='A',lote='10',dt_aloj='2026-07-18',
                data_abate=day,qt_aves=birds,ida=age,pes_total=D(str(weight))*birds,
                carregado_em='2026-10-19 10:00:00')


def closed(code='1',id=1,period='2026-09-30'):
    return dict(id=id,codigo_granja=code,galp='A',num_lote='10',data_recepcao='2026-07-18',
                periodo_fim=period,**{f'peso_med_{n:02}':str(w) for n,w in zip((7,14,21,28,35),(140,420,910,1540,2170))})


class Result:
    def __init__(self,cursor):
        cols=[x[0] for x in cursor.description]
        self.rows=[dict(zip(cols,row)) for row in cursor.fetchall()]
    def fetchall(self): return self.rows


class Connection:
    def __init__(self,db): self.db=db;self.calls=[]
    def execute(self,query,values=None):
        self.calls.append((query.as_string(),values))
        return Result(self.db.execute(query.as_string().replace('%s','?'),values or []))


class PhaseMathTests(unittest.TestCase):
    def test_single_lot_all_six_phases_and_unit_conversion(self):
        payload=g.build_payload([acerto()],[closed()],'semana')
        self.assertEqual([payload['totais'][key]['valor'] for key,_,_,_ in g.PHASES],list(map(D,[20,40,70,90,90,93])))
        self.assertEqual(payload['cards'],dict(lotes=1,com_vinculo=1,sem_vinculo=0))

    def test_unequal_birds_and_terminal_durations_recompose_bases(self):
        other=closed('2',2);other['peso_med_07']='210';other['peso_med_35']='2520'
        payload=g.build_payload([acerto(),acerto('2',300,49,3.4,'2026-09-08')],[closed(),other],'dia')
        self.assertEqual(payload['totais']['07']['valor'],D('27.5'))
        self.assertEqual(payload['totais']['35_abate']['valor'],D(357000)/D(5200))
        for phase,_,_,_ in g.PHASES:
            numer=sum(p['fases'][phase]['numerador'] for p in payload['periodos'])
            denom=sum(p['fases'][phase]['denominador'] for p in payload['periodos'])
            self.assertEqual(payload['totais'][phase]['valor'],numer/denom)

    def test_snapshot_is_latest_by_date_then_id_not_sum_or_fallback(self):
        stale=closed(id=1000,period='2026-08-31');stale['peso_med_07']='999'
        latest=closed(id=2);latest['peso_med_14']=None
        result=g.build_payload([acerto()],[latest,closed(),stale],'semana')['totais']
        self.assertEqual(result['07']['valor'],D(20))
        self.assertIsNone(result['14']['valor']);self.assertIsNone(result['21']['valor'])
        self.assertEqual(result['28']['valor'],D(90))

    def test_no_match_missing_key_different_barn_or_arrival(self):
        rows=[acerto('1'),acerto('2'),acerto('3')]
        rows[1]['gal']='';rows[2]['dt_aloj']='2026-07-19'
        payload=g.build_payload(rows,[closed('2'),closed('3')],'semana')
        self.assertEqual(payload['cards']['com_vinculo'],0)
        self.assertTrue(all(value['valor'] is None for value in payload['totais'].values()))

    def test_zero_birds_age_nonpositive_duration_negative_and_zero_gain(self):
        row=acerto(birds=0);self.assertIsNone(g.phase_bases(row,closed(),0,7))
        self.assertIsNone(g.phase_bases(acerto(age=35),closed(),35,None))
        self.assertIsNone(g.phase_bases(acerto(age=6),closed(),0,7))
        weights=closed();weights['peso_med_14']='100'
        self.assertIsNone(g.phase_bases(acerto(),weights,7,14))
        weights['peso_med_14']='140'
        self.assertEqual(g.phase_bases(acerto(),weights,7,14)[0],0)

    def test_iso_weeks_and_days_do_not_mix_years(self):
        rows=[acerto(day='2025-12-31'),acerto('2',day='2026-01-01'),acerto('3',day='2026-12-31')]
        weekly=g.build_payload(rows,[],'semana')['periodos']
        self.assertEqual([(p['inicio'],p['ano_semana'],p['semana'],p['lotes']) for p in weekly],
                         [('2025-12-29',2026,1,2),('2026-12-28',2026,53,1)])
        self.assertEqual(len(g.build_payload(rows,[],'dia')['periodos']),3)


class PhaseQueryTests(unittest.TestCase):
    def setUp(self):
        self.db=duckdb.connect();self.db.execute('CREATE SCHEMA zootecnico');self.db.execute('CREATE MACRO btrim(v) AS trim(v)')
        self.db.execute('''CREATE TABLE zootecnico.vw_desempenho_acerto_portal (
          chave_lote VARCHAR,codigo VARCHAR,gal VARCHAR,lote VARCHAR,dt_aloj TIMESTAMP,
          data_abate TIMESTAMP,qt_aves DOUBLE,pes_total DOUBLE,ida DOUBLE,carregado_em TIMESTAMP,
          status_acerto VARCHAR,tipo_granja VARCHAR,modelo VARCHAR,integrado VARCHAR,
          tecnico_exibicao VARCHAR,galpao_exibicao VARCHAR,linh VARCHAR)''')
        self.db.execute("""INSERT INTO zootecnico.vw_desempenho_acerto_portal VALUES
          ('a','1','A','10','2026-07-18','2026-09-01',100,310,45,'2026-10-19','Fechado','Integrada','Modelo','Produtor','Tecnico','A','COBB'),
          ('b','2','A','10','2026-07-18','2026-10-01',200,620,45,'2026-10-19','Fechado','Integrada','Modelo','Outro','Tecnico','A','COBB')""")
        self.db.execute('''CREATE TABLE zootecnico.mortalidade_peso_fechados (
          id BIGINT,periodo_fim DATE,codigo_granja VARCHAR,galp VARCHAR,num_lote VARCHAR,
          data_recepcao VARCHAR,peso_med_07 VARCHAR,peso_med_14 VARCHAR,peso_med_21 VARCHAR,
          peso_med_28 VARCHAR,peso_med_35 VARCHAR)''')
        self.db.execute("""INSERT INTO zootecnico.mortalidade_peso_fechados VALUES
          (1,'2026-09-30','1','A','10','2026-07-18','140','420','910','1540','2170'),
          (2,'2026-09-30','2','A','10','2026-07-18','210','490','980','1610','2240')""")
        self.conn=Connection(self.db)
        routes=r.criar_router(lambda:bank(self.conn)).routes
        self.summary=next(x.endpoint for x in routes if x.path.endswith('/{bi}/resumo'))
        self.options=next(x.endpoint for x in routes if x.path.endswith('/{bi}/filtros'))

    def tearDown(self):self.db.close()

    def test_all_performance_filters_and_dates_reach_real_sql(self):
        filters=[('ano','2026'),('mes','9'),('status_acerto','Fechado'),('tipo_granja','Integrada'),
                 ('modelo','Modelo'),('produtor','Produtor'),('tecnico','Tecnico'),('galpao','A'),
                 ('linhagem','COBB'),('tipo_linhagem','pura'),('agrupamento','dia'),
                 ('data_inicio','2026-09-01'),('data_fim','2026-09-30')]
        result=self.summary('gpd-fases',request(filters))
        self.assertEqual(result['cards']['lotes'],1)
        self.assertEqual(result['periodos'][0]['inicio'],'2026-09-01')
        self.assertEqual(result['totais']['07']['valor'],20)
        self.assertEqual(len(self.conn.calls),2)
        self.assertEqual(set(BI_REGISTRY['gpd-fases']['filters']),set(BI_REGISTRY['zootecnico']['filters']))

    def test_options_use_existing_facets_and_allow_granularity(self):
        result=self.options('gpd-fases',request([('ano','2026'),('agrupamento','semana')]))
        self.assertEqual(result['produtor'],['Outro','Produtor'])
        self.assertEqual([m['valor'] for m in result['mes']],[9,10])

    def test_invalid_granularity_duplicate_dates_and_unknown_parameter_rejected(self):
        for params in [[('agrupamento','mes')],[('agrupamento','dia'),('agrupamento','semana')],
                       [('data_inicio','invalid')],[('sql','SELECT 1')]]:
            with self.assertRaises(HTTPException) as error:self.summary('gpd-fases',request(params))
            self.assertEqual(error.exception.status_code,422)

    def test_empty_and_sql_injection_value_are_parameterized(self):
        result=self.summary('gpd-fases',request([('produtor',"' OR 1=1 --")]))
        self.assertEqual(result['cards']['lotes'],0)
        self.assertEqual(result['periodos'],[])
        self.assertEqual(len(self.conn.calls),1)
        self.assertNotIn("' OR 1=1 --",self.conn.calls[0][0])


if __name__=='__main__':unittest.main()
