"""Comparativo e ocorrências de condenações; somente leitura do PCP."""
from pathlib import Path
from datetime import date,timedelta
from collections import defaultdict
import json,unicodedata
from fastapi import APIRouter,Query,Request,HTTPException
MAP=json.loads(Path(__file__).with_name('pcp_condenacoes_mapa.json').read_text(encoding='utf-8'))
def norm(value):return ' '.join(''.join(c for c in unicodedata.normalize('NFKD',str(value or '').upper())if not unicodedata.combining(c)).split())
def classify(name,kind):
    m=MAP.get(norm(name)+'|'+norm(kind),{})
    return m.get('grupo','Outras'),m.get('nome',name),kind

def criar_router(banco,limite):
    router=APIRouter()
    @router.get('/condenacoes')
    def consulta(request:Request,ano:str=Query(...,pattern=r'^\d{4}(,\d{4})*$',max_length=500),mes:str=Query(...,pattern=r'^\d{1,2}(,\d{1,2})*$',max_length=40),dias:str|None=Query(None,max_length=4000,pattern=r'^\d{4}-\d{2}-\d{2}(,\d{4}-\d{2}-\d{2})*$'),visao:str=Query('geral',pattern=r'^(geral|1|2|10|111)(,(geral|1|2|10|111))*$'),causa:str|None=Query(None,max_length=500),tipo:str|None=Query(None,max_length=40),pagina:int=Query(1,ge=1),ordenar:str='data',direcao:str='asc',agrupado:bool=False,fornecedor_detalhado:bool=False,tecnicos:str|None=Query(None,max_length=12000),fornecedores:str|None=Query(None,max_length=12000)):
        from pcp_paradas import acesso_autorizado
        if not acesso_autorizado(request):raise HTTPException(403,'Abra pelo portal para validar sua sessão.')
        years=sorted(set(map(int,ano.split(','))));months=sorted(set(map(int,mes.split(','))))
        if any(y<2020 or y>2100 for y in years)or any(m<1 or m>12 for m in months):raise HTTPException(422,'Período inválido')
        sort_fields={'data':'coalesce(data_abate,data_referencia)','empresa':'empresa','turno':"coalesce(nullif(turno_codigo,''),turno)",'granja':"CASE WHEN granja ~ '^[0-9]+$' THEN granja::numeric END",'fornecedor':'fornecedor','galpao':'galpao','lote':"CASE WHEN lote ~ '^[0-9]+$' THEN lote::numeric END",'tecnico':'tecnico','cidade':'cidade','codigo':"CASE WHEN codigo ~ '^[0-9]+$' THEN codigo::numeric END",'condenacao':'condenacao','tipo':'tipo','ocorrencia':'ocorrencia','peso_total':'peso_total','peso_pesagem':'peso_pesagem','percentual':'peso_total / nullif(peso_pesagem,0)'}
        if ordenar not in sort_fields or direcao not in {'asc','desc'}:raise HTTPException(422,'Ordenação inválida')
        order=sort_fields[ordenar]+(' DESC'if direcao=='desc'else' ASC')+' NULLS LAST,coalesce(data_abate,data_referencia),empresa,granja,galpao,lote,codigo,chave_hash'
        cutoff=limite();start=date(min(years),min(months),1);last=date(max(years)+max(months)//12,max(months)%12+1,1)-timedelta(days=1);end=min(last,cutoff)
        chosen=set(date.fromisoformat(d)for d in dias.split(','))if dias else None
        where=" WHERE coalesce(data_abate,data_referencia) BETWEEN %s AND %s AND extract(year FROM coalesce(data_abate,data_referencia))=ANY(%s) AND extract(month FROM coalesce(data_abate,data_referencia))=ANY(%s) AND tipo IN ('Parcial','Total')"
        args=[start,end,years,months]
        if chosen:where+=' AND coalesce(data_abate,data_referencia)=ANY(%s)';args.append(list(chosen))
        views=set(visao.split(','));all_views='geral'in views
        an_turns={'1','2'}if all_views or '10'in views else views&{'1','2'}
        include_ra=all_views or '111'in views
        conditions=[]
        if an_turns:
            conditions.append("(empresa='Ave Nova' AND coalesce(nullif(turno_codigo,''),turno)=ANY(%s))");args.append(sorted(an_turns))
        if include_ra:conditions.append("empresa='Real Alimentos'")
        where+=' AND ('+' OR '.join(conditions)+')'
        with banco()as conn:
            conn.execute('SET LOCAL max_parallel_workers_per_gather=0')
            filter_options=conn.execute("SELECT DISTINCT tecnico,fornecedor FROM pcp.condenacoes"+where,args).fetchall()
            for field,value in [('tecnico',tecnicos),('fornecedor',fornecedores)]:
                if value:
                    try:values=json.loads(value)
                    except (ValueError,TypeError):raise HTTPException(422,'Filtro inválido')
                    if not isinstance(values,list) or not all(isinstance(v,str) for v in values):raise HTTPException(422,'Filtro inválido')
                    where+=' AND '+field+'=ANY(%s)';args.append(values)
            facts=conn.execute("SELECT coalesce(data_abate,data_referencia) data,empresa,condenacao,tipo,sum(peso_total) kg,sum(ocorrencia) ocorrencias FROM pcp.condenacoes"+where+' GROUP BY 1,2,3,4',args).fetchall()
            live=conn.execute("SELECT data,empresa,turno_codigo,secao,sum(quantidade) kg FROM pcp.diario_industria_turnos WHERE data BETWEEN %s AND %s AND empresa='Ave Nova' AND turno_codigo IN ('1','2') AND descricao='Peso Vivo(-D+A)' AND secao IN ('Recepção de Aves Vivas','Compra de Aves Vivas') GROUP BY 1,2,3,4 UNION ALL SELECT data,empresa,NULL,secao,sum(quantidade) FROM pcp.diario_industria WHERE data BETWEEN %s AND %s AND empresa='Real Alimentos' AND descricao='Peso Vivo(-D+A)' AND secao IN ('Recepção de Aves Vivas','Compra de Aves Vivas','Abate - Total') GROUP BY 1,2,3,4",(start,end,start,end)).fetchall()
            details=[];count=0
            if causa is not None or fornecedor_detalhado:
                raw=[k.split('|')[0] for k,v in MAP.items()if norm(v['nome'])==norm(causa)and (not tipo or k.split('|')[-1]==norm(tipo))]
                # Match using the same Python classification as the summary, then bind source labels.
                originals=list({r['condenacao']for r in facts if norm(classify(r['condenacao'],r['tipo'])[1])==norm(causa)and(not tipo or norm(r['tipo'])==norm(tipo))})
                w=where;a=list(args)
                # O fornecedor aprofunda o recorte; nao remove causa nem tipo.
                if causa is not None:w+=' AND condenacao=ANY(%s)';a.append(originals)
                if tipo:w+=' AND tipo=%s';a.append(tipo)
                if fornecedor_detalhado and not fornecedores:raise HTTPException(422,'Selecione o fornecedor')
                if agrupado:
                    grouped_sql="SELECT empresa,granja,fornecedor,galpao,lote,string_agg(DISTINCT coalesce(data_abate,data_referencia)::text,', ' ORDER BY coalesce(data_abate,data_referencia)::text) datas,string_agg(DISTINCT coalesce(nullif(turno_codigo,''),turno),', ') turnos,string_agg(DISTINCT tecnico,', ') tecnico,string_agg(DISTINCT cidade,', ') cidade,string_agg(DISTINCT codigo,', ') codigo,string_agg(DISTINCT condenacao,', ') condenacao,string_agg(DISTINCT tipo,', ') tipo,sum(ocorrencia) ocorrencia,sum(peso_total) peso_total,sum(peso_pesagem) peso_pesagem,sum(peso_total)/nullif(sum(peso_pesagem),0) percentual FROM pcp.condenacoes"+w+" GROUP BY empresa,granja,fornecedor,galpao,lote"
                    if fornecedor_detalhado:
                        grouped_sql=grouped_sql.replace("string_agg(DISTINCT condenacao,', ') condenacao,string_agg(DISTINCT tipo,', ') tipo",'condenacao,tipo')+' ,condenacao,tipo'
                    # Weighings repeat for each condemnation. Count each date/shift/lot
                    # once, using the full cause set so every cause shares its base.
                    base_sql="SELECT empresa,granja,fornecedor,galpao,lote,sum(kg) peso_base FROM (SELECT empresa,granja,fornecedor,galpao,lote,d,t,max(cause_kg) kg FROM (SELECT empresa,granja,fornecedor,galpao,lote,coalesce(data_abate,data_referencia) d,coalesce(nullif(turno_codigo,''),turno) t,condenacao,tipo,sum(peso_pesagem) cause_kg FROM pcp.condenacoes"+where+" GROUP BY empresa,granja,fornecedor,galpao,lote,coalesce(data_abate,data_referencia),coalesce(nullif(turno_codigo,''),turno),condenacao,tipo) cause_weights GROUP BY empresa,granja,fornecedor,galpao,lote,d,t) weighings GROUP BY empresa,granja,fornecedor,galpao,lote"
                    grouped_sql="WITH weights AS ("+base_sql+"), causes AS ("+grouped_sql+") SELECT c.*,w.peso_base FROM causes c LEFT JOIN weights w ON c.empresa IS NOT DISTINCT FROM w.empresa AND c.granja IS NOT DISTINCT FROM w.granja AND c.fornecedor IS NOT DISTINCT FROM w.fornecedor AND c.galpao IS NOT DISTINCT FROM w.galpao AND c.lote IS NOT DISTINCT FROM w.lote"
                    a=list(args)+a
                    grouped_sort={'data':'datas','turno':'turnos','tecnico':'tecnico','cidade':'cidade','codigo':'codigo','condenacao':'condenacao','tipo':'tipo','ocorrencia':'ocorrencia','empresa':'empresa','granja':"CASE WHEN granja ~ '^[0-9]+$' THEN granja::numeric END",'fornecedor':'fornecedor','galpao':'galpao','lote':"CASE WHEN lote ~ '^[0-9]+$' THEN lote::numeric END",'peso_total':'peso_total','peso_pesagem':'peso_pesagem','percentual':'percentual'}
                    if ordenar!='data' and ordenar not in grouped_sort:raise HTTPException(422,'Ordenação inválida para o consolidado')
                    grouped_order=grouped_sort.get(ordenar,'empresa')+(' DESC'if direcao=='desc'else' ASC')+' NULLS LAST,empresa,granja,fornecedor,galpao,lote'
                    count=conn.execute('SELECT count(*) n FROM ('+grouped_sql+') grouped',a).fetchone()['n']
                    details=conn.execute('SELECT * FROM ('+grouped_sql+') grouped ORDER BY '+grouped_order+' LIMIT 200 OFFSET %s',a+[(pagina-1)*200]).fetchall()
                    for detail in details:
                        detail['peso_pesagem']=detail.pop('peso_base',None)
                        detail['percentual']=detail['peso_total']/detail['peso_pesagem'] if detail['peso_pesagem'] else None
                else:
                    count=conn.execute('SELECT count(*) n FROM pcp.condenacoes'+w,a).fetchone()['n']
                    details=conn.execute("SELECT coalesce(data_abate,data_referencia) data,empresa,coalesce(nullif(turno_codigo,''),turno) turno,granja,fornecedor,galpao,lote,tecnico,cidade,codigo,condenacao,tipo,ocorrencia,peso_total,peso_pesagem,peso_total/nullif(peso_pesagem,0) percentual FROM pcp.condenacoes"+w+' ORDER BY '+order+' LIMIT 200 OFFSET %s',a+[(pagina-1)*200]).fetchall()

        accepted=lambda d:d.year in years and d.month in months and(not chosen or d in chosen)
        den=defaultdict(float);ra=defaultdict(dict)
        for r in live:
            d=r['data']
            if not accepted(d):continue
            if r['empresa']=='Ave Nova':
                if str(r['turno_codigo'])not in an_turns:continue
                den[d.strftime('%Y-%m')]+=float(r['kg']or 0)
            elif include_ra:ra[d][r['secao']]=float(r['kg']or 0)
        for d,sections in ra.items():den[d.strftime('%Y-%m')]+=sections.get('Abate - Total',sections.get('Recepção de Aves Vivas',0))if 'Compra de Aves Vivas'in sections else sections.get('Recepção de Aves Vivas',0)
        groups={};total=defaultdict(float)
        for r in facts:
            group,name,kind=classify(r['condenacao'],r['tipo']);key=norm(name)+'|'+norm(kind);month=r['data'].strftime('%Y-%m');kg=float(r['kg']or 0)
            item=groups.setdefault(key,{'grupo':group,'causa':name,'tipo':kind,'pesos':defaultdict(float),'ocorrencias':0})
            item['pesos'][month]+=kg;item['ocorrencias']+=float(r['ocorrencias']or 0);total[month]+=kg
        periods=sorted(set(den)|set(total));den_total=sum(den.values());result=[]
        for item in sorted(groups.values(),key=lambda r:(r['grupo'],r['causa'],r['tipo'])):
            weights=item.pop('pesos');kg=sum(weights.values());item.update(kg=kg,percentual=kg/den_total if den_total>0 else None,meses={m:{'kg':weights.get(m,0),'percentual':weights.get(m,0)/den[m]if den[m]>0 else None}for m in periods});result.append(item)
        return {'ok':True,'opcoes_tecnicos':sorted({r['tecnico'] for r in filter_options if r['tecnico']}),'opcoes_fornecedores':sorted({r['fornecedor'] for r in filter_options if r['fornecedor']}),'agrupado':agrupado,'data_limite':cutoff,'meses':periods,'resumo':result,'peso_vivo_kg':den_total,'peso_condenado_kg':sum(total.values()),'percentual':sum(total.values())/den_total if den_total>0 else None,'totais_mensais':{m:{'kg':total[m],'peso_vivo_kg':den[m],'percentual':total[m]/den[m]if den[m]>0 else None}for m in periods},'detalhes':details,'total_detalhes':count,'pagina':pagina,'por_pagina':200,'regra':'SUM(peso condenado)/SUM(peso vivo), ponderado no período. Grupos e equivalências da planilha; parcial e total separados. Peso vivo: mesmas fontes do Comparativo Cirúrgico; sem somar pesagens repetidas por causa.'}
    return router
