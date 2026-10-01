# BI Zootécnico

Integração do visual de bi-zootecnico-desenvolvimento-local com o cliente HTTP de bi-zootecnico-api-db. Implementação realizada somente neste diretório em 01/10/2026. Referências e infraestrutura não foram alteradas.

## Situação da entrega

- Seis páginas, sidebar, temas, CSS, imagens, ECharts 5.6.0 e Geist Variable 5.3.0 locais.
- Desempenho: filtros e resumo em /api/bi/zootecnico. Detalhamento: KPI, rankings e evolução no endpoint genérico existente.
- Valores vêm da API; não existem snapshots, Parquets, mocks ou SQL no fluxo publicado.
- Vazio permanece sem valor: o backend fornecido ainda não substitui valores fora de 7–18 por 14. Seu detalhamento apresenta uma mensagem, sem requisição incompatível.
- As demais médias e filtros de calendário/galpão estão em validação: a referência ainda diverge da regra local aprovada.
- Lotes, Histórico e RxP preservam o HTML/CSS e catálogos de fórmulas, mas apresentam indisponibilidade explícita. Os motores analíticos locais não foram transportados para produção. Filtros de dados, rankings, expansão e detalhes dessas telas aguardam contratos de backend.
- RxP deverá considerar as duas fontes, separadas por unidade, com total consolidado e detalhe de produtores. Não há endpoint analítico correspondente na referência.

Esta entrega não encerra a migração nem está validada para publicação. Consulte [ALTERACOES_NECESSARIAS_BACKEND.md](ALTERACOES_NECESSARIAS_BACKEND.md) e [INTEGRACAO.md](INTEGRACAO.md).

## Autenticação e dados

CENTRAL → HTML → Bearer → Worker → FastAPI → PostgreSQL → JSON.

assets/js/api.js reutiliza o cliente validado, lê sessionStorage.granjabi_auth_token e centraliza fetch, URL, parâmetros repetidos, cancelamento e erros seguros. Não cria login. Não grava token nem encaminha credenciais internas.

O Worker atual permite navegador somente em https://controladoriagranja.github.io. Localhost pode servir a interface, mas chamadas reais serão bloqueadas por CORS. Não modificar Worker/CENTRAL para testes locais. Validar a integração autenticada na origem existente.

## Publicação

O artefato estático deve conter somente index.html, detalhes.html, lotes.html, historico.html, diferenca-aves-abatidas.html, formulas.html e assets/.

backend/, tests/, documentação e instruções antigas não fazem parte desse artefato. O backend DuckDB existente nesta pasta foi mantido intocado como histórico e não é o backend de produção. Não executar seus comandos antigos para esta integração.

Nenhum deploy, commit, push ou alteração de Git foi realizado.

## Verificação

Com Node já instalado, execute: node tests/integration-checks.cjs

Node é usado apenas nos testes; não há build ou dependência Node no frontend. O teste não consulta produção, não precisa de token real e não grava nas referências.

Resultado: 23 verificações de HTTP/contratos, sintaxe e assets passaram. Evidência: tests/INTEGRATION_REPORT.json. Browser/mobile, sessão CENTRAL e comparação PostgreSQL → API → interface continuam pendentes; nenhum navegador estava conectado à ferramenta de computer-use.
