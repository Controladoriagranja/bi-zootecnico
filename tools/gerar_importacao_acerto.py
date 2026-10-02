"""Gera SQL transacional de dados brutos; não acessa o banco."""
import argparse
import importlib.util
import json
import math
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('robo', ROOT / 'outputs/robo-acerto/acerto_lote_resultado_geral_incremental.py')
robo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(robo)
TARGETS = '''codigo integrado local tecnico assist planta_alimento acerto_manual gal lote dt_aloj mao_de_obra vazio_sanitario aloj mort mort_2 ida data_abate qt_aves ps_med pes_total pes_liq consumo_racao gpd conv cac iep kg_m2 calo sx linh forneced vl_medic vlmedic_kgfg vl_insumo vlins_kgfg custo_r custo_kg custo_cab remun_prod_cab remun_prod_kg bonif_estrutura bonif_condenacao vl_liquido vl_liquido_s_taxas custo_pinto custo_racao custo_racao_total frete ps_med_pinto composicao_lote_qtde_idd densidade frete_kg'''.split()
HEADERS = ['Código','Integrado','Local','Técnico','Assist.','Planta Alimento','Acerto Manual','Gal','Lote','Dt.Aloj.','Mão-de-Obra','Vazio Sanitário','Aloj.','Mort.','%Mort.','Ida','Data Abate','Qt. Aves','Ps.Med','Pes.Total','Pes.Liq','Consumo Racao','GPD','Conv','CAC','IEP','Kg/M2','% Calo','SX','Linh','Forneced','Vl Medic','VlMedic /KgFg','Vl Insumo','VlIns /KgFg','Custo R$','Custo kg','Custo Cab','Remun Prod Cab','Remun Prod/Kg','Bonif. Estrutura','Bonif. Condenação','Vl Liquido','Vl Liquido S/Taxas','Custo Pinto','Custo Ração','Custo Ração Total','Frete','Ps Med Pinto','Composicao [lote/Qtde/Idd]','Densidade','Frete/Kg']

def literal(v):
    v = robo.valor_banco(v)
    if v is None: return 'NULL'
    if isinstance(v, (date, datetime)): v = v.isoformat()
    if isinstance(v, (int, float)):
        if not math.isfinite(v): raise ValueError('Número não finito')
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"

def main():
    p=argparse.ArgumentParser()
    p.add_argument('arquivo', type=Path)
    p.add_argument('--unidade', required=True)
    p.add_argument('--saida', type=Path, default=ROOT/'outputs/importacao-acerto/importar_relatorio.sql')
    a=p.parse_args()
    df=robo.ler_acerto_lote(a.arquivo)
    cols=list(df.columns[:-5])
    if list(map(robo.header_key, cols)) != list(map(robo.header_key, HEADERS)):
        raise ValueError('Cabeçalho diferente do mapeamento confirmado; nenhuma carga gerada.')
    df['Unidade_Extracao']=a.unidade
    mapa={robo.header_key(c):c for c in cols}
    inicio=df[mapa['data abate']].min().date()
    fim=df[mapa['data abate']].max().date()
    campos=['chave_lote','hash_linha','periodo_inicio','periodo_fim','unidade_extracao','origem_arquivo']+TARGETS
    rows=[]
    for _,r in df.iterrows():
        valores=[robo.valor_banco(r[c]) for c in cols]
        digest=robo.hashlib.sha256(json.dumps(valores,default=str,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
        rows.append([robo.identidade_lote(r,mapa),digest,inicio,fim,a.unidade,a.arquivo.name]+valores)
    match="t.unidade_extracao=s.unidade_extracao AND BTRIM(t.codigo)=s.codigo AND BTRIM(t.gal)=s.gal AND BTRIM(t.lote)=s.lote AND t.dt_aloj::date=s.dt_aloj::date AND t.data_abate::date=s.data_abate::date"
    sql=['-- Dados brutos. Não altera views, funções, fórmulas ou schema.\nBEGIN;\nSET LOCAL standard_conforming_strings=on;\nLOCK TABLE zootecnico.acerto_lote_resultado_geral IN SHARE ROW EXCLUSIVE MODE;\nCREATE TEMP TABLE carga_acerto (LIKE zootecnico.acerto_lote_resultado_geral INCLUDING DEFAULTS) ON COMMIT DROP;']
    for i in range(0,len(rows),250):
        sql.append('INSERT INTO carga_acerto ('+', '.join(campos)+') VALUES\n'+',\n'.join('('+', '.join(map(literal,r))+')' for r in rows[i:i+250])+';')
    sql.append("DO $$ BEGIN IF EXISTS (SELECT s.chave_lote FROM carga_acerto s JOIN zootecnico.acerto_lote_resultado_geral t ON "+match+" GROUP BY s.chave_lote HAVING COUNT(*)>1) THEN RAISE EXCEPTION 'Mais de um registro existente para o mesmo lote. Carga revertida.'; END IF; END $$;")
    updates=[c for c in campos if c!='chave_lote']
    sql.append('UPDATE zootecnico.acerto_lote_resultado_geral t SET '+', '.join(c+'=s.'+c for c in updates)+', carregado_em=CURRENT_TIMESTAMP FROM carga_acerto s WHERE '+match+';')
    sql.append('INSERT INTO zootecnico.acerto_lote_resultado_geral ('+', '.join(campos)+') SELECT '+', '.join('s.'+c for c in campos)+' FROM carga_acerto s WHERE NOT EXISTS (SELECT 1 FROM zootecnico.acerto_lote_resultado_geral t WHERE '+match+');')
    sql.append("DO $$ BEGIN IF EXISTS (SELECT 1 FROM carga_acerto s WHERE NOT EXISTS (SELECT 1 FROM zootecnico.acerto_lote_resultado_geral t WHERE "+match+" AND t.hash_linha=s.hash_linha)) THEN RAISE EXCEPTION 'Conferência da carga falhou. Carga revertida.'; END IF; END $$;")
    sql.append('SELECT COUNT(*) AS registros_conferidos FROM carga_acerto;\nCOMMIT;')
    a.saida.parent.mkdir(parents=True,exist_ok=True)
    a.saida.write_text('\n\n'.join(sql)+'\n',encoding='utf-8')
    report={'arquivo':a.arquivo.name,'registros':len(rows),'unidade':a.unidade,'abate_inicio':str(inicio),'abate_fim':str(fim),'mapeamento':dict(zip(cols,TARGETS)),'formulas_alteradas':False}
    (a.saida.parent/'conferencia.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='mapeamento'},ensure_ascii=False))

if __name__=='__main__': main()
