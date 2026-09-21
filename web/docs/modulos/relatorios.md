# Relatórios

## Propósito

Consultas e exportações gerenciais e fiscais já calculadas pela API. Não há motor de relatório no front: a página manda filtro (período, empresa) e renderiza o retorno.

## Rotas

`src/app/(auth)/relatorios`:

- `/relatorios` — central financeira. O menu abre recortes com query: `?abrir=dre`, `despesas`, `fluxo-caixa`, `contas-pagar`, `contas-receber`
- `/relatorios/fiscais`
- `/relatorios/fiscais/compras`
- `/relatorios/fiscais/vendas`
- `/relatorios/notas-fiscais`

Relatórios de produto/estoque não estão nesta pasta: `/produtos/relatorios` e `/produtos/relatorios/[tipo]` ([estoque.md](estoque.md)).

## Services / hooks

- `src/services/relatorios.service.ts` — central `/relatorios`
- `src/services/relatorio-notas-fiscais.service.ts`
- Schema `src/schemas/relatorio-fiscal.schema.ts` (também o campo `relatorioFiscal` de erro na emissão; ver [fiscal.md](fiscal.md))
- Opções de coluna/relatório da empresa: aba `relatorios` em `/configuracoes` (`RelatoriosForm`)

Não há hook `use-relatorios` em `src/hooks`. A página usa React Query no client.

Chave de cache específica da central: **não confirmada** num único prefixo neste levantamento (a página chama o service direto). Não inventar chave compartilhada com `["financeiro"]` ou `["dashboard"]`.

## Estado compartilhado

- Empresa ativa entra no filtro. Sem ela o relatório não é da empresa do header `x-empresa-id` de forma confiável se a página deixar de passar `idempresa`.
- `?abrir=` é contrato do menu e da busca (`search-pages.ts`). Renomear o valor quebra o atalho, a rota `/relatorios` continua existindo.
- Dashboard tem fluxo de caixa e DRE-like em `["dashboard", ...]`. São endpoints diferentes (`dashboard.service.ts`). Mudar um não atualiza o outro.

## Permissões / guards

Menu de relatórios: `PERFIS_GESTAO`. Notas fiscais no submenu exigem feature `notas_fiscais`.

Prefixo `/relatorios` **não** está em `REGRAS_ACESSO_ROTAS`. `/produtos/relatorios` está (perfis de gestão) e não cobre `/relatorios/fiscais`.

## O que não remover

- Query `abrir` na central financeira.
- Schema do relatório fiscal quando a tela valida filtro ou resposta.
- Separação entre relatório de notas (`/relatorios/notas-fiscais`) e listas operacionais (`/nota-fiscal-venda`, `/nfce`). A lista emite/cancela; o relatório consulta.

## Regressões típicas

- Reaproveitar a grade de contas a pagar como se fosse o relatório `?abrir=contas-pagar`. São telas diferentes.
- Fundir `/relatorios/fiscais/vendas` com o dashboard de vendas. Filtros e services não são os mesmos.
- Esconder `?abrir=` num state local e o link do menu passa a abrir sempre a central genérica.
