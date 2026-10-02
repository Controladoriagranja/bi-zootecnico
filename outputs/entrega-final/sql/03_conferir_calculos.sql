-- Somente leitura. Mesma seleção na API: ano=2026&mes=9.
-- Fórmulas individuais, seguidas de média simples. Não divide somas.
-- Usa a view final para respeitar a exclusão de acertos sem Tipo de Granja.
SELECT COUNT(*) AS registros,
       AVG(mort::numeric / NULLIF(aloj::numeric,0) * 100) AS mortalidade,
       AVG(pes_total::numeric / NULLIF(qt_aves::numeric,0)) AS peso_medio,
       AVG((qt_aves::numeric * ida::numeric) / NULLIF(qt_aves::numeric,0)) AS idade,
       AVG(ps_med::numeric / NULLIF(ida::numeric,0) * 1000) AS gmd,
       AVG(consumo_racao::numeric / NULLIF(pes_total::numeric,0)) AS ca,
       AVG(iep::numeric) AS iep,
       AVG(cac::numeric) AS cac,
       AVG(CASE WHEN vazio_sanitario>14 THEN 14::numeric ELSE vazio_sanitario::numeric END) AS vazio,
       SUM(qt_aves::numeric) AS aves_abatidas
FROM zootecnico.vw_desempenho_acerto
WHERE data_abate::date BETWEEN DATE '2026-09-01' AND DATE '2026-09-30';

-- Exemplo da linha 2 da planilha: um único acerto.
SELECT codigo, gal, lote, data_abate,
       mort::numeric / NULLIF(aloj::numeric,0) * 100 AS mortalidade,
       pes_total::numeric / NULLIF(qt_aves::numeric,0) AS peso_medio,
       (qt_aves::numeric * ida::numeric) / NULLIF(qt_aves::numeric,0) AS idade,
       ps_med::numeric / NULLIF(ida::numeric,0) * 1000 AS gmd,
       consumo_racao::numeric / NULLIF(pes_total::numeric,0) AS ca,
       candidatos_galpao, candidatos_base, candidatos_tecnico,
       tecnico, tecnico_exibicao, modelo, tipo_granja, status_acerto
FROM zootecnico.vw_desempenho_acerto
WHERE BTRIM(codigo)='770' AND BTRIM(gal)='238B' AND BTRIM(lote)='50'
  AND data_abate::date=DATE '2026-09-11';

-- Estrutura efetiva das três fontes para comparação com a documentação.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema='zootecnico'
  AND table_name IN ('acerto_lote_resultado_geral','galpoes','base_dinamica')
ORDER BY table_name, ordinal_position;
