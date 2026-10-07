"""Lê o relatório Agrosys e compara com os resultados SQL enviados pelo usuário."""
from pathlib import Path
from datetime import datetime
from decimal import Decimal
import json
import openpyxl

ROOT=Path(__file__).resolve().parents[1]
PLAN=Path(r'C:\Users\vchaves\Downloads\relatorio (5).xlsx')
SQL_RESULTS=Path(r'C:\Users\vchaves\.codex\attachments\a41bf042-ffc1-4143-af6e-09e34989ac30\Pasted text.txt')
REFERENCE=datetime(2026,10,7)
START=datetime(2026,8,23)
WEEKS=[7,14,21,28,35,42]
DATABASE_WEEK=[68978,34768,47335,36876,23122,7602]

def main():
    book=openpyxl.load_workbook(PLAN,read_only=True,data_only=True)
    try:
        source=list(book.worksheets[0].iter_rows(values_only=True))
        header=source[7]
        assert 'Aves' in header[16] and 'Inicia' in header[16]
        for j,w in enumerate(WEEKS):
            assert 'Mort' in header[17+2*j] and f'{w:02}' in header[17+2*j]
            assert 'Desc' in header[18+2*j] and f'{w:02}' in header[18+2*j]
        rows=[(i,r) for i,r in enumerate(source,1) if isinstance(r[11],datetime) and START<=r[11]<=REFERENCE and r[3] is not None]
        bank={};capture=False
        for line in SQL_RESULTS.read_text(encoding='utf-8').splitlines():
            parts=line.split('\t')
            if parts==['coalesce','coalesce','lotes','aves','mortes','mortalidade_percent']:
                capture=True;continue
            if line.startswith('WITH parametros'):capture=False
            if capture and len(parts)==6 and parts[2].isdigit():
                key=(parts[0].strip(),parts[1].strip())
                assert key not in bank
                bank[key]={'aves':int(parts[3]),'mortes':int(parts[4])}
        differences=[];seen=set();weekly=[]
        for j,w in enumerate(WEEKS):
            eligible=[r for _,r in rows if (REFERENCE-r[11]).days>=w]
            mort=sum(Decimal(str(r[17+2*j] or 0)) for r in eligible)
            disc=sum(Decimal(str(r[18+2*j] or 0)) for r in eligible)
            birds=sum(Decimal(str(r[16] or 0)) for r in eligible)
            weekly.append({'semana':w,'lotes':len(eligible),'aves':int(birds),'mortos_planilha':int(mort),
                           'descartes_planilha':int(disc),'planilha':int(mort+disc),'banco':DATABASE_WEEK[j],
                           'diferenca':int(mort+disc)-DATABASE_WEEK[j],
                           'percentual_planilha':float((mort+disc)/birds*100),
                           'percentual_banco':float(Decimal(DATABASE_WEEK[j])/birds*100)})
        for line,r in rows:
            key=(r[4].strip(),str(r[6]).strip());assert key not in seen;seen.add(key)
            assert key in bank and bank[key]['aves']==r[16]
            total=sum(int(r[17+2*j] or 0)+int(r[18+2*j] or 0) for j,w in enumerate(WEEKS) if (REFERENCE-r[11]).days>=w)
            if total!=bank[key]['mortes']:
                differences.append({'linha_excel':line,'codigo':r[3],'produtor':key[0],'galpao':key[1],
                                    'lote':r[5],'recepcao':r[11].date().isoformat(),'planilha':total,
                                    'banco':bank[key]['mortes'],'diferenca':total-bank[key]['mortes']})
        assert seen==set(bank)
        result={'referencia':REFERENCE.date().isoformat(),'inicio':START.date().isoformat(),
                'relatorio_emitido':str(source[0][1]),'periodo_relatorio':source[5][0],
                'lotes':len(rows),'aves':sum(int(r[16]) for _,r in rows),
                'identidades_e_aves_por_galpao_iguais':True,'semanas':weekly,
                'mortes_planilha':sum(p['planilha'] for p in weekly),'mortes_banco':sum(DATABASE_WEEK),
                'galpoes_divergentes':len(differences),'diferencas_por_galpao':differences}
        target=ROOT/'outputs/entrega-final/CONFERENCIA_PLANILHA_LOTES_2026_10_07.json'
        target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps({k:v for k,v in result.items() if k!='diferencas_por_galpao'},ensure_ascii=False,indent=2))
        # Compara valores brutos e datas de carga sem alterar banco, robô ou frontend.
        original=(target.parent/'CONFERIR_SOMAS_LOTES.sql').read_text(encoding='utf-8')
        prefix=original[original.index('WITH parametros AS'):original.index("SELECT '1. Brutas")]
        columns=['id','codigo_granja','nome_granja','galp','num_lote','data_recepcao','periodo_fim','carregado_em','aves_inicia']
        for w in WEEKS:columns.extend([f'qtde_mort_sem_{w:02}',f'qtde_desc_sem_{w:02}'])
        raw=prefix+'SELECT '+', '.join(columns)+' FROM selecionadas ORDER BY nome_granja,galp,num_lote;\n'
        (target.parent/'EXPORTAR_DADOS_LOTES_PARA_COMPARAR.sql').write_text('-- Somente leitura: dados brutos e datas de carga da mesma janela.\n'+raw,encoding='utf-8')
    finally:book.close()

if __name__=='__main__':main()
