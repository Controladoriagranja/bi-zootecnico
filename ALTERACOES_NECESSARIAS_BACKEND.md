> Atualização: o usuário autorizou editar a cópia _backend-zootecnico-referencia. As capacidades abaixo foram implementadas nessa cópia; implantação, consultas PostgreSQL reais e ligação das novas telas permanecem pendentes. Consulte ../_backend-zootecnico-referencia/LEIA-ME-INTEGRACAO.md.

# ALTERAÇÃO NECESSÁRIA NO BACKEND

Relatório de 01/10/2026. Somente documentação: nenhum Python, serviço, Worker, CENTRAL, credencial ou infraestrutura foi alterado. Primeiro usar registry.py; evoluir helpers/router apenas quando a capacidade declarativa não existir.

## 1. Desempenho e detalhamento

Arquivo provável: registry.py; sql_utils.py para capacidades numéricas/calendário ausentes.
Tabela: zootecnico.base_dinamica.
Endpoints existentes: /api/bi/zootecnico/filtros, /resumo, /detalhes.
Filtros: ano, mês, status_acerto, tipo_granja, modelo, produtor, galpao, tecnico, tipo_linhagem, linhagem, data_inicio/data_fim. OR dentro de cada dimensão, AND entre dimensões; faceta ignora sua própria seleção.
Métricas: médias ponderadas por aves_abatidas apenas nesta fonte e nestas duas telas; aves_abatidas é soma.

Necessidades:
- Vazio numérico < 7 ou > 18 vira 14, mantendo 7/18; ausentes não viram 14.
- Preservar ponderação local: excluir pares cujo valor ou peso não é numérico. O helper atual soma pesos de linhas com métrica nula.
- Calendário de negócio: data_de_abate é text; periodo_fim é data de exportação e não substitui automaticamente o abate. Validar formatos e fornecer conversão segura antes de configurar o calendário.
- Galpão: confirmar correspondência entre galpao e galpao_2; o frontend local usa Galpão, registry usa galpao_2.
- Totais recalculados nas linhas filtradas, nunca média das médias mensais.

Sugestão genérica: política declarativa de transformação numérica, política de nulos e expressão de data validada. Não criar if bi == zootecnico no router.
Risco: indicadores visualmente corretos com denominadores/calendário diferentes.
Teste: Vazio 6/7/18/19, nulos, inválidos, peso zero, métrica zero; filtros múltiplos, totais anuais, rankings e meses; intervalo por abate versus exportação.
Ativação frontend: retirar a proteção explícita de Vazio em api.js somente após validar a nova regra; atualizar avisos e evidências das demais regras.

## 2. Lotes em Criação

Arquivo provável: registry.py e camada analítica genérica; helpers se necessário.
Tabela: zootecnico.mortalidade_peso_abertos.
Endpoint analítico: ausente; definir e disponibilizar no backend antes de configurar frontend. /api/zootecnico/mortalidade-peso/abertos já fornece registros paginados, mas não as agregações requeridas.
Filtros: semanas 7/14/21/28/35/42; tipo_granja, produtor, modelo, galpao, tecnico e mist_linha.
Chave da última versão: codigo_granja + num_lote + galp + data_recepcao, ordenada por periodo_fim; definir desempate estável. Chave incompleta não pode colapsar registros distintos.
Idade: data_recepcao até data de referência de hoje em America/Sao_Paulo, dias inteiros 0..45 inclusivos. Selecionar uma semana inclui lotes com idade >= semana; usar apenas colunas selecionadas.
Métricas: quantidade de lotes deduplicados, soma aves_inicia, mortes + descartes elegíveis, percentual M+D/aves × 100, média simples por coluna semanal e média simples das médias semanais válidas.
Gráficos: mortalidade semanal (quantidade e percentual), peso por idade, crescimento com Ps Pinto quando todas as semanas estiverem selecionadas; sem extrapolação a 45.
Detalhes: agrupamentos tipo/produtor/linhagem, galpões, ranking de mortalidade e séries por galpão; paginação por grupo quando necessário.
Modelo: modelo_aviario existe na fonte. Verificar preenchimento e equivalência antes de substituir o vínculo antigo por prefixo de produtor.
Capacidade ausente: deduplicação, elegibilidade, médias simples/em duas etapas, agrupamentos e detalhes específicos. Não calcular sobre a página de dados recebida.
Teste: datas, duplicatas, empate, chaves incompletas, semanas atingidas, pesos zero/nulos, média das médias com quantidades diferentes de lotes; totais não duplicados.

## 3. Histórico de Lotes

Arquivo provável: registry.py e camada analítica genérica.
Tabela definida pela instrução mais recente: zootecnico.mortalidade_peso_fechados. Essa orientação substitui a escolha anterior por abertos.
Endpoint analítico: ausente; definir no backend. Reutilizar capacidades de lotes quando equivalentes.
Filtros: ano, tipo_granja, produtor, modelo_aviario, galp, tecnico e linhagem. Confirmar calendário do campo ano, sem substituir por ano de carga.
Deduplicação: mesma identidade composta e última versão.
Métricas: contagem de lotes, aves iniciais, mortalidade acumulada das colunas 07/14/21/28/35 (não 42), média simples do peso atual.
A tabela de fechados contém ps_abate e data_abate. Preservar a regra original do Histórico: usar ps_abate numérico em kg; na ausência, primeiro peso válido de peso_med_35, 28, 21, 14, 07 convertido de g para kg. Não substituir o calendário de negócio por periodo_fim.
Detalhes: hierarquia semana → produtor → galpão; por semana %M, %D e %M+D e médias simples de peso. Rodapés recalculados no contexto, não soma de percentuais.
Risco: misturar períodos/exportações e contagens de níveis de agrupamento.
Teste: total versus hierarquia, 35/42, fallback de peso, unidade g/kg, ano e deduplicação.

## 4. RxP — ambas as fontes

Arquivo provável: registry.py e camada analítica; router/helpers somente para capacidades ausentes.
Tabelas: zootecnico.lotes_planejados_abate_ave_nova e zootecnico.lotes_planejados_abate_real_alimentos.
Endpoint analítico: ausente. O portal genérico pode listar registros paginados; não oferece filtros/agregações RxP.

As duas fontes devem participar do contexto consolidado, mantendo origem identificada. Unidade/destino deve distinguir AVE NOVA e REAL ALIMENTOS conforme o HTML de referência; confirmar se destino físico equivale à unidade ou representa subdestinos. Não sobrepor automaticamente destino pela tabela.
Sem JOIN entre as tabelas. Uma composição vertical só deve ser aplicada após validar granularidade, identidade e ausência de duplicidade entre fontes/arquivos; a inclusão de ambas não autoriza deduplicação arbitrária.
Filtros: data, destino/unidade, integrado (produtor), galpao, tecnico, tipo_granja e modelo_aviario. Aceitar parâmetros repetidos e facetas cruzadas.
Métricas: soma qtde_programada, soma qtde_real, soma dif_qtde_rxp; contagem de diferenças válidas != 0; Dif % = soma diferenças / soma programada × 100. Denominador zero é null. Nenhuma média ponderada de indicadores nesta tela.
Detalhes: resumo por unidade; cards e rodapé do contexto completo; modal Ver produtores por unidade e no Total, com registros paginados, totais independentes da página, ordenação permitida e identificação de fonte.
Diferença já existe: nunca recalcular como real - programada. Campos de peso/AxP/retirada/cargas/equipe existem, mas não incluir indicadores novos sem requisito.
Técnico não existe nas tabelas RxP. Regra confirmada pelo usuário: codigo ↔ base_dinamica.cod_prod, último abate com técnico válido; alternativa por nome exato normalizado somente se unívoco; manter sem vínculo nos totais. Validar desempates: schema atual não contém Data_Analise original; documentar equivalência com metadados disponíveis, sem assumir automaticamente.

Capacidades sugeridas: fonte composta declarativa com proveniência, agrupamentos, contagem condicional, razão de somas, vínculo de dimensão e detalhes paginados. Registry atual exige ano/mês e rankings fixos: só cadastrar tabelas não basta.
Risco: duplicar períodos, contar totalizadores, perder registros sem técnico ou somar dados equivalentes das duas fontes.
Teste: ambas as fontes e cada uma isolada, multisseleção, data text, diferença propositalmente distinta da subtração, zero/null, valores negativos, total completo versus páginas, vínculos seguros e duplicatas entre arquivos.

## 5. Conversões e contratos comuns

numeric_texto atual aceita números simples com ponto ou vírgula decimal. Não suporta 1.234,56 ou 1,234.56, unidades, percentuais textuais ou notação científica. Verificar amostras reais antes de ampliar; formatos ambíguos não devem ser interpretados silenciosamente. Datas de negócio são text: obter formatos reais e validar datas inexistentes.

Requisições inválidas devem retornar 422 com mensagem segura. Agregações vazias: quantidades/contagens conforme regra documentada; médias/razões sem denominador válido null. Nunca entregar resultados de uma página como totais completos.

Contratos novos devem separar resumo, séries, grupos e detalhes paginados. Indicar atualizado_em, data de referência, fonte, filtros efetivos e versão das regras. Apenas depois atualizar config.js e os renderizadores correspondentes, sem fallback local.

## Fora do escopo

Nenhuma mudança em Cloudflare, VPC, Tunnel, portas, Render, Neon, PostgreSQL ou CENTRAL. matrizes_acerto_produtor permanece sem nova tela; mortalidade_peso_fechados passa a ser a fonte do Histórico. O Worker fornecido encaminha /api/* e parâmetros repetidos e guarda Basic Auth internamente. Seu CORS limita a origem existente.

## Condições atuais para execução

Os avisos permanecerão até endpoints válidos e valores verificados. A autorização anterior limita edição a bi-zootecnico e proíbe alterar o backend real ou as referências. É necessário indicar uma cópia editável autorizada do serviço e um ambiente PostgreSQL de validação somente leitura. Não enviar credenciais pelo chat. Não houve confirmação semântica de JOIN/UNION nem da vinculação de técnico RxP.

O registry disponível continua cadastrando apenas base_dinamica. Não existem capacidades declarativas para ajuste de Vazio, política de pares nulos, datas text seguras, deduplicação, médias em duas etapas, agrupamentos arbitrários e paginação analítica. Evoluir apenas essas capacidades ausentes, mantendo as rotas e demais BIs existentes.
