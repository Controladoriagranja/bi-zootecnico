-- Somente leitura. Verifica Modelo/Tipo nos mesmos seis acertos do código 2963.
-- Mesma relação validada: código + galpão + lote + dia do abate.
SELECT v.codigo, v.integrado, v.gal, v.lote, v.data_abate,
       b.modelo AS modelo_base, b.tipo_de_granja AS tipo_granja_base,
       v.modelo AS modelo_view, v.tipo_granja AS tipo_granja_view
FROM zootecnico.vw_desempenho_acerto v
LEFT JOIN zootecnico.base_dinamica b
  ON NULLIF(BTRIM(b.cod_prod),'')=NULLIF(BTRIM(v.codigo),'')
 AND NULLIF(BTRIM(b.galpao),'')=NULLIF(BTRIM(v.gal),'')
 AND NULLIF(BTRIM(b.lote),'')=NULLIF(BTRIM(v.lote),'')
 AND (
       (BTRIM(b.data_de_abate) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}([ T].*)?$'
        AND SUBSTRING(BTRIM(b.data_de_abate) FROM 1 FOR 10)=TO_CHAR(v.data_abate,'YYYY-MM-DD'))
       OR BTRIM(b.data_de_abate)=TO_CHAR(v.data_abate,'DD/MM/YYYY')
     )
WHERE BTRIM(v.codigo)='2963' AND v.candidatos_galpao=0
ORDER BY v.gal, v.data_abate, v.lote;
