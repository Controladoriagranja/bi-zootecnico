"""Reconcilia todas as somas e taxas de lotes abertos com idades e versões."""
from datetime import date, timedelta
from decimal import Decimal
import unittest
from test_backend_integration import a, BI_REGISTRY, Connection

class LotesTotalsTests(unittest.TestCase):
    def test_every_week_and_selection_reconcile_groups(self):
        config=BI_REGISTRY['lotes-abertos'];ref=date(2026,10,7)
        raw=[]
        for i,age in enumerate([-1,0,6,7,13,14,20,21,27,28,34,35,41,42,45,46]):
            row=dict(id=i+1,codigo=str(i),lote='1',galpao=str(i%3),
                     produtor='A' if i%2 else 'B',tipo_granja='Integrada',linhagem='COBB',
                     recepcao=ref-timedelta(days=age),versao=ref,aves=str((i+1)*100))
            for w in config['weeks']:
                row[f'mort{w}']=str(i+w);row[f'disc{w}']='2'
            raw.append(row)
        raw.append({**raw[7],'id':100,'versao':ref-timedelta(days=1),'aves':'99999','mort7':'99999'})
        rows=a.prepare_rows(Connection({'mortalidade_peso_abertos':raw}),config,ref)
        self.assertEqual(len(rows),14)
        for weeks in [[w] for w in config['weeks']]+[config['weeks'],[7,21,42]]:
            selected=[r for r in rows if a.match(r,{'periodo_dias':[str(w) for w in weeks]},config)]
            expected_deaths=Decimal(0)
            for point,w in zip(a.weekly(selected,config,weeks),weeks):
                eligible=[r for r in selected if r['idade']>=w]
                deaths=sum((Decimal(r[f'mort{w}'])+Decimal(r[f'disc{w}']) for r in eligible),Decimal(0))
                birds=sum((Decimal(r['aves']) for r in eligible),Decimal(0))
                self.assertEqual(point['mortes'],deaths)
                self.assertEqual(point['mortalidade'],a.ratio(deaths,birds,100))
                expected_deaths+=deaths
            total=a.stats(selected,config,weeks)
            self.assertEqual(total['mortes'],expected_deaths)
            self.assertEqual(total['mortalidade'],a.ratio(expected_deaths,total['aves'],100))
            for keys in [config['group_by'],['produtor','galpao']]:
                groups=a.groups(selected,keys,config,weeks)
                for key in ['lotes','aves','mortes']:
                    self.assertEqual(sum(g['cards'][key] for g in groups),total[key])
                for g in groups:
                    self.assertEqual(g['cards']['mortalidade'],a.ratio(g['cards']['mortes'],g['cards']['aves'],100))

if __name__=='__main__':unittest.main()
