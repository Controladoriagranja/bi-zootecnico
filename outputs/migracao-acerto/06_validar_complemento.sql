-- Somente leitura. Executar após reaplicar 01_criar_view_desempenho_acerto.sql.
SELECT (SELECT COUNT(*) FROM zootecnico.acerto_lote_resultado_geral) AS linhas_acerto,
       (SELECT COUNT(*) FROM zootecnico.vw_desempenho_acerto) AS linhas_view,
       (SELECT COUNT(*) FROM zootecnico.acerto_lote_resultado_geral)
       - (SELECT COUNT(*) FROM zootecnico.vw_desempenho_acerto) AS linhas_ignoradas;

-- Estes seis devem ter Modelo=Convencional Forrado e Tipo=Alugada.
SELECT codigo, integrado, gal, lote, data_abate, modelo, tipo_granja,
       tecnico AS tecnico_acerto, tecnico_exibicao,
       candidatos_galpao, candidatos_base
FROM zootecnico.vw_desempenho_acerto
WHERE BTRIM(codigo)='2963' AND BTRIM(gal) IN ('290A','290B','290C')
ORDER BY gal, data_abate, lote;

-- Verifica se ainda há outros campos cadastrais sem valor na view completa.
SELECT codigo, integrado, gal, lote, data_abate, modelo, tipo_granja,
       tecnico_exibicao, candidatos_galpao, candidatos_base
FROM zootecnico.vw_desempenho_acerto
WHERE NULLIF(BTRIM(modelo),'') IS NULL
   OR NULLIF(BTRIM(tipo_granja),'') IS NULL
   OR tecnico_exibicao='Sem técnico informado'
ORDER BY codigo, gal, data_abate;

-- Com a carga atual, deve aparecer somente 24516 / 522 / lote 52.
SELECT a.codigo, a.integrado, a.gal, a.lote, a.data_abate
FROM zootecnico.acerto_lote_resultado_geral a
WHERE NOT EXISTS (
    SELECT 1 FROM zootecnico.vw_desempenho_acerto v
    WHERE v.chave_lote IS NOT DISTINCT FROM a.chave_lote
)
ORDER BY a.codigo, a.gal, a.data_abate;
