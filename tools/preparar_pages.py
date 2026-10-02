"""Prepara o site estático para GitHub Pages, sem conectar à API."""
import argparse
import json
from pathlib import Path
import shutil

ROOT=Path(__file__).resolve().parents[1]
PAGES=('index.html','detalhes.html','lotes.html','historico.html',
       'diferenca-aves-abatidas.html','formulas.html')


def frontend_files():
    files={name:ROOT/name for name in PAGES}
    files.update({path.relative_to(ROOT).as_posix():path for path in
                  sorted((ROOT/'assets').rglob('*')) if path.is_file()})
    return files


def build(destination):
    destination=destination.resolve()
    if destination==ROOT or not destination.is_relative_to(ROOT):
        raise ValueError('O destino deve ser uma subpasta do projeto.')
    if destination.exists() and any(destination.iterdir()):
        raise ValueError('Use uma pasta de destino vazia; arquivos existentes não serão apagados.')
    files=frontend_files()
    destination.mkdir(parents=True,exist_ok=True)
    for name,source in files.items():
        target=destination/name
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(source,target)
    return {'pasta':str(destination),'arquivos':len(files),'paginas':list(PAGES)}


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--destino',type=Path,default=ROOT/'_site')
    print(json.dumps(build(parser.parse_args().destino),ensure_ascii=False))
