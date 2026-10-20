"""Empacota copias locais; analisa sintaxe sem importar/executar o backend."""
import ast
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs/mortalidade-atualizacao-20261020-v2'
BACKEND = OUT / 'backend'
PYTHON_FILES = ['bi_generic/analytics.py', 'bi_generic/registry.py',
                'bi_generic/freshness.py', 'bi_generic/router.py',
                'bi_generic/gpd_fases.py', 'portal_router.py']
PAGES = ['index.html', 'detalhes.html', 'lotes.html', 'historico.html',
         'gpd-por-fase.html', 'diferenca-aves-abatidas.html', 'formulas.html']


def archive(name, files):
    target = OUT / name
    with ZipFile(target, 'w', ZIP_DEFLATED) as zipped:
        for relative, source in files.items():
            zipped.write(source, relative)
    with ZipFile(target) as zipped:
        assert zipped.testzip() is None
        for relative, source in files.items():
            assert zipped.read(relative) == source.read_bytes(), relative
    return {'arquivo': name, 'arquivos': len(files),
            'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}


def main():
    for name in PYTHON_FILES:
        ast.parse((BACKEND/name).read_text(encoding='utf-8-sig'), filename=name)
    registry = (BACKEND/'bi_generic/registry.py').read_text(encoding='utf-8')
    history = registry.split('BI_REGISTRY["historico-abertos"] = {', 1)[1].split('BI_REGISTRY["rxp"]', 1)[0]
    assert '"table": "vw_historico_lotes_criacao"' in history
    assert '"recepcao": "data_recepcao"' in history
    assert 'recepcao_dia_cache' not in history
    assert '"weekly_partial_values": True' in history
    for page in PAGES:
        html = (ROOT/page).read_text(encoding='utf-8')
        update_id = 'phaseUpdated' if page == 'gpd-por-fase.html' else 'ultimaAtualizacao'
        assert html.count(f'id="{update_id}"') == 1, page
        assert html.count('assets/js/date-time.js') == 1, page
    docs = {name: OUT/name for name in ['INSTALAR.txt', 'CONFERIR_ORIGEM.sql']}
    packages = [archive('backend_zootecnico_v2.zip', {
        **{name: BACKEND/name for name in PYTHON_FILES}, **docs})]
    frontend = {name: ROOT/name for name in PAGES}
    frontend.update({p.relative_to(ROOT).as_posix(): p for p in sorted((ROOT/'assets').rglob('*')) if p.is_file()})
    packages.append(archive('frontend_zootecnico_v2.zip', frontend))
    (OUT/'manifesto.json').write_text(json.dumps({
        'pacotes': packages, 'backend_executado': False, 'sql_executado': False,
        'publicado': False, 'historico_fonte': 'zootecnico.vw_historico_lotes_criacao',
        'cabecalhos': PAGES}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(packages, ensure_ascii=False))


if __name__ == '__main__':
    main()
