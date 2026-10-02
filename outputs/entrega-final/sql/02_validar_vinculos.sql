-- Somente leitura. Rodar depois da criação da view.
SELECT (SELECT COUNT(*) FROM zootecnico.acerto_lote_resultado_geral) AS linhas_acerto,
       (SELECT COUNT(*) FROM zootecnico.vw_desempenho_acerto) AS linhas_view,
       (SELECT COUNT(*) FROM zootecnico.acerto_lote_resultado_geral)
       - (SELECT COUNT(*) FROM zootecnico.vw_desempenho_acerto) AS linhas_ignoradas;
SELECT candidatos_galpao, candidatos_base, candidatos_tecnico, COUNT(*) AS registros
FROM zootecnico.vw_desempenho_acerto GROUP BY 1,2,3 ORDER BY 1,2,3;
SELECT chave_lote, COUNT(*) FROM zootecnico.acerto_lote_resultado_geral
GROUP BY chave_lote HAVING COUNT(*)>1;
SELECT codigo, gal, lote, data_abate, candidatos_galpao, candidatos_base, candidatos_tecnico
FROM zootecnico.vw_desempenho_acerto WHERE candidatos_galpao<>1 OR candidatos_base<>1;
-- Acertos excluídos da view final pela ausência de Tipo de Granja.
SELECT a.codigo, a.integrado, a.gal, a.lote, a.data_abate
FROM zootecnico.acerto_lote_resultado_geral a
WHERE NOT EXISTS (
    SELECT 1 FROM zootecnico.vw_desempenho_acerto v
    WHERE v.chave_lote IS NOT DISTINCT FROM a.chave_lote
)
ORDER BY a.codigo, a.gal, a.data_abate;
