"""Contrato da Central e identidades confirmadas; sem importar app/rede/banco."""
from pathlib import Path
import ast, json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/acesso-tecnicos-acompanhamento-20261124'
def tree(path):return ast.parse(path.read_text(encoding='utf-8-sig'))
def function(module,name):return next(n for n in module.body if isinstance(n,ast.FunctionDef) and n.name==name)
def literal(module,name):return ast.literal_eval(next(n.value for n in module.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id==name for t in n.targets)))
portal=tree(OUT/'central/api/zootecnico_access.py')
before=tree(ROOT.parent/'portal-bi-granjabrasilia/api/zootecnico_access.py')
# Nenhuma regra de leitura/equipe/grant foi reescrita nesta entrega.
for name in ('read_access','personal_entity','normalize_access','report_allowed','replace_canonical_access'):
 assert ast.dump(function(portal,name))==ast.dump(function(before,name))
sources=set(literal(portal,'SOURCES'))
assert sources-set(literal(before,'SOURCES'))=={'acompanhamento_lotes_criacao'}
catalog=tree(OUT/'central/api/zootecnico_catalog.py')
namespace={'SOURCES':frozenset(sources)}
exec(compile(ast.Module(body=[function(catalog,'validate')],type_ignores=[]),'<catalog validate>','exec'),namespace)
validate=namespace['validate']
for keys in (sources,sources-{'acompanhamento_lotes_criacao'}):
 result=validate({'ok':True,'sources':{k:[] for k in keys},'groups':[]})
 assert set(result['sources'])==sources
try:validate({'ok':True,'sources':{**{k:[] for k in sources},'unknown':[]},'groups':[]})
except ValueError:pass
else:raise AssertionError('Fonte desconhecida aceita')
confirmed=json.loads((OUT/'CORRESPONDENCIAS_CONFIRMADAS.json').read_text(encoding='utf-8'))
assert len(confirmed)==len({r['sigla'] for r in confirmed})==len({r['identidade'] for r in confirmed})==13
migration=(OUT/'01_INCLUIR_ALIASES_NEON.sql').read_text(encoding='utf-8')
for row in confirmed:
 for value in row.values():assert value in migration
assert 'ON CONFLICT(recurso,fonte,valor) DO NOTHING' in migration
assert 'UPDATE public.usuario_' not in migration
assert 'INSERT INTO public.usuario_' not in migration
assert 'DROP TABLE' not in migration
assert 'entidade_aliases_dados_valor_check' not in migration
for path in OUT.rglob('*.py'):tree(path)
print('PASS: Central preserva regras de usuarios/equipes; catalogos 6/7 fontes; 13 identidades confirmadas; sem alteracao de escopos existentes; AST valida.')
