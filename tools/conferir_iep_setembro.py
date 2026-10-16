"""Gera SELECT de conferencia do IEP usando os componentes reais do registry."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests' / '.backend-test-deps'))
sys.path.insert(0, str(ROOT.parent / '_backend-zootecnico-referencia'))
from bi_generic.registry import BI_REGISTRY
from bi_generic.sql_utils import metrica_expr


def main():
    config = BI_REGISTRY['zootecnico']
    metrics = config['metrics']
    expressions = {key: metrica_expr(metrics[key]).as_string() for key in ('gmd', 'mortalidade', 'ca')}
    fields = 'gpd,mort,aloj,pes_total,qt_aves,ida,consumo_racao,iep'
    sql = f"""-- SOMENTE LEITURA. Nao altera IEP, view, backend ou dados.
-- Setembro/2026 pela DATA DE ABATE, sem outros filtros selecionados.
-- Compara o Acerto bruto com o recorte que o portal usa hoje.
-- As expressoes de GPD, mortalidade e CA sao as mesmas do registry atual.
-- A coluna gpd existente na origem nao substitui a regra atual de GPD do portal.
WITH lotes AS (
    SELECT 'Acerto bruto'::text AS origem,{fields}
    FROM zootecnico.acerto_lote_resultado_geral
    WHERE data_abate >= TIMESTAMP '2026-09-01 00:00:00'
      AND data_abate <  TIMESTAMP '2026-10-01 00:00:00'
    UNION ALL
    SELECT 'Recorte atual do portal'::text,{fields}
    FROM zootecnico.vw_desempenho_acerto
    WHERE data_abate >= TIMESTAMP '2026-09-01 00:00:00'
      AND data_abate <  TIMESTAMP '2026-10-01 00:00:00'
), resultados_mensais AS (
    SELECT origem,COUNT(*) AS lotes,
           {expressions['gmd']} AS gpd_mes,
           {expressions['mortalidade']} AS mortalidade_percent_mes,
           {expressions['ca']} AS ca_mes,
           AVG(CASE WHEN iep::text NOT IN ('NaN','Infinity','-Infinity')
                    THEN iep::numeric END) AS iep_media_simples_atual
    FROM lotes
    GROUP BY origem
), comparacao AS (
    SELECT *,
           (gpd_mes / 1000) * (100 - mortalidade_percent_mes)
              / NULLIF(ca_mes,0) * 100 AS iep_divisor_1000,
           (gpd_mes / 100) * (100 - mortalidade_percent_mes)
              / NULLIF(ca_mes,0) * 100 AS iep_divisor_100
    FROM resultados_mensais
)
SELECT origem,lotes,
       gpd_mes,mortalidade_percent_mes,ca_mes,iep_media_simples_atual,
       iep_divisor_1000,iep_divisor_100,
       ROUND(iep_divisor_1000,2) AS iep_1000_duas_casas,
       ROUND(iep_divisor_100,2) AS iep_100_duas_casas,
       ROUND(iep_divisor_1000,0) AS iep_1000_inteiro,
       ROUND(iep_divisor_100,0) AS iep_100_inteiro,
       ABS(iep_divisor_1000-342) AS distancia_1000_ate_342,
       ABS(iep_divisor_100-342) AS distancia_100_ate_342
FROM comparacao
ORDER BY origem;
"""
    output = ROOT / 'outputs' / 'iep-setembro-2026'
    output.mkdir(parents=True, exist_ok=True)
    target = output / '01_conferir_iep_setembro_2026.sql'
    target.write_text(sql, encoding='utf-8')
    print(target)


if __name__ == '__main__':
    main()
