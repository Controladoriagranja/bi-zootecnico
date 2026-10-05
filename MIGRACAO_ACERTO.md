# Migração para Acerto — situação em 02/10/2026

Implementação local preparada. A view foi criada, reaplicada e conferida pelo usuário no PostgreSQL do servidor. A regra posterior de excluir acertos sem Tipo de Granja já está no SQL local e aguarda reaplicação no servidor. Publicação do backend/frontend e conferência das fórmulas/API real continuam pendentes. Nenhum commit, push ou deploy executado nesta etapa.

`index.html` é a tela Desempenho; `detalhes.html` é o Detalhamento. Ambas passam a consultar `zootecnico.vw_desempenho_acerto`, cuja fonte principal é `zootecnico.acerto_lote_resultado_geral`. A view complementa cadastro de galpões e campos ausentes pela base dinâmica, somente por vínculo único. Não substitui acertos por registros da base dinâmica.

## Mapeamento das consultas

| Tela/consumidor | Endpoint | Antes | Agora |
| --- | --- | --- | --- |
| Index/Desempenho: `dashboard.js` + `filters.js` | `/api/bi/zootecnico/filtros` | `base_dinamica`, via registry/router | `vw_desempenho_acerto`: opções de filtros |
| Index/Desempenho: `dashboard.js` | `/api/bi/zootecnico/resumo` | `base_dinamica`, via registry/router | View: agregações mensais e anuais no SQL |
| Detalhamento: `detalhes.js` + `filters.js` | `/api/bi/zootecnico/filtros` | `base_dinamica` | View: opções de filtros |
| Detalhamento: `detalhes.js` | `/api/bi/zootecnico/resumo` | Catálogo de indicadores da base dinâmica | Catálogo/contrato da nova fonte |
| Detalhamento: `detalhes.js` | `/api/bi/zootecnico/detalhes?indicador=…` | KPI, rankings e evolução da base dinâmica | View: KPI, rankings e evolução no SQL |

As funções de rotas continuam em `bi_generic/router.py`; a configuração fica em `bi_generic/registry.py`, e as expressões em `bi_generic/sql_utils.py`. Os nomes JSON dos indicadores e endpoints foram preservados. `gmd` continua sendo o identificador interno do GPD.

## Campos das duas telas

Todas as fórmulas são calculadas por registro de acerto, no SQL da API. Meses, anos, totais e rankings usam **média simples dos resultados individuais válidos**, nunca média ponderada nem divisão de somas. Aves abatidas é uma quantidade total e continua como soma.

| Campo da tela | Coluna/fórmula individual | Consolidação | Endpoint |
| --- | --- | --- | --- |
| IEP | `acerto.iep` | AVG | resumo; detalhes `indicador=iep` |
| CA | `consumo_racao / pes_total` | AVG | resumo; detalhes `indicador=ca` |
| CAC | `acerto.cac` | AVG | resumo; detalhes `indicador=cac` |
| GPD | `(ps_med / ida) × 1000` | AVG | resumo; detalhes `indicador=gmd` |
| Mortalidade (%) | `(mort / aloj) × 100` | AVG | resumo; detalhes `indicador=mortalidade` |
| Idade Média | `(qt_aves × ida) / qt_aves` | AVG | resumo; detalhes `indicador=idade` |
| Peso Médio | `pes_total / qt_aves` | AVG | resumo; detalhes `indicador=peso_medio` |
| Vazio | `CASE WHEN vazio_sanitario > 14 THEN 14 ELSE vazio_sanitario END` | AVG | resumo; detalhes `indicador=vazio` |
| Morte no Transporte (%) | `base_dinamica.mort_transporte_2`, somente vínculo único | AVG | resumo; detalhes `indicador=morte_transporte` |
| CAC Ref | `base_dinamica.cac_ref`, somente vínculo único | AVG | resumo; detalhes `indicador=cac_ref` |
| Aves Abatidas | `acerto.qt_aves` | SUM | resumo; detalhes `indicador=aves_abatidas` |
| Ano/Mês e intervalo | `acerto.data_abate`, comparando dias | Filtro | filtros; resumo; detalhes |
| Produtor/ranking de produtores | `acerto.integrado` | Filtro/agrupamento | filtros; detalhes |
| Galpão | `acerto.gal` | Filtro | filtros; resumo; detalhes |
| Técnico/ranking de técnicos | `acerto.tecnico`; alternativa única no cadastro válida na data de abate | Filtro/agrupamento | filtros; detalhes |
| Tipo de Linhagem | `acerto.linh`: contém `/` → mista; demais preenchidos → pura | Filtro | filtros; resumo |
| Linhagem | `acerto.linh` | Filtro | filtros; detalhes |
| Tipo de Granja | `galpoes.tipo_granja`; quando ausente, `base_dinamica.tipo_de_granja`, vínculo único | Filtro | filtros; resumo; detalhes |
| Modelo | `galpoes.modelo`; quando ausente, `base_dinamica.modelo`, vínculo único | Filtro | filtros; resumo; detalhes |
| Status Acerto | `base_dinamica.status_acerto`, vínculo único | Filtro | filtros; resumo |
| Última atualização | MAX `acerto.carregado_em` | Metadado | resumo; detalhes |

Componentes nulos, denominador zero ou não finitos produzem null, apresentado como `—`. AVG ignora resultados nulos; não os transforma em zero. O intervalo final inclui todo o dia. Foi mantido o recorte existente a partir de 2023.

Regra de elegibilidade autorizada após a conferência: acertos cujo Tipo de Granja continue em branco após o complemento não entram na view final nem nos filtros, médias, somas ou rankings de Index/Desempenho e Detalhamento. Com a carga conferida, isso exclui apenas 24516/522/lote 52. A tabela original permanece com 343 registros; a view deve ter 342.

O Peso Médio recalculado **não** alimenta GPD: GPD usa `ps_med` original, conforme a planilha. Vazio igual ou inferior a 14, incluindo zero, permanece inalterado. Exemplo de consolidação aprovado: mortalidades individuais 10% e 5% → 7,50%.

## Relações e dados ainda sem correspondência

Chaves avaliadas nos arquivos enviados:

- Acerto ↔ cadastro: código extraído do início de `galpoes.granja` (formato `código - nome`) + `galpoes.galpao = acerto.gal` + `unidade_codigo = unidade_extracao`. O cadastro enviado identifica empresa `1`; a view usa essa empresa explicitamente. Se houver outra empresa na alimentação, é necessário documentar sua identificação no acerto antes de ampliar a relação.
- Acerto ↔ base dinâmica: `codigo = cod_prod`, `gal = galpao`, `lote = lote` e mesmo dia de `data_abate = data_de_abate`. `galpao_2` não correspondeu à amostra. Identificadores são comparados como texto, sem cortar letras nem unir por nomes truncados.
- Técnico preenchido no acerto prevalece. Quando ausente, o cadastro só complementa com um candidato cuja atividade inclua o dia do abate. Sem candidato ou com ambiguidade: `Sem técnico informado`.
- As datas de atividade não são um histórico de troca de técnico. Se o cadastro tiver apenas o técnico atual, não permite reconstruir sozinho o técnico antigo de um acerto sem técnico; essa limitação precisa ser considerada na conferência dos complementos.
- LEFT JOINs não multiplicam acertos. A view agrega candidatos de cadastro/base antes de unir. Cada fonte só fornece complementos quando seu vínculo é único. Modelo e Tipo priorizam o cadastro; se o valor faltar, usam a base dinâmica com vínculo único. Acertos sem Tipo de Granja após essas alternativas são excluídos da view final conforme a autorização posterior do usuário.

No CSV analisado havia 343 acertos. No cadastro: 337 vínculos únicos e 6 ausentes (código 2963, galpões 290A/B/C). Três vínculos tinham datas de atividade incompatíveis com o abate; isso impede o preenchimento alternativo do técnico. Uma linha não tinha Tipo de Granja preenchido. Contra o Parquet local completo da base dinâmica: 332 vínculos únicos e 11 ausentes, sem multiplicidade. **Esses números são evidência dos arquivos locais; devem ser recalculados no banco atual.**

Conferência PostgreSQL enviada pelo usuário em 02/10/2026: 343 linhas no acerto e 343 na view; nenhuma repetição de `chave_lote`; os 343 acertos têm exatamente um candidato na base dinâmica. No cadastro, 334 têm um candidato de galpão e de técnico válido na data, 3 têm um galpão mas nenhum candidato de técnico válido na data, e 6 não têm galpão correspondente. Os seis são do código 2963, galpões 290A/B/C, lotes 34 (janeiro/2023) e 56 (setembro/2026). Esse resultado substitui a estimativa local de cobertura da base dinâmica. A quantidade de candidatos não comprova que todos os campos complementares estejam preenchidos; fórmulas e API real ainda precisam ser conferidas.

Detalhamento enviado na sequência: os nove acertos com candidato de técnico zero têm técnico preenchido no acerto e preservado em `tecnico_exibicao`. Os três com galpão reconhecido são 278/253B, 40363/691 e 40365/687; Modelo e Tipo de Granja aparecem preenchidos nessas três linhas. A consulta `05_conferir_complemento_base.sql`, executada pelo usuário no PostgreSQL, confirmou `base_dinamica.modelo = Convencional Forrado` e `base_dinamica.tipo_de_granja = Alugada` nos seis acertos do código 2963. O SQL da view foi atualizado para complementar essas ausências pela base dinâmica. É necessário reaplicar `01_criar_view_desempenho_acerto.sql` e executar `06_validar_complemento.sql`; a versão anterior da view no print ainda mostrava esses campos nulos. O cadastro de galpões continua sem vínculo para essas seis linhas, mesmo quando o complemento da base passa a preencher os campos.

Reaplicação confirmada pelo resultado de `06_validar_complemento.sql` enviado pelo usuário: contagens 343/343; os seis acertos do código 2963 estão preenchidos com Convencional Forrado/Alugada e mantêm o técnico do acerto. A consulta final de campos cadastrais ausentes retornou somente código 24516, galpão 522, lote 52, abate 11/09/2026, com Tipo de Granja nulo, apesar de haver vínculo único com cadastro e base. Modelo e técnico estão preenchidos. O usuário autorizou ignorar esse acerto na base final por estar com o Tipo em branco. A nova versão do SQL filtra acertos sem Tipo em vez de inventar sua classificação; após reaplicar, a contagem esperada é 343 na origem, 342 na view e 1 ignorado.

Status Acerto, Morte no Transporte e CAC Ref não têm correspondência confirmada no acerto; receberam o complemento explicitamente autorizado. Não foi inventada coluna no acerto. Não foram criadas PK/FK nem regras para descartar versões de acerto. Duplicidade de `chave_lote` no banco exige decisão antes de afirmar que cada linha representa um lote único.

## Demais telas

Lotes, Histórico e RxP ainda usavam o renderizador de indisponibilidade no frontend. Agora consultam os endpoints já presentes no backend do Anderson, sem mudar suas fontes:

| Tela | Fonte preservada | Consultas usadas |
| --- | --- | --- |
| `lotes.html` | `mortalidade_peso_abertos` | `/api/bi/lotes-abertos/filtros` e `/resumo`: cards, tabela, ranking de galpões, evolução e detalhe do galpão |
| `historico.html` | `mortalidade_peso_fechados` | `/api/bi/historico-fechados/filtros` e `/resumo`: anos, dimensões, cards, hierarquia e colunas semanais |
| `diferenca-aves-abatidas.html` | `lotes_planejados_abate_ave_nova` e `lotes_planejados_abate_real_alimentos` | `/api/bi/rxp/filtros`, `/resumo`, `/detalhes`: unidades, totais e paginação dos produtores |

RxP mantém AVE NOVA/REAL ALIMENTOS e soma os campos oficiais `qtde_programada`, `qtde_real`, `dif_qtde_rxp`. O frontend não recalcula a diferença nem Dif %. As fontes continuam lidas separadamente no backend, conforme relação autorizada. A regra existente de técnico via base dinâmica foi preservada nesse BI. `formulas.html` apresenta explicações, não é uma tela de dados.

Os avisos estáticos de integração/validação foram retirados conforme a última instrução. O aviso Agrosys permanece. Erros de sessão, conexão, banco, contrato e HTTP continuam visíveis. A resposta de zootécnico deve identificar `arquivo=zootecnico.vw_desempenho_acerto` e `rules_version=acerto-2026-10-02`; um backend antigo não é exibido como se já fosse a nova fonte.

## Resumo dos arquivos alterados

Backend a transferir: **`_backend-zootecnico-referencia/bi_generic/`**, pacote usado pelo serviço e pelo Docker do Anderson. Arquivos Python soltos na raiz não são o pacote publicado.

| Arquivo | Mudança |
| --- | --- |
| `bi_generic/registry.py` | Nova fonte zootécnico, filtros por abate, métricas declarativas e médias simples; demais registries preservados |
| `bi_generic/sql_utils.py` | Fórmulas estruturadas, números tipados, cap de Vazio e comparação de datas tipadas; extensão necessária do helper genérico |
| `bi_generic/analytics.py` | Campos aditivos de mortalidade/descarte no Histórico, ano pelo abate desde 2023, idade/linhagens dos galpões e Dif % por registro RxP para evitar cálculo no navegador |
| `outputs/migracao-acerto/01_criar_view_desempenho_acerto.sql` | View, complemento Modelo/Tipo e exclusão autorizada de acertos sem Tipo; SELECT para a conta de leitura |
| `02_validar_vinculos.sql`, `03_conferir_calculos.sql` | Conferência de cardinalidade, vínculos, duplicidade, estrutura e fórmulas no PostgreSQL |
| `04_revisar_cadastro.sql`, `05_conferir_complemento_base.sql`, `06_validar_complemento.sql` | Diagnóstico dos campos ausentes e conferência após complementar Modelo/Tipo pela base |
| `assets/js/api.js` | Validação da nova fonte; Vazio liberado; autenticação/erros/cache preservados |
| `assets/js/metrics.js` | Catálogo das fórmulas atuais e explicações de média simples |
| `assets/js/filters.js` | Observação das opções para atualizar anos do Histórico; cancelamento de consultas substituídas sem erro não tratado |
| `assets/js/api-screen.js` | Renderização compartilhada, filtros, cancelamento, erros, cards e gráficos da API |
| `assets/js/lotes.js`, `historico.js`, `rxp.js` | Renderizadores ligados aos respectivos contratos; filtros, agrupamentos e detalhes |
| `assets/js/historico-formulas.js`, `lotes-formulas.js` | Explicações alinhadas à API e às semanas selecionadas |
| `index.html`, `detalhes.html` | Retirada dos avisos estáticos; atualização da versão dos assets |
| `lotes.html`, `historico.html`, `diferenca-aves-abatidas.html` | Inclusão do cliente/helper da API; versão dos assets; texto do Histórico indica fechados |
| `formulas.html` | Versão dos assets para usar o novo catálogo |
| `tests/test_backend_integration.py`, `test_acerto_formulas.py` | Fonte atual, fórmulas, Vazio, datas, campos ausentes e regressão dos outros BIs |
| `tests/integration-checks.cjs`, `frontend-smoke.cjs` | Cliente, contratos, assets, renderização/interações, falha da API e resposta vazia |
| `README.md`, `MIGRACAO_ACERTO.md` | Estado atual e roteiro de publicação/conferência |
| `.gitignore` | Screenshots locais de testes não entram no artefato publicado |

`bi_generic/router.py`, autenticação, CORS, serviço, Docker e Worker não precisaram de mudança nesta migração. O backend histórico dentro do frontend não é o serviço de produção.

## Publicação e validação final

Passo a passo operacional e pacote dos três arquivos: [ATUALIZAR_BACKEND_ANDERSON.md](ATUALIZAR_BACKEND_ANDERSON.md).

1. No PostgreSQL, com conta autorizada a criar view, execute `01_criar_view_desempenho_acerto.sql`. Ele também concede SELECT na nova view a `granjabiadmin`. Nenhuma linha de tabela é atualizada.
2. Execute `02_validar_vinculos.sql`: na carga conferida, espere 343 em `linhas_acerto`, 342 em `linhas_view` e 1 em `linhas_ignoradas`. A consulta de excluídos deve listar apenas 24516/522/lote 52. Revise as duplicidades e os vínculos ausentes/ambíguos. Execute `03_conferir_calculos.sql` para comparar com a API usando o mesmo contexto; a conferência das fórmulas usa a view final para respeitar a mesma seleção de acertos elegíveis.
3. Transfira os três Python modificados de `bi_generic/` para o pacote correspondente do Anderson, documentado em `C:\BI_Granja\API\api_zootecnico\bi_generic`. Preserve os demais arquivos do servidor e suas configurações.
4. No servidor, em `C:\BI_Granja\Banco\postgresql_granja`, execute:

   ```powershell
   docker compose up -d --build --no-deps zootecnico
   docker compose logs --tail=100 zootecnico
   ```

5. Publique os HTMLs e `assets/` na origem atual e abra pela CENTRAL. O Worker já encaminha `/api/bi/…`; não precisa mudar para adicionar a view. Não envie arquivos de testes, SQL, credenciais ou backend ao artefato estático.
6. Confira HTTP 200 em `zootecnico/filtros`, `zootecnico/resumo?ano=2026&mes=9` e `zootecnico/detalhes?indicador=mortalidade&ano=2026&mes=9` (todos sob `/api/bi/`). Resumo/detalhes devem identificar a view e a versão acima. `/api/zootecnico/health` sozinho não comprova essa migração.
7. Compare cada indicador de resumo/detalhes com `03_conferir_calculos.sql`. Abra `index.html` e `detalhes.html`; teste mês, ano, intervalo de um dia, produtor, galpão, técnico, vazio e retorno sem registros. Totais anuais são AVG dos acertos do ano, não AVG dos meses.
8. Abra Lotes/Histórico/RxP. Teste filtros, ranking/drawer, expansão semana → produtor → galpão, alternância mortalidade/peso e paginação RxP. Confirme fontes e totais preservados. Em RxP, mantenha os exemplos já conferidos no banco: REAL ALIMENTOS/JOSE NILO NAVES/2026-01-02 → 11274, 10356, -918; AVE NOVA/GRANJA BRASILIA AGROINDUSTRIAL/mesma data → 7524, 7524, 0, caso esses dados ainda estejam presentes.

## Exemplo conferido com a planilha

Arquivo `acerto lote(Recuperado Automaticamente).xlsx`, aba Relatório, linha 2: código 770, galpão 238B, lote 50, abate 11/09/2026. Componentes: mort 2462; aloj 18500; qt_aves 16038; ida 41,9; ps_med 2,878; pes_total 46150; consumo_racao 75864.

| Indicador | Resultado sem arredondar | Exibição |
| --- | --- | --- |
| Mortalidade | 13,308108108108108 | 13,31% |
| Peso Médio | 2,8775408405038037 | 2,878 kg/ave |
| Idade Média | 41,9 | 41,9 dias |
| GPD | 68,68735083532219 | 68,69 g/dia |
| CA | 1,6438569880823402 | 1,644 |

A execução local das expressões reproduziu esses valores. O arquivo `exemplo_conferido.json` guarda os componentes/resultados. A planilha tem 133 lotes de setembro, enquanto o CSV tem 137 nesse mês: alinhe o conjunto antes de comparar totais; não inclua linhas Total/Mínimo/Máximo da planilha como lotes.

Validação executada: 23 testes de backend, 6 testes de fórmulas, 16 testes do robô e 23 verificações do frontend passaram; cinco telas verificadas em Chrome isolado com dados sintéticos, incluindo troca rápida, aviso de filtros, falha e resposta vazia. Os gráficos de Lotes foram conferidos também em celular e tema escuro. Os testes SQL de expressão usam DuckDB e não substituem execução PostgreSQL. A criação da view, contagens, vínculos e complemento de Modelo/Tipo foram conferidos pelo usuário no PostgreSQL. Permanecem pendentes reaplicar a exclusão autorizada de acertos sem Tipo, publicação, comparação das fórmulas com a planilha e conferência autenticada da API real.

## Ajustes visuais e robô desta entrega

O helper `assets/js/api-screen.js` havia simplificado as opções do ECharts ao conectar os dados da API. Foram restaurados o tema vinho/dourado, formatação brasileira dos eixos/tooltips, barras de ranking, linhas de peso, redimensionamento e troca de tema. `assets/js/lotes.js` preserva os cards, ranking e detalhes do galpão; `assets/js/rxp.js` recupera os destaques da diferença oficial, sem refazer a diferença no frontend. A estrutura de HTML/CSS continua baseada na referência `novos`.

`assets/js/api.js` e `assets/css/app.css` exibem “Aplicando filtros…” no canto inferior direito enquanto houver consulta pendente. O contador acompanha todas as telas de dados e termina também em cancelamento/falha. `dashboard.js`, `detalhes.js` e `filters.js` tratam consultas substituídas durante troca rápida de filtros.

`registry.py` configura o calendário do Histórico em `data_abate`, desde 2023 até o ano atual, conforme confirmação do usuário. `analytics.py` aplica esse recorte antes das opções e agregações; o frontend abre no ano válido mais recente. A fonte continua sendo `mortalidade_peso_fechados`.

O robô foi preparado separadamente em [outputs/robo-acerto/COMO_USAR.md](outputs/robo-acerto/COMO_USAR.md). Cobre desde janeiro de 2023, com checkpoint por mês, exportações de até sete dias, retries e conferência de chaves/hashes antes do COMMIT. Leu a planilha fornecida com 133 lotes. Não houve extração no Agrosys real nesta preparação.

Para transferir o pacote atualizado, siga [ATUALIZAR_BACKEND_ANDERSON.md](ATUALIZAR_BACKEND_ANDERSON.md).
# Atualização vigente de fórmulas

As regras de consolidação foram alteradas em 05/10/2026. Consulte [ATUALIZACAO_2026_10_05.md](outputs/entrega-final/ATUALIZACAO_2026_10_05.md); a implementação usa `acerto-2026-10-05`. As referências anteriores à média simples geral, GPD com ps_med original e Vazio limitado a 14 neste documento são histórico da migração, não a regra atual.

