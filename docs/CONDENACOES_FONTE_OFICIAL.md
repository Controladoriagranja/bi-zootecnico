# Condenações: fonte oficial do card — 19/11/2026

O card `% Cond (Tot+Par Quilos)` do Desempenho Lotes Fechados passa a usar `/api/pcp/comparativo/cirurgico-geral`, a mesma consulta oficial do PCP. Deixa de obter o indicador principal pela soma das ocorrências de `pcp.condenacoes`.

O layout continua com um consolidado Ave Nova + Real por mês e ano. Como o PCP fornece os percentuais das unidades e turnos separadamente, o consolidado usa os percentuais diários oficiais ponderados pelos respectivos pesos vivos. Os pesos são consultados nos endpoints já existentes `/api/pcp/dados/diario_industria` e `/api/pcp/dados/diario_industria_turnos`, com `descricao=Peso Vivo(-D+A)`. Não há média simples de percentuais, soma do total AN novamente com seus turnos ou inclusão de pesos em dias sem condenação oficial válida.

As regras de denominador são as mesmas de `calcular_cirurgico`: AN soma recepção e compra por turno; Real usa Abate - Total quando compra e abate estão presentes, senão recepção. A consolidação por unidade é conferida contra o mês efetivamente retornado pelo PCP, com tolerância numérica de 1e-9. Divergência, peso ausente ou paginação incompleta tornam o valor indisponível; não ocorre fallback para outra base.

O Total do card é a razão dos pesos acumulados dos meses selecionados. Zero oficial permanece zero; ausência de base permanece “—”. Os filtros de produtor/lote zootécnico não passam a limitar o consolidado industrial.

O detalhamento do Zootécnico continua abrindo Ave Nova + Real (`visao=geral`), com ano e mês da célula ou do botão Detalhes e liberdade para alterar os filtros internos. O PCP não foi modificado: continua abrindo seu contexto preestabelecido. Os dois detalhamentos continuam consultando as ocorrências em `pcp.condenacoes`, portanto a reconciliação entre ocorrências e Diário da Indústria continua sendo uma comparação de fontes distintas.

Validação: `node tests/condenacoes-oficial.cjs` cobre fonte, ponderação, tratamento das seções, turnos, zeros, ausências, falhas, paginação, divergência mensal, card, ordenação e abertura do detalhe em 1440 e 390 px.

Também foi executado o cálculo real `calcular_cirurgico` do ZIP fornecido em 19/11/2026, com consultas SELECT ao banco em modo read-only para outubro e novembro de 2026 até 18/11. Os valores mensais por unidade foram reproduzidos. Consolidados: outubro, 622.383 kg / 13.687.882 kg; novembro, 351.875 kg / 8.203.644 kg. O teste reaproveita essa captura local quando presente em `outputs/condenacoes-oficial-20261119/reference.json`, sem depender dela para os cenários sintéticos.

Sem alteração ou publicação da API, do banco ou do projeto PCP. A implementação está somente nos assets e no HTML do Zootécnico.
