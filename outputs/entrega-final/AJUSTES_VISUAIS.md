# Ajustes visuais — referência ZIP de desenvolvimento local

Referência: `bi-zootecnico-desenvolvimento-local.zip`, fornecida em 02/10/2026. O CSS da referência já correspondia ao atual, exceto pelo aviso de atividade autorizado; `assets/js/charts.js`, usado no Detalhamento, também era idêntico. Os desvios estavam nos renderizadores que recebem os contratos da API.

| Arquivo | Ajuste |
| --- | --- |
| `assets/js/api-screen.js` | Curva de crescimento com preenchimento em degradê, linha suave e rótulos; barras e rótulos de peso/mortalidade; valores nos rankings e detalhes; margens, cores e SVG segundo a referência. |
| `assets/js/lotes.js` | Peso semanal em barras; totais com as células de cabeçalho usadas pelo CSS; nomes em destaque e percentuais formatados. |
| `assets/js/historico.js` | Classes de nível da hierarquia, botões de expansão da referência, colunas M+D destacadas, cabeçalhos numéricos, totais e botões de fórmula dos cards. |
| `assets/js/rxp.js` | Totais destacados, produtor em negrito, datas brasileiras e rótulos das células que permitem o layout de detalhes no celular. |
| `assets/js/table-sort.js` | Ordenadores com as classes próprias de Histórico/RxP para aproveitar o visual da referência. |
| Seis HTMLs | Versão de cache atualizada para `ajustes-20261002-4`. |

Sem mudança nas fontes, autenticação ou fórmulas da API. Os cálculos locais e arquivos de dados do ZIP de referência não foram incorporados.

Validação: 23 verificações de integração de frontend, teste de ordenação e cinco telas no Chrome com respostas simuladas. Foram conferidos degradê, rótulos, barras, totais, hierarquia, datas, rótulos móveis e funcionamento dos filtros. Capturas claro/escuro e celular foram inspecionadas localmente.

Para publicar esta alteração, use somente [frontend_bi_zootecnico.zip](frontend_bi_zootecnico.zip), ou publique os HTMLs e assets alterados pelo workflow existente. Não é necessário reconstruir o backend por causa destes ajustes visuais. O pacote foi conferido e não foi publicado nesta sessão.
