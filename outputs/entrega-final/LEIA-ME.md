# Entrega final para transferência

**Atualização vigente de 05/10/2026:** veja [ATUALIZACAO_2026_10_05.md](ATUALIZACAO_2026_10_05.md). Os ZIPs foram atualizados para `acerto-2026-10-05` e cache `ajustes-20261005-1`. As regras de média simples geral e limite de 14 mencionadas abaixo descrevem a entrega anterior e foram substituídas. Atualize backend antes de publicar o frontend novo.

Pacotes preparados localmente em 02/10/2026. Nenhuma publicação no servidor foi executada. Os nomes e conteúdos internos de cada ZIP foram conferidos contra os arquivos de origem; hashes estão em `manifesto.json` e `SHA256SUMS.txt`.

O frontend incorpora os [ajustes visuais da referência ZIP](AJUSTES_VISUAIS.md): degradê, rótulos, barras de peso, hierarquia e tabelas formatadas, com cache `ajustes-20261002-4`. Esta atualização visual não requer alteração do backend.

| Arquivo | Destino e conteúdo |
| --- | --- |
| [frontend_bi_zootecnico.zip](frontend_bi_zootecnico.zip) | Hospedagem do BI: seis HTMLs na raiz e a pasta `assets/`. Não inclui backend, testes, SQL, planilhas ou snapshots. |
| [backend_anderson.zip](backend_anderson.zip) | Pasta `bi_generic` do backend do Anderson: somente `registry.py`, `sql_utils.py` e `analytics.py`. |
| [robo_acerto_incremental.zip](robo_acerto_incremental.zip) | Ambiente Agrosys_Extractor: novo Python de carga, instruções e SQL de conferência. |
| [github_pages_publicacao.zip](github_pages_publicacao.zip) | Raiz do repositório GitHub: workflow de Pages e script que publica somente os seis HTMLs e `assets/`. |
| [sql/01_criar_view_desempenho_acerto.sql](sql/01_criar_view_desempenho_acerto.sql) | Adminer/PostgreSQL: view de desempenho com Acerto e complementos por vínculo único. |
| `sql/02_…` até `sql/06_…` | Consultas de conferência, conforme os cabeçalhos de cada arquivo. |

## Ordem de instalação

1. Aplique a versão atual da view no PostgreSQL e confira vínculos/exclusões. Na carga anterior à extração completa, foram conferidos 343 registros de Acerto; a exclusão autorizada de Tipo de Granja em branco deve deixar 342 na view. Depois da carga histórica essas contagens poderão aumentar.
2. Guarde os três Python atuais do Anderson em backup; extraia o ZIP de backend e substitua seus correspondentes em `C:\BI_Granja\API\api_zootecnico\bi_generic`. Preserve os demais arquivos e configurações.
3. Na pasta `C:\BI_Granja\Banco\postgresql_granja`, execute `docker compose up -d --build --no-deps zootecnico` e confira o status/logs. Os caminhos são os documentados no backend fornecido pelo Anderson.
4. Publique o conteúdo do ZIP de frontend na hospedagem atual, mantendo os seis HTMLs e `assets/` nos respectivos caminhos. Abra pela CENTRAL. O Worker atual já encaminha as rotas; não há mudança de Worker nesta entrega.
5. Instale o robô na máquina de extração e execute a primeira carga desde 2023. A API exibirá os registros que já estiverem no banco durante o preenchimento.

O passo a passo completo para PostgreSQL, computador do Anderson, robô e GitHub está em [IMPLEMENTAR_PASSO_A_PASSO.md](../../IMPLEMENTAR_PASSO_A_PASSO.md). Os testes autenticados e a recuperação do backend estão em [ATUALIZAR_BACKEND_ANDERSON.md](../../ATUALIZAR_BACKEND_ANDERSON.md).

## Executar o robô

Extraia o ZIP do robô e copie seu Python para a mesma pasta de `banco_zootecnico.py`, dentro do Agrosys_Extractor já instalado. Preserve `Indice Zootecnico/acerto_lote_resultado_geral.py`, que é o extrator oficial chamado pelo robô de carga.

Na pasta do Python, execute um comando por vez:

```powershell
py -B .\acerto_lote_resultado_geral_incremental.py --planejar
py -B .\acerto_lote_resultado_geral_incremental.py --manter-excel
```

Sem datas manuais, ele cobre **01/01/2023 até hoje**, em exportações de até sete dias, com retomada por mês. Não apague o checkpoint gerado. A chamada diária também deve omitir `--inicio`/`--fim` para manter a cobertura automática.

Instruções e limites da conferência estão no `COMO_USAR.md` dentro do ZIP e em [outputs/robo-acerto/COMO_USAR.md](../robo-acerto/COMO_USAR.md). O Agrosys não informa total oficial de linhas; o robô verifica os intervalos e a gravação integral das linhas recebidas. Não houve execução de extração real nesta preparação.

## Conferir as telas

- Desempenho/Detalhamento: fonte `zootecnico.vw_desempenho_acerto`, fórmulas por lote e média simples dos resultados; Vazio acima de 14 substituído por 14.
- Lotes: fonte de abertos preservada, gráficos vinho/dourado, ranking e detalhes dos galpões; temas claro/escuro e redimensionamento.
- Histórico: fonte de fechados preservada, ano pela data de abate, somente de 2023 até o ano atual; expansão semana → produtor → galpão.
- RxP: AVE NOVA/REAL ALIMENTOS e diferença oficial, com destaques visuais e detalhes paginados.
- Todas as telas de dados: “Aplicando filtros…” no canto inferior direito durante consultas, desaparecendo ao concluir, cancelar ou falhar.
- Tabelas: ordenação por clique nos cabeçalhos, com setas no visual existente, mantendo totais e hierarquia. Nos detalhes paginados do RxP, ordena a página carregada. Cache atualizado para `ajustes-20261002-4`.

A importação manual do relatório bruto está separada dos pacotes de publicação: veja [COMO_IMPORTAR.md](../importacao-acerto/COMO_IMPORTAR.md). Esse SQL foi gerado, mas não executado no banco.

Validação local: 45 testes Python, 23 verificações de frontend e cinco telas no Chrome com dados sintéticos. A planilha fornecida foi lida com 133 lotes. Aplicação do SQL atualizado, publicação, extração real e conferência PostgreSQL → API → interface permanecem como etapas no ambiente do Anderson.

## Regerar os pacotes após novas alterações

Na raiz de `bi-zootecnico`, execute `py -B tools/preparar_entrega.py`. O script empacota os arquivos autorizados, atualiza o ZIP de backend já fornecido e verifica os bytes dos ZIPs; não faz deploy.
