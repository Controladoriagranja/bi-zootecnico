"""Gera a view e o pacote especifico do Historico, sem acessar producao."""
from pathlib import Path
import hashlib
import json
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs' / 'historico-pesos'
BACKEND = ROOT.parent / '_backend-zootecnico-referencia' / 'bi_generic'


def data_segura(coluna):
    c = f"NULLIF(BTRIM({coluna}), '')"
    def parte(inicio, quantidade):
        return f'SUBSTRING({c},{inicio},{quantidade})::integer'
    def validar(y, m, d):
        return (f'CASE WHEN {y} BETWEEN 1 AND 9999 AND {m} BETWEEN 1 AND 12 '
                f'THEN CASE WHEN {d} BETWEEN 1 AND EXTRACT(day FROM '
                f"(MAKE_DATE({y},{m},1) + INTERVAL '1 month - 1 day')) "
                f'THEN MAKE_DATE({y},{m},{d}) END END')
    return (f"CASE WHEN {c} ~ '^[0-9]{{4}}-[0-9]{{2}}-[0-9]{{2}}([ T].*)?$' "
            f'THEN {validar(parte(1,4),parte(6,2),parte(9,2))} '
            f"WHEN {c} ~ '^[0-9]{{2}}/[0-9]{{2}}/[0-9]{{4}}$' "
            f'THEN {validar(parte(7,4),parte(4,2),parte(1,2))} END')


def numero_seguro(coluna):
    return (f"CASE WHEN BTRIM({coluna}) ~ '^[+-]?[0-9]+([.,][0-9]+)?$' "
            f"THEN REPLACE(BTRIM({coluna}),',','.')::numeric END")


def view_sql():
    return f"""-- Historico: preserva cada linha da fonte aberta; nao muda as outras telas.
-- Chave conferida no banco: codigo_granja + galp + num_lote + dia da recepcao.
-- Fechados: ultimo snapshot por periodo_fim e id, nunca somar snapshots.
-- ps_pinto em gramas; ps_abate em kg. Razao calculada em uma unica unidade.
CREATE OR REPLACE VIEW zootecnico.vw_historico_lotes_criacao AS
WITH fechados_normalizados AS (
    SELECT f.id, f.periodo_fim,
           NULLIF(BTRIM(f.codigo_granja),'') AS codigo_chave,
           NULLIF(BTRIM(f.galp),'') AS galpao_chave,
           NULLIF(BTRIM(f.num_lote),'') AS lote_chave,
           {data_segura('f.data_recepcao')} AS recepcao_dia,
           {numero_seguro('f.ps_abate')} AS peso_abate
    FROM zootecnico.mortalidade_peso_fechados f
), fechados_unicos AS (
    SELECT DISTINCT ON (codigo_chave,galpao_chave,lote_chave,recepcao_dia) *
    FROM fechados_normalizados
    WHERE codigo_chave IS NOT NULL AND galpao_chave IS NOT NULL
      AND lote_chave IS NOT NULL AND recepcao_dia IS NOT NULL
    ORDER BY codigo_chave,galpao_chave,lote_chave,recepcao_dia,
             periodo_fim DESC NULLS LAST,id DESC
)
SELECT a.*, f.id AS id_fechado_historico,
       CASE WHEN f.peso_abate > 0 THEN f.peso_abate END AS ps_abate_historico,
       CASE WHEN f.peso_abate > 0 AND p.peso_pinto > 0
            THEN f.peso_abate * 1000 / p.peso_pinto END AS vezes_maior_historico
FROM zootecnico.mortalidade_peso_abertos a
LEFT JOIN fechados_unicos f
  ON f.codigo_chave=NULLIF(BTRIM(a.codigo_granja),'')
 AND f.galpao_chave=NULLIF(BTRIM(a.galp),'')
 AND f.lote_chave=NULLIF(BTRIM(a.num_lote),'')
 AND f.recepcao_dia=({data_segura('a.data_recepcao')})
CROSS JOIN LATERAL (SELECT {numero_seguro('a.ps_pinto')} AS peso_pinto) p;
"""


def sha(content):
    return hashlib.sha256(content).hexdigest()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / '02_criar_view_historico.sql').write_text(view_sql(), encoding='utf-8')
    (OUT / '03_validar_view.sql').write_text(f"""-- Somente leitura. Executar depois de 02_criar_view_historico.sql.
-- 1. As duas contagens precisam ser iguais: a view nao multiplica abertos.
SELECT (SELECT COUNT(*) FROM zootecnico.mortalidade_peso_abertos) AS linhas_abertos,
       (SELECT COUNT(*) FROM zootecnico.vw_historico_lotes_criacao) AS linhas_view;

-- 2. Cobertura com a mesma deduplicacao e calendario do Historico.
WITH base AS (
    SELECT v.*, NULLIF(BTRIM(codigo_granja),'') AS codigo_chave,
           NULLIF(BTRIM(galp),'') AS galpao_chave,
           NULLIF(BTRIM(num_lote),'') AS lote_chave,
           {data_segura('data_recepcao')} AS recepcao_dia
    FROM zootecnico.vw_historico_lotes_criacao v
), ordenados AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY codigo_chave,galpao_chave,lote_chave,recepcao_dia,
          CASE WHEN codigo_chave IS NULL OR galpao_chave IS NULL OR lote_chave IS NULL
                 OR recepcao_dia IS NULL THEN id END
        ORDER BY periodo_fim DESC NULLS LAST,id DESC
    ) AS ordem
    FROM base
)
SELECT COUNT(*) AS lotes_historico,
       COUNT(id_fechado_historico) AS com_vinculo,
       COUNT(*) FILTER (WHERE id_fechado_historico IS NULL) AS sem_vinculo,
       COUNT(vezes_maior_historico) AS razoes_validas
FROM ordenados
WHERE ordem=1 AND recepcao_dia >= DATE '2023-01-01'
  AND EXTRACT(year FROM recepcao_dia) <= EXTRACT(year FROM CURRENT_DATE);

-- 3. Exemplo enviado: 44,6 g; 2,919 kg; 65,4 vezes (se fonte nao mudar).
SELECT id,codigo_granja,galp,num_lote,data_recepcao,
       ps_pinto,ps_abate_historico,
       ROUND(vezes_maior_historico,1) AS vezes_maior
FROM zootecnico.vw_historico_lotes_criacao
WHERE id=31614;

-- 4. Datas invalidas ja existentes na fonte (18 registros na sua conferencia).
SELECT id,codigo_granja,galp,num_lote,data_recepcao
FROM zootecnico.mortalidade_peso_abertos
WHERE ({data_segura('data_recepcao')}) IS NULL
ORDER BY id;
""", encoding='utf-8')
    received = OUT / 'backend-recebido' / 'bi_generic'
    expected = {'registry.py', 'analytics.py'}
    changed = {p.relative_to(received).as_posix() for p in received.rglob('*.py')
               if p.read_bytes() != (BACKEND / p.relative_to(received)).read_bytes()}
    if changed != expected:
        raise RuntimeError(f'Diferencas inesperadas em relacao ao ZIP do Anderson: {changed}')
    packages = {
        'backend_anderson_historico_pesos.zip': {
            f'bi_generic/{name}': BACKEND / name for name in sorted(expected)},
        'frontend_historico_pesos.zip': {
            name: ROOT / name for name in ('historico.html', 'assets/js/historico.js',
                                          'assets/js/historico-formulas.js')},
    }
    manifest = {'origem_backend': 'api_zootecnico.zip recebido em 16/10/2026',
                'publicado': False, 'aplicado_no_banco': False, 'pacotes': {}}
    for name, files in packages.items():
        content = {arc: p.read_bytes() for arc, p in files.items()}
        with ZipFile(OUT / name, 'w', ZIP_DEFLATED) as z:
            for arc, body in content.items():
                z.writestr(arc, body)
        with ZipFile(OUT / name) as z:
            assert set(z.namelist()) == set(content)
            assert all(z.read(arc) == body for arc, body in content.items())
        manifest['pacotes'][name] = {
            'sha256': sha((OUT / name).read_bytes()),
            'arquivos': {arc: sha(body) for arc, body in content.items()}}
    (OUT / 'manifesto.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    raise SystemExit('Entrega substituida pela consolidacao: execute tools/preparar_consolidacao_20261016.py. Este modulo ainda fornece o SQL da view de pesos.')
