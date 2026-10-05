# Publicação das regras de 05/10/2026

Esta atualização substitui as regras de média simples de todos os indicadores e o limite de 14 do Vazio descritos nos documentos de 02/10. A tela se chama **Desempenho Lotes Fechados**. Desempenho e Detalhamento compartilham as novas regras; Lotes, Histórico e RxP mantêm suas fontes e cálculos.

| Indicador | Regra final | Agosto na planilha `relatorio (52).xlsx` |
| --- | --- | --- |
| IEP | AVG(iep) | 321,57 |
| CA | SUM(consumo_racao) / SUM(pes_total) | 1,794 |
| CAC | SUM(cac × aloj) / SUM(aloj), pares válidos | 1,740 |
| GPD | SUM(pes_total / qt_aves) / SUM((qt_aves × ida) / qt_aves) × 1000 | 65,78 |
| Mortalidade | SUM(mort) / SUM(aloj) × 100 | 13,17% |
| Idade | SUM(qt_aves × ida) / SUM(qt_aves) | 47,13 |
| Peso Médio | SUM(pes_total) / SUM(qt_aves) | 3,107 |
| Vazio | SUM(vazio_sanitario × qt_aves) / SUM(qt_aves), sem limite, pares válidos | 16,36 |

Morte no Transporte e CAC Ref usam ponderação por `aloj`. Aves Abatidas permanece soma de `qt_aves`. NULLs não contribuem para somas/médias; nas ponderações, pesos de indicadores ausentes não entram no denominador. Divisões por zero retornam NULL. O GPD da fórmula aprovada resulta em 65,78, não nos 65,94 da linha de totais do Agrosys; não há ajuste artificial para atingir esse total.

## Instalar

1. Faça backup dos três Python atuais no Anderson. Extraia [backend_anderson.zip](backend_anderson.zip) e substitua somente `registry.py`, `sql_utils.py` e `analytics.py` em `C:\BI_Granja\API\api_zootecnico\bi_generic`.
2. No PowerShell do Anderson, execute um comando por vez:

```powershell
Set-Location -LiteralPath 'C:\BI_Granja\Banco\postgresql_granja'
docker compose up -d --build --no-deps zootecnico
docker compose ps --all zootecnico
docker compose logs --tail=100 zootecnico
```

3. Publique [frontend_bi_zootecnico.zip](frontend_bi_zootecnico.zip), ou os seis HTMLs e `assets/` pelo workflow GitHub existente. Cache: `ajustes-20261005-1`. As explicações da página Fórmulas e dos botões ƒx estão atualizadas. O frontend exige o backend novo, para não apresentar regras antigas com explicações novas.
4. Abra pela CENTRAL. Consulte `/api/bi/zootecnico/resumo?ano=2026&mes=8`, usando a sessão autenticada. Espere `rules_version = acerto-2026-10-05` e `arquivo = zootecnico.vw_desempenho_acerto`. Confira também Detalhamento e rankings com os mesmos filtros.
5. Para conferir no Adminer, execute a primeira consulta de [03_conferir_calculos.sql](sql/03_conferir_calculos.sql), somente leitura. Os resultados reais dependem dos lotes existentes na view e dos filtros; a comparação acima usa os 163 lotes brutos da planilha.

Não é necessário ALTER TABLE, recriar a view, reimportar dados ou mudar o Worker por causa destas regras. A view existente e os dados precisam já estar instalados. O robô não foi alterado nesta atualização. Nenhum deploy, carga real ou commit foi executado pelo assistente.
