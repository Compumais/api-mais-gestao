# Gestão de Contratos

## Propósito no produto

Cadastro de contratos de prestação de serviço com faturamento em lote em três fluxos (NFS-e+CR+boleto+remessa, CR+boleto+remessa, só CR).

## Pastas e entrypoints

| Plugin | Prefixo |
| --- | --- |
| `src/controllers/http/contrato/rotas.ts` | `/contratos` |
| `src/controllers/http/contrato-faturamento/rotas.ts` | `/contratos/faturamento` |
| `src/controllers/http/remessa-bancaria/rotas.ts` | `/remessas-bancarias` |

Services: `src/service/contrato/`, `src/service/boleto/`, `src/service/remessa-bancaria/`.

Schema: `drizzle/tables/contrato.ts`, `contrato-faturamento-lote.ts`, `contrato-cobranca.ts`, `remessa-bancaria.ts`, `remessa-bancaria-item.ts`.

## Invariantes

- Unicidade de cobrança: `(idempresa, idcontrato, competencia)`.
- Fluxo 1 emite NFS-e com `gerarFinanceiro: false`; o título é criado pelo orquestrador com `tipoorigem = 5`.
- Título permanece `A` após faturamento concluído.
- Remessa `gerada` ≠ `enviada` (envio é manual via download CNAB).
- Item de remessa único por `idfinanceiro`.

## Jobs

- `consultar_nfse_contratos` no worker: retoma cobranças em `aguardando_autorizacao_nfse`.
