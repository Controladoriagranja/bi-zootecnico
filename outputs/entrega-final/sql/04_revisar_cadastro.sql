-- Somente leitura. Detalha os vínculos de galpão/técnico pendentes.
-- O técnico do acerto pode estar preenchido mesmo sem alternativa no cadastro.
SELECT v.codigo, v.integrado, v.gal, v.lote, v.data_abate,
       v.tecnico AS tecnico_acerto, v.tecnico_exibicao,
       v.modelo, v.tipo_granja,
       v.candidatos_galpao, v.candidatos_tecnico,
       g.granja AS granja_cadastro,
       g.tecnico AS tecnico_cadastro, g.tec AS tec_cadastro,
       g.ini_atividade, g.encerra_atividade
FROM zootecnico.vw_desempenho_acerto v
LEFT JOIN zootecnico.galpoes g
  ON g.empresa_codigo='1'
 AND g.unidade_codigo=BTRIM(v.unidade_extracao)
 AND SUBSTRING(BTRIM(g.granja) FROM '^([0-9]+)[[:space:]]*-')=NULLIF(BTRIM(v.codigo),'')
 AND NULLIF(BTRIM(g.galpao),'')=NULLIF(BTRIM(v.gal),'')
WHERE v.candidatos_galpao<>1 OR v.candidatos_tecnico<>1
ORDER BY v.codigo, v.gal, v.data_abate;

-- Procura o código ou os três galpões no cadastro, inclusive em outras unidades.
SELECT empresa_codigo, unidade_codigo, granja, galpao,
       modelo, tipo_granja, tecnico, tec, ini_atividade, encerra_atividade
FROM zootecnico.galpoes
WHERE BTRIM(granja) ~ '^2963([[:space:]]*-|$)'
   OR BTRIM(galpao) IN ('290A','290B','290C')
ORDER BY empresa_codigo, unidade_codigo, granja, galpao;
