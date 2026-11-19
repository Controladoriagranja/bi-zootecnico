# Condenações com a API atual — 19/11/2026

**Publicar os frontends do PCP e do Zootécnico. Não substituir módulos, reiniciar ou atualizar a API.**

Os filtros internos de condenações ficam em uma linha: Ano, Mês, Semana, Visão, Grupo, Condenação, Técnico e Fornecedor. No celular a faixa tem rolagem horizontal; os menus abrem dentro dos limites da subtela. Ano, mês e semana permitem múltiplas seleções com o mesmo componente visual, busca, caixas de seleção e selecionar tudo. As semanas seguem o calendário ISO (segunda a domingo), com número e intervalo de datas em padrão brasileiro. Apenas os dias da semana dentro dos anos/meses selecionados são enviados no parâmetro `dias` já existente. Selecionar todas as semanas ou limpar a seleção não restringe os dias. As semanas selecionadas são combinadas sem duplicar datas. Se um recorte parcial de muitos anos ultrapassar o limite de 4000 caracteres do parâmetro dias da API atual, a interface preserva a seleção anterior e pede reduzir anos/meses; não envia consulta inválida nem amplia o resultado. Ao abrir por uma célula diária, o dia original é preservado até alterar um filtro de período. Trocar o período dentro da subtela mantém os filtros e o drill-down atuais; voltar preserva o período escolhido. Ano/mês incompatíveis removem apenas a semana que não pertence ao novo período.

O drill-down do fornecedor usa a mesma rota `/api/pcp/comparativo/condenacoes`, enviando `causa`, `tipo`, `fornecedores` e `tecnicos`, além do período, visão, página e ordenação. O parâmetro `fornecedor_detalhado` não é enviado: o modo antigo desse parâmetro ignora causa e tipo. O fornecedor clicado apenas restringe o filtro da consulta, sem sobrescrever a seleção anterior da interface.

Nos dois BIs, o resumo mostra uma linha por grupo/condenação, somando Total + Parcial e recalculando os percentuais pela mesma base de peso vivo, sem somar percentuais arredondados. O drill-down leva a causa inteira, sem restringir o tipo. A lista de fornecedores permanece consolidada (`agrupado=true`). Somente no último nível, após clicar no fornecedor, as pesagens individuais (`agrupado=false`) mostram a coluna Tipo com Total e Parcial. O servidor existente já atende esse caminho; a API permanece inalterada. Voltar recupera os filtros anteriores. Ordenação, paginação, resultados vazios e respostas antigas não removem a seleção. Fechar e reabrir o mesmo contexto preserva os filtros; abrir outro período começa um contexto novo.

Os arquivos em `backend/condenacoes/` pertencem à proposta futura de alteração da API e **não são necessários nesta entrega**. Não foram instalados.

Validação local: navegador real com os componentes de filtro e tabela, em 1440 e 390 px, incluindo causas Total e Parcial, fornecedor e técnico, navegação, ordenação, paginação, retorno, ausência de opções, resultado vazio e concorrência de respostas. As requisições capturadas foram reexecutadas no roteador original de referência de 18/11/2026, usando adaptadores de FastAPI e conexão instrumentada, para conferir SQL e parâmetros. O código original da API não foi alterado. Não houve consulta ao banco real nem homologação contra o servidor de produção.

```powershell
$env:CONDENACOES_REQUESTS_FILE = "$PWD/outputs/condenacoes-api-atual-20261119/requests.json"
New-Item -ItemType Directory -Force outputs/condenacoes-api-atual-20261119 | Out-Null
node tests/condenacoes-drilldown-browser.cjs
python tests/check_condenacoes_api_atual.py $env:CONDENACOES_REQUESTS_FILE
```

O teste Python encontra o backend original em `bi-zootecnico/outputs/ranking-galpoes-20261118-v2/backend-referencia/api_zootecnico`, ao lado dos dois projetos neste workspace. Esse caminho é apenas uma dependência local dos testes, sem efeito na publicação.
