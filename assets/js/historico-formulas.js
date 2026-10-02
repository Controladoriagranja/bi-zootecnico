window.FORMULAS_HISTORICO = [
  {
    "id": "lotes",
    "nome": "Lotes consultados",
    "formula_exibicao": "Quantidade de registros após deduplicação e filtros",
    "descricao": "Contagem dos registros consultados, sem somar novamente as linhas de agrupamento.",
    "colunas": [
      "Codigo Granja",
      "Num Lote",
      "Galp",
      "Data Recepcao",
      "Periodo_Arquivo_Fim"
    ],
    "passos": [
      "Aplicar o ano e todos os filtros do Histórico. Manter a última ocorrência por Codigo Granja + Num Lote + Galp + Data Recepcao, segundo Periodo_Arquivo_Fim; registros sem chave completa permanecem individuais.",
      "Contar os registros restantes."
    ]
  },
  {
    "id": "aves",
    "nome": "Aves alojadas",
    "formula_exibicao": "Σ([Aves Inicia])",
    "descricao": "Soma das aves iniciais dos registros filtrados.",
    "colunas": [
      "Aves Inicia"
    ],
    "passos": [
      "Aplicar o ano e todos os filtros do Histórico. Manter a última ocorrência por Codigo Granja + Num Lote + Galp + Data Recepcao, segundo Periodo_Arquivo_Fim; registros sem chave completa permanecem individuais.",
      "Somar os valores numéricos; ausentes ou inválidos contribuem com zero."
    ]
  },
  {
    "id": "mortalidade",
    "nome": "Mortalidade acumulada",
    "formula_exibicao": "(Σ([Qtde Mort Sem-07] + [Qtde Desc Sem-07] + [Qtde Mort Sem-14] + [Qtde Desc Sem-14] + [Qtde Mort Sem-21] + [Qtde Desc Sem-21] + [Qtde Mort Sem-28] + [Qtde Desc Sem-28] + [Qtde Mort Sem-35] + [Qtde Desc Sem-35]) / Σ([Aves Inicia])) × 100",
    "descricao": "Inclui mortes e descartes das semanas 7, 14, 21, 28 e 35; não inclui a coluna de 42 dias.",
    "colunas": [
      "Qtde Mort Sem-07",
      "Qtde Desc Sem-07",
      "Qtde Mort Sem-14",
      "Qtde Desc Sem-14",
      "Qtde Mort Sem-21",
      "Qtde Desc Sem-21",
      "Qtde Mort Sem-28",
      "Qtde Desc Sem-28",
      "Qtde Mort Sem-35",
      "Qtde Desc Sem-35",
      "Aves Inicia"
    ],
    "passos": [
      "Aplicar o ano e todos os filtros do Histórico. Manter a última ocorrência por Codigo Granja + Num Lote + Galp + Data Recepcao, segundo Periodo_Arquivo_Fim; registros sem chave completa permanecem individuais.",
      "Somar mortes e descartes dessas cinco semanas. Valores ausentes contribuem com zero.",
      "Dividir pela soma das aves iniciais de todos os registros filtrados e multiplicar por 100. Denominador zero: o card mostra —."
    ]
  },
  {
    "id": "peso_atual",
    "nome": "Peso médio atual",
    "formula_exibicao": "Σ(peso atual válido em kg) / quantidade de pesos atuais válidos",
    "descricao": "Média simples, sem ponderação por aves.",
    "colunas": [
      "Peso Med.-07",
      "Peso Med.-14",
      "Peso Med.-21",
      "Peso Med.-28",
      "Peso Med.-35"
    ],
    "passos": [
      "Aplicar ano, dimensões e a deduplicação aprovada de lotes fechados.",
      "Usar ps_abate quando válido; caso ausente, usar o primeiro peso semanal válido na ordem 35, 28, 21, 14 e 7 dias e converter de gramas para kg.",
      "Calcular a média simples dos valores válidos. Zero é válido; ausência permanece null."
    ]
  },
  {
    "id": "tabela_mortalidade",
    "nome": "Tabela — Mortalidade por semana",
    "formula_exibicao": "%M+D = Σ([Qtde Mort Sem-N] + [Qtde Desc Sem-N]) / Σ([Aves Inicia]) × 100\n%M = Σ([Qtde Mort Sem-N]) / Σ([Aves Inicia]) × 100\n%D = Σ([Qtde Desc Sem-N]) / Σ([Aves Inicia]) × 100",
    "descricao": "N = 07, 14, 21, 28 ou 35. Cada coluna usa somente sua semana, sem acumular as anteriores.",
    "colunas": [
      "Qtde Mort Sem-07",
      "Qtde Desc Sem-07",
      "Qtde Mort Sem-14",
      "Qtde Desc Sem-14",
      "Qtde Mort Sem-21",
      "Qtde Desc Sem-21",
      "Qtde Mort Sem-28",
      "Qtde Desc Sem-28",
      "Qtde Mort Sem-35",
      "Qtde Desc Sem-35",
      "Aves Inicia"
    ],
    "passos": [
      "Aplicar o ano e todos os filtros do Histórico. Manter a última ocorrência por Codigo Granja + Num Lote + Galp + Data Recepcao, segundo Periodo_Arquivo_Fim; registros sem chave completa permanecem individuais.",
      "Aplicar as fórmulas aos registros de cada semana do ano, produtor ou galpão.",
      "Valores ausentes de morte e descarte contribuem com zero. O denominador inclui todas as aves iniciais do grupo.",
      "No total, recalcular sobre todos os registros filtrados, sem somar percentuais nem linhas de agrupamento. Denominador zero: —."
    ]
  },
  {
    "id": "tabela_peso",
    "nome": "Tabela — Peso por idade",
    "formula_exibicao": "Σ([Peso Med.-N] válido) / quantidade de valores válidos em [Peso Med.-N]",
    "descricao": "Média simples da coluna de cada idade (7, 14, 21, 28 e 35 dias), na unidade original da base, sem conversão para kg.",
    "colunas": [
      "Peso Med.-07",
      "Peso Med.-14",
      "Peso Med.-21",
      "Peso Med.-28",
      "Peso Med.-35"
    ],
    "passos": [
      "Aplicar o ano e todos os filtros do Histórico. Manter a última ocorrência por Codigo Granja + Num Lote + Galp + Data Recepcao, segundo Periodo_Arquivo_Fim; registros sem chave completa permanecem individuais.",
      "Usar somente valores numéricos da respectiva coluna; zero é válido.",
      "Calcular separadamente por semana do ano, produtor e galpão.",
      "No total, calcular novamente sobre os registros filtrados; não tirar a média das médias dos grupos. Sem valores: —. Exibir duas casas decimais."
    ]
  }
];
