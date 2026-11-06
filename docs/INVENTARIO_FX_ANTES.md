# Inventário antes da implementação — bi-zootecnico

Levantamento das telas originais. Inclui o complemento da auditoria de mortalidade conferido durante a leitura das fontes.

| Tela | Card/gráfico/tabela | fx anterior | Origem do cálculo |
|---|---|---|---|
| Desempenho | IEP | sim: mini-button ƒx, modal próprio | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | CA | sim: mini-button ƒx, modal próprio | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | CAC | sim: mini-button ƒx, modal próprio | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | GPD | sim: mini-button ƒx, modal próprio | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | % Mortalidade | sim: mini-button ƒx, modal próprio | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | Idade Média | sim: mini-button ƒx, modal próprio | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | Peso Médio | sim: mini-button ƒx, modal próprio | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | Vazio | sim: mini-button ƒx, modal próprio | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | % Morte no Transporte | sim: mini-button ƒx, modal próprio | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | Aves Abatidas | sim: mini-button ƒx, modal próprio | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Detalhamento | Indicador selecionado | link Fórmula e bloco embutido | detalhes.render → API zootecnico/detalhes; mesmo indicador do Desempenho |
| Detalhamento | Ranking Técnicos | não | detalhes.render → API zootecnico/detalhes; mesmo indicador do Desempenho |
| Detalhamento | Ranking Produtores | não | detalhes.render → API zootecnico/detalhes; mesmo indicador do Desempenho |
| Detalhamento | Evolução | não | detalhes.render → API zootecnico/detalhes; mesmo indicador do Desempenho |
| Detalhamento / modal de lotes | Tabela e métricas por faixa de mortalidade | não | mortalidade-lotes.render; API detalhes etapa=lotes; mortality_details.py |
| Lotes em Criação | Lotes em Criação | sim: botão fora do título, modal Lotes | lotes.cards → analytics.cohort_cards/cohort_points; API lotes-abertos/resumo |
| Lotes em Criação | Aves Alojadas | sim: botão fora do título, modal Lotes | lotes.cards → analytics.cohort_cards/cohort_points; API lotes-abertos/resumo |
| Lotes em Criação | Mortalidade no Período | sim: botão fora do título, modal Lotes | lotes.cards → analytics.cohort_cards/cohort_points; API lotes-abertos/resumo |
| Lotes em Criação | Mortalidade (%) | sim: botão fora do título, modal Lotes | lotes.cards → analytics.cohort_cards/cohort_points; API lotes-abertos/resumo |
| Lotes em Criação | Peso Médio Geral | sim: botão fora do título, modal Lotes | lotes.cards → analytics.cohort_cards/cohort_points; API lotes-abertos/resumo |
| Lotes em Criação | Mortalidade Semanal | sim: formatos diferentes no cabeçalho | lotes.js / analytics.cohort_points, API lotes-abertos/resumo |
| Lotes em Criação | Média da Coluna de Peso por Idade | sim: formatos diferentes no cabeçalho | lotes.js / analytics.cohort_points, API lotes-abertos/resumo |
| Lotes em Criação | Curva de Crescimento de Peso | sim: formatos diferentes no cabeçalho | lotes.js / analytics.cohort_points, API lotes-abertos/resumo |
| Lotes em Criação / Galpões | Resumo por Produtor | não | lotes.table/barns/drawer; mesmos dados do resumo API |
| Lotes em Criação / Galpões | Top 10 Galpões | não | lotes.table/barns/drawer; mesmos dados do resumo API |
| Lotes em Criação / Galpões | Ranking de Galpões | não | lotes.table/barns/drawer; mesmos dados do resumo API |
| Lotes em Criação / Galpões | Desempenho por Idade / tabela do galpão | não | lotes.table/barns/drawer; mesmos dados do resumo API |
| Lotes em Criação / Galpões | Evolução Mortalidade do galpão | não | lotes.table/barns/drawer; mesmos dados do resumo API |
| Lotes / detalhe do Galpão | Idade atual | não | lotes.drawer; cards recebidos da API |
| Lotes / detalhe do Galpão | Aves alojadas | não | lotes.drawer; cards recebidos da API |
| Lotes / detalhe do Galpão | Média de peso | não | lotes.drawer; cards recebidos da API |
| Lotes / detalhe do Galpão | Mortalidade | não | lotes.drawer; cards recebidos da API |
| Histórico / Mortalidade | Tabela hierárquica semanal | sim: modal Histórico; apenas botão genérico | historico.values/renderTable → analytics.query_cohort/cards; vw_historico_lotes_criacao_portal |
| Histórico / Peso | Tabela hierárquica por idade | mesmo botão genérico | historico.values/renderTable; mesmos dados API historico-abertos/resumo |
| Diferença de Aves Abatidas | Qtde Programada | sim: mini-button, modal RxP | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| Diferença de Aves Abatidas | Qtde Real | sim: mini-button, modal RxP | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| Diferença de Aves Abatidas | Dif Qtde RxP | sim: mini-button, modal RxP | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| Diferença de Aves Abatidas | Registros com Diferença | sim: mini-button, modal RxP | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| Diferença de Aves Abatidas | Comparativo Unidade/Destino e Mês | não | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| Diferença de Aves Abatidas | Diferença por Semana | não | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| Diferença de Aves Abatidas | Ranking de Galpões | não | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| Diferença de Aves Abatidas | Tabela de Produtores no modal | não | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| RxP / modal de produtores | Qtde Programada | não | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| RxP / modal de produtores | Qtde Real | não | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| RxP / modal de produtores | Dif Qtde RxP | não | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| RxP / modal de produtores | Dif % | não | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| GPD por Fase | Gráfico e tabela por dia/semana/total | sim: modal exclusivo, texto em HTML | gpd-fases.draw/render; API gpd-fases/resumo; gpd_fases_dinamica.individual/aggregate |
| Fórmulas / desempenho | IEP | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | CA | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | CAC | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | GPD | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | % Mortalidade | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | Idade Média | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | Peso Médio | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | Vazio | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | % Morte no Transporte | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | CAC Ref | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | Aves Abatidas | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / lotes | Lotes em Criação | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / lotes | Aves Alojadas | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / lotes | Mortalidade no Período (Qtde) | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / lotes | Mortalidade no Período (%) | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / lotes | Peso Médio Geral | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / lotes | Mortalidade Semanal | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / lotes | Média da Coluna de Peso por Idade | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / lotes | Curva de Crescimento de Peso | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / historico | Lotes consultados | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / historico | Aves alojadas | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / historico | Mortalidade acumulada | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / historico | Peso médio atual | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / historico | Peso do pintinho, peso de abate e PS Pintinho x 7 dias | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / historico | Tabela — Mortalidade por semana | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / historico | Tabela — Peso por idade | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / rxp | Qtde Programada | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / rxp | Qtde Real | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / rxp | Dif Qtde RxP | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / rxp | Registros com Diferença | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / rxp | Último técnico do produtor | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Fórmulas / rxp | Dif % | não: disclosure com texto próprio | catálogos atuais; correspondente fonte acima |
| Detalhamento / Mortalidade | Conferência por faixa e registros com divergência | não | mortalidade-chart.audit; mortalidade_faixas.aggregate e exclusões do backend |
