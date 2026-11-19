# Condenações com a API atual — 19/11/2026

**Publicar os frontends do PCP e do Zootécnico. Não substituir módulos, reiniciar ou atualizar a API.**

O drill-down do fornecedor usa a mesma rota `/api/pcp/comparativo/condenacoes`, enviando `causa`, `tipo`, `fornecedores` e `tecnicos`, além do período, visão, página e ordenação. O parâmetro `fornecedor_detalhado` não é enviado: o modo antigo desse parâmetro ignora causa e tipo. O fornecedor clicado apenas restringe o filtro da consulta, sem sobrescrever a seleção anterior da interface.

O PCP mantém as pesagens individuais no nível do fornecedor (`agrupado=false`), e o Zootécnico mantém o consolidado (`agrupado=true`). Voltar recupera os filtros anteriores. Ordenação, paginação, resultados vazios e respostas antigas não removem a seleção. Fechar e reabrir o mesmo contexto preserva os filtros; abrir outro período começa um contexto novo.

Os arquivos em `backend/condenacoes/` pertencem à proposta futura de alteração da API e **não são necessários nesta entrega**. Não foram instalados.

Validação local: navegador real com os componentes de filtro e tabela, em 1440 e 390 px, incluindo causas Total e Parcial, fornecedor e técnico, navegação, ordenação, paginação, retorno, ausência de opções, resultado vazio e concorrência de respostas. As requisições capturadas foram reexecutadas no roteador original de referência de 18/11/2026, usando adaptadores de FastAPI e conexão instrumentada, para conferir SQL e parâmetros. O código original da API não foi alterado. Não houve consulta ao banco real nem homologação contra o servidor de produção.

```powershell
$env:CONDENACOES_REQUESTS_FILE = "$PWD/outputs/condenacoes-api-atual-20261119/requests.json"
New-Item -ItemType Directory -Force outputs/condenacoes-api-atual-20261119 | Out-Null
node tests/condenacoes-drilldown-browser.cjs
python tests/check_condenacoes_api_atual.py $env:CONDENACOES_REQUESTS_FILE
```

O teste Python encontra o backend original em `bi-zootecnico/outputs/ranking-galpoes-20261118-v2/backend-referencia/api_zootecnico`, ao lado dos dois projetos neste workspace. Esse caminho é apenas uma dependência local dos testes, sem efeito na publicação.
