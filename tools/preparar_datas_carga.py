"""Entrega de metadados sobre o ZIP atual do usuario; sem banco, commit ou deploy."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import hashlib
import json
from preparar_pages import frontend_files

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/atualizacao-dados-20261020'
BACKEND=OUT/'backend-corrigido'
FILES=['bi_generic/freshness.py','bi_generic/registry.py','bi_generic/router.py',
       'bi_generic/analytics.py','bi_generic/gpd_fases.py','portal_router.py']


def archive(name,files):
    target=OUT/name
    with ZipFile(target,'w',ZIP_DEFLATED) as zipped:
        for relative,file in files.items():zipped.write(file,relative)
    with ZipFile(target) as zipped:
        assert zipped.testzip() is None
        for relative,file in files.items():assert zipped.read(relative)==file.read_bytes(),relative
    return {'arquivo':name,'arquivos':list(files),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}


def main():
    for file in FILES:compile((BACKEND/file).read_text(encoding='utf-8-sig'),file,'exec')
    # Proibe sobrescrever silenciosamente mudancas do ZIP em outros modulos.
    with ZipFile(Path.home()/'Downloads/api_zootecnico(2).zip') as zipped:
        for name in zipped.namelist():
            if name.endswith('.py') and '__pycache__' not in name:
                relative=Path(name).relative_to('api_zootecnico').as_posix()
                if relative not in FILES:assert (BACKEND/relative).read_bytes()==zipped.read(name),relative
    packages=[archive('backend_datas_corrigidas.zip',{file:BACKEND/file for file in FILES}),
      archive('frontend_datas_corrigidas.zip',{**frontend_files(),'tools/preparar_pages.py':ROOT/'tools/preparar_pages.py'}),
      archive('diagnostico_e_validacao.zip',{name:OUT/name for name in ('DIAGNOSTICO_E_INSTALACAO.md','VALIDAR_CARGAS.sql','CONFERIR_CONTAGENS.sql')})]
    (OUT/'manifesto.json').write_text(json.dumps({'base':'api_zootecnico(2).zip','pacotes':packages,
      'banco_alterado':False,'carga_executada':False,'refresh_executado':False,'commit':False,'publicado':False},indent=2,ensure_ascii=False),encoding='utf-8')
    print(json.dumps({p['arquivo']:len(p['arquivos']) for p in packages}))


if __name__=='__main__':main()
