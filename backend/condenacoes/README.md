# Condenações: continuidade dos filtros no drill-down

> **Proposta futura, adiada. Não instalar agora.** A implementação atual dos frontends foi adaptada para funcionar com a API existente, sem `fornecedor_detalhado`. A alteração deste módulo não é necessária para publicar os frontends. Consulte `docs/CONDENACOES_API_ATUAL.md`.

Este módulo substitui `pcp_condenacoes.py` na **API compartilhada** pelo PCP e pelo Zootécnico. Não é uma nova API nem altera o `backend/main.py` histórico destes projetos.

Origem: backend de referência da entrega `outputs/ranking-galpoes-20261118-v2/backend-referencia/api_zootecnico`, de 18/11/2026.

Correção: o detalhe do fornecedor agora conserva `causa` e `tipo` quando informados, tanto na contagem quanto nos registros, com ou sem agrupamento. Filtros de técnico e fornecedor continuam aplicados uma única vez em cada consulta de base e de condenações. Sem causa/tipo selecionados, a consulta permanece abrangente.

Para instalação no servidor, substituir apenas `pcp_condenacoes.py` no diretório existente `api_zootecnico` e reiniciar pelo procedimento habitual. O arquivo `pcp_condenacoes_mapa.json` incluso é a referência original, sem alterações. Se o servidor tiver um mapa mais recente, preservá-lo. A rota existente já registra o módulo; não é preciso criar outra rota ou alterar banco, coletores ou permissões.

As instruções de substituição acima se aplicam somente à proposta futura deste módulo. Para a entrega atual, publicar apenas os frontends dos dois projetos e manter a API como está.

Validação local:

```text
python tests/test_condenacoes_drilldown_api.py
node tests/condenacoes-drilldown-browser.cjs
```

O teste Python executa o roteador real com adaptadores de FastAPI e conexão instrumentada, verificando SQL e parâmetros. O teste de navegador usa os filtros e tabelas reais com respostas simuladas. Não houve conexão ao banco nem implantação em produção. Após instalação, conferir uma condenação e tipo com fornecedor que possua outras condenações, avançar ao fornecedor, ordenar, paginar e voltar: o recorte deve permanecer o mesmo.
