"""Pacote unico, baseado no ZIP atual do Anderson; sem deploy."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import sys
from preparar_historico_pesos import view_sql, data_segura
from preparar_pages import frontend_files

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/consolidacao-20261016'
BACKEND=ROOT.parent/'_backend-zootecnico-referencia/bi_generic'
sys.path.insert(0,str(ROOT/'tests/.backend-test-deps'))
sys.path.insert(0,str(BACKEND.parent))
from bi_generic.registry import BI_REGISTRY
from bi_generic.sql_utils import metrica_expr


def digest(body): return hashlib.sha256(body).hexdigest()


def package(name,files):
    contents={arc:path.read_bytes() for arc,path in files.items()}
    with ZipFile(OUT/name,'w',ZIP_DEFLATED) as z:
        for arc,body in sorted(contents.items()): z.writestr(arc,body)
    with ZipFile(OUT/name) as z:
        assert set(z.namelist())==set(contents)
        assert all(z.read(arc)==body for arc,body in contents.items())
    return {'sha256':digest((OUT/name).read_bytes()),'arquivos':{arc:digest(body) for arc,body in contents.items()}}


def create_sql():
    (OUT/'00_historico_pesos.sql').write_text(view_sql(),encoding='utf-8')
    history=f"""-- Historico: snapshot mais recente por chave, desde 2023, sem limite de 45 dias.
-- Dados originais e datas invalidas continuam preservados nas tabelas/views de origem.
CREATE MATERIALIZED VIEW IF NOT EXISTS zootecnico.mv_historico_lotes_criacao_portal AS
WITH normalizados AS (
    SELECT v.*, {data_segura('v.data_recepcao')} AS recepcao_dia_cache
    FROM zootecnico.vw_historico_lotes_criacao v
), classificados AS (
    SELECT *,ROW_NUMBER() OVER (
        PARTITION BY NULLIF(BTRIM(codigo_granja),''),NULLIF(BTRIM(galp),''),
                     NULLIF(BTRIM(num_lote),''),recepcao_dia_cache,
          CASE WHEN NULLIF(BTRIM(codigo_granja),'') IS NULL OR NULLIF(BTRIM(galp),'') IS NULL
                 OR NULLIF(BTRIM(num_lote),'') IS NULL OR recepcao_dia_cache IS NULL THEN id END
        ORDER BY periodo_fim DESC NULLS LAST,id DESC
    ) AS ordem_snapshot_cache
    FROM normalizados
)
SELECT * FROM classificados
WHERE ordem_snapshot_cache=1 AND recepcao_dia_cache >= DATE '2023-01-01'
WITH DATA;
"""
    path=OUT/'02_caches_materializados.sql'
    current=path.read_text(encoding='utf-8')
    start=current.index('-- Historico: snapshot') if '-- Historico: snapshot' in current else current.index('CREATE MATERIALIZED VIEW IF NOT EXISTS zootecnico.mv_historico_lotes_criacao_portal AS')
    end=current.index('-- O indice unico',start)
    current=current[:start]+history+'\n'+current[end:]
    path.write_text(current,encoding='utf-8')
    metrics=BI_REGISTRY['zootecnico']['metrics']
    select=',\n       '.join(metrica_expr(metrics[k]).as_string()+' AS '+k for k in ('gmd','mortalidade','ca','iep'))
    fields='mort,aloj,qt_aves,ida,pes_total,consumo_racao'
    def source(table,label):
        return (f"SELECT '{label}' AS origem,{fields} FROM zootecnico.{table} "
                "WHERE data_abate >= TIMESTAMP '2026-09-01' AND data_abate < TIMESTAMP '2026-10-01'")
    parts=[source(table,label) for table,label in (
        ('acerto_lote_resultado_geral','Acerto bruto'),
        ('vw_desempenho_acerto_completo','View completa'),
        ('vw_desempenho_acerto_portal','Cache do portal'))]
    sql='-- Somente leitura, depois da criacao e atualizacao dos caches.\nWITH lotes AS (\n'+'\nUNION ALL\n'.join(parts)+'\n), resultados AS (\nSELECT origem,COUNT(*) AS lotes,\n       '+select+'\nFROM lotes GROUP BY origem\n)\nSELECT *,ROUND(iep,2) AS iep_duas_casas FROM resultados ORDER BY origem;\n'
    sql+='''
-- A view completa nao pode multiplicar ou excluir acertos.
SELECT (SELECT COUNT(*) FROM zootecnico.acerto_lote_resultado_geral) AS acertos,
       (SELECT COUNT(*) FROM zootecnico.vw_desempenho_acerto_completo) AS view_completa,
       (SELECT COUNT(*) FROM zootecnico.vw_desempenho_acerto_portal) AS cache_portal;

-- Snapshot deduplicado do Historico, mesmo calendario desde 2023.
SELECT COUNT(*) AS lotes_historico,
       COUNT(id_fechado_historico) AS com_vinculo,
       COUNT(*) FILTER (WHERE id_fechado_historico IS NULL) AS sem_vinculo
FROM zootecnico.vw_historico_lotes_criacao_portal
WHERE EXTRACT(year FROM recepcao_dia_cache) <= EXTRACT(year FROM CURRENT_DATE);

-- Exemplo: 44,6 g, 2,919 kg, 65,4 vezes enquanto a fonte nao mudar.
SELECT id,codigo_granja,galp,num_lote,ps_pinto,ps_abate_historico,
       ROUND(vezes_maior_historico,1) AS vezes_maior
FROM zootecnico.vw_historico_lotes_criacao_portal WHERE id=31614;
'''
    (OUT/'04_conferir_iep_final.sql').write_text(sql,encoding='utf-8')


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    create_sql()
    baseline=ROOT/'outputs/historico-pesos/backend-recebido/bi_generic'
    expected={'registry.py','analytics.py','sql_utils.py','router.py'}
    changed={str(p.relative_to(baseline)).replace('\\','/') for p in baseline.rglob('*.py')
             if p.read_bytes()!=(BACKEND/p.relative_to(baseline)).read_bytes()}
    if changed!=expected: raise RuntimeError(f'Diferencas nao previstas: {changed}')
    manifest={'publicado':False,'sql_aplicado':False,'backend_base':'api_zootecnico.zip recebido em 16/10/2026',
              'regras':'acerto-iep-mensal-2026-10-16','pacotes':{}}
    manifest['pacotes']['backend_anderson_consolidado.zip']=package('backend_anderson_consolidado.zip',
        {f'bi_generic/{name}':BACKEND/name for name in sorted(expected)})
    manifest['pacotes']['frontend_consolidado.zip']=package('frontend_consolidado.zip',frontend_files())
    manifest['pacotes']['banco_e_instrucoes.zip']=package('banco_e_instrucoes.zip',
        {p.name:p for p in OUT.glob('*.sql')} | {'COMO_PUBLICAR.md':OUT/'COMO_PUBLICAR.md'})
    (OUT/'manifesto.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'pasta':str(OUT),'pacotes':{name:len(spec['arquivos']) for name,spec in manifest['pacotes'].items()}},ensure_ascii=False))


if __name__=='__main__': main()
