# Integração em bi-zootecnico

Data: 01/10/2026. Somente o destino autorizado foi modificado. Todas as 145 referências inventariadas foram comparadas por SHA-256 e permaneceram idênticas. Git e infraestrutura não foram alterados.

## Etapas e evidências

| Etapa | Arquivos | Motivo e comportamento | Endpoint | Verificação / pendência |
|---|---|---|---|---|
| Base visual | Seis HTMLs, assets/css, assets/img, assets/vendor, theme.js, sidebar.js, charts.js, formula-ui.js | Preservar estrutura, navegação, temas, bibliotecas e estilos recentes | Nenhum | Assets encontrados; sintaxe validada; hashes vendor conferidos. Layout real e mobile pendentes |
| HTTP | api.js, config.js | Reutilizar cliente api-db, Bearer existente, GET, parâmetros repetidos, AbortSignal, erros sanitizados | Worker; três rotas genéricas | Testes sintéticos passaram; sessão CENTRAL e resposta real pendentes |
| Filtros | filters.js, dashboard.js, detalhes.js | Interface recente + normalização api-db; seleções múltiplas, contexto, cancelamento e descarte de respostas antigas | /api/bi/zootecnico/filtros | Normalização/serialização testadas; interação real pendente |
| Resumo | dashboard.js | Receber totais/meses sem agregar registros; loading, empty e erro; Vazio sem valor | /api/bi/zootecnico/resumo | Não considerar valores finais corretos antes de alinhar nulos/calendário/galpão/Vazio |
| Detalhamento | detalhes.js, charts.js | KPI/rankings/evolução; herdar datas e dimensões; limpar resultados ao mudar contexto | /api/bi/zootecnico/detalhes | Sintaxe e parâmetros testados; gráficos reais pendentes |
| Lotes/histórico | lotes.html, historico.html, lotes.js, historico.js, unavailable.js, catálogos | Preservar HTML/CSS e explicações; dados/filtros indisponíveis explicitamente | Nenhum analítico configurado | Aguardar backend; expansão/rankings não concluídos |
| RxP | diferenca-aves-abatidas.html, rxp.js, unavailable.js, rxp-formulas.js | Duas unidades separadas, total e botões preservados, valores —; não apresentar dados antigos | Nenhum analítico configurado | Aguardar fonte composta com proveniência, resumo, filtros e detalhes paginados |
| Fórmulas | metrics.js, formulas.js, historico-formulas.js, lotes-formulas.js, rxp-formulas.js | Catálogos estáticos, sem SQL executável; médias ponderadas só na base dinâmica | Nenhum | Scripts/assets conferidos; não depende de /formulas inexistente |
| Dependência local | HTMLs e JS publicados | Não copiar Parquets, data/*.js, motor offline, mocks ou geradores Python | Nenhum | Verificação de referências e fetch único passou |

## Limites reais

O código de backend disponível não satisfaz todas as fases aprovadas. Nada foi simulado em produção. Lotes, Histórico e RxP estão explicitamente pendentes; Vazio não exibe o cálculo antigo. Demais médias e filtros estão sinalizados como em validação.

computer-use não encontrou navegador conectado. Não foi possível testar mobile, screenshots, modais no navegador, console/network real, fontes efetivamente renderizadas ou ECharts com dados reais. Não existe sessão CENTRAL nesta execução. Não foi feita consulta autenticada à API nem ao PostgreSQL.

O relatório de backend é a entrega para o processo separado: ALTERACOES_NECESSARIAS_BACKEND.md. A implementação das rotas analíticas, alinhamento de regras e validação dos valores são pré-requisitos para concluir a migração. Depois, configurar apenas endpoints existentes e conectar os renderizadores aos resultados agregados; não transformar dados paginados em KPIs globais.

## Regressão executada

23 verificações em tests/integration-checks.cjs passaram. Execução: node tests/integration-checks.cjs. Dados de teste são sintéticos e existem somente na suíte, fora do fluxo publicado. tests/INTEGRATION_REPORT.json registra as evidências e pendências.

## Arquivos criados ou modificados nesta execução

- ALTERACOES_NECESSARIAS_BACKEND.md
- assets/css/app.css
- assets/img/favicon-granja.png
- assets/img/logo-granja-brasilia-branca.png
- assets/js/api.js
- assets/js/charts.js
- assets/js/config.js
- assets/js/dashboard.js
- assets/js/detalhes.js
- assets/js/filters.js
- assets/js/formula-ui.js
- assets/js/formulas.js
- assets/js/historico-formulas.js
- assets/js/historico.js
- assets/js/lotes-formulas.js
- assets/js/lotes.js
- assets/js/metrics.js
- assets/js/rxp-formulas.js
- assets/js/rxp.js
- assets/js/sidebar.js
- assets/js/theme.js
- assets/js/unavailable.js
- assets/vendor/echarts/echarts.min.js
- assets/vendor/echarts/LICENSE
- assets/vendor/geist/files/geist-cyrillic-ext-wght-normal.woff2
- assets/vendor/geist/files/geist-cyrillic-wght-normal.woff2
- assets/vendor/geist/files/geist-latin-ext-wght-normal.woff2
- assets/vendor/geist/files/geist-latin-wght-normal.woff2
- assets/vendor/geist/files/geist-vietnamese-wght-normal.woff2
- assets/vendor/geist/index.css
- assets/vendor/geist/LICENSE
- assets/vendor/manifest.json
- detalhes.html
- diferenca-aves-abatidas.html
- formulas.html
- historico.html
- index.html
- lotes.html
- README.md
- tests/integration-checks.cjs
- tests/INTEGRATION_REPORT.json

Também criados: este relatório e ALTERACOES_NECESSARIAS_BACKEND.md. Arquivos históricos de backend e instruções antigas permanecem fora do artefato de publicação; README.md é a instrução vigente.
