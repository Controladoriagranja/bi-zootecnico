# Instalação e publicação — 02/10/2026

Verificação local concluída: 45 testes Python, 23 verificações de frontend e cinco telas no Chrome, com filtros reais da interface, cancelamento, erro e resposta vazia usando API simulada. Os quatro ZIPs e o site preparado para Pages foram conferidos byte a byte. Veja [VERIFICACAO.json](outputs/entrega-final/VERIFICACAO.json). Nenhum commit, push, deploy ou acesso ao Agrosys/PostgreSQL real foi executado nesta conferência.

## 1. PostgreSQL

No Adminer, selecione banco `bi_granja`, schema `zootecnico`, Comando SQL. Execute **todo** [01_criar_view_desempenho_acerto.sql](outputs/entrega-final/sql/01_criar_view_desempenho_acerto.sql). Depois execute [06_validar_complemento.sql](outputs/entrega-final/sql/06_validar_complemento.sql).

Na carga anterior de 343 acertos, esperamos 342 na view e um ignorado: código 24516, galpão 522, lote 52, cujo Tipo está em branco. Os seis acertos do código 2963 devem ter Modelo Convencional Forrado e Tipo Alugada. A origem permanece intacta. Após a carga histórica, as contagens poderão aumentar; compare sempre origem, view e excluídos, em vez de exigir 342.

## 2. Backend no computador do Anderson

Extraia [backend_anderson.zip](outputs/entrega-final/backend_anderson.zip). Faça backup dos três arquivos atuais e substitua somente `registry.py`, `sql_utils.py` e `analytics.py` em `C:\BI_Granja\API\api_zootecnico\bi_generic`. Preserve os demais arquivos e as configurações.

No PowerShell do Anderson, execute um comando por vez:

```powershell
Set-Location -LiteralPath 'C:\BI_Granja\Banco\postgresql_granja'
docker compose up -d --build --no-deps zootecnico
docker compose ps --all zootecnico
docker compose logs --tail=100 zootecnico
```

O serviço deve estar `Up`/`running`, sem reinicializações ou erro de importação/SQL. O serviço e os caminhos são os do backend fornecido pelo Anderson. [Referência do Docker](https://docs.docker.com/reference/cli/docker/compose/up/). Para restaurar, recoloque os três arquivos do backup e repita o comando de build.

## 3. Robô de carga desde 2023

Extraia [robo_acerto_incremental.zip](outputs/entrega-final/robo_acerto_incremental.zip). Copie `acerto_lote_resultado_geral_incremental.py` para a mesma pasta de `banco_zootecnico.py`, no ambiente Agrosys_Extractor existente. Preserve `Core` e `Indice Zootecnico/acerto_lote_resultado_geral.py`; o novo robô depende desse ambiente e não fica no Docker da API.

Abra o PowerShell nessa pasta e execute:

```powershell
py -B .\acerto_lote_resultado_geral_incremental.py --planejar
py -B .\acerto_lote_resultado_geral_incremental.py --manter-excel
```

O primeiro comando apenas apresenta o plano. O segundo extrai e grava desde **01/01/2023 até hoje**, em intervalos de até sete dias, com retomada por mês. Não informe datas manuais se quiser cobrir toda essa faixa. Não apague o arquivo de checkpoint. Se houver falha, corrija a causa e execute novamente o mesmo comando; confira que terminou sem erro.

Na tarefa agendada, use esse Python sem `--inicio`/`--fim`, preservando a pasta de execução e o checkpoint. Confira o resultado com `CONFERIR_CARGA.sql` do ZIP e os recibos do checkpoint. O robô verifica a gravação de todas as linhas recebidas; como o Agrosys não informa total oficial, a completude da exportação precisa também de conferência operacional. Veja [COMO_USAR.md](outputs/robo-acerto/COMO_USAR.md).

## 4. GitHub e frontend

No computador atual, os arquivos já estão preparados no repositório `bi-zootecnico`. Se publicar de outro computador, extraia **na raiz do repositório** os ZIPs [frontend_bi_zootecnico.zip](outputs/entrega-final/frontend_bi_zootecnico.zip) e [github_pages_publicacao.zip](outputs/entrega-final/github_pages_publicacao.zip), preservando as subpastas.

No GitHub Desktop, abra o repositório local `bi-zootecnico` na branch `main`. Revise e selecione para publicação os seis HTMLs, `assets/`, `.github/workflows/deploy-pages.yml` e `tools/preparar_pages.py`; inclua a alteração de `.gitignore` se presente. Backend, planilhas, credenciais e pacotes de entrega não precisam entrar na publicação. Faça **Commit to main** e depois **Push origin** quando estiver pronto para publicar.

No repositório `Controladoriagranja/bi-zootecnico` no GitHub, abra **Settings → Pages → Build and deployment → Source → GitHub Actions**. Em **Actions**, confira o workflow **Publicar BI Zootecnico**. Se o push já ocorreu, use **Run workflow** na branch `main`. Espere as etapas de build e deploy ficarem verdes. [Procedimento oficial do GitHub](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

O workflow publica somente os seis HTMLs e `assets/`. Use o endereço mostrado em Settings → Pages; para este repositório, o endereço esperado é `https://controladoriagranja.github.io/bi-zootecnico/`. Abra o BI pela CENTRAL para receber a autenticação. Os arquivos usam versão de cache `ajustes-20261002-4`.

O Worker atual já encaminha as rotas: não há alteração de Worker nesta entrega.

## 5. Conferência final autenticada

Siga o teste de Console de [ATUALIZAR_BACKEND_ANDERSON.md](ATUALIZAR_BACKEND_ANDERSON.md), no contexto da tela do BI, sem copiar ou divulgar o token.

- `/api/bi/zootecnico/resumo`: status 200, `arquivo = zootecnico.vw_desempenho_acerto`, `rules_version = acerto-2026-10-02`. Confira também filtros e detalhes.
- Compare o mesmo período e filtros do resumo com [03_conferir_calculos.sql](outputs/entrega-final/sql/03_conferir_calculos.sql). Fórmulas são individuais por lote e depois média simples; GPD usa `ps_med` original. Vazio só troca valores acima de 14 por 14.
- Abra Desempenho e Detalhamento; aplique produtor, ano, mês e demais filtros. Confira indicadores, rankings e retorno sem dados.
- Abra Lotes: gráficos vinho/dourado, abas Produtores/Galpões, detalhes, tema escuro e redimensionamento.
- Abra Histórico: somente anos de abate de 2023 até o ano atual. `/api/bi/historico-fechados/resumo?ano=2023` deve usar regras `historico-fechados-2026-10-02`; confira detalhes do mesmo ano.
- Abra RxP: fontes AVE NOVA e REAL ALIMENTOS, diferença oficial e detalhes. A amostra já conferida de REAL ALIMENTOS / JOSE NILO NAVES / 02/01/2026 tem programada 11274, real 10356 e diferença -918.
- Em todas as telas de dados, “Aplicando filtros…” aparece no canto inferior direito e desaparece ao concluir ou falhar. Falha da API não deve deixar números antigos apresentados como atuais.

Só depois dessas conferências podemos considerar a instalação funcional no ambiente real. Se surgir erro, registre endpoint/status ou logs, sem enviar senhas ou tokens.
