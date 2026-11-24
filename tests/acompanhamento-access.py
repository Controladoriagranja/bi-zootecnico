"""Regressao local de autorizacao. Sem rede, banco ou cargas."""
from pathlib import Path
import sys, asyncio
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
BACKEND=ROOT/'outputs/correcao-acesso-acompanhamento-20261124/backend/api_zootecnico'
sys.path[:0]=[str(BACKEND),str(ROOT/'tests/.backend-test-deps')]
import zootecnico_acesso as access
from fastapi import HTTPException
from starlette.requests import Request
from starlette.responses import JSONResponse

query='SELECT * FROM zootecnico.acompanhamento_lotes_criacao'
general=access.Access(1,'todos')
assert 'acompanhamento_lotes_criacao' not in access.SOURCES # contrato antigo da CENTRAL
assert access.scope_query(query,general)==query
for mode in ('none','proprio','equipe'):
    try: access.scope_query(query,access.Access(0,mode))
    except HTTPException as e: assert e.status_code==403
    else: raise AssertionError('Consulta sem autorizacao liberada')

async def check():
    for action in ('filtros','detalhes'):
        path='/api/bi/acompanhamento-mortalidades/'+action
        assert access.route_policy(path)=='general'
        async def handler(request):
            assert access.CURRENT.get()==general
            assert access.scope_query(query,access.CURRENT.get())==query
            return JSONResponse({'ok':True})
        with patch.object(access,'resolve_access',return_value=general):
            response=await access.dispatch(Request({'type':'http','path':path,'headers':[],'query_string':b''}),handler)
            assert response.status_code==200
        assert access.CURRENT.get() is None
        for mode in ('proprio','equipe','none'):
            with patch.object(access,'resolve_access',return_value=access.Access(2,mode)):
                response=await access.dispatch(Request({'type':'http','path':path,'headers':[],'query_string':b''}),handler)
                assert response.status_code==403
        with patch.object(access,'resolve_access',side_effect=HTTPException(403,'Negado')):
            response=await access.dispatch(Request({'type':'http','path':path,'headers':[],'query_string':b''}),handler)
            assert response.status_code==403
asyncio.run(check())
print('PASS: filtros/detalhes somente acesso geral; proprio/equipe/sem acesso bloqueados antes da consulta; catalogo preservado; sem rede/banco.')
