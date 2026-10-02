# Atualizar o backend do Anderson

Pacote preparado em 02/10/2026: [backend_anderson.zip](outputs/migracao-acerto/backend_anderson.zip). Contém somente `registry.py`, `sql_utils.py` e `analytics.py`, obtidos da cópia de trabalho `_backend-zootecnico-referencia/bi_generic/`. O serviço importa `bi_generic.router`, e o Dockerfile copia essa pasta para `/app/bi_generic`.

Pacote atualizado nesta entrega: inclui também o **Histórico pelo ano da data de abate, de 2023 até o ano atual**, e os dados de idade/linhagem usados nos detalhes de galpão. A coluna `ano` de fechados não é usada para montar o calendário, pois contém valores inválidos. Lotes e RxP mantêm suas fontes e regras.

## 1. Aplicar a última regra no PostgreSQL

No Adminer, banco `bi_granja`, Comando SQL, execute novamente todo o arquivo [01_criar_view_desempenho_acerto.sql](outputs/migracao-acerto/01_criar_view_desempenho_acerto.sql).

Ele inclui os complementos Modelo/Tipo e a exclusão autorizada de acertos cujo Tipo de Granja continue em branco. Depois execute [06_validar_complemento.sql](outputs/migracao-acerto/06_validar_complemento.sql).

Com a carga conferida, espere:

- Origem: 343; view: 342; ignorados: 1.
- Os seis acertos do código 2963 preenchidos com Convencional Forrado / Alugada.
- A consulta de acertos excluídos lista somente código 24516, galpão 522, lote 52.

## 2. Levar os três arquivos ao servidor

Copie o ZIP para o computador do Anderson e extraia para uma pasta temporária. Os três `.py` devem ficar visíveis na pasta extraída.

No servidor, abra a pasta documentada:

```text
C:\BI_Granja\API\api_zootecnico\bi_generic
```

Copie os três arquivos atuais dessa pasta para uma pasta de backup identificada com a data. Depois copie os três arquivos do ZIP para `bi_generic`, aceitando substituir os correspondentes. Preserve `router.py`, `__init__.py` e as configurações do servidor.

Os arquivos Python soltos na raiz de `_backend-zootecnico-referencia` não são os usados pelo Docker. A origem do pacote é a subpasta `bi_generic`.

## 3. Reconstruir o serviço

No computador do Anderson, abra o PowerShell e execute os comandos, um por vez. Continue ao próximo somente quando o anterior terminar sem erro:

```powershell
Set-Location -LiteralPath 'C:\BI_Granja\Banco\postgresql_granja'
docker compose up -d --build --no-deps zootecnico
docker compose ps --all zootecnico
```

O `up --build` reconstrói a imagem e recria o serviço quando a imagem mudou; `-d` o mantém em segundo plano. `--no-deps` restringe a inicialização ao serviço solicitado. [Documentação do Docker](https://docs.docker.com/reference/cli/docker/compose/up/).

O status deve mostrar `Up`/`running`. Se houver erro ou reinicializações, confira:

```powershell
docker compose logs --tail=100 zootecnico
```

O serviço e os caminhos acima são os documentados no backend fornecido pelo Anderson. Se a instalação atual tiver outro caminho ou o Compose não reconhecer `zootecnico`, envie a mensagem para ajustarmos ao ambiente efetivo.

## 4. Confirmar que a API usa a nova fonte

Abra a tela do BI pela CENTRAL e execute este teste no Console dessa tela. Se ela estiver dentro de um iframe, selecione o contexto da tela do BI no Console.

```javascript
(async () => {
  const resposta = await fetch(
    'https://api-bi-granja.controladoriagb05.workers.dev/api/bi/zootecnico/resumo?ano=2026&mes=9',
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('granjabi_auth_token') || ''}`
      },
      cache: 'no-store'
    }
  );
  const dados = await resposta.json();
  console.log({status: resposta.status, fonte: dados.arquivo, regras: dados.rules_version});
  console.log('RESUMO:', dados);
})();
```

Espere status 200, fonte `zootecnico.vw_desempenho_acerto` e regras `acerto-2026-10-02`. O teste lê o token da sessão e não o imprime. A consulta `/api/zootecnico/health` sozinha não confirma a nova fonte.

Teste também `/api/bi/zootecnico/detalhes?indicador=mortalidade&ano=2026&mes=9`. Para conferir as fórmulas, execute as duas primeiras consultas de [03_conferir_calculos.sql](outputs/migracao-acerto/03_conferir_calculos.sql) no Adminer e compare com o mesmo contexto da API. Na amostra da planilha, código 770/galpão 238B/lote 50/abate 11/09/2026: Mortalidade 13,31%; Peso 2,878; Idade 41,9; GPD 68,69; CA 1,644.

## 5. Publicar e abrir o frontend atualizado

Publique as seis páginas (`index.html`, `detalhes.html`, `lotes.html`, `historico.html`, `diferenca-aves-abatidas.html`, `formulas.html`) e `assets/` na hospedagem atual. Abra pela CENTRAL.

Confirme filtros, Vazio, rankings e gráficos em Index/Desempenho e Detalhamento. Lotes, Histórico e RxP devem continuar respondendo em seus próprios endpoints e fontes. O Worker atual já encaminha `/api/bi/…`; a nova view é usada internamente pelo backend.

Todos os CSS/JS das páginas recebem a versão de cache `ajustes-20261002-4`. Confira que os arquivos publicados são os da raiz `bi-zootecnico`, junto com `assets/`.

Teste também:

- Lotes: três gráficos em vinho/dourado, abas Produtores/Galpões, ranking e detalhes de galpão; alternar tema e redimensionar a janela.
- Histórico: `/api/bi/historico-fechados/filtros` deve retornar somente anos válidos a partir de 2023. `/resumo?ano=2023` e `/detalhes?ano=2023&tamanho=5` devem conter exclusivamente abates de 2023 e versão `historico-fechados-2026-10-02`.
- Qualquer tela de dados: aplicar/trocar filtros e conferir “Aplicando filtros…” no canto inferior direito, incluindo troca rápida e falha da consulta. O aviso deve desaparecer ao terminar.
- RxP: destaque visual da diferença oficial e modal de produtores, preservando AVE NOVA/REAL ALIMENTOS e os exemplos já conferidos no banco.

## 6. Instalar o robô incremental separadamente

O robô não fica dentro do Docker da API. Instale-o no ambiente Agrosys_Extractor do computador que executa as extrações, conforme [outputs/robo-acerto/COMO_USAR.md](outputs/robo-acerto/COMO_USAR.md). Ele preenche Acerto desde janeiro de 2023, com retomada por mês. A publicação de backend/frontend pode ser feita antes do preenchimento completo, mas só exibirá os registros existentes no banco.

## Recuperação se o código do serviço falhar

Restaure os três Python salvos no backup para a mesma pasta `bi_generic` e execute novamente `docker compose up -d --build --no-deps zootecnico` na pasta do Compose. Envie o erro de build ou os logs para analisarmos. Nenhuma atualização foi executada no servidor por esta preparação local.
