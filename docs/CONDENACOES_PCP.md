# Condenações no Desempenho

O quadro mensal utiliza o endpoint autenticado `/api/pcp/comparativo/condenacoes`, com a visão consolidada Ave Nova + Real. Usa os meses e anos selecionados no painel. Os filtros de lote, produtor, galpão e linhagem não se aplicam a esse consolidado do PCP.

Os percentuais mensais e acumulados são retornados pelo backend: peso condenado / peso vivo, com acumulado ponderado. Não existe média simples dos percentuais no navegador. Ausência de resposta aparece como indisponível, nunca como zero inventado.

O clique do mês e ano abre a implementação de acompanhamento do PCP, preservando resumo por grupo, causas, ocorrências, filtros e ordenação. Os arquivos pcp-condenacoes.js, pcp-multiselect.js e pcp-table-sort.js foram sincronizados do BI-PCP em 12/11/2026. Não alteramos autenticação, permissões, coleta ou dados.

Verificação: sintaxe de todos os novos scripts; navegador com respostas simuladas: mês/ano, percentual mensal, grupos → causas → ocorrências, altura estável e viewport de 390px.
