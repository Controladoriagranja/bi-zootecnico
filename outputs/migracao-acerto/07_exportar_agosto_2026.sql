-- Somente leitura. Exportar o resultado como CSV no Adminer.
-- Todos os acertos da view final, sem filtros de unidade/produtor.
SELECT *
FROM zootecnico.vw_desempenho_acerto
WHERE data_abate >= TIMESTAMP '2026-08-01 00:00:00'
  AND data_abate < TIMESTAMP '2026-09-01 00:00:00'
ORDER BY data_abate, codigo, gal, lote;
