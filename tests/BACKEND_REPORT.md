# Backend — evidência de teste

Atualização: 02/10/2026.

Cópia autorizada: `_backend-zootecnico-referencia/bi_generic`, na versão fornecida pelo Anderson. O pacote de transferência contém `registry.py`, `sql_utils.py` e `analytics.py`; `router.py` permanece o fornecido pelo Anderson. Nenhum serviço foi publicado e nenhum comando Git foi executado nesta etapa.

Resultado: 23 testes de backend, 6 testes de fórmulas e 16 testes de robô passaram. A planilha fornecida foi validada pelo parser do robô: 133 lotes. Sintaxe Python validada.

Cobertura: regras no registry, números/datas válidos e inválidos, intervalos inválidos/invertidos/duplicados, construção SQL de Vazio e filtros parametrizados, facetas ignorando a própria seleção, médias em duas etapas, elegibilidade semanal, denominador zero, peso do Histórico com fallback, exclusão de 42 no Histórico, última versão, chaves incompletas, OR/AND, diferença oficial RxP distinta da subtração, técnico mais recente e nome ambíguo, fontes distintas com paginação e totais globais, recusa de parâmetros/página/ordenação inválidos e totais hierárquicos.

Executar: py -B tests/test_backend_integration.py

Os testes carregam a cópia como bi_generic e usam conexão sintética. O Histórico também foi testado com anos corrompidos, abates anteriores a 2023, data inválida e ano futuro; seu calendário passa a usar abate. Os detalhes de galpão incluem idade/linhagens da API. Não executam SQL no PostgreSQL; não validam formatos/volumes reais, query plan, dados da API publicada ou sessão CENTRAL. A validação de fórmulas usa expressões SQL em DuckDB. Os testes do robô não acessam Agrosys/PostgreSQL.

Executar todos: `py -B -m unittest discover -s tests -p 'test_*.py' -v`.

Dependências de teste: psycopg3, psycopg-binary e tzdata isolados em tests/.backend-test-deps, pasta ignorada pelo Git. Não fazem parte do frontend.
