"""Executa o roteador real com banco instrumentado, sem conexao externa.

python tests/test_condenacoes_drilldown_api.py [raiz-do-projeto]
Confere filtros e parametros no SQL de contagem e de registros.
"""
import importlib.util
import json
import sys
import types
import unittest
from contextlib import contextmanager
from datetime import date
from pathlib import Path
from unittest.mock import patch

ROOT = Path(sys.argv.pop(1)).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]


class Router:
    def get(self, path):
        def register(endpoint):
            self.endpoint = endpoint
            return endpoint
        return register


class Cursor:
    def __init__(self, rows):
        self.rows = rows

    def fetchall(self):
        return self.rows

    def fetchone(self):
        return self.rows[0]


class Connection:
    def __init__(self):
        self.queries = []

    def execute(self, sql, args=()):
        self.queries.append((sql, list(args)))
        if sql.startswith('SET LOCAL'):
            return Cursor([])
        # Parametrizacao deve continuar valida em toda consulta.
        assert sql.count('%s') == len(args), (sql, args)
        if 'SELECT DISTINCT tecnico,fornecedor' in sql:
            return Cursor([{'tecnico': 'T', 'fornecedor': 'Y'}])
        if ' GROUP BY 1,2,3,4' in sql and 'sum(ocorrencia)' in sql:
            return Cursor([
                {'data': date(2026,11,10), 'empresa':'Ave Nova', 'condenacao':'X', 'tipo':'Parcial', 'kg':5, 'ocorrencias':1},
                {'data': date(2026,11,10), 'empresa':'Ave Nova', 'condenacao':'X', 'tipo':'Total', 'kg':7, 'ocorrencias':1},
                {'data': date(2026,11,10), 'empresa':'Ave Nova', 'condenacao':'Outra', 'tipo':'Parcial', 'kg':20, 'ocorrencias':1},
            ])
        if 'pcp.diario_industria_turnos' in sql:
            return Cursor([])
        if sql.startswith('SELECT count(*)'):
            return Cursor([{'n':1}])
        return Cursor([])


class Integrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        fake_fastapi = types.ModuleType('fastapi')
        fake_fastapi.APIRouter = Router
        fake_fastapi.Query = lambda default=None, **kwargs: default
        fake_fastapi.Request = object
        class HTTPException(Exception):
            def __init__(self, status_code, detail):
                self.status_code = status_code
                super().__init__(detail)
        fake_fastapi.HTTPException = HTTPException
        fake_access = types.ModuleType('pcp_paradas')
        fake_access.acesso_autorizado = lambda request: True
        cls.modules = patch.dict(sys.modules, {'fastapi':fake_fastapi, 'pcp_paradas':fake_access})
        cls.modules.start()
        spec = importlib.util.spec_from_file_location('cond_test', ROOT/'backend/condenacoes/pcp_condenacoes.py')
        cls.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.module)

    @classmethod
    def tearDownClass(cls):
        cls.modules.stop()

    def run_query(self, **overrides):
        connection = Connection()
        @contextmanager
        def database():
            yield connection
        endpoint = self.module.criar_router(database, lambda:date(2026,11,18)).endpoint
        args = dict(request=object(), ano='2026', mes='11', dias='2026-11-10', visao='10',
                    causa='X', tipo='Parcial', pagina=1, ordenar='peso_total', direcao='desc',
                    agrupado=False, fornecedor_detalhado=True, tecnicos='["T"]', fornecedores='["Y"]')
        args.update(overrides)
        result = endpoint(**args)
        return result, [(sql, values) for sql,values in connection.queries if sql.startswith('SELECT count(*)') or ' LIMIT 200 OFFSET ' in sql]

    def test_cause_type_supplier_on_all_pages_and_modes(self):
        for grouped in [True,False]:
            for supplier_detail in [True,False]:
                for page in [1,2,4]:
                    for kind in ['Parcial','Total']:
                        with self.subTest(grouped=grouped, supplier=supplier_detail, page=page, kind=kind):
                            result, queries = self.run_query(agrupado=grouped, fornecedor_detalhado=supplier_detail, pagina=page, tipo=kind)
                            self.assertEqual(len(queries),2)
                            for sql,values in queries:
                                self.assertIn(' AND condenacao=ANY(%s)',sql)
                                self.assertIn(' AND tipo=%s',sql)
                                self.assertIn(['X'],values)
                                self.assertIn(kind,values)
                                self.assertIn(['Y'],values)
                                self.assertIn(['T'],values)
                                self.assertIn([date(2026,11,10)],values)
                                # Consolidado tem CTEs distintas para pesagem e condenacao.
                                self.assertEqual(sql.count(' AND fornecedor=ANY(%s)'),2 if grouped else 1)
                                self.assertEqual(sql.count(' AND tecnico=ANY(%s)'),2 if grouped else 1)
                                self.assertIn('sum(peso_total)',sql) if grouped else None
                            self.assertEqual(queries[-1][1][-1],(page-1)*200)
                            self.assertEqual(result['pagina'],page)

    def test_all_causes_only_when_explicitly_unfiltered(self):
        _,queries = self.run_query(causa=None,tipo=None)
        for sql,_ in queries:
            self.assertNotIn(' AND condenacao=ANY(%s)',sql)
            self.assertNotIn(' AND tipo=%s',sql)
            self.assertIn(' AND fornecedor=ANY(%s)',sql)

    def test_unknown_cause_does_not_broaden_to_all_causes(self):
        _,queries = self.run_query(causa='Inexistente')
        for sql,values in queries:
            self.assertIn(' AND condenacao=ANY(%s)',sql)
            self.assertIn([],values)

    def test_supplier_required_for_supplier_details(self):
        with self.assertRaises(self.module.HTTPException) as error:
            self.run_query(fornecedores=None)
        self.assertEqual(error.exception.status_code,422)

    def test_invalid_sort_is_rejected(self):
        with self.assertRaises(self.module.HTTPException) as error:
            self.run_query(ordenar='drop table')
        self.assertEqual(error.exception.status_code,422)


if __name__ == '__main__':
    unittest.main(verbosity=2)
