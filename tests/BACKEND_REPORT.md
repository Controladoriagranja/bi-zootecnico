# Backend — evidência de teste

Data: 01/10/2026.

Cópia autorizada: _backend-zootecnico-referencia. Alterados registry.py, sql_utils.py, router.py; criado analytics.py e LEIA-ME-INTEGRACAO.md. Nenhum serviço foi publicado e nenhum comando Git foi executado nesta etapa.

Resultado: 21 testes sintéticos passaram após correção da política de pares nulos em todas as médias. Sintaxe de todos os Python validada.

Cobertura: regras no registry, números/datas válidos e inválidos, intervalos inválidos/invertidos/duplicados, construção SQL de Vazio e filtros parametrizados, facetas ignorando a própria seleção, médias em duas etapas, elegibilidade semanal, denominador zero, peso do Histórico com fallback, exclusão de 42 no Histórico, última versão, chaves incompletas, OR/AND, diferença oficial RxP distinta da subtração, técnico mais recente e nome ambíguo, fontes distintas com paginação e totais globais, recusa de parâmetros/página/ordenação inválidos e totais hierárquicos.

Executar: py -B tests/test_backend_integration.py

Os testes carregam a cópia como bi_generic e usam conexão sintética. Não executam SQL no PostgreSQL; não validam formatos/volumes reais, query plan, dados da API publicada ou sessão CENTRAL. Os avisos do frontend foram preservados.

Dependências de teste: psycopg3, psycopg-binary e tzdata isolados em tests/.backend-test-deps, pasta ignorada pelo Git. Não fazem parte do frontend.
