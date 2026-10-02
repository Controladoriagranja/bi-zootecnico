# Importar o relatório pelo Adminer

Arquivo gerado de `relatorio (1).xlsx`: 8.119 lotes, 52 colunas, abates de 02/01/2023 a 29/09/2026. Dados brutos, sem fórmulas Excel. Unidade usada: **52**, conforme o robô atual; confirme que a exportação corresponde a essa unidade antes de executar.

1. Faça backup da tabela `zootecnico.acerto_lote_resultado_geral` usando Exportar no Adminer.
2. Selecione o banco `bi_granja` e clique em **Importar**.
3. Escolha [importar_relatorio.sql](importar_relatorio.sql), formato SQL, e execute. O XLSX não é importado diretamente.
4. Aguarde o término. O resultado deve apresentar `registros_conferidos = 8119` e concluir o COMMIT sem erro.
5. Confira o portal pelo mesmo período/filtros. A view e as fórmulas existentes não são alteradas por este arquivo.

O SQL atualiza os registros encontrados por unidade + código + galpão + lote + dia de alojamento + dia de abate, mantendo a chave existente. Insere os novos com a identidade usada pelo robô. Se encontrar vínculos duplicados, interrompe a transação. Outros lotes permanecem na tabela. Valores em branco do relatório substituem os respectivos valores antigos por NULL.

O mapeamento completo está em [conferencia.json](conferencia.json). `%Mort.` corresponde a `mort_2`; `Mort.` corresponde a `mort`. A mortalidade do portal continua calculada por `(mort / aloj) × 100`, sem usar o percentual bruto para substituir a fórmula. Peso, Idade, GPD, CA e médias simples também permanecem definidos no backend.

Se o Adminer rejeitar o arquivo pelo limite de upload, use no computador com `psql` instalado e acesso ao banco:

```powershell
psql -h 192.168.1.193 -U granjabiadmin -d bi_granja -W -v ON_ERROR_STOP=1 -f .\importar_relatorio.sql
```

A senha é solicitada no terminal. Não copie o SQL inteiro para o console do navegador ou para os HTMLs do dashboard. Se houver erro SQL, envie a mensagem antes de repetir a carga.
