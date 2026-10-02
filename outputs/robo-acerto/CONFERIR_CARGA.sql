-- Somente leitura. A tabela do acerto possui data_abate timestamp.
SELECT TO_CHAR(data_abate, 'YYYY-MM') AS mes_abate,
       COUNT(*) AS registros,
       MIN(data_abate)::date AS primeiro_abate,
       MAX(data_abate)::date AS ultimo_abate
FROM zootecnico.acerto_lote_resultado_geral
WHERE unidade_extracao = '52' AND data_abate >= DATE '2023-01-01'
GROUP BY 1 ORDER BY 1;

-- Meses sem linhas na origem. Conferir retorno vazio nos Excel/checkpoint.
WITH meses AS (
    SELECT GENERATE_SERIES(DATE '2023-01-01', DATE_TRUNC('month', CURRENT_DATE), INTERVAL '1 month') AS inicio
)
SELECT TO_CHAR(m.inicio, 'YYYY-MM') AS mes_sem_registros
FROM meses m
WHERE NOT EXISTS (
    SELECT 1 FROM zootecnico.acerto_lote_resultado_geral a
    WHERE a.unidade_extracao = '52'
      AND a.data_abate >= m.inicio AND a.data_abate < m.inicio + INTERVAL '1 month'
)
ORDER BY 1;

-- Não deve retornar linhas.
SELECT chave_lote, COUNT(*) AS registros
FROM zootecnico.acerto_lote_resultado_geral
GROUP BY chave_lote HAVING COUNT(*) > 1;

-- Não deve retornar linhas para as cargas deste robô.
SELECT codigo, gal, lote, data_abate, periodo_inicio, periodo_fim, origem_arquivo
FROM zootecnico.acerto_lote_resultado_geral
WHERE unidade_extracao = '52'
  AND (data_abate IS NULL OR data_abate::date < periodo_inicio OR data_abate::date > periodo_fim)
ORDER BY data_abate;
