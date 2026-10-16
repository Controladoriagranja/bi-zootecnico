"""Leitura do relatorio de Acerto, sem alterar o XLSX original."""
from decimal import Decimal
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
REPORT = Path('C:/Users/vchaves/Downloads/relatorio (12).xlsx')
NS = {'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
MAPPING = {'A':'codigo','B':'integrado','D':'tecnico','H':'gal','I':'lote',
           'K':'vazio_sanitario','L':'aloj','M':'mort','O':'ida','P':'data_abate',
           'Q':'qt_aves','R':'ps_med','S':'pes_total','U':'consumo_racao',
           'V':'gpd','W':'conv','X':'cac','Y':'iep','AC':'linh'}
TEXT = {'codigo','integrado','tecnico','gal','lote','data_abate','linh'}


def read_report(path=REPORT):
    rows=[]
    with ZipFile(path) as z:
        strings=[]
        if 'xl/sharedStrings.xml' in z.namelist():
            strings=[''.join(t.itertext()) for t in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',NS)]
        for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('m:sheetData/m:row',NS):
            values={}
            for cell in row:
                value=cell.find('m:v',NS)
                inline=cell.find('m:is',NS)
                raw=value.text if value is not None else ''.join(inline.itertext()) if inline is not None else ''
                if cell.get('t')=='s': raw=strings[int(raw)]
                values[''.join(c for c in cell.get('r') if c.isalpha())]=raw
            if values.get('A','').isdigit() and values.get('P','').startswith('2026-09'):
                record={name:(values.get(col,'').strip() if name in TEXT else Decimal(values[col]) if values.get(col) else None)
                        for col,name in MAPPING.items()}
                record['excel_row']=int(row.get('r'))
                rows.append(record)
    return rows


def totals(rows):
    total=lambda key:sum((r[key] for r in rows if r[key] is not None),Decimal(0))
    aves=total('qt_aves')
    age_total=sum(r['qt_aves']*r['ida'] for r in rows if r['qt_aves'] is not None and r['ida'] is not None)
    peso=total('pes_total')/aves
    idade=age_total/aves
    gpd=peso/idade*1000
    mortality=total('mort')/total('aloj')*100
    ca=total('consumo_racao')/total('pes_total')
    return {'lotes':len(rows),'aves_alojadas':total('aloj'),'mortes':total('mort'),
            'aves_abatidas':aves,'peso_total':total('pes_total'),
            'consumo_racao':total('consumo_racao'),'peso_medio':peso,'idade_media':idade,
            'gpd':gpd,'mortalidade_percent':mortality,'ca':ca,
            'iep':gpd/1000*(100-mortality)/ca*100}


def main():
    rows=read_report()
    old_context=[r for r in rows if (r['codigo'],r['gal'],r['lote'])!=('24516','522','52')]
    result={'fonte':str(REPORT),'sha256':hashlib.sha256(REPORT.read_bytes()).hexdigest(),
            'periodo':'2026-09 por data_abate','celula_total_iep':'Relatório!Y171',
            'total_159_lotes':totals(rows),'anterior_158_lotes':totals(old_context),
            'conferencia_postgresql_real_da_formula_nova':'pendente executar 04_conferir_iep_final.sql'}
    target=ROOT/'outputs/consolidacao-20261016/CONFERENCIA_SETEMBRO.json'
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(result,default=str,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,default=str,ensure_ascii=False,indent=2))


if __name__=='__main__':
    main()
