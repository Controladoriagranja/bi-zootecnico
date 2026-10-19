"""Empacota a aba GPD por Fase sobre a base confirmada de 16/10; nao publica."""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
from preparar_pages import frontend_files

ROOT=Path(__file__).resolve().parents[1]
BACKEND=ROOT.parent/'_backend-zootecnico-referencia/bi_generic'
OUT=ROOT/'outputs/gpd-por-fase-20261019'


def archive(name, files):
    target=OUT/name
    with ZipFile(target,'w',compression=8) as package:
        for relative,source in files.items(): package.write(source,relative)
    with ZipFile(target) as package:
        assert package.testzip() is None
        assert set(package.namelist())==set(files)
        for relative,source in files.items():assert package.read(relative)==source.read_bytes(),relative
    return {'arquivo':name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
            'arquivos':list(files)}


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    previous=OUT/'backend-anterior'
    for name in ('analytics.py','sql_utils.py'):
        assert (BACKEND/name).read_bytes()==(previous/name).read_bytes(),name
    for name in ('registry.py','router.py','gpd_fases.py'):
        compile((BACKEND/name).read_text(encoding='utf-8'),str(BACKEND/name),'exec')
    frontend={**frontend_files(),'tools/preparar_pages.py':ROOT/'tools/preparar_pages.py'}
    # O script de build precisa incluir a setima pagina no GitHub Pages.
    assert 'gpd-por-fase.html' in frontend
    packages=[archive('backend_atualizacao_gpd_por_fase.zip',{
        'bi_generic/'+name:BACKEND/name for name in ('registry.py','router.py','gpd_fases.py')}),
        archive('frontend_com_gpd_por_fase.zip',frontend)]
    (OUT/'manifesto.json').write_text(json.dumps({'base_anderson':'ZIP de 16/10 confirmado pelo usuario em 19/10',
        'publicado':False,'cria_tabela':False,'cria_view':False,'pacotes':packages},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({p['arquivo']:len(p['arquivos']) for p in packages}))


if __name__=='__main__':main()
