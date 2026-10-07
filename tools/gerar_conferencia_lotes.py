"""Gera SELECTs somente leitura para reproduzir somas/percentuais da API."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from test_backend_integration import s

def main():
    weeks=[7,14,21,28,35,42]
    def numeric(column):
        raw=f'BTRIM("{column}"::text)'
        return f"CASE WHEN {raw} ~ '^[+-]?[0-9]+([.,][0-9]+)?$' THEN REPLACE({raw}, ',', '.')::numeric ELSE NULL END"
    fields=[f'{numeric("aves_inicia")} AS aves']
    for w in weeks:
        fields.extend([f'{numeric(f"qtde_mort_sem_{w:02}")} AS mort{w}',f'{numeric(f"qtde_desc_sem_{w:02}")} AS disc{w}'])
    keys=['codigo_granja','num_lote','galp']
    trim=lambda c:f"NULLIF(BTRIM({c}::text), '')"
    complete=' AND '.join(f'{trim(c)} IS NOT NULL' for c in keys)+' AND recepcao_dia IS NOT NULL'
    key='ARRAY['+', '.join(trim(c) for c in keys)+', recepcao_dia::text]'
    prefix=f'''WITH parametros AS (
  -- Use a data_referencia retornada pela API no mesmo momento da conferência.
  SELECT DATE '2026-10-07' AS referencia, ARRAY[7,14,21,28,35,42]::integer[] AS semanas
), base AS (
  SELECT *, {s.date_texto('data_recepcao').as_string()} AS recepcao_dia,
    {s.date_texto('periodo_fim').as_string()} AS versao_dia,
    {', '.join(fields)}
  FROM zootecnico.mortalidade_peso_abertos
), classificadas AS (
  SELECT *, ROW_NUMBER() OVER (
    PARTITION BY CASE WHEN {complete} THEN {key} ELSE ARRAY['incomplete',id::text] END
    ORDER BY versao_dia DESC NULLS LAST, id DESC
  ) AS posicao FROM base
), brutas_janela AS (
  SELECT b.*, p.referencia-b.recepcao_dia AS idade
  FROM base b CROSS JOIN parametros p
  WHERE b.recepcao_dia BETWEEN p.referencia-45 AND p.referencia
), unicas AS (
  SELECT b.*, p.referencia-b.recepcao_dia AS idade
  FROM classificadas b CROSS JOIN parametros p
  WHERE b.posicao=1 AND b.recepcao_dia BETWEEN p.referencia-45 AND p.referencia
), selecionadas AS (
  -- Todos inclui também lotes com menos de 7 dias. Para uma seleção parcial,
  -- a API inclui somente lotes que já alcançaram alguma semana escolhida.
  SELECT u.* FROM unicas u CROSS JOIN parametros p
  WHERE CARDINALITY(p.semanas)=6 OR EXISTS (SELECT 1 FROM UNNEST(p.semanas) w WHERE u.idade>=w)
), semanal_por_lote AS (
  SELECT r.id, w.semana, COALESCE(w.mort,0)+COALESCE(w.disc,0) AS mortes,
    COALESCE(r.aves,0) AS aves, COALESCE(w.mort,0) AS mortos, COALESCE(w.disc,0) AS descartes
  FROM selecionadas r CROSS JOIN parametros p CROSS JOIN LATERAL (VALUES
    {', '.join(f'({w},r.mort{w},r.disc{w})' for w in weeks)}
  ) w(semana,mort,disc)
  WHERE w.semana=ANY(p.semanas) AND r.idade>=w.semana
)
'''
    diagnostic=prefix+'''SELECT '1. Brutas na janela, sem deduplicar' AS etapa, COUNT(*) AS lotes,
 COALESCE(SUM(COALESCE(mort7,0)+COALESCE(disc7,0)),0) AS soma_7dias
FROM brutas_janela
UNION ALL SELECT '2. Únicas na janela',COUNT(*),COALESCE(SUM(COALESCE(mort7,0)+COALESCE(disc7,0)),0) FROM unicas
UNION ALL SELECT '3. Elegíveis para 7 dias',COUNT(*),COALESCE(SUM(COALESCE(mort7,0)+COALESCE(disc7,0)),0) FROM selecionadas WHERE idade>=7;
'''
    weekly=prefix+'''SELECT semana,COUNT(*) AS lotes_elegiveis,SUM(aves) AS aves_elegiveis,
 SUM(mortos) AS mortos,SUM(descartes) AS descartes,SUM(mortes) AS mortes_e_descartes,
 SUM(mortes)/NULLIF(SUM(aves),0)*100 AS mortalidade_percent
FROM semanal_por_lote GROUP BY semana ORDER BY semana;
'''
    cards=prefix+'''SELECT COUNT(*) AS lotes,COALESCE(SUM(aves),0) AS aves_alojadas,
 (SELECT COALESCE(SUM(mortes),0) FROM semanal_por_lote) AS mortes_no_periodo,
 (SELECT COALESCE(SUM(mortes),0) FROM semanal_por_lote)/NULLIF(SUM(aves),0)*100 AS mortalidade_percent
FROM selecionadas;
'''
    queries=[diagnostic,weekly,cards]
    for keys in [('tipo_granja','nome_granja','linhagem'),('nome_granja','galp')]:
        grouped=', '.join(f"COALESCE(BTRIM(r.{k}::text),'')" for k in keys)
        queries.append(prefix+f'''SELECT {grouped}, COUNT(*) AS lotes,SUM(COALESCE(r.aves,0)) AS aves,
 SUM(COALESCE(m.mortes,0)) AS mortes,
 SUM(COALESCE(m.mortes,0))/NULLIF(SUM(COALESCE(r.aves,0)),0)*100 AS mortalidade_percent
FROM selecionadas r LEFT JOIN (SELECT id,SUM(mortes) AS mortes FROM semanal_por_lote GROUP BY id) m ON m.id=r.id
GROUP BY {', '.join(str(i+1) for i in range(len(keys)))} ORDER BY 1,2;
''')
    path=ROOT/'outputs/entrega-final/CONFERIR_SOMAS_LOTES.sql'
    path.write_text('-- Somente leitura. Sem outros filtros de produtor/modelo/técnico.\n'
                    '-- Ajuste referencia e semanas em CADA bloco para coincidir com a API.\n\n'+'\n'.join(queries),encoding='utf-8')
    print(path)
    original_sum="COALESCE(NULLIF(qtde_mort_sem_07,'')::numeric,0)+COALESCE(NULLIF(qtde_desc_sem_07,'')::numeric,0)"
    explanation=prefix+f'''SELECT CASE
 WHEN b.recepcao_dia IS NULL THEN 'Data não reconhecida'
 WHEN b.recepcao_dia < p.referencia-45 THEN 'Antes do início do painel'
 WHEN b.recepcao_dia > p.referencia THEN 'Depois do fim do painel'
 ELSE 'Dentro do intervalo do painel' END AS recorte,
 COUNT(*) AS registros, SUM({original_sum}) AS soma_select_original,
 SUM(COALESCE(mort7,0)+COALESCE(disc7,0)) AS soma_leitura_api
FROM base b CROSS JOIN parametros p
WHERE b.data_recepcao > '2026-08-22'
GROUP BY 1 ORDER BY 1;
'''
    explanation+=prefix+f'''SELECT b.id,b.codigo_granja,b.nome_granja,b.galp,b.num_lote,
 b.data_recepcao,b.recepcao_dia,{original_sum} AS mortes_e_descartes_7dias
FROM base b CROSS JOIN parametros p
WHERE b.data_recepcao > '2026-08-22'
 AND (b.recepcao_dia IS NULL OR b.recepcao_dia NOT BETWEEN p.referencia-45 AND p.referencia)
ORDER BY b.recepcao_dia,b.nome_granja,b.galp;
'''
    (path.parent/'DIFERENCA_7DIAS_LOTES.sql').write_text(
        '-- Somente leitura. Compara o SELECT original com a janela do painel.\n'
        '-- Mesma referência: 07/10/2026. Ajuste em ambos os blocos se necessário.\n'+explanation,encoding='utf-8')

if __name__=='__main__':main()
