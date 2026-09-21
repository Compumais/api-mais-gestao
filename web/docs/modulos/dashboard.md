# Dashboard

## Propósito

Painel da empresa ativa: visão geral, vendas, financeiro, fluxo de caixa, clientes e metas. O chat Atena existe só neste layout.

## Rotas

- `/dashboard` — `src/app/(auth)/dashboard/page.tsx`
- Layout filho: `dashboard/layout.tsx` envolve `AtenaChatProvider`

Abas em `src/lib/dashboard-periodo.ts`, renderizadas em `dashboard/page.tsx`: `visao-geral`, `vendas`, `clientes`, `financeiro`, `fluxo-caixa`, `rentabilidade`, `dre`, `metas`, `comparativo`, `alertas`, `controle`. A aba ativa vai na query `?tab=`.

Sem a feature `dashboard_completo` (`useEntitlements`), as abas de `DASHBOARD_TABS_COMPLETAS` (`clientes`, `fluxo-caixa`, `rentabilidade`, `metas`, `alertas`) somem e, se a URL ainda apontar para uma delas, o efeito volta para `visao-geral`. As básicas (`visao-geral`, `vendas`, `financeiro`, `dre`, `comparativo`, `controle`) ficam. Enquanto o plano carrega, as completas aparecem.

## Services / hooks

- `src/services/dashboard.service.ts`
- `src/hooks/dashboard/use-dashboard-queries.ts`
- `src/hooks/dashboard/use-dashboard-filtro-opcoes.ts`
- `src/hooks/dashboard/dashboard-filters-context.tsx` — lê/grava `tab`, `preset`, intervalo e filtros na URL (`useSearchParams`)
- `src/services/ia.service.ts` + `src/hooks/use-atena-chat.tsx` (somente o layout do dashboard)

Todas as queries passam `empresa.id` (ou `empresaId`) para a API. O cálculo dos números é da API.

## Estado compartilhado

Chaves (prefixo `["dashboard", ...]`), todas com id da empresa:

- `executivo`, `vendas-avancadas`, `vendas-por-hora`, `vendas-por-dia-semana`, `top-produtos-avancado`, `matriz-produtos`, `financeiro-saude`, `fluxo-caixa`, `comparativo-flexivel`, `rentabilidade`, `clientes`, `clientes-rfm`, `insights`, `metas-acompanhamento`, `metas`, `controle-plano-contas`

Mutations de meta invalidam `["dashboard", "metas"]` e `["dashboard", "metas-acompanhamento"]`.

`ControleSection` também consulta `["dashboard", "controle-plano-contas", empresa.id, ano]` e o service `buscarControlePlanoContas`. Mexer no plano de contas (`["plano-contas"]`) não invalida esta chave automaticamente: o painel pode ficar defasado até refetch. Não confirmado um invalidate cruzado.

Filtros do dashboard estão na URL, não num store global. Outra rota não lê esse context.

## Permissões / guards

`/dashboard` não tem entrada em `REGRAS_ACESSO_ROTAS` (qualquer autenticado que passou no `ProtectedRoute`). É a home de quem não é `super` nem `garcom` (`getDefaultRouteForUser`). O item de menu “Dashboard” permanece no perfil de menu restrito.

## O que não remover

- `empresa?.id` dentro da query key. Sem isso, trocar empresa reaproveita número de outra empresa.
- Search params `tab` e `preset` (`dashboard-filters-context.tsx`).
- Provider do Atena só no layout do dashboard. O chat não está no shell `(auth)`.
- Feature `dashboard_completo` para as abas extras. Não tratar todas as abas como sempre visíveis.

## Regressões típicas

- Renomear uma aba sem atualizar `isDashboardTab` derruba o usuário na aba padrão.
- Apagar uma chave `dashboard/*` que a mutation de meta invalida e o acompanhamento não atualiza.
- Colocar fetch de dashboard direto no `page.tsx` server sem empresa: a empresa ativa é estado de client (`localStorage`).
