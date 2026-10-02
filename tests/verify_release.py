"""Confere pacotes/site e testa o frontend empacotado, sem publicar."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from zipfile import ZipFile

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from preparar_pages import build, frontend_files


def main():
    output=ROOT/'outputs'/'entrega-final'
    manifest=json.loads((output/'manifesto.json').read_text(encoding='utf-8'))
    for package in manifest['pacotes']:
        archive=output/package['arquivo']
        assert hashlib.sha256(archive.read_bytes()).hexdigest()==package['sha256'],archive.name
        with ZipFile(archive) as zipped:
            assert sorted(zipped.namelist())==sorted(package['arquivos']),archive.name
            for name,expected in package['arquivos'].items():
                assert hashlib.sha256(zipped.read(name)).hexdigest()==expected,name
    frontend=frontend_files()
    with ZipFile(output/'frontend_bi_zootecnico.zip') as zipped:
        assert sorted(zipped.namelist())==sorted(frontend)
        for name,path in frontend.items():
            assert zipped.read(name)==path.read_bytes(),name
    previews=ROOT/'tests'/'frontend-previews'
    previews.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='release-',dir=previews) as temporary:
        base=Path(temporary).resolve()
        assert base.is_relative_to(previews.resolve())
        stage=base/'site'
        build(stage)
        for name,path in frontend.items():
            assert (stage/name).read_bytes()==path.read_bytes(),name
        node=Path(os.environ.get('LOCALAPPDATA','')).parent/'.cache'
        node=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
        env={**os.environ,'BI_FRONTEND_ROOT':str(stage)}
        result=subprocess.run([str(node),str(ROOT/'tests/frontend-smoke.cjs')],
                              cwd=ROOT,env=env,text=True,encoding='utf-8',capture_output=True)
        if result.returncode:
            print(result.stdout);print(result.stderr,file=sys.stderr)
            raise SystemExit(result.returncode)
        pages=json.loads(result.stdout)
    report={'pacotes_conferidos':len(manifest['pacotes']),'frontend_arquivos':len(frontend),
            'site_pages_identico_ao_pacote':True,'telas':pages,
            'acesso_agrosys_postgresql_reais':False,'publicado':False}
    (output/'VERIFICACAO.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__=='__main__':
    main()
