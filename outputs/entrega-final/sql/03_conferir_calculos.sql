-- Somente leitura. Regras acerto-2026-10-05. API: ano=2026&mes=8.
-- Fórmulas por divisão de somas; IEP simples; CAC ponderado por aloj.
-- Vazio sem limite, ponderado por qt_aves.
-- Usa a view final para respeitar a exclusão de acertos sem Tipo de Granja.
SELECT COUNT(*) AS registros,
       SUM(mort::numeric) / NULLIF(SUM(aloj::numeric),0) * 100 AS mortalidade,
       SUM(pes_total::numeric) / NULLIF(SUM(qt_aves::numeric),0) AS peso_medio,
       SUM(qt_aves::numeric * ida::numeric) / NULLIF(SUM(qt_aves::numeric),0) AS idade,
       SUM(pes_total::numeric / NULLIF(qt_aves::numeric,0)) /
         NULLIF(SUM((qt_aves::numeric * ida::numeric) / NULLIF(qt_aves::numeric,0)),0) * 1000 AS gmd,
       SUM(consumo_racao::numeric) / NULLIF(SUM(pes_total::numeric),0) AS ca,
       AVG(iep::numeric) AS iep,
       SUM(cac::numeric * aloj::numeric) /
         NULLIF(SUM(CASE WHEN cac IS NOT NULL AND aloj IS NOT NULL THEN aloj::numeric END),0) AS cac,
       SUM(vazio_sanitario::numeric * qt_aves::numeric) /
         NULLIF(SUM(CASE WHEN vazio_sanitario IS NOT NULL AND qt_aves IS NOT NULL THEN qt_aves::numeric END),0) AS vazio,
       SUM(qt_aves::numeric) AS aves_abatidas
FROM zootecnico.vw_desempenho_acerto
WHERE data_abate::date BETWEEN DATE '2026-08-01' AND DATE '2026-08-31';

-- Exemplo da linha 2 da planilha: um único acerto.
SELECT codigo, gal, lote, data_abate,
       mort::numeric / NULLIF(aloj::numeric,0) * 100 AS mortalidade,
       pes_total::numeric / NULLIF(qt_aves::numeric,0) AS peso_medio,
       (qt_aves::numeric * ida::numeric) / NULLIF(qt_aves::numeric,0) AS idade,
       (pes_total::numeric / NULLIF(qt_aves::numeric,0)) /
         NULLIF((qt_aves::numeric * ida::numeric) / NULLIF(qt_aves::numeric,0),0) * 1000 AS gmd,
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
