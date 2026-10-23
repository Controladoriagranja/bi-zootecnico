# Investigação — Histórico de Lotes em Criação

21/10/2026. Pasta inspecionada: `C:\Users\vchaves\Documents\GitHub\bi-zootecnico`.
Modo somente investigação. Este é o único arquivo criado. Nenhum patch, teste,
script da aplicação, SQL, carga, publicação ou reinício foi executado.

## 1. Comprovado no frontend

- `assets/js/historico.js:49`: `ApiScreen.connect({bi:"historico-abertos", ...})`.
- `assets/js/api-screen.js:68–100`: `connect()` chama `refresh()`, consulta opções
  e depois `GET /api/bi/historico-abertos/resumo` com os filtros atuais.
- Host: `assets/js/config.js:4`: `https://api-bi-granja.controladoriagb05.workers.dev`.
- Opções: `GET /api/bi/historico-abertos/filtros`.
- Parâmetros possíveis: `ano`, `tipo_granja`, `produtor`, `modelo`, `galpao`,
  `tecnico`, `linhagem`, `mist_linha`. Multisseleções repetem a chave na URL
  (`assets/js/api.js:138–152`). Opção Todos é omitida (`filters.js:53–76`).
- O ano vem das opções da API: anos de 2023 ao ano do navegador, ordenados do
  maior para o menor; inicialmente seleciona o maior disponível (`historico.js:51–56`).
  Para a seleção 2026, o resumo leva `ano=2026`. A primeira consulta de opções
  pode ocorrer sem ano, porque `year` começa vazio.
- Abrir Semana 42 e expandir produtor/galpão NÃO consulta novamente a API.
  A hierarquia já veio no resumo. Não há parâmetro `semana=42` nesta tela.
- Histórico não habilita carregamento progressivo: não envia `etapa` nem `mes_carga`.

### Campos exatos do JSON

Nas linhas de semana/produtor/galpão, o objeto é cada nó de
`hierarchy[]`, `children[]`, `children[]`. No rodapé, é a raiz do JSON.

| Exibição | Campo lido | Código |
|---|---|---|
| Mortalidade total | `cards.mortalidade` | `historico.js:26` |
| M+D7/14/21/28/35 | `weekly[].mortalidade`, selecionando `weekly[].idade` 7/14/21/28/35 | `historico.js:18,26–28` |
| M7/14/21/28/35 | `weekly[].mortalidade_sem_descartes` | `historico.js:28` |
| D7/14/21/28/35 | `weekly[].descarte_percent` | `historico.js:28` |
| Peso do pintinho | `cards.peso_pinto` | `historico.js:26` |
| Peso de abate | `cards.peso_abate_final` | `historico.js:26` |
| Vezes maior | `cards.vezes_maior` | `historico.js:26` |
| Peso por idade | `weekly[].peso` | `historico.js:28` |
| Aves alojadas | `cards.aves` | `historico.js:26` |
| Última atualização | raiz `atualizado_em` | `api-screen.js:88`; `date-time.js:33` |

O topo também usa `cards.mortalidade`; o peso atual do topo usa
`cards.peso_atual` (`historico.js:5`). O frontend NÃO calcula a mortalidade
por soma nem média dos galpões: exibe os agregados enviados pela API.
Não consulta nenhuma view diretamente. O nome da view no servidor não pode
ser deduzido apenas do nome do endpoint.

## 2. Histórico git conferido

HEAD: `9291ea8`, 20/10/2026 10:06 -03:00. Os arquivos inspecionados não têm
diferenças de conteúdo em relação a esse commit; há avisos de LF/CRLF do Git.
O Git não estava inicialmente no PATH; foi localizado em
`C:\Users\vchaves\AppData\Local\Programs\Git\cmd\git.exe`.

Log dos arquivos relevantes nos últimos 15 dias:

| Commit | Data | Assunto |
|---|---|---|
| `9291ea8` | 20/10 10:06 | Exibe atualização dos dados nas telas do BI |
| `e64e22b` | 20/10 09:45 | Show data freshness and fix mortality target |
| `1fa99ba` | 19/10 08:24 | Adiciona análise de GPD por fase |
| `9408bbb` | 16/10 17:36 | Consolidate October BI metrics and views |
| `903a72b` | 15/10 11:55 | Melhora filtros e carregamento da tela RxP |
| `1881a37` | 08/10 13:43 | Switch history to open-lot tracking |
| `b25610a` | 07/10 10:27 | Exibir período de recepção nos lotes |
| `a0d42ee` | 06/10 18:01 | Bump frontend cache & fix filter rendering |
| `e40e4e5` | 06/10 17:28 | Implement progressive loading (frontend + tests) |
| `fb3ca40` | 06/10 13:45 | Add full rankings and reconciliation feedback |
| `92f2be9` | 06/10 09:14 | remove cac ref |

Comparação desde 14/10: último commit existente antes dessa data é `b750a23`
(08/10). O diff desse commit até os arquivos atuais mostra:

- Endpoint do Histórico continua `historico-abertos/resumo`; sem troca de campo
  de M+D (`weekly[].mortalidade`). Configuração do host e implementação dos
  filtros não tiveram diferenças nesse intervalo.
- Novas colunas passaram a exigir `cards.peso_pinto`, `peso_abate_final`,
  `vezes_maior` e `cards.mortalidade`. Se a API antiga não os enviar, peso vira
  “—”. Isso é uma possibilidade de incompatibilidade de contrato, não prova
  de qual versão está instalada no servidor.
- Entraram filtro Linhagem, cores condicionais e formatação/cabeçalho de data.
  O código de data só formata `atualizado_em`; não grava a data 16/10.
- A validação de fonte em `api.js:198–207` mudou, mas atende SOMENTE
  Desempenho/Detalhes, não `historico-abertos/resumo`.
- O modo progressivo adicionado ao cliente não está habilitado no Histórico.

Comandos somente leitura usados: `git log`, `git diff`, `git show`,
`git status --short`, `git ls-tree`, com `--no-optional-locks`.

## 3. Zeros, datas e caches locais

- `historico.js:20`: `null`/campo ausente de percentual aparece como “—”. Zero
  recebido aparece como `0,00%`. Não existe `|| 0` nesse cálculo/exibição.
- `api-screen.js:5`: formatação verifica nulo antes de `Number(value)`, portanto
  `Number(null)` NÃO gera zero nesse fluxo. Porém string vazia, espaços ou
  booleano falso são convertidos a zero. Essa é uma possibilidade local para
  JSON com tipos errados; não transforma um número válido `1.17` em zero.
- `historico.js:22–24`: `Number()` adicional decide apenas a cor da célula;
  não altera o valor exibido. Arredondamento é de exibição, com duas casas.
- `historico.js:53`: o filtro de data local limita opções de ANO; não descarta
  mortes/pesos por idade nem aplica regra `idade >= 7` aos lotes.
- `api.js:158–166`: requisição GET com `cache: "no-store"` e Bearer da sessão.
  Não há cache de respostas/TTL no cliente; o Histórico não sobrescreve essa opção.
- `sessionStorage` em `api.js:17` guarda autenticação. `localStorage` em
  `theme.js:10,54` e `historico.html:8` guarda tema, não dados dos lotes.
- Não foi encontrada inscrição de Service Worker nem uso de Cache API ou
  IndexedDB no frontend inspecionado. Isso não certifica o estado de um
  navegador específico nem outro site no mesmo domínio.
- Não há `worker.js` implantável no projeto atual. Há apenas o preparador
  `tools/preparar_worker_diagnostico.py` e um teste que referencia um arquivo
  ausente em `outputs/worker-diagnostico/worker.js`. Não executados.
  Portanto headers/TTL/Cache API do Worker instalado permanecem desconhecidos.
- `date-time.js:3,14–29,33` formata dd/mm/aaaa hh:mm; usa America/Sao_Paulo
  para offsets explícitos e preserva o relógio informado sem fuso. Não inventa
  a data atual. `16/10/2026 17:00` pode vir de `2026-10-16 17:00:01.633842`.

## 4. Evidência externa já fornecida e limites

O JSON anteriormente enviado pelo usuário trazia `fontes` com
`vw_historico_lotes_criacao_portal`, `atualizado_em` de 16/10 17:00, mortes e
mortalidade zero em Ademir/616A/616B, e não trazia os campos de peso do pintinho
em `cards`. Isso explica a exibição daquela captura sem precisar supor um
zero criado pelo frontend. Não prova que a resposta de agora é a mesma.

A definição SQL anteriormente colada pelo usuário apontava para
`zootecnico.mv_historico_lotes_criacao_portal`. Além disso, o arquivo LOCAL
`outputs/consolidacao-20261016/02_caches_materializados.sql:47–48` contém essa
definição. Isso comprova que essa definição existiu no material consultado;
NÃO prova que ela foi reaplicada, por quem, nem como está o servidor agora.
Não foi usada cópia local de Python para afirmar a query ativa do Anderson.

## 5. Kit do banco — executar manualmente no Adminer

Somente SELECTs. Registrar a hora da coleta e usar o mesmo PostgreSQL da API.
Nomes SQL abaixo constam do material local/estrutura já fornecida; não são
nomes JSON. A consulta inicial confirma as colunas realmente instaladas.

```sql
SELECT current_database() AS banco, current_user AS usuario,
       inet_server_addr() AS servidor, inet_server_port() AS porta;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='zootecnico'
  AND table_name='vw_historico_lotes_criacao_portal'
ORDER BY ordinal_position;
```

### a) Definição atual

Schema explícito evita consultar um objeto homônimo de outro schema.

```sql
SELECT pg_get_viewdef(
    'zootecnico.vw_historico_lotes_criacao_portal'::regclass, true
) AS definicao_atual;
```

### b) Valores brutos de Ademir, semana 42/2026

```sql
SELECT id, codigo_granja, nome_granja AS produtor,
       galp AS galpao, num_lote, ano, semana_ano,
       data_recepcao, idade_data_final, aves_inicia,
       qtde_mort_sem_07, qtde_desc_sem_07,
       qtde_mort_sem_14, qtde_desc_sem_14,
       qtde_mort_sem_21, qtde_desc_sem_21,
       qtde_mort_sem_28, qtde_desc_sem_28,
       qtde_mort_sem_35, qtde_desc_sem_35,
       ps_pinto, ps_abate_historico, vezes_maior_historico,
       periodo_fim, carregado_em
FROM zootecnico.vw_historico_lotes_criacao_portal
WHERE nome_granja ILIKE 'ADEMIR%'
  AND BTRIM(semana_ano::text)='42'
  AND BTRIM(ano::text)='2026'
ORDER BY galp, periodo_fim DESC NULLS LAST, id DESC;

SELECT MAX(carregado_em) AS maior_carga_na_view
FROM zootecnico.vw_historico_lotes_criacao_portal;
```

Conferir também a recepção 14/10/2026 e os mesmos números de lote. Se a API
agrupar semana/ano pela recepção em vez das colunas `semana_ano/ano`, o Anderson
deve demonstrar essa regra na query ativa e comparar o MESMO recorte.
Não assumir que o `atualizado_em` global da API é a data dessas duas linhas.

Referência conhecida, se a origem ainda contém os mesmos valores:
616B: 197+191 sobre 36.000 = 1,08%; 616A: 149+294 sobre 35.000 = 1,27%;
produtor: 831 sobre 71.000 = 1,17%; peso do pintinho anteriormente 41,902 g.
Não substituir valores no banco para forçar esses resultados.

## 6. c) Teste da mesma chamada HTTP

Primeiro, no Network, copiar Request URL completa, parâmetros e horário da
requisição REAL. Sem filtros além do ano, a chamada do código é:

```text
GET https://api-bi-granja.controladoriagb05.workers.dev/api/bi/historico-abertos/resumo?ano=2026
```

Para recorte equivalente aos filtros de produtor e galpões da tela, a URL é:

```text
https://api-bi-granja.controladoriagb05.workers.dev/api/bi/historico-abertos/resumo?ano=2026&produtor=ADEMIR%20MELO%20LOPES&galpao=616A&galpao=616B
```

Não acrescentar `semana`, `etapa` ou `mes_carga`: o Histórico não os envia.
Use a primeira URL se a captura da tela estava sem filtro de produtor/galpão.
Token somente na máquina local; não colar credenciais no diagnóstico.

PowerShell, para o usuário executar (não foi executado nesta investigação):

```powershell
$urlBi = Read-Host 'Cole a Request URL exata do Network'
$tokenBi = Read-Host 'Cole localmente o Bearer da sessao (sem a palavra Bearer)'
$httpBi = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $urlBi -Headers @{
    Authorization = "Bearer $tokenBi"
    'Cache-Control' = 'no-cache'
    Pragma = 'no-cache'
}
Remove-Variable tokenBi
$httpBi.Headers | Format-List
$jsonBi = $httpBi.Content | ConvertFrom-Json
$semanaBi = $jsonBi.hierarchy | Where-Object {
    $_.campo -eq 'semana' -and [string]$_.valor -eq '42'
}
$ademirBi = $semanaBi.children | Where-Object {
    $_.campo -eq 'produtor' -and $_.valor -eq 'ADEMIR MELO LOPES'
}
[pscustomobject]@{
    rules_version = $jsonBi.rules_version
    fontes = $jsonBi.fontes
    arquivo = $jsonBi.arquivo
    atualizado_em = $jsonBi.atualizado_em
    atualizacao_dados = $jsonBi.atualizacao_dados
    filtros = $jsonBi.filtros
    ademir = $ademirBi
} | ConvertTo-Json -Depth 20
```

Registrar `Date`, `Age`, `CF-Cache-Status`, `Cache-Control`, `ETag` se existirem.
`no-cache` é pedido de revalidação; não prova ausência de cache do Worker.
Campo ausente, campo null e número zero devem ser distinguidos no JSON.

## 7. d) Checagens no PC do Anderson

Comandos apenas de inspeção, para o operador executar. Não reiniciar, recriar
container, executar robôs, alterar banco ou ligar logs com credenciais.

```powershell
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
$containerBi = Read-Host 'Nome real do container da API'
docker inspect --format '{{.Created}}' $containerBi
docker inspect --format '{{.State.StartedAt}}' $containerBi
docker inspect --format '{{.RestartCount}}' $containerBi
docker inspect --format '{{.Image}}' $containerBi
docker inspect --format '{{.Config.WorkingDir}}' $containerBi
docker inspect --format '{{json .Mounts}}' $containerBi
docker port $containerBi
```

`Created` identifica criação/recriação; `StartedAt` é o início atual. Esses
campos não fornecem um histórico completo de reinícios. `RestartCount` não
substitui a análise de logs/eventos. Datas do Docker costumam ter offset UTC.
Se houver mais de uma instância, inspecionar todas as que atendem essa rota.

Descobrir em Mounts a pasta REAL do host. Se o código está embutido na imagem,
arquivos do host não comprovam o código ativo: confirmar os arquivos dentro
do container com leitura (`docker exec ... pwd/find/cat`), sem iniciar a API.

```powershell
$pastaApiBi = Read-Host 'Pasta real do codigo ativo, confirmada no Docker'
$arquivosApiBi = Get-ChildItem -LiteralPath $pastaApiBi -Recurse -File |
    Where-Object { $_.Name -in @(
        'registry.py','servico_zootecnico.py','router.py','analytics.py','freshness.py'
    ) }
$arquivosApiBi | Select-Object FullName,Length,LastWriteTime,LastWriteTimeUtc
$arquivosApiBi | Get-FileHash -Algorithm SHA256
$arquivosApiBi | Select-String -Pattern (
    'historico-abertos|vw_historico_lotes_criacao|def weekly|def stats|' +
    'query_payload|fetch_rows|carregado_em|atualizado_em|age_window|dedup'
) -Context 3,6
```

Solicitar os trechos ATIVOS que demonstram: registro de `historico-abertos`,
schema/tabela, aliases SQL -> JSON, query de seleção, deduplicação/ordem dos
snapshots, filtros de ano/semana/idade e regra de mortalidade/pesos/data.
`LastWriteTime` isolado não prova que houve rollback nem que o container leu
esse arquivo. Não inferir a query instalada a partir de uma cópia local.

Para observar a consulta realmente chegando ao PostgreSQL, abrir o Network
e disparar o resumo enquanto outra sessão do Adminer executa este SELECT:

```sql
SELECT pid, datname, application_name, client_addr, query_start, query
FROM pg_stat_activity
WHERE datname=current_database()
  AND pid<>pg_backend_pid()
  AND state='active'
  AND query ILIKE '%historico%'
ORDER BY query_start DESC;
```

Consultas curtas podem não ser capturadas; permissões podem ocultar consultas
de outros usuários. Resultado vazio não prova que a API deixou de consultar.
Confirmar banco/schema/servidor do processo ativo sem divulgar senhas.
Se o Worker continuar suspeito, comparar a mesma rota diretamente na FastAPI,
usando endereço/porta e autenticação verificados no ambiente (não presumidos),
e enviar o código/configuração do Worker realmente publicado.

## 8. e) Decisão

| Resultado | Direção da investigação |
|---|---|
| View (b) correta e HTTP (c) zerado | Camada API/Worker/conexão; teste direto na FastAPI separa Worker de API. Não basta para culpar o Python. |
| View (b) zerada/sem peso | View/banco/seleção de snapshot; comparar origem física, definição e mesmo lote/data. |
| HTTP (c) correto e a tela zerada | Front publicado/estado/filtros/versão dos assets; comparar a resposta REAL do Network, não só a chamada isolada. |
| HTTP via Worker errado, FastAPI direta correta | Worker/roteamento/cache/instância de destino. |
| Resultados variam entre chamadas idênticas | Verificar múltiplas instâncias/conexões e caches; não assumir a causa sem evidência. |

## Conclusão provisória / o que falta

Confiança alta de que a captura anterior já recebeu zeros e campos ausentes
da API. Hipótese principal: fonte/snapshot antigo ou seleção/versão divergente
na cadeia API -> banco. Não comprovado: rollback, responsável, container ou
query atual. O frontend atual não explica sozinho a perda de valores válidos.

Para fechar: resultados a/b, URL+JSON+headers atuais de c, Created/StartedAt/
image/mapeamentos e trechos da query/configuração efetivamente ativos em d.
Nenhuma correção proposta ou aplicada nesta investigação.

## 9. Complemento: ANDERSON.txt e diferença entre os pacotes de 20/10

Leitura adicional solicitada pelo usuário:

- `outputs/mortalidade-20261020/ANDERSON.txt:35–40` mantém a fonte
  `vw_historico_lotes_criacao_portal` e acrescenta `weekly_partial_values=True`.
  O item 4 ainda depende de refresh da materializada. Portanto esse primeiro
  pacote corrigia o tratamento dos valores, mas não eliminava o snapshot.
- O próprio TXT distingue instruções de instalação de validação real: linha 1
  informa que backend/banco não foram executados pelo Codex; linha 146 informa
  que os testes daquela entrega eram de frontend com respostas simuladas.
- Já `outputs/mortalidade-atualizacao-20261020-v2/INSTALAR.txt:13–23` documenta
  a troca para a view normal `vw_historico_lotes_criacao` e o retorno dos campos
  de peso no resumo, dispensando refresh para o Histórico.
- Essa diferença também está no código das cópias: o `registry.py:105` do
  primeiro pacote aponta para `_portal`; o da V2 aponta para a view sem `_portal`.
  O `analytics.py:250–252` da V2 preenche os `mean_fields` nos cards.

A imagem do usuário com 1,17%, 1,08%, 1,27% e pintinho 41,902 g comprova que
a tela exibiu esses valores em algum momento. O TXT ajuda a identificar as
versões preparadas, mas não documenta qual pacote está ativo no container nem
se houve uma nova implantação. A resposta atual com `_portal` e sem os campos
de peso é incompatível com o contrato esperado dessa cópia V2, salvo alguma
transformação/intermediação ainda não demonstrada.

Próxima evidência específica: bloco `BI_REGISTRY["historico-abertos"]` e
funções `weekly()`/`stats()` dos arquivos REALMENTE usados pelo container,
junto com identidade da instância e os resultados SQL/HTTP do kit. Não é
necessário reinstalar ou modificar nada para obter essas evidências.
