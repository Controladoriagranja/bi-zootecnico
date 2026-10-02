-- Fonte principal: acerto. LEFT JOINs não multiplicam seus registros.
-- Regra autorizada: a view final ignora acertos cujo Tipo de Granja fique em branco.
-- Código/granja/lote preservados como texto. Não usa nomes truncados para vincular.
BEGIN;
CREATE OR REPLACE VIEW zootecnico.vw_desempenho_acerto AS
WITH base_preparada AS (
    SELECT NULLIF(BTRIM(cod_prod),'') AS codigo_chave,
           NULLIF(BTRIM(galpao),'') AS gal_chave,
           NULLIF(BTRIM(lote),'') AS lote_chave,
           CASE WHEN NULLIF(BTRIM("data_de_abate"::text), '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}([ T].*)?$' THEN CASE WHEN substring(NULLIF(BTRIM("data_de_abate"::text), '') from 1 for 4)::integer BETWEEN 1 AND 9999 AND substring(NULLIF(BTRIM("data_de_abate"::text), '') from 6 for 2)::integer BETWEEN 1 AND 12 THEN CASE WHEN substring(NULLIF(BTRIM("data_de_abate"::text), '') from 9 for 2)::integer BETWEEN 1 AND EXTRACT(day FROM (make_date(substring(NULLIF(BTRIM("data_de_abate"::text), '') from 1 for 4)::integer,substring(NULLIF(BTRIM("data_de_abate"::text), '') from 6 for 2)::integer,1) + interval '1 month - 1 day')) THEN make_date(substring(NULLIF(BTRIM("data_de_abate"::text), '') from 1 for 4)::integer,substring(NULLIF(BTRIM("data_de_abate"::text), '') from 6 for 2)::integer,substring(NULLIF(BTRIM("data_de_abate"::text), '') from 9 for 2)::integer) ELSE NULL END ELSE NULL END WHEN NULLIF(BTRIM("data_de_abate"::text), '') ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN CASE WHEN substring(NULLIF(BTRIM("data_de_abate"::text), '') from 7 for 4)::integer BETWEEN 1 AND 9999 AND substring(NULLIF(BTRIM("data_de_abate"::text), '') from 4 for 2)::integer BETWEEN 1 AND 12 THEN CASE WHEN substring(NULLIF(BTRIM("data_de_abate"::text), '') from 1 for 2)::integer BETWEEN 1 AND EXTRACT(day FROM (make_date(substring(NULLIF(BTRIM("data_de_abate"::text), '') from 7 for 4)::integer,substring(NULLIF(BTRIM("data_de_abate"::text), '') from 4 for 2)::integer,1) + interval '1 month - 1 day')) THEN make_date(substring(NULLIF(BTRIM("data_de_abate"::text), '') from 7 for 4)::integer,substring(NULLIF(BTRIM("data_de_abate"::text), '') from 4 for 2)::integer,substring(NULLIF(BTRIM("data_de_abate"::text), '') from 1 for 2)::integer) ELSE NULL END ELSE NULL END ELSE NULL END AS abate_chave,
           status_acerto, mort_transporte_2, cac_ref,
           NULLIF(BTRIM(modelo),'') AS modelo_base,
           NULLIF(BTRIM(tipo_de_granja),'') AS tipo_granja_base
    FROM zootecnico.base_dinamica
), base_unica AS (
    SELECT codigo_chave, gal_chave, lote_chave, abate_chave, COUNT(*) AS candidatos,
           CASE WHEN COUNT(*) = 1 THEN MIN(status_acerto) END AS status_acerto,
           CASE WHEN COUNT(*) = 1 THEN MIN(mort_transporte_2) END AS mort_transporte_2,
           CASE WHEN COUNT(*) = 1 THEN MIN(cac_ref) END AS cac_ref,
           CASE WHEN COUNT(*) = 1 THEN MIN(modelo_base) END AS modelo,
           CASE WHEN COUNT(*) = 1 THEN MIN(tipo_granja_base) END AS tipo_granja
    FROM base_preparada
    GROUP BY codigo_chave, gal_chave, lote_chave, abate_chave
), cadastro AS (
    SELECT *, SUBSTRING(BTRIM(granja) FROM '^([0-9]+)[[:space:]]*-') AS codigo_chave
    FROM zootecnico.galpoes
), cadastro_unico AS (
    SELECT empresa_codigo, unidade_codigo, codigo_chave, NULLIF(BTRIM(galpao),'') AS gal_chave,
           COUNT(*) AS candidatos,
           CASE WHEN COUNT(*)=1 THEN MIN(NULLIF(BTRIM(modelo),'')) END AS modelo,
           CASE WHEN COUNT(*)=1 THEN MIN(NULLIF(BTRIM(tipo_granja),'')) END AS tipo_granja
    FROM cadastro
    GROUP BY empresa_codigo, unidade_codigo, codigo_chave, NULLIF(BTRIM(galpao),'')
)
SELECT a.*, COALESCE(g.modelo, b.modelo) AS modelo,
       COALESCE(g.tipo_granja, b.tipo_granja) AS tipo_granja,
       COALESCE(NULLIF(BTRIM(a.tecnico),''), t.tecnico, 'Sem técnico informado') AS tecnico_exibicao,
       b.status_acerto, b.mort_transporte_2, b.cac_ref,
       COALESCE(g.candidatos,0) AS candidatos_galpao,
       COALESCE(b.candidatos,0) AS candidatos_base,
       COALESCE(t.candidatos,0) AS candidatos_tecnico
FROM zootecnico.acerto_lote_resultado_geral a
LEFT JOIN cadastro_unico g ON g.empresa_codigo = '1'
    AND g.unidade_codigo = BTRIM(a.unidade_extracao)
    AND g.codigo_chave = NULLIF(BTRIM(a.codigo),'')
    AND g.gal_chave = NULLIF(BTRIM(a.gal),'')
LEFT JOIN base_unica b ON b.codigo_chave = NULLIF(BTRIM(a.codigo),'')
    AND b.gal_chave = NULLIF(BTRIM(a.gal),'')
    AND b.lote_chave = NULLIF(BTRIM(a.lote),'')
    AND b.abate_chave = a.data_abate::date
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS candidatos,
           CASE WHEN COUNT(*)=1 THEN MIN(COALESCE(NULLIF(BTRIM(c.tecnico),''),NULLIF(BTRIM(c.tec),''))) END AS tecnico
    FROM cadastro c
    WHERE c.empresa_codigo='1' AND c.unidade_codigo=BTRIM(a.unidade_extracao)
      AND c.codigo_chave=NULLIF(BTRIM(a.codigo),'')
      AND NULLIF(BTRIM(c.galpao),'')=NULLIF(BTRIM(a.gal),'')
      AND a.data_abate IS NOT NULL
      AND (c.ini_atividade IS NULL OR c.ini_atividade::date <= a.data_abate::date)
      AND (c.encerra_atividade IS NULL OR c.encerra_atividade::date >= a.data_abate::date)
) t ON TRUE
WHERE COALESCE(g.tipo_granja, b.tipo_granja) IS NOT NULL;
GRANT SELECT ON zootecnico.vw_desempenho_acerto TO granjabiadmin;
COMMIT;
