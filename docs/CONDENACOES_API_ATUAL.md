# Condenações com a API atual — 19/11/2026

**Publicar os frontends do PCP e do Zootécnico. Não substituir módulos, reiniciar ou atualizar a API.**

## Contexto do drill-down e colunas mensais/semanais

O botão compacto “Limpar filtros”, acima de Mensal/Semanal e ocupando a mesma largura, remove Grupo, Condenação, Técnico, Fornecedor e o histórico de navegação. Restaura o ano, mês, dia e visão usados na abertura da subtela, sem modificar os filtros da página principal e sem trocar o modo Mensal/Semanal escolhido. Em uma abertura diária do PCP, o dia/unidade/turno originais continuam limitando o relatório após limpar. A limpeza renova a consulta e invalida caches do subrelatório.

O clique em qualquer grupo, condenação ou fornecedor seleciona o mesmo valor no respectivo filtro. Um histórico interno preserva as seleções anteriores (inclusive múltiplas), a navegação, ordenação, página e rolagem; Voltar restaura o nível anterior. Alterações explícitas de período continuam válidas ao voltar e reiniciam apenas as posições de paginação. Alterações manuais de grupo/condenação ou visão iniciam a navegação pelo resumo, mantendo os valores escolhidos nos filtros.

Ao final da linha de filtros, o seletor Mensal | Semanal determina as colunas dos resumos de grupos e condenações. Semanal agrupa pela semana ISO, com cabeçalhos Semana NN/AAAA. O filtro Semana limita os dias consultados; o seletor Mensal/Semanal controla a apresentação. Ano, mês, visão, técnico, fornecedor e dias continuam sendo respeitados. As semanas nos limites de mês/ano são cortadas pelos dias do período selecionado e por D−1.

Sem alteração na API: a visão semanal consulta `/api/pcp/comparativo/condenacoes` com o parâmetro `dias` já existente, no máximo sete dias por consulta e quatro consultas simultâneas. Respostas concluídas são reutilizadas ao navegar no mesmo contexto. As somas de quilos e peso vivo das semanas formam o acumulado; não há média simples de percentuais. Falha em uma semana torna a visão indisponível, sem preencher zeros ou reapresentar o resultado de outro contexto.

A lista intermediária de fornecedores permanece consolidada. O último nível continua com as ocorrências por dia e Tipo (Total/Parcial), sem transformar registros diários em linhas semanais. Alterar Mensal/Semanal nesse último nível somente guarda a preferência para os resumos ao voltar.

Testes: `node tests/condenacoes-contexto-semanal.cjs`, em desktop e celular, além de `condenacoes-drilldown-browser.cjs`. Conferência adicional em modo read-only com o roteador real do ZIP de 19/11: em 01–18/11/2026, o peso condenado de 351.874,71 kg e o peso vivo de 8.203.644 kg foram iguais no mês e na soma das quatro semanas; cada causa/tipo também foi reconciliado. Evidência local em `outputs/condenacoes-contexto-semanal-20261119/integridade.json` no projeto Zootécnico.

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
