"""Reexecuta as requisicoes capturadas no navegador no roteador ORIGINAL.

python tests/check_condenacoes_api_atual.py captura.json [outra-captura.json]
Sem servidor, banco ou alteracoes na API: adaptadores instrumentam o SQL real.
"""
import importlib.util
import json
import sys
from pathlib import Path

captures = [Path(arg) for arg in sys.argv[1:]]
root = Path(__file__).resolve().parents[1]
source = root.parent / 'bi-zootecnico/outputs/ranking-galpoes-20261118-v2/backend-referencia/api_zootecnico/pcp_condenacoes.py'


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


if not captures:
    raise SystemExit('Informe os JSONs capturados pelo teste de navegador.')

saved_args = sys.argv
sys.argv = [sys.argv[0]]
helper = load('cond_test_helpers', root / 'tests/test_condenacoes_drilldown_api.py')
sys.argv = saved_args
helper.Integrity.setUpClass()
try:
    # Usa o arquivo de referencia original, nao o backend de correcao proposto.
    legacy = load('original_condenacoes', source)
    helper.Integrity.module = legacy
    current = {}
    original_connection = helper.Connection

    class ReplayConnection(original_connection):
        def execute(self, sql, args=()):
            cursor = super().execute(sql, args)
            if ' GROUP BY 1,2,3,4' in sql and 'sum(ocorrencia)' in sql:
                for row in cursor.rows:
                    if row['condenacao'] == 'X':
                        row['condenacao'] = current.get('causa') or 'X'
            return cursor

    helper.Connection = ReplayConnection
    checker = helper.Integrity()
    for capture in captures:
        calls = json.loads(capture.read_text(encoding='utf-8'))
        checked = 0
        for current in calls:
            assert not current.get('fornecedor_detalhado'), current
            args = dict(ano=current['ano'], mes=current['mes'], dias=current.get('dias'),
                        visao=current.get('visao', 'geral'), causa=current.get('causa'), tipo=current.get('tipo'),
                        pagina=current.get('pagina', 1), ordenar=current.get('ordenar', 'data'),
                        direcao=current.get('direcao', 'asc'), agrupado=current.get('agrupado', False),
                        fornecedor_detalhado=False, tecnicos=current.get('tecnicos'), fornecedores=current.get('fornecedores'))
            result, queries = checker.run_query(**args)
            if not current.get('causa'):
                assert not queries
                continue
            assert len(queries) == 2
            for sql, params in queries:
                assert ' AND condenacao=ANY(%s)' in sql
                assert [current['causa']] in params, params
                assert ' AND tipo=%s' in sql and current['tipo'] in params
                for key in ['fornecedores', 'tecnicos']:
                    if current.get(key):
                        assert json.loads(current[key]) in params
                assert sql.count('%s') == len(params)
            assert queries[-1][1][-1] == (current.get('pagina', 1) - 1) * 200
            checked += 1
        print(f'PASS API original: {capture.name}: {len(calls)} requisicoes, {checked} detalhamentos; causa/tipo/fornecedor, contagem, pagina e SQL parametrizado')
finally:
    helper.Integrity.tearDownClass()
