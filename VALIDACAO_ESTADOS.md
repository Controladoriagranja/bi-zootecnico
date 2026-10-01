# Validação das causas dos avisos

Nenhum aviso deve ser removido por CSS, edição do HTML ou chave manual de habilitação. Sua resolução depende de regras implementadas, contratos válidos e comparação dos valores contra PostgreSQL.

## Desempenho — amarelo

- Ponderação somente base_dinamica: pares valor/peso válidos; aves abatidas como soma. Nulos e denominador zero explicitamente testados.
- Vazio <7 ou >18 vira14, mantendo7/18 e ausência como null.
- Intervalo deve filtrar data_de_abate de negócio após confirmar formatos reais; rejeitar datas inválidas/invertidas com422.
- Ano/mês e galpão devem corresponder ao contexto local aprovado.
- Comparar /api/bi/zootecnico/resumo com consulta PostgreSQL para cada indicador, meses e totais; usar o mesmo recorte e a mesma fotografia dos dados. Nenhum arredondamento antes da comparação.
- Validar mínimo de: contexto completo, ano/mês múltiplos, produtor/técnico, galpão, intervalo, vazio, pesos zero/nulos e limites de Vazio.
- Endpoint deve informar versão das regras e permitir verificar que a nova regra está ativa. Atualmente a resposta não demonstra isso e os valores foram apenas testados sinteticamente.

## Lotes — vermelho

- Fonte: mortalidade_peso_abertos.
- Filtros cruzados com OR/AND, deduplicação e idade 0..45 definidos no backend.
- KPIs, séries semanais, médias simples/em duas etapas e detalhes por produtor/galpão calculados no contexto completo, nunca só na página recebida.
- Paginação/ordenação no backend; totais independentes da página.

## Histórico — vermelho

- Fonte atualizada pelo usuário: mortalidade_peso_fechados.
- Preservar filtros e hierarquia existentes com respostas agregadas; usar ps_abate quando válido e fallback semanal conforme a regra original.
- Mortalidade 07/14/21/28/35, porcentagens e médias simples por grupo e total, sem dupla contagem.
- Calendário do ano/semana a confirmar nos dados. Não inferir ano de carga.

## RxP — vermelho

- AVE NOVA e REAL ALIMENTOS com fonte identificada em todos os níveis.
- qtde_programada, qtde_real e dif_qtde_rxp oficiais. Não reconstruir diferença.
- Dif % é razão dos totais; não média dos percentuais.
- Não executar JOIN/UNION até confirmar se os conjuntos representam operações independentes e podem ser consolidados, inclusive regras de duplicidade entre arquivos.
- Vinculação de técnico é pendente de confirmação. O schema normalizado não possui todos os campos de desempate da implementação local.
- Filtros, resumo e detalhes válidos; produtores por unidade e Total; detalhes paginados com totais do contexto completo.

## Evidências necessárias antes de concluir

Registrar contexto de filtros, data de referência, atualização da fonte, resultado PostgreSQL, resposta JSON e valor exibido. Conferir endpoint do Worker com sessão CENTRAL e origem autorizada; não copiar tokens para relatórios.

Registrar também 401/403/422/500, loading/empty, multisseleção, cancelamento/respostas fora de ordem, mobile, modais e console/network. Os23 testes existentes verificam o frontend/HTTP, mas não comprovam regras do banco nem rotas analíticas ausentes.

Consulta inicial de diagnóstico: tests/postgresql-diagnostics.sql. Contém somente SELECTs, não integra dados ao frontend, não implementa JOIN/UNION e não foi executada nesta sessão. Sua saída identifica formatos e nulidades; não é validação final de /resumo.
