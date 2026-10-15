"""Entrega RxP baseada no ZIP atualizado do Anderson; não publica nem conecta ao banco."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from hashlib import sha256
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r'C:\Users\vchaves\Downloads\Matrizes\api_zootecnico_atualizado.zip')
BACKEND = ROOT.parent / '_backend-zootecnico-referencia' / 'bi_generic'
OUTPUT = ROOT / 'outputs' / 'rxp-20261015'
FRONTEND = ['diferenca-aves-abatidas.html', 'assets/css/app.css', 'assets/js/api.js',
            'assets/js/api-screen.js', 'assets/js/rxp.js', 'assets/js/table-sort.js']


def pack(path, content):
    with ZipFile(path, 'w', ZIP_DEFLATED) as target:
        for name, data in content.items(): target.writestr(name, data)
    with ZipFile(path) as target:
        assert set(target.namelist()) == set(content)
        for name, data in content.items(): assert target.read(name) == data
    return {'arquivo':path.name, 'sha256':sha256(path.read_bytes()).hexdigest(), 'arquivos':len(content)}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    changed = {f'bi_generic/{name}':(BACKEND / name).read_bytes() for name in ('registry.py', 'analytics.py')}
    with ZipFile(SOURCE) as source:
        full = {entry.filename:source.read(entry) for entry in source.infolist()}
        # A versão recebida já contém Faturamento NF; não substituir por router antigo.
        assert b'faturamento_nf' in source.read('api_zootecnico/bi_generic/router.py')
        assert b'FATURAMENTO_NF_CONFIG' in changed['bi_generic/registry.py']
        for name, data in changed.items():
            assert 'api_zootecnico/' + name in full
            full['api_zootecnico/' + name] = data
        original = {entry.filename:source.read(entry) for entry in source.infolist()}
    differences = [name for name in full if full[name] != original[name]]
    assert set(differences) == {'api_zootecnico/' + name for name in changed}
    for name, data in changed.items():
        path=OUTPUT/'backend'/name; path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
    packages = [pack(OUTPUT/'backend_anderson_rxp_patch.zip', changed),
                pack(OUTPUT/'api_zootecnico_atualizado_rxp.zip', full),
                pack(OUTPUT/'frontend_rxp_patch.zip', {name:(ROOT/name).read_bytes() for name in FRONTEND})]
    manifest = {'base':str(SOURCE), 'base_sha256':sha256(SOURCE.read_bytes()).hexdigest(),
                'backend_alterados':differences, 'demais_arquivos_backend_identicos':True,
                'pacotes':packages, 'publicado':False}
    (OUTPUT/'manifesto.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(manifest,ensure_ascii=False,indent=2))


if __name__ == '__main__': main()
