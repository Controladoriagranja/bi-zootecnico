"""Entrega de metas com a consolidacao anterior preservada; sem deploy."""
from pathlib import Path
import json
from preparar_pages import frontend_files
from preparar_entrega import archive

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/metas-mortalidade'
BACKEND=ROOT.parent/'_backend-zootecnico-referencia/bi_generic'


def main():
    previous=OUT/'backend-anterior'
    names=('registry.py','analytics.py','sql_utils.py','router.py')
    changed={name for name in names if (previous/name).read_bytes()!=(BACKEND/name).read_bytes()}
    if changed!={'registry.py','analytics.py'}:
        raise RuntimeError(f'Mudancas inesperadas desde a consolidacao: {changed}')
    packages=[
        archive(OUT/'backend_anderson_com_metas.zip',{f'bi_generic/{name}':BACKEND/name for name in names}),
        archive(OUT/'frontend_com_metas.zip',frontend_files()),
        archive(OUT/'sql_e_instrucoes.zip',{name:OUT/name for name in ('01_criar_e_inserir_meta.sql','COMO_PUBLICAR.md')}),
    ]
    manifest={'publicado':False,'tabela_criada_em_producao':False,'meta_inserida_em_producao':False,
              'origem':'Consolidacao de 16/10/2026 baseada no ZIP atual do Anderson',
              'alterados_backend_nesta_etapa':sorted(changed),'pacotes':packages}
    (OUT/'manifesto.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'pasta':str(OUT),'pacotes':[{p['arquivo']:len(p['arquivos'])} for p in packages]},ensure_ascii=False))


if __name__=='__main__': main()
