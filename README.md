# BI Zootécnico

Frontend integrado à API. Em 02/10/2026, a migração para Acerto foi implementada neste projeto e na cópia autorizada `_backend-zootecnico-referencia/bi_generic/`, usando a versão do backend fornecida pelo Anderson. Consulte [MIGRACAO_ACERTO.md](MIGRACAO_ACERTO.md) para o mapeamento, arquivos, SQL e publicação.

## Situação da entrega

- Seis páginas, sidebar, temas, CSS, imagens, ECharts 5.6.0 e Geist Variable 5.3.0 locais.
- Desempenho e Detalhamento: `/api/bi/zootecnico`, configurado para `zootecnico.vw_desempenho_acerto`. Acerto é a fonte principal; galpões e campos ausentes da base dinâmica são complementos por vínculo único. Modelo e Tipo priorizam galpões, com alternativa na base quando faltar valor.
- Valores vêm da API; não existem snapshots, Parquets, mocks ou SQL no fluxo publicado.
- Fórmulas individuais conforme a planilha, consolidadas por média simples. Nenhuma média ponderada nas telas migradas. Vazio troca somente valores maiores que 14 por 14.
- Lotes, Histórico e RxP ligados à API, preservando respectivamente abertos, fechados e as duas fontes oficiais de RxP. Filtros, resumo e detalhes usam os contratos do backend.
- Avisos estáticos retirados conforme solicitado; erro Agrosys e falhas da API/sessão permanecem.
- ECharts de Lotes e destaques de RxP restaurados no tema da referência `novos`; aviso “Aplicando filtros…” no canto inferior direito durante consultas, inclusive cancelamento e erro.
- Histórico usa ano da **data de abate**, desde 2023, em filtros e agregados. Valores corrompidos da coluna `ano` deixam de alimentar o calendário.
- Cabeçalhos de tabelas permitem ordenação por clique, preservando totais e hierarquia do Histórico. Nos detalhes paginados do RxP, a ordenação aplica-se à página carregada.
- [Robô incremental de Acerto](outputs/robo-acerto/COMO_USAR.md) preparado para toda a faixa desde 01/01/2023, com checkpoint, retries, exportações curtas e conferência Excel → PostgreSQL antes do COMMIT.

A implementação local foi testada, e a view já foi aplicada e conferida no PostgreSQL pelo usuário. Foi autorizada a exclusão de acertos sem Tipo de Granja (atualmente 24516/522); falta reaplicar o SQL atualizado, publicar o pacote de backend/frontend e conferir fórmulas/API reais. Os documentos de 01/10 registram etapas anteriores; as instruções atuais estão em [MIGRACAO_ACERTO.md](MIGRACAO_ACERTO.md).

## Autenticação e dados

CENTRAL → HTML → Bearer → Worker → FastAPI → PostgreSQL → JSON.

assets/js/api.js reutiliza o cliente validado, lê sessionStorage.granjabi_auth_token e centraliza fetch, URL, parâmetros repetidos, cancelamento e erros seguros. Não cria login. Não grava token nem encaminha credenciais internas.

O Worker atual permite navegador somente em https://controladoriagranja.github.io. Localhost pode servir a interface, mas chamadas reais serão bloqueadas por CORS. Não modificar Worker/CENTRAL para testes locais. Validar a integração autenticada na origem existente.

## Publicação

Siga [IMPLEMENTAR_PASSO_A_PASSO.md](IMPLEMENTAR_PASSO_A_PASSO.md) para instalar PostgreSQL/backend/robô e publicar no GitHub. Os quatro pacotes conferidos estão em [outputs/entrega-final/LEIA-ME.md](outputs/entrega-final/LEIA-ME.md). O workflow de Pages prepara somente o frontend permitido; configure a fonte como GitHub Actions.

O artefato estático deve conter somente index.html, detalhes.html, lotes.html, historico.html, diferenca-aves-abatidas.html, formulas.html e assets/.

backend/, tests/, documentação e instruções antigas não fazem parte desse artefato. O backend DuckDB existente nesta pasta foi mantido intocado como histórico e não é o backend de produção. Não executar seus comandos antigos para esta integração.

Nenhum deploy, commit, push ou alteração de Git foi realizado.

## Verificação

Com Node já instalado, execute: node tests/integration-checks.cjs

Node é usado apenas nos testes; não há build ou dependência Node no frontend. O teste não consulta produção, não precisa de token real e não grava nas referências.

Resultado atual: 23 verificações de frontend e 45 testes Python (23 de backend, 6 de fórmulas e 16 de robô) passaram. Cinco telas abriram em Chrome isolado com respostas sintéticas; foram conferidos interação, troca rápida de filtros, aviso de atividade, falha da API e retorno vazio; gráficos de Lotes também foram conferidos em tema escuro e celular. A leitura real da planilha fornecida foi validada: 133 lotes. Sessão CENTRAL, extração Agrosys e comparação PostgreSQL → API → interface continuam pendentes. Screenshots e testes não fazem parte do frontend publicado.
