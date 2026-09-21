# Relatórios e dashboard

## Propósito no produto

Leitura gerencial e fiscal: DRE, fluxo de caixa, vendas, produtos, notas e metas. Não grava estoque nem autoriza nota.

## Pastas e entrypoints

- `src/controllers/http/dashboard/rotas.ts` — `verifyJwt`. Parte das rotas usa `requireFeature(dashboard_completo)` em `onRequest` (fluxo de caixa, rentabilidade, clientes e outras após o comentário “Analytics — completo” no arquivo). Rotas anteriores no mesmo plugin não usam esse hook.
- `src/controllers/http/relatorios/rotas.ts` — `verifyJwt`. Fiscais e de notas exigem `requireFeature(notas_fiscais)`:
  - `GET /relatorios/notas-fiscais` e exportar
  - `GET /relatorios/produtos/:tipo` e exportar
  - `POST /relatorios/fluxo-caixa`, `contas-pagar`, `contas-receber`, `despesas-por-categoria`, `dre-gerencial`
  - `POST /relatorios/fiscal-compras`, `fiscal-vendas`, `fiscal-contabilidade`

Services: `src/service/dashboard/`, `src/service/relatorios/`. Repositórios: `dashboard-repositories.ts`, `dashboard-analytics-repositories.ts`, `metas-dashboard-repositories.ts`, `relatorios-repositories.ts`, `relatorio-notas-fiscais-repositories.ts`, `relatorio-produtos-repositories.ts`.

Schema de metas: `drizzle/tables/metas-dashboard.ts`.

Seed de desenvolvimento: `npm run seed:financeiro-dashboard`.

## Contratos externos

ERP web. Não há rota de PDV neste módulo. Dashboard também lê fechamentos e vendas já gravados pelo PDV (`buscar-ultimos-fechamentos`, `buscar-vendas`). POS Android: não confirmado.

## Configuração crítica

Features `dashboard_simplificado`, `dashboard_completo`, `relatorios_avancados`, `consolidacao_relatorios`, `notas_fiscais` no catálogo. No código das rotas, o gate encontrado é `dashboard_completo` (trecho analytics) e `notas_fiscais` (relatórios fiscais e de notas). Uso de `relatorios_avancados` nas rotas: não confirmado.

`src/util/dashboard-periodo.ts` define recorte de datas. Não alterar o fuso/corte sem ler esse util.

## Invariantes

- São consultas. Exportação não pode atualizar saldo, status de nota ou financeiro.
- Filtro de notas inclui `ambiente` (`1` produção / `2` homologação / `todos`), `status` e `modelo` 55/65. Misturar homologação no relatório fiscal de produção é decisão do query param, não um default para apagar.
- Metas (`/dashboard` metas no mesmo plugin) são gravadas; o restante do dashboard é leitura.
- Relatório fiscal de contabilidade é visão, distinta de `POST /contabilidade/exportar-xmls`.

## O que quebra se alterar ou apagar

- Telas de dashboard do web e exports CSV/XLSX.
- Conferência fiscal de compras e vendas.
- Metas e acompanhamento de orçamento se os handlers de meta saírem do plugin.
- Feature `dashboard_completo`: rotas marcadas passam a responder 403 `PLAN_FEATURE_REQUIRED`.

## Dependências de outros módulos da API

Financeiro, plano de contas, notas, produtos, vendas PDV, fechamento de caixa, empresas.

## Testes relacionados

- `src/service/relatorios/relatorio-fiscal-format.test.ts`
- `src/repositories/relatorio-notas-fiscais-repositories.test.ts`
- `src/repositories/relatorio-produtos-repositories.test.ts`
- `src/util/dashboard-periodo.ts` (util; teste dedicado não confirmado)
