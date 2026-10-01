-- Diagnóstico somente leitura. Executar no ambiente autorizado, fora do frontend.
-- Não é prova de correção dos indicadores nem deduplicação de lotes.
-- Não executar sobre dados diferentes dos usados pela API na validação final.

-- Formatos reais das datas de negócio e frequência. Sem CAST de data text.
SELECT data_de_abate, COUNT(*) AS registros
FROM zootecnico.base_dinamica
GROUP BY data_de_abate ORDER BY registros DESC LIMIT 30;

SELECT data_recepcao, COUNT(*) AS registros
FROM zootecnico.mortalidade_peso_abertos
GROUP BY data_recepcao ORDER BY registros DESC LIMIT 30;

SELECT data_abate, COUNT(*) AS registros
FROM zootecnico.mortalidade_peso_fechados
GROUP BY data_abate ORDER BY registros DESC LIMIT 30;

SELECT data, COUNT(*) AS registros
FROM zootecnico.lotes_planejados_abate_ave_nova
GROUP BY data ORDER BY registros DESC LIMIT 30;

SELECT data, COUNT(*) AS registros
FROM zootecnico.lotes_planejados_abate_real_alimentos
GROUP BY data ORDER BY registros DESC LIMIT 30;

-- Medir impactos de nulos, formatos não aceitos e substituição de Vazio.
-- A regex corresponde à capacidade atual do helper; formatos adicionais são
-- contabilizados como inválidos, sem interpretar separadores ambíguos.
WITH numeros AS (
  SELECT
    CASE WHEN BTRIM(vazio) ~ '^[+-]?[0-9]+([.,][0-9]+)?$'
      THEN replace(BTRIM(vazio), ',', '.')::numeric END AS vazio_num,
    CASE WHEN BTRIM(aves_abatidas) ~ '^[+-]?[0-9]+([.,][0-9]+)?$'
      THEN replace(BTRIM(aves_abatidas), ',', '.')::numeric END AS aves_num,
    CASE WHEN BTRIM(iep) ~ '^[+-]?[0-9]+([.,][0-9]+)?$'
      THEN replace(BTRIM(iep), ',', '.')::numeric END AS iep_num
  FROM zootecnico.base_dinamica
)
SELECT COUNT(*) AS registros_brutos,
       COUNT(*) FILTER (WHERE vazio_num IS NULL) AS vazio_ausente_ou_invalido,
       COUNT(*) FILTER (WHERE aves_num IS NULL) AS aves_ausente_ou_invalido,
       COUNT(*) FILTER (WHERE iep_num IS NULL AND aves_num IS NOT NULL) AS pesos_com_iep_nulo,
       COUNT(*) FILTER (WHERE vazio_num < 7 OR vazio_num > 18) AS vazio_a_substituir,
       COUNT(*) FILTER (WHERE vazio_num = 7 OR vazio_num = 18) AS vazio_nos_limites
FROM numeros;

-- Verificar preenchimento de modelo na própria fonte de lotes.
SELECT COUNT(*) AS registros_brutos,
       COUNT(*) FILTER (WHERE NULLIF(BTRIM(modelo_aviario), '') IS NULL) AS modelo_ausente,
       COUNT(*) FILTER (WHERE NULLIF(BTRIM(tecnico), '') IS NULL) AS tecnico_ausente
FROM zootecnico.mortalidade_peso_abertos;

-- Identificar destinos por fonte separadamente; não consolidar antes da
-- confirmação semântica. Contagens brutas não são quantidade de lotes únicos.
SELECT destino, COUNT(*) AS registros_brutos
FROM zootecnico.lotes_planejados_abate_ave_nova
GROUP BY destino ORDER BY destino;

SELECT destino, COUNT(*) AS registros_brutos
FROM zootecnico.lotes_planejados_abate_real_alimentos
GROUP BY destino ORDER BY destino;
