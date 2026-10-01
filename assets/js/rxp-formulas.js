window.FORMULAS_RXP = [
  {
    "id": "programada",
    "nome": "Qtde Programada",
    "unidade": "aves",
    "formula_exibicao": "Σ([Qtde Programada])",
    "descricao": "Soma da coluna Qtde Programada no contexto dos filtros. Valor recebido da API; a diferença não é recalculada.",
    "colunas": [
      "Qtde Programada"
    ],
    "passos": [
      "Aplicar os filtros selecionados.",
      "Somar os valores válidos da coluna Qtde Programada."
    ]
  },
  {
    "id": "real",
    "nome": "Qtde Real",
    "unidade": "aves",
    "formula_exibicao": "Σ([Qtde Real])",
    "descricao": "Soma da coluna Qtde Real no contexto dos filtros. Valor recebido da API; a diferença não é recalculada.",
    "colunas": [
      "Qtde Real"
    ],
    "passos": [
      "Aplicar os filtros selecionados.",
      "Somar os valores válidos da coluna Qtde Real."
    ]
  },
  {
    "id": "diferenca",
    "nome": "Dif Qtde RxP",
    "unidade": "aves",
    "formula_exibicao": "Σ([Dif Qtde RxP])",
    "descricao": "Soma da coluna Dif Qtde RxP no contexto dos filtros. Valor recebido da API; a diferença não é recalculada.",
    "colunas": [
      "Dif Qtde RxP"
    ],
    "passos": [
      "Aplicar os filtros selecionados.",
      "Somar os valores válidos da coluna Dif Qtde RxP."
    ]
  },
  {
    "id": "registros",
    "nome": "Registros com Diferença",
    "unidade": "registros",
    "formula_exibicao": "CONTAR registros com [Dif Qtde RxP] válida e diferente de zero",
    "descricao": "Contagem de registros, não de produtores ou lotes distintos. Valores ausentes não contam como diferença.",
    "colunas": [
      "Dif Qtde RxP"
    ],
    "passos": [
      "Aplicar os filtros.",
      "Contar diferenças válidas, positivas ou negativas."
    ]
  },
  {
    "id": "tecnico",
    "nome": "Último técnico do produtor",
    "unidade": "",
    "formula_exibicao": "Técnico do registro com maior [Data de Abate] por [Cod Prod]",
    "descricao": "Vínculo por Código ↔ Cod Prod. Sem código correspondente, usa nome normalizado exato somente quando identifica um único produtor. Considera todo o histórico disponível, antes dos filtros RxP, com técnico preenchido. Desempate por Data_Analise, Periodo_Arquivo_Fim e nome do técnico. Sem correspondência segura: Sem técnico vinculado.",
    "colunas": [
      "Código",
      "Integrado",
      "Cod Prod",
      "Produtor",
      "Técnico",
      "Data de Abate"
    ],
    "passos": [
      "Localizar o produtor pelo código; usar nome exato e unívoco como alternativa.",
      "Selecionar seu último abate com técnico informado.",
      "Aplicar o mesmo vínculo em todos os registros RxP desse produtor."
    ]
  },
  {
    "id": "dif_percent",
    "nome": "Dif %",
    "formula_exibicao": "Σ(dif_qtde_rxp) / Σ(qtde_programada) × 100",
    "descricao": "Razão dos totais do contexto, por unidade e no consolidado. Não calcular a média dos percentuais de Ave Nova e Real Alimentos. Denominador zero: —.",
    "colunas": [
      "dif_qtde_rxp",
      "qtde_programada"
    ],
    "passos": [
      "Aplicar filtros a ambas as fontes e preservar sua identificação.",
      "Usar a diferença armazenada.",
      "Dividir a soma das diferenças pela soma programada e multiplicar por 100."
    ]
  }
];
