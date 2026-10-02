# BI Zootécnico

Frontend integrado à API. Em 02/10/2026, a migração para Acerto foi implementada neste projeto e na cópia autorizada `_backend-zootecnico-referencia/bi_generic/`, usando a versão do backend fornecida pelo Anderson. Consulte [MIGRACAO_ACERTO.md](MIGRACAO_ACERTO.md) para o mapeamento, arquivos, SQL e publicação.

## Situação da entrega

- Seis páginas, sidebar, temas, CSS, imagens, ECharts 5.6.0 e Geist Variable 5.3.0 locais.
- Desempenho e Detalhamento: `/api/bi/zootecnico`, configurado para `zootecnico.vw_desempenho_acerto`. Acerto é a fonte principal; galpões e campos ausentes da base dinâmica são complementos por vínculo único. Modelo e Tipo priorizam galpões, com alternativa na base quando faltar valor.
- Valores vêm da API; não existem snapshots, Parquets, mocks ou SQL no fluxo publicado.
- Fórmulas individuais conforme a planilha, consolidadas por média simples. Nenhuma média ponderada nas telas migradas. Vazio troca somente valores maiores que 14 por 14.
- Lotes, Histórico e RxP ligados à API, preservando respectivamente abertos, fechados e as duas fontes oficiais de RxP. Filtros, resumo e detalhes usam os contratos do backend.
- Avisos estáticos retirados conforme solicitado; erro Agrosys e falhas da API/sessão permanecem.

A implementação local foi testada, e a view já foi aplicada e conferida no PostgreSQL pelo usuário. Foi autorizada a exclusão de acertos sem Tipo de Granja (atualmente 24516/522); falta reaplicar o SQL atualizado, publicar o pacote de backend/frontend e conferir fórmulas/API reais. Os documentos de 01/10 registram etapas anteriores; as instruções atuais estão em [MIGRACAO_ACERTO.md](MIGRACAO_ACERTO.md).

## Autenticação e dados

CENTRAL → HTML → Bearer → Worker → FastAPI → PostgreSQL → JSON.

assets/js/api.js reutiliza o cliente validado, lê sessionStorage.granjabi_auth_token e centraliza fetch, URL, parâmetros repetidos, cancelamento e erros seguros. Não cria login. Não grava token nem encaminha credenciais internas.

O Worker atual permite navegador somente em https://controladoriagranja.github.io. Localhost pode servir a interface, mas chamadas reais serão bloqueadas por CORS. Não modificar Worker/CENTRAL para testes locais. Validar a integração autenticada na origem existente.

## Publicação

O artefato estático deve conter somente index.html, detalhes.html, lotes.html, historico.html, diferenca-aves-abatidas.html, formulas.html e assets/.

backend/, tests/, documentação e instruções antigas não fazem parte desse artefato. O backend DuckDB existente nesta pasta foi mantido intocado como histórico e não é o backend de produção. Não executar seus comandos antigos para esta integração.

Nenhum deploy, commit, push ou alteração de Git foi realizado.

## Verificação

Com Node já instalado, execute: node tests/integration-checks.cjs

Node é usado apenas nos testes; não há build ou dependência Node no frontend. O teste não consulta produção, não precisa de token real e não grava nas referências.

Resultado atual: 23 verificações de frontend, 21 testes de backend e 6 testes de fórmulas passaram. Cinco telas abriram em Chrome isolado com respostas sintéticas; foram conferidos interação, falha da API e retorno vazio. Sessão CENTRAL e comparação PostgreSQL → API → interface continuam pendentes. Screenshots e testes não fazem parte do frontend publicado.
