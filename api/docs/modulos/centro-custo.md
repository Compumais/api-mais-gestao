# Centro de custos

## Propósito

Cadastro gerencial de centros de custo, apropriação/rateio de despesas, orçamento por centro, relatórios analíticos (competência e caixa) e fila de classificação pendente.

## Rotas principais

| Plugin | Prefixo |
| --- | --- |
| `centro-custo/rotas.ts` | `/centros-custo` |
| `apropriacao-centro-custo/rotas.ts` | `/apropriacoes-centro-custo` |
| `criterio-rateio/rotas.ts` | `/criterios-rateio` |
| `budgets-centro-custo/rotas.ts` | `/budgets-centro-custo` |
| `config-financeiro-empresa/rotas.ts` | `/config-financeiro-empresa` |
| `relatorios/rotas.ts` | `/relatorios/centro-custos*` |

## Tabelas

- `centrocusto` (campos estendidos: departamento, responsável, vigência, tipogestao)
- `apropriacao_centro_custo`
- `criterio_rateio`, `criterio_rateio_linha`
- `budget_centro_custo`
- `config_financeiro_empresa`

## Critérios de aceite (spec §10)

1. Cadastro — `/centros-custo` + UI web
2. Associar despesas — apropriação em financeiro/movimentações
3. Rateio documentado — critérios + relatório `/relatorios/centro-custos/rateios`
4. Sem classificação — `/apropriacoes-centro-custo/pendentes`
5–6. Consulta/comparativo — relatórios analíticos GET
7. Orçado × realizado — `/budgets-centro-custo/acompanhamento?regime=`
8. Origem — campos `origemtipo`/`origemid` nas apropriações
9. Consistência — validação de soma no service
10. Decisão gerencial — relatórios + regimes caixa/competência

## Folha de pagamento

Entrada manual via `POST /apropriacoes-centro-custo/manual` até existir módulo RH integrado.
