"""Empacota somente os arquivos de entrega e confere seu conteúdo; sem deploy."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
from zipfile import ZipFile, ZIP_DEFLATED
from preparar_pages import frontend_files

ROOT=Path(__file__).resolve().parents[1]
BACKEND=ROOT.parent/'_backend-zootecnico-referencia'/'bi_generic'
OUTPUT=ROOT/'outputs'/'entrega-final'


def digest(content):
    return hashlib.sha256(content).hexdigest()


def archive(target, files):
    """Confere nomes e bytes do ZIP contra os arquivos lidos da origem."""
    content={name:path.read_bytes() for name,path in files.items()}
    with ZipFile(target,'w',compression=ZIP_DEFLATED,compresslevel=6) as zipped:
        for name,data in sorted(content.items()):
            zipped.writestr(name,data)
    with ZipFile(target) as zipped:
        if sorted(zipped.namelist()) != sorted(content):
            raise RuntimeError(f'Arquivos divergentes no pacote {target.name}')
        for name,data in content.items():
            if digest(zipped.read(name)) != digest(data):
                raise RuntimeError(f'Conteúdo divergente: {target.name}/{name}')
    return {'arquivo':target.name,'sha256':digest(target.read_bytes()),
            'arquivos':{name:digest(data) for name,data in sorted(content.items())}}


def main():
    OUTPUT.mkdir(parents=True,exist_ok=True)
    frontend=frontend_files()
    backend={name:BACKEND/name for name in ('registry.py','sql_utils.py','analytics.py','router.py')}
    robot={name:ROOT/'outputs'/'robo-acerto'/name for name in
           ('acerto_lote_resultado_geral_incremental.py','COMO_USAR.md','CONFERIR_CARGA.sql')}
    github={name:ROOT/name for name in
            ('.github/workflows/deploy-pages.yml','tools/preparar_pages.py')}
    packages=[archive(OUTPUT/'frontend_bi_zootecnico.zip',frontend),
              archive(OUTPUT/'backend_anderson.zip',backend),
              archive(OUTPUT/'robo_acerto_incremental.zip',robot),
              archive(OUTPUT/'github_pages_publicacao.zip',github)]
    # Mantém o link de transferência já fornecido ao usuário atualizado.
    shutil.copyfile(OUTPUT/'backend_anderson.zip',ROOT/'outputs'/'migracao-acerto'/'backend_anderson.zip')
    sql_dir=OUTPUT/'sql'
    sql_dir.mkdir(exist_ok=True)
    statements={}
    for source in sorted((ROOT/'outputs'/'migracao-acerto').glob('0[1-6]_*.sql')):
        target=sql_dir/source.name
        shutil.copyfile(source,target)
        statements[target.relative_to(OUTPUT).as_posix()]=digest(target.read_bytes())
    manifest={'gerado_em_utc':datetime.now(timezone.utc).isoformat(),
              'cache_frontend':'ajustes-20261007-1',
              'regras_acerto':'acerto-2026-10-05',
              'regras_historico':'historico-fechados-2026-10-02',
              'pacotes':packages,'sql':statements,
              'publicado_no_servidor':False}
    (OUTPUT/'manifesto.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUTPUT/'SHA256SUMS.txt').write_text(''.join(f"{p['sha256']}  {p['arquivo']}\n" for p in packages),encoding='utf-8')
    print(json.dumps({'pasta':str(OUTPUT),'pacotes':[
        {'arquivo':p['arquivo'],'arquivos_conferidos':len(p['arquivos'])} for p in packages],
        'sql_conferidos':len(statements),'deploy_executado':False},ensure_ascii=False))


if __name__=='__main__':
    main()
