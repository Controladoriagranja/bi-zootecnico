# Inventário final — bi-zootecnico

88 ocorrências (cards, gráficos, tabelas, blocos de detalhes e catálogo), compartilhando 40 indicadores. Nenhum indicador ficou A DEFINIR nas fontes locais conferidas.

| Tela | Card/gráfico/tabela | Antes | Status | ID central | Fonte |
|---|---|---|---|---|---|
| Desempenho | IEP | sim: mini-button ƒx, modal próprio | padronizado | desempenho.iep | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | CA | sim: mini-button ƒx, modal próprio | padronizado | desempenho.ca | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | CAC | sim: mini-button ƒx, modal próprio | padronizado | desempenho.cac | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | GPD | sim: mini-button ƒx, modal próprio | padronizado | desempenho.gmd | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | % Mortalidade | sim: mini-button ƒx, modal próprio | padronizado | desempenho.mortalidade | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | Idade Média | sim: mini-button ƒx, modal próprio | padronizado | desempenho.idade | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | Peso Médio | sim: mini-button ƒx, modal próprio | padronizado | desempenho.peso_medio | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | Vazio | sim: mini-button ƒx, modal próprio | padronizado | desempenho.vazio | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | % Morte no Transporte | sim: mini-button ƒx, modal próprio | padronizado | desempenho.morte_transporte | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Desempenho | Aves Abatidas | sim: mini-button ƒx, modal próprio | padronizado | desempenho.aves_abatidas | dashboard.metricCard → API zootecnico/resumo; registry.metrics + sql_utils.metrica_expr |
| Detalhamento | Indicador selecionado | link Fórmula e bloco embutido | padronizado | desempenho.{indicador} | detalhes.render → API zootecnico/detalhes; mesmo indicador do Desempenho |
| Detalhamento | Ranking Técnicos | não | padronizado | desempenho.{indicador} | detalhes.render → API zootecnico/detalhes; mesmo indicador do Desempenho |
| Detalhamento | Ranking Produtores | não | padronizado | desempenho.{indicador} | detalhes.render → API zootecnico/detalhes; mesmo indicador do Desempenho |
| Detalhamento | Evolução | não | padronizado | desempenho.{indicador} | detalhes.render → API zootecnico/detalhes; mesmo indicador do Desempenho |
| Detalhamento / modal de lotes | Tabela e métricas por faixa de mortalidade | não | padronizado | desempenho.mortalidade-faixas | mortalidade-lotes.render; API detalhes etapa=lotes; mortality_details.py |
| Lotes em Criação | Lotes em Criação | sim: botão fora do título, modal Lotes | padronizado | lotes.lotes_criacao | lotes.cards → analytics.cohort_cards/cohort_points; API lotes-abertos/resumo |
| Lotes em Criação | Aves Alojadas | sim: botão fora do título, modal Lotes | padronizado | lotes.aves_alojadas | lotes.cards → analytics.cohort_cards/cohort_points; API lotes-abertos/resumo |
| Lotes em Criação | Mortalidade no Período | sim: botão fora do título, modal Lotes | padronizado | lotes.mortalidade_qtde | lotes.cards → analytics.cohort_cards/cohort_points; API lotes-abertos/resumo |
| Lotes em Criação | Mortalidade (%) | sim: botão fora do título, modal Lotes | padronizado | lotes.mortalidade | lotes.cards → analytics.cohort_cards/cohort_points; API lotes-abertos/resumo |
| Lotes em Criação | Peso Médio Geral | sim: botão fora do título, modal Lotes | padronizado | lotes.peso_medio | lotes.cards → analytics.cohort_cards/cohort_points; API lotes-abertos/resumo |
| Lotes em Criação | Mortalidade Semanal | sim: formatos diferentes no cabeçalho | padronizado | lotes.mortalidade_semanal | lotes.js / analytics.cohort_points, API lotes-abertos/resumo |
| Lotes em Criação | Média da Coluna de Peso por Idade | sim: formatos diferentes no cabeçalho | padronizado | lotes.peso_semanal | lotes.js / analytics.cohort_points, API lotes-abertos/resumo |
| Lotes em Criação | Curva de Crescimento de Peso | sim: formatos diferentes no cabeçalho | padronizado | lotes.crescimento | lotes.js / analytics.cohort_points, API lotes-abertos/resumo |
| Lotes em Criação / Galpões | Resumo por Produtor | não | padronizado | lotes.aves_alojadas; lotes.mortalidade_qtde; lotes.mortalidade; lotes.peso_medio | lotes.table/barns/drawer; mesmos dados do resumo API |
| Lotes em Criação / Galpões | Top 10 Galpões | não | padronizado | lotes.mortalidade | lotes.table/barns/drawer; mesmos dados do resumo API |
| Lotes em Criação / Galpões | Ranking de Galpões | não | padronizado | lotes.mortalidade | lotes.table/barns/drawer; mesmos dados do resumo API |
| Lotes em Criação / Galpões | Desempenho por Idade / tabela do galpão | não | padronizado | lotes.peso_semanal | lotes.table/barns/drawer; mesmos dados do resumo API |
| Lotes em Criação / Galpões | Evolução Mortalidade do galpão | não | padronizado | lotes.mortalidade_semanal | lotes.table/barns/drawer; mesmos dados do resumo API |
| Lotes / detalhe do Galpão | Idade atual | não | padronizado | lotes.idade_atual | lotes.drawer; cards recebidos da API |
| Lotes / detalhe do Galpão | Aves alojadas | não | padronizado | lotes.aves_alojadas | lotes.drawer; cards recebidos da API |
| Lotes / detalhe do Galpão | Média de peso | não | padronizado | lotes.peso_medio | lotes.drawer; cards recebidos da API |
| Lotes / detalhe do Galpão | Mortalidade | não | padronizado | lotes.mortalidade | lotes.drawer; cards recebidos da API |
| Histórico / Mortalidade | Tabela hierárquica semanal | sim: modal Histórico; apenas botão genérico | padronizado | historico.tabela_mortalidade; historico.pesos_lote | historico.values/renderTable → analytics.query_cohort/cards; vw_historico_lotes_criacao_portal |
| Histórico / Peso | Tabela hierárquica por idade | mesmo botão genérico | padronizado | historico.tabela_peso; historico.pesos_lote | historico.values/renderTable; mesmos dados API historico-abertos/resumo |
| Diferença de Aves Abatidas | Qtde Programada | sim: mini-button, modal RxP | padronizado | rxp.programada | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| Diferença de Aves Abatidas | Qtde Real | sim: mini-button, modal RxP | padronizado | rxp.real | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| Diferença de Aves Abatidas | Dif Qtde RxP | sim: mini-button, modal RxP | padronizado | rxp.diferenca | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| Diferença de Aves Abatidas | Registros com Diferença | sim: mini-button, modal RxP | padronizado | rxp.registros | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| Diferença de Aves Abatidas | Comparativo Unidade/Destino e Mês | não | padronizado | rxp.programada; rxp.real; rxp.diferenca; rxp.dif_percent; rxp.registros | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| Diferença de Aves Abatidas | Diferença por Semana | não | padronizado | rxp.diferenca; rxp.dif_percent | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| Diferença de Aves Abatidas | Ranking de Galpões | não | padronizado | rxp.diferenca; rxp.dif_percent; rxp.programada; rxp.real | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| Diferença de Aves Abatidas | Tabela de Produtores no modal | não | padronizado | rxp.programada; rxp.real; rxp.diferenca; rxp.dif_percent; rxp.tecnico | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| RxP / modal de produtores | Qtde Programada | não | padronizado | rxp.programada | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| RxP / modal de produtores | Qtde Real | não | padronizado | rxp.real | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| RxP / modal de produtores | Dif Qtde RxP | não | padronizado | rxp.diferenca | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| RxP / modal de produtores | Dif % | não | padronizado | rxp.dif_percent | rxp-data.cards/query + rxp-ranking + rxp-weekly-chart; campos oficiais de rxp/detalhes; vínculo do técnico na API |
| GPD por Fase | Gráfico e tabela por dia/semana/total | sim: modal exclusivo, texto em HTML | padronizado | gpd.07; gpd.14; gpd.21; gpd.28; gpd.35; gpd.35_abate | gpd-fases.draw/render; API gpd-fases/resumo; gpd_fases_dinamica.individual/aggregate |
| Fórmulas / desempenho | IEP | não: disclosure com texto próprio | padronizado | desempenho.iep | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | CA | não: disclosure com texto próprio | padronizado | desempenho.ca | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | CAC | não: disclosure com texto próprio | padronizado | desempenho.cac | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | GPD | não: disclosure com texto próprio | padronizado | desempenho.gmd | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | % Mortalidade | não: disclosure com texto próprio | padronizado | desempenho.mortalidade | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | Idade Média | não: disclosure com texto próprio | padronizado | desempenho.idade | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | Peso Médio | não: disclosure com texto próprio | padronizado | desempenho.peso_medio | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | Vazio | não: disclosure com texto próprio | padronizado | desempenho.vazio | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | % Morte no Transporte | não: disclosure com texto próprio | padronizado | desempenho.morte_transporte | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | CAC Ref | não: disclosure com texto próprio | padronizado | desempenho.cac_ref | catálogos atuais; correspondente fonte acima |
| Fórmulas / desempenho | Aves Abatidas | não: disclosure com texto próprio | padronizado | desempenho.aves_abatidas | catálogos atuais; correspondente fonte acima |
| Fórmulas / lotes | Lotes em Criação | não: disclosure com texto próprio | padronizado | lotes.lotes_criacao | catálogos atuais; correspondente fonte acima |
| Fórmulas / lotes | Aves Alojadas | não: disclosure com texto próprio | padronizado | lotes.aves_alojadas | catálogos atuais; correspondente fonte acima |
| Fórmulas / lotes | Mortalidade no Período (Qtde) | não: disclosure com texto próprio | padronizado | lotes.mortalidade_qtde | catálogos atuais; correspondente fonte acima |
| Fórmulas / lotes | Mortalidade no Período (%) | não: disclosure com texto próprio | padronizado | lotes.mortalidade | catálogos atuais; correspondente fonte acima |
| Fórmulas / lotes | Peso Médio Geral | não: disclosure com texto próprio | padronizado | lotes.peso_medio | catálogos atuais; correspondente fonte acima |
| Fórmulas / lotes | Mortalidade Semanal | não: disclosure com texto próprio | padronizado | lotes.mortalidade_semanal | catálogos atuais; correspondente fonte acima |
| Fórmulas / lotes | Média da Coluna de Peso por Idade | não: disclosure com texto próprio | padronizado | lotes.peso_semanal | catálogos atuais; correspondente fonte acima |
| Fórmulas / lotes | Curva de Crescimento de Peso | não: disclosure com texto próprio | padronizado | lotes.crescimento | catálogos atuais; correspondente fonte acima |
| Fórmulas / historico | Lotes consultados | não: disclosure com texto próprio | padronizado | historico.lotes | catálogos atuais; correspondente fonte acima |
| Fórmulas / historico | Aves alojadas | não: disclosure com texto próprio | padronizado | historico.aves | catálogos atuais; correspondente fonte acima |
| Fórmulas / historico | Mortalidade acumulada | não: disclosure com texto próprio | padronizado | historico.mortalidade | catálogos atuais; correspondente fonte acima |
| Fórmulas / historico | Peso médio atual | não: disclosure com texto próprio | padronizado | historico.peso_atual | catálogos atuais; correspondente fonte acima |
| Fórmulas / historico | Peso do pintinho, peso de abate e PS Pintinho x 7 dias | não: disclosure com texto próprio | padronizado | historico.pesos_lote | catálogos atuais; correspondente fonte acima |
| Fórmulas / historico | Tabela — Mortalidade por semana | não: disclosure com texto próprio | padronizado | historico.tabela_mortalidade | catálogos atuais; correspondente fonte acima |
| Fórmulas / historico | Tabela — Peso por idade | não: disclosure com texto próprio | padronizado | historico.tabela_peso | catálogos atuais; correspondente fonte acima |
| Fórmulas / rxp | Qtde Programada | não: disclosure com texto próprio | padronizado | rxp.programada | catálogos atuais; correspondente fonte acima |
| Fórmulas / rxp | Qtde Real | não: disclosure com texto próprio | padronizado | rxp.real | catálogos atuais; correspondente fonte acima |
| Fórmulas / rxp | Dif Qtde RxP | não: disclosure com texto próprio | padronizado | rxp.diferenca | catálogos atuais; correspondente fonte acima |
| Fórmulas / rxp | Registros com Diferença | não: disclosure com texto próprio | padronizado | rxp.registros | catálogos atuais; correspondente fonte acima |
| Fórmulas / rxp | Último técnico do produtor | não: disclosure com texto próprio | padronizado | rxp.tecnico | catálogos atuais; correspondente fonte acima |
| Fórmulas / rxp | Dif % | não: disclosure com texto próprio | padronizado | rxp.dif_percent | catálogos atuais; correspondente fonte acima |
| Detalhamento / Mortalidade | Conferência por faixa e registros com divergência | não | padronizado | desempenho.mortalidade-faixas | mortalidade-chart.audit; mortalidade_faixas.aggregate e exclusões do backend |
| Fórmulas / complementos | GPD 7 dias | sem card próprio no catálogo; métrica já existente em outra tela | padronizado | gpd.07 | mesma entrada central usada pelo gráfico/detalhe |
| Fórmulas / complementos | GPD 14 dias | sem card próprio no catálogo; métrica já existente em outra tela | padronizado | gpd.14 | mesma entrada central usada pelo gráfico/detalhe |
| Fórmulas / complementos | GPD 21 dias | sem card próprio no catálogo; métrica já existente em outra tela | padronizado | gpd.21 | mesma entrada central usada pelo gráfico/detalhe |
| Fórmulas / complementos | GPD 28 dias | sem card próprio no catálogo; métrica já existente em outra tela | padronizado | gpd.28 | mesma entrada central usada pelo gráfico/detalhe |
| Fórmulas / complementos | GPD 35 dias | sem card próprio no catálogo; métrica já existente em outra tela | padronizado | gpd.35 | mesma entrada central usada pelo gráfico/detalhe |
| Fórmulas / complementos | GPD 35 dias–abate | sem card próprio no catálogo; métrica já existente em outra tela | padronizado | gpd.35_abate | mesma entrada central usada pelo gráfico/detalhe |
| Fórmulas / complementos | Idade atual do galpão | sem card próprio no catálogo; métrica já existente em outra tela | padronizado | lotes.idade_atual | mesma entrada central usada pelo gráfico/detalhe |
| Fórmulas / complementos | Mortalidade por faixa e lotes do período | sem card próprio no catálogo; métrica já existente em outra tela | padronizado | desempenho.mortalidade-faixas | mesma entrada central usada pelo gráfico/detalhe |
