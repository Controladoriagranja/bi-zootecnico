/** Catálogo de apresentação; os valores são calculados pela API. */
const METRICAS = {
  "iep": {
    "id": "iep",
    "nome": "IEP",
    "coluna": "IEP",
    "unidade": "",
    "tipo_calculo": "media_ponderada",
    "ponderador": "Aves Abatidas",
    "casas_decimais": 2,
    "formula_exibicao": "Σ([IEP] × [Aves Abatidas]) / Σ([Aves Abatidas])",
    "formula_dax": "iep =\nVAR LinhasValidas = FILTER(base_dinamica_tratado, YEAR(base_dinamica_tratado[Data de Abate]) >= 2023 && NOT ISBLANK(base_dinamica_tratado[IEP]) && NOT ISBLANK(base_dinamica_tratado[Aves Abatidas]))\nRETURN DIVIDE(\n    SUMX(LinhasValidas, base_dinamica_tratado[IEP] * base_dinamica_tratado[Aves Abatidas]),\n    SUMX(LinhasValidas, base_dinamica_tratado[Aves Abatidas])\n)",
    "descricao": "Média ponderada do IEP pelas Aves Abatidas.",
    "colunas": [
      "IEP",
      "Aves Abatidas"
    ],
    "passos": [
      "Aplique os filtros atuais e use registros com ano de abate a partir de 2023.",
      "Use apenas linhas com valor válido em [IEP] e [Aves Abatidas].",
      "Multiplique [IEP] por [Aves Abatidas] em cada linha e some os produtos.",
      "Divida pela soma de [Aves Abatidas] dessas mesmas linhas. Se o denominador for zero, mostre —."
    ]
  },
  "ca": {
    "id": "ca",
    "nome": "CA",
    "coluna": "CA",
    "unidade": "",
    "tipo_calculo": "media_ponderada",
    "ponderador": "Aves Abatidas",
    "casas_decimais": 3,
    "formula_exibicao": "Σ([CA] × [Aves Abatidas]) / Σ([Aves Abatidas])",
    "formula_dax": "ca =\nVAR LinhasValidas = FILTER(base_dinamica_tratado, YEAR(base_dinamica_tratado[Data de Abate]) >= 2023 && NOT ISBLANK(base_dinamica_tratado[CA]) && NOT ISBLANK(base_dinamica_tratado[Aves Abatidas]))\nRETURN DIVIDE(\n    SUMX(LinhasValidas, base_dinamica_tratado[CA] * base_dinamica_tratado[Aves Abatidas]),\n    SUMX(LinhasValidas, base_dinamica_tratado[Aves Abatidas])\n)",
    "descricao": "Média ponderada da Conversão Alimentar pelas Aves Abatidas.",
    "colunas": [
      "CA",
      "Aves Abatidas"
    ],
    "passos": [
      "Aplique os filtros atuais e use registros com ano de abate a partir de 2023.",
      "Use apenas linhas com valor válido em [CA] e [Aves Abatidas].",
      "Multiplique [CA] por [Aves Abatidas] em cada linha e some os produtos.",
      "Divida pela soma de [Aves Abatidas] dessas mesmas linhas. Se o denominador for zero, mostre —."
    ]
  },
  "cac": {
    "id": "cac",
    "nome": "CAC",
    "coluna": "CAC",
    "unidade": "",
    "tipo_calculo": "media_ponderada",
    "ponderador": "Aves Abatidas",
    "casas_decimais": 3,
    "formula_exibicao": "Σ([CAC] × [Aves Abatidas]) / Σ([Aves Abatidas])",
    "formula_dax": "cac =\nVAR LinhasValidas = FILTER(base_dinamica_tratado, YEAR(base_dinamica_tratado[Data de Abate]) >= 2023 && NOT ISBLANK(base_dinamica_tratado[CAC]) && NOT ISBLANK(base_dinamica_tratado[Aves Abatidas]))\nRETURN DIVIDE(\n    SUMX(LinhasValidas, base_dinamica_tratado[CAC] * base_dinamica_tratado[Aves Abatidas]),\n    SUMX(LinhasValidas, base_dinamica_tratado[Aves Abatidas])\n)",
    "descricao": "Média ponderada do CAC pelas Aves Abatidas.",
    "colunas": [
      "CAC",
      "Aves Abatidas"
    ],
    "passos": [
      "Aplique os filtros atuais e use registros com ano de abate a partir de 2023.",
      "Use apenas linhas com valor válido em [CAC] e [Aves Abatidas].",
      "Multiplique [CAC] por [Aves Abatidas] em cada linha e some os produtos.",
      "Divida pela soma de [Aves Abatidas] dessas mesmas linhas. Se o denominador for zero, mostre —."
    ]
  },
  "gmd": {
    "id": "gmd",
    "nome": "GMD",
    "coluna": "GMD",
    "unidade": "",
    "tipo_calculo": "media_ponderada",
    "ponderador": "Aves Abatidas",
    "casas_decimais": 2,
    "formula_exibicao": "Σ([GMD] × [Aves Abatidas]) / Σ([Aves Abatidas])",
    "formula_dax": "gmd =\nVAR LinhasValidas = FILTER(base_dinamica_tratado, YEAR(base_dinamica_tratado[Data de Abate]) >= 2023 && NOT ISBLANK(base_dinamica_tratado[GMD]) && NOT ISBLANK(base_dinamica_tratado[Aves Abatidas]))\nRETURN DIVIDE(\n    SUMX(LinhasValidas, base_dinamica_tratado[GMD] * base_dinamica_tratado[Aves Abatidas]),\n    SUMX(LinhasValidas, base_dinamica_tratado[Aves Abatidas])\n)",
    "descricao": "Média ponderada do GMD pelas Aves Abatidas.",
    "colunas": [
      "GMD",
      "Aves Abatidas"
    ],
    "passos": [
      "Aplique os filtros atuais e use registros com ano de abate a partir de 2023.",
      "Use apenas linhas com valor válido em [GMD] e [Aves Abatidas].",
      "Multiplique [GMD] por [Aves Abatidas] em cada linha e some os produtos.",
      "Divida pela soma de [Aves Abatidas] dessas mesmas linhas. Se o denominador for zero, mostre —."
    ]
  },
  "mortalidade": {
    "id": "mortalidade",
    "nome": "% Mortalidade",
    "coluna": "% Mortalidade",
    "unidade": "%",
    "tipo_calculo": "media_ponderada",
    "ponderador": "Aves Abatidas",
    "casas_decimais": 2,
    "formula_exibicao": "Σ([% Mortalidade] × [Aves Abatidas]) / Σ([Aves Abatidas])",
    "formula_dax": "mortalidade =\nVAR LinhasValidas = FILTER(base_dinamica_tratado, YEAR(base_dinamica_tratado[Data de Abate]) >= 2023 && NOT ISBLANK(base_dinamica_tratado[% Mortalidade]) && NOT ISBLANK(base_dinamica_tratado[Aves Abatidas]))\nRETURN DIVIDE(\n    SUMX(LinhasValidas, base_dinamica_tratado[% Mortalidade] * base_dinamica_tratado[Aves Abatidas]),\n    SUMX(LinhasValidas, base_dinamica_tratado[Aves Abatidas])\n)",
    "descricao": "Mortalidade média ponderada pelas Aves Abatidas.",
    "colunas": [
      "% Mortalidade",
      "Aves Abatidas"
    ],
    "passos": [
      "Aplique os filtros atuais e use registros com ano de abate a partir de 2023.",
      "Use apenas linhas com valor válido em [% Mortalidade] e [Aves Abatidas].",
      "Multiplique [% Mortalidade] por [Aves Abatidas] em cada linha e some os produtos.",
      "Divida pela soma de [Aves Abatidas] dessas mesmas linhas. Se o denominador for zero, mostre —.",
      "A coluna já contém percentual: não multiplique novamente por 100."
    ]
  },
  "idade": {
    "id": "idade",
    "nome": "Idade",
    "coluna": "Idade",
    "unidade": "dias",
    "tipo_calculo": "media_ponderada",
    "ponderador": "Aves Abatidas",
    "casas_decimais": 1,
    "formula_exibicao": "Σ([Idade] × [Aves Abatidas]) / Σ([Aves Abatidas])",
    "formula_dax": "idade =\nVAR LinhasValidas = FILTER(base_dinamica_tratado, YEAR(base_dinamica_tratado[Data de Abate]) >= 2023 && NOT ISBLANK(base_dinamica_tratado[Idade]) && NOT ISBLANK(base_dinamica_tratado[Aves Abatidas]))\nRETURN DIVIDE(\n    SUMX(LinhasValidas, base_dinamica_tratado[Idade] * base_dinamica_tratado[Aves Abatidas]),\n    SUMX(LinhasValidas, base_dinamica_tratado[Aves Abatidas])\n)",
    "descricao": "Idade média ponderada pelas Aves Abatidas.",
    "colunas": [
      "Idade",
      "Aves Abatidas"
    ],
    "passos": [
      "Aplique os filtros atuais e use registros com ano de abate a partir de 2023.",
      "Use apenas linhas com valor válido em [Idade] e [Aves Abatidas].",
      "Multiplique [Idade] por [Aves Abatidas] em cada linha e some os produtos.",
      "Divida pela soma de [Aves Abatidas] dessas mesmas linhas. Se o denominador for zero, mostre —."
    ]
  },
  "peso_medio": {
    "id": "peso_medio",
    "nome": "Peso Médio Ponderado",
    "coluna": "Peso Médio",
    "unidade": "",
    "tipo_calculo": "media_ponderada",
    "ponderador": "Aves Abatidas",
    "casas_decimais": 3,
    "formula_exibicao": "Σ([Peso Médio] × [Aves Abatidas]) / Σ([Aves Abatidas])",
    "formula_dax": "peso_medio =\nVAR LinhasValidas = FILTER(base_dinamica_tratado, YEAR(base_dinamica_tratado[Data de Abate]) >= 2023 && NOT ISBLANK(base_dinamica_tratado[Peso Médio]) && NOT ISBLANK(base_dinamica_tratado[Aves Abatidas]))\nRETURN DIVIDE(\n    SUMX(LinhasValidas, base_dinamica_tratado[Peso Médio] * base_dinamica_tratado[Aves Abatidas]),\n    SUMX(LinhasValidas, base_dinamica_tratado[Aves Abatidas])\n)",
    "descricao": "Média ponderada da coluna [Peso Médio] da base de desempenho, usando [Aves Abatidas] como peso. Não utiliza as colunas semanais [Peso Med.-07] a [Peso Med.-42].",
    "colunas": [
      "Peso Médio",
      "Aves Abatidas"
    ],
    "passos": [
      "Aplique os filtros atuais e use registros com ano de abate a partir de 2023.",
      "Use apenas linhas com valor válido em [Peso Médio] e [Aves Abatidas].",
      "Multiplique [Peso Médio] por [Aves Abatidas] em cada linha e some os produtos.",
      "Divida pela soma de [Aves Abatidas] dessas mesmas linhas. Se o denominador for zero, mostre —."
    ]
  },
  "vazio": {
    "id": "vazio",
    "nome": "Vazio",
    "coluna": "Vazio",
    "unidade": "dias",
    "tipo_calculo": "media_ponderada",
    "ponderador": "Aves Abatidas",
    "casas_decimais": 1,
    "formula_exibicao": "Σ(SE([Vazio] < 7 OU [Vazio] > 18; 14; [Vazio]) × [Aves Abatidas]) / Σ([Aves Abatidas])",
    "formula_dax": "vazio =\nVAR LinhasValidas = FILTER(base_dinamica_tratado, YEAR(base_dinamica_tratado[Data de Abate]) >= 2023 && NOT ISBLANK(base_dinamica_tratado[Vazio]) && NOT ISBLANK(base_dinamica_tratado[Aves Abatidas]))\nRETURN DIVIDE(\n    SUMX(LinhasValidas, IF(base_dinamica_tratado[Vazio] < 7 || base_dinamica_tratado[Vazio] > 18, 14, base_dinamica_tratado[Vazio]) * base_dinamica_tratado[Aves Abatidas]),\n    SUMX(LinhasValidas, base_dinamica_tratado[Aves Abatidas])\n)",
    "regra_adicional": {
      "status": "implementada",
      "descricao": "Em cada registro, substitua [Vazio] menor que 7 ou maior que 18 por 14 antes do cálculo. Valores de 7 a 18 são mantidos; valores ausentes continuam fora da média."
    },
    "descricao": "Vazio médio ponderado pelas Aves Abatidas.",
    "colunas": [
      "Vazio",
      "Aves Abatidas"
    ],
    "passos": [
      "Aplique os filtros atuais e use registros com ano de abate a partir de 2023.",
      "Use apenas linhas com valor válido em [Vazio] e [Aves Abatidas].",
      "Em cada linha, se [Vazio] < 7 ou [Vazio] > 18, use 14. Mantenha os valores entre 7 e 18, incluindo os limites. Não transforme valores ausentes em 14.",
      "Multiplique o Vazio ajustado por [Aves Abatidas] de cada linha e some os produtos.",
      "Divida pela soma de [Aves Abatidas] dessas mesmas linhas. Se o denominador for zero, mostre —."
    ]
  },
  "morte_transporte": {
    "id": "morte_transporte",
    "nome": "% Morte no Transporte",
    "coluna": "% Mort. Transporte",
    "unidade": "%",
    "tipo_calculo": "media_ponderada",
    "ponderador": "Aves Abatidas",
    "casas_decimais": 2,
    "formula_exibicao": "Σ([% Mort. Transporte] × [Aves Abatidas]) / Σ([Aves Abatidas])",
    "formula_dax": "morte_transporte =\nVAR LinhasValidas = FILTER(base_dinamica_tratado, YEAR(base_dinamica_tratado[Data de Abate]) >= 2023 && NOT ISBLANK(base_dinamica_tratado[% Mort. Transporte]) && NOT ISBLANK(base_dinamica_tratado[Aves Abatidas]))\nRETURN DIVIDE(\n    SUMX(LinhasValidas, base_dinamica_tratado[% Mort. Transporte] * base_dinamica_tratado[Aves Abatidas]),\n    SUMX(LinhasValidas, base_dinamica_tratado[Aves Abatidas])\n)",
    "descricao": "Morte no transporte média ponderada pelas Aves Abatidas.",
    "colunas": [
      "% Mort. Transporte",
      "Aves Abatidas"
    ],
    "passos": [
      "Aplique os filtros atuais e use registros com ano de abate a partir de 2023.",
      "Use apenas linhas com valor válido em [% Mort. Transporte] e [Aves Abatidas].",
      "Multiplique [% Mort. Transporte] por [Aves Abatidas] em cada linha e some os produtos.",
      "Divida pela soma de [Aves Abatidas] dessas mesmas linhas. Se o denominador for zero, mostre —.",
      "A coluna já contém percentual: não multiplique novamente por 100."
    ]
  },
  "aves_abatidas": {
    "id": "aves_abatidas",
    "nome": "Aves Abatidas",
    "coluna": "Aves Abatidas",
    "unidade": "aves",
    "tipo_calculo": "soma",
    "casas_decimais": 0,
    "formula_exibicao": "Σ([Aves Abatidas])",
    "formula_dax": "base_dinamica_sum_aves_abatidas =\nSUM(base_dinamica_tratado[Aves Abatidas])",
    "descricao": "Total de aves abatidas no contexto atual de filtros.",
    "colunas": [
      "Aves Abatidas"
    ],
    "passos": [
      "Aplique os filtros atuais e use registros com ano de abate a partir de 2023.",
      "Some os valores da coluna [Aves Abatidas]."
    ]
  }
};
const BI_METRIC_ORDER = ["iep","ca","cac","gmd","mortalidade","idade","peso_medio","vazio","morte_transporte","aves_abatidas"];
window.METRICAS = METRICAS;
window.BI_METRIC_ORDER = BI_METRIC_ORDER;
