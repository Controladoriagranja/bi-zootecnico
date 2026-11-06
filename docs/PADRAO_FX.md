# Padronização de fx — bi-zootecnico

Referência consultada: BI-PCP, sem qualquer alteração nela. O registro central
`formulas-registry.js` possui 40 indicadores. Um componente `indicator-formulas.js`
cria os botões e a única instância nativa do modal por página. Abertura, foco e
rolagem apontam para o indicador do card; as demais seções continuam disponíveis.
O título permanece Fórmulas do relatório, com descrição padrão, chips, passos e
bloco destacado de regras específicas. Código real do backend é opcional, fechado
por padrão, sem hosts, caminhos internos, conexões ou credenciais.

## Inventário

Ver [tabela por ocorrência](INVENTARIO_FX.md), [inventário anterior](INVENTARIO_FX_ANTES.md)
e `inventario-fx.json`. São 88 ocorrências de interface/catálogo ligadas a 40
entradas. As instâncias repetidas em linhas de dados usam a fórmula da tabela,
sem adicionar um botão por registro. Os mesmos indicadores entre cards/tabelas
compartilham ID. Blocos sem cálculo, como Linhagem, não recebem botão.

## Remoções

- Cinco modais antigos: Desempenho, Lotes, Histórico, RxP e GPD por Fase.
- Link e explicação embutida de Fórmula no Detalhamento.
- Renderizador antigo de disclosures e controladores dos modais duplicados.
- Catálogos divergentes de metrics/lotes/histórico/RxP passam a adaptadores do
  registro único. Seus nomes globais são mantidos para não mudar o contrato de
  apresentação dos scripts existentes; não contêm fórmulas duplicadas.

## Fontes e premissas

- Os cálculos não foram alterados. API, filtros, rankings, séries, escalas,
  seleção, ordenação e números continuam nas rotinas existentes.
- Documentação confrontada com os scripts atuais e o backend local do pacote
  `rxp-versoes-20261106`. Essa cópia é evidência local, não comprovação da versão
  implantada. Nenhuma API autenticada ou carga real foi executada.
- Acerto: os códigos atuais usam divisão de somas/ponderação e IEP sobre
  componentes consolidados; não há base para afirmar média simples geral.
- Vazio: a configuração local mais recente mantém 7–20 e substitui demais valores
  por 14, antes da média por qt_aves; não corresponde a teto de 14. O texto antigo
  do frontend divergente foi identificado e substituído apenas na documentação.
- GPD por Fase: base_dinamica, resultado por lote seguido de média simples.
  A exceção dos 7 dias, pesos válidos, idade e exclusão de ganho negativo no
  Abate ficam destacadas. Diferenças negativas entre pesagens semanais não são
  artificialmente bloqueadas na documentação, pois a função não o faz.
- RxP atual: RxpData.cards/query consolida no frontend os campos oficiais de
  rxp/detalhes. Soma das duas unidades e diferença da origem preservadas. D−1,
  real positivo, cache/conferência e denominador zero são documentados. Não se
  apresenta código do frontend como se fosse regra da API.
- Histórico atual: valores parciais informados, zeros válidos e ausências
  preservadas. O catálogo antigo descrevia ausência como zero em alguns locais;
  o texto foi alinhado à função backend atual, sem alterar essa função.
- Calendários e fontes de cada tela continuam intactos. Nenhum limite ou meta
  novo foi criado. Meta de mortalidade de Lotes vem da resposta/cadastro existente.
- Nenhum indicador ficou A DEFINIR no conjunto local examinado. Divergências
  entre descrição antiga e backend local estão explícitas acima e no modal.

## Validação

- 24 verificações de integração/sintaxe/assets; testes do registro e sanitização.
- Navegador Chrome headless com API/dados sintéticos nas sete páginas: todos os
  botões visíveis, uma instância, IDs válidos, foco/rolagem/destaque, conteúdo de
  outras fórmulas, Enter/Espaço/ESC/×/fora, regras destacadas, claro/escuro e
  larguras 1440 e 390. Conferidos também galpão e modal de produtores/RxP e
  diálogo nativo de lotes sem fechar o detalhe ao pressionar ESC.
- Séries antes/depois da abertura iguais e nenhuma consulta causada por fx.
- Smoke de Desempenho, Detalhamento, Lotes e Histórico; catálogo de atualização;
  testes RxP D−1 e ranking/semanas (1205 registros, 385 galpões, cinco larguras).
- O smoke legado completo de RxP ainda espera o fluxo antigo resumo/principal/
  grupos, anterior ao RxpData atual. A regressão correspondente foi validada
  pela suíte atual rxp-ranking-week-browser e pelo teste novo das fórmulas.
- Dois ajustes necessários nos testes antigos: timers no sandbox da API que
  hoje faz retries, e ausência dos quatro KPIs já removidos do Histórico.
- Capturas inspecionadas em desktop/celular, temas claro e escuro. Sem teste em
  telefone físico. Não há lint configurado separado; scripts são compilados pelo
  verificador de integração. Backend não foi modificado, nem requer migração.

## Arquivos alterados

- `assets/js/dashboard.js`
- `assets/js/detalhes.js`
- `assets/js/formula-ui.js`
- `assets/js/formulas-registry.js`
- `assets/js/formulas.js`
- `assets/js/gpd-fases.js`
- `assets/js/historico-formulas.js`
- `assets/js/historico.js`
- `assets/js/indicator-formulas.js`
- `assets/js/lotes-formulas.js`
- `assets/js/lotes.js`
- `assets/js/metrics.js`
- `assets/js/rxp-formulas.js`
- `assets/js/rxp.js`
- `assets/js/unavailable.js`
- `assets/css/indicator-formulas.css`
- `index.html`
- `detalhes.html`
- `lotes.html`
- `historico.html`
- `diferenca-aves-abatidas.html`
- `gpd-por-fase.html`
- `formulas.html`
- `tests/integration-checks.cjs`
- `tests/frontend-smoke.cjs`
- `tests/indicator-formulas.browser.cjs`
- `tests/indicator-formulas.test.cjs`
- `docs/INVENTARIO_FX.md`
- `docs/INVENTARIO_FX_ANTES.md`
- `docs/inventario-fx.json`
- `docs/PADRAO_FX.md`

Sem commit, push, deploy, carga real ou pasta de backup.
