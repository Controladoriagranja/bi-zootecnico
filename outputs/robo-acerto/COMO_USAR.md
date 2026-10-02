# Robô de Acerto desde 2023

Arquivo: [acerto_lote_resultado_geral_incremental.py](acerto_lote_resultado_geral_incremental.py).

O robô fornecido consultava somente o mês anterior e o atual. Esta versão cobre todas as datas de abate desde **01/01/2023 até hoje**, preservando o extrator oficial, as colunas originais, a unidade **52** e o UPSERT em `zootecnico.acerto_lote_resultado_geral`. Não calcula indicadores nem exclui lotes da origem.

## Instalar no computador do robô

1. Guarde uma cópia do robô de carga atual.
2. Copie o novo Python para a **mesma pasta que contém `banco_zootecnico.py`**, dentro da árvore existente do Agrosys_Extractor. Ele usa as configurações já instaladas em `Core/agrosys_runtime.py` e a conexão de `banco_zootecnico.py`.
3. Preserve o extrator original `Indice Zootecnico/acerto_lote_resultado_geral.py`: o novo robô chama suas funções de relatório, cookies e download oficial. Esse extrator é diferente do robô que grava no banco.
4. Use o mesmo ambiente Python do robô atual. Pandas, openpyxl, psycopg2, Selenium e Core já eram dependências do código fornecido; nenhuma configuração de senha precisa ser copiada para este projeto.

Se preferir manter o nome do robô de carga já chamado pelo atualizador, substitua seu conteúdo pelo novo código e mantenha a localização. Ajuste o nome nos comandos abaixo.

## Conferir e executar

Abra o PowerShell na pasta onde colocou o Python. Primeiro confira o plano, sem conectar ao Agrosys/banco:

```powershell
py -B .\acerto_lote_resultado_geral_incremental.py --planejar
```

Sem checkpoint anterior, aparecem todos os meses de janeiro de 2023 até o mês atual. Em 02/10/2026 são **46 meses**. Cada mês é dividido em exportações consecutivas de **até sete dias**, incluindo ambos os extremos, sem sobreposição ou dias omitidos.

Para executar a primeira carga e guardar os Excel recebidos:

```powershell
py -B .\acerto_lote_resultado_geral_incremental.py --manter-excel
```

Para as execuções diárias posteriores:

```powershell
py -B .\acerto_lote_resultado_geral_incremental.py
```

O progresso fica em `acerto_lote_checkpoint_unidade_52.json`, ao lado do Python. **Mantenha esse arquivo** nas execuções seguintes. Os meses ausentes ou com erro são reconsultados; os dois meses recentes são atualizados sempre. Meses antigos confirmados são reconsultados a cada sete dias para incorporar alterações históricas. O primeiro preenchimento exige mais tempo porque consulta todo o histórico.

Para forçar nova conferência de todo o histórico:

```powershell
py -B .\acerto_lote_resultado_geral_incremental.py --reconciliar-historico
```

Um intervalo manual continua disponível e também é dividido em partes de até sete dias:

```powershell
py -B .\acerto_lote_resultado_geral_incremental.py --inicio 01/01/2023 --fim 31/01/2023 --manter-excel
```

`--data-inicial`/`--data-final` são equivalentes a `--inicio`/`--fim`. **Datas manuais limitam a execução ao intervalo informado**. Para a cobertura automática desde 2023, o agendamento/atualizador deve chamar o robô **sem esses argumentos de data**. Se o atualizador os fornece sempre, altere somente a chamada deste relatório para omiti-los.

Não execute duas cargas usando checkpoints diferentes para a mesma unidade/tabela. Com o mesmo checkpoint, o lock do sistema operacional impede duas execuções simultâneas.

## O que é conferido

- Cabeçalho real do relatório, tipos, identificação completa e ausência de chaves repetidas.
- Data de **abate**, confirmada como calendário do filtro Agrosys, dentro de cada intervalo solicitado.
- Detalhes posteriores a um total provocam erro: o robô não corta esses lotes silenciosamente.
- Todas as chaves e hashes do Excel precisam existir no PostgreSQL antes do COMMIT. Divergência reverte a carga.
- O mês só fica confirmado depois que todas as exportações e cargas desse mês terminarem. Um mês parcialmente gravado fica pendente e a reexecução usa UPSERT.
- Arquivo sem o cabeçalho esperado, download inválido, dados incompletos e falha de banco nunca confirmam progresso.
- Um Excel com cabeçalho válido e sem linhas analíticas registra uma carga de zero linhas. Isso representa o retorno vazio desse intervalo, e fica identificado no checkpoint.

São feitas até três tentativas por exportação/carga. Os meses seguintes continuam caso um mês falhe. O processo retorna **0** quando os períodos planejados terminam e **1** se houver falha. Excel de falhas ficam em `acerto_lote_falhas/`, ao lado do robô; Excel mantidos por `--manter-excel` ficam no caminho informado no log, sob a pasta temporária `BI_Granja/Zootecnico/Acerto_Lote_Resultado_Geral`.

O Agrosys **não informa o total de lotes nem o limite da exportação**. Portanto a conferência prova cobertura dos intervalos e gravação integral das linhas recebidas; não prova que o Agrosys tenha enviado todas as linhas existentes. Exportações curtas e reconsultas periódicas reduzem esse risco. Uma amostra de Excel/banco real ainda deve ser conferida após a primeira execução.

## Conferir no PostgreSQL

Execute [CONFERIR_CARGA.sql](CONFERIR_CARGA.sql) no Adminer após a execução. A primeira consulta lista quantidades por mês de abate; compare com `registros` de cada mês no checkpoint. A consulta de duplicidades deve retornar vazia. Meses sem linhas só são esperados quando as exportações correspondentes retornaram vazias.

Não use somente `MAX(data_abate)` como controle de preenchimento: uma data recente não comprova que meses antigos foram carregados. O checkpoint controla os meses separadamente.

A exclusão autorizada de lotes sem Tipo de Granja continua sendo regra da view de desempenho. O robô preserva esses registros na tabela de origem. Depois do preenchimento histórico, as contagens 343/342 da amostra anterior naturalmente podem mudar.

## Validação local feita

Testes com dados sintéticos verificaram intervalos contínuos, fevereiro bissexto, retomada de lacunas, reconciliação, mês parcial, falha no meio da carga, retries, checkpoint atômico, lock, identificação, datas, relatórios vazios/malformados, hash e preservação de Excel de falhas. Agrosys e PostgreSQL reais não foram acessados nesta preparação.

A planilha fornecida `acerto lote(Recuperado Automaticamente).xlsx` foi lida com sucesso: **133 lotes**, sem carga no banco. Foi corrigida também a leitura de cabeçalhos com `_x000D_` (quebras de linha do Excel), mantendo os nomes de coluna normalizados. Essa planilha contém colunas de cálculo adicionadas; a extração operacional continua usando o Excel oficial do relatório.
