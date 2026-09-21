# Financeiro

## Propósito no produto

Contas a pagar e a receber, baixas, contas correntes, lançamentos (incluindo OFX), bancos, orçamentos, centros de custo, condições de pagamento, tipos de cobrança e de documento, bandeiras de cartão.

## Pastas e entrypoints

Todos com `verifyJwt`, registrados em `src/index.ts`:

| Plugin | Prefixo |
| --- | --- |
| `src/controllers/http/financeiro/rotas.ts` | `/financeiro` |
| `src/controllers/http/financeirolancamento/rotas.ts` | `/financeiro-lancamentos` |
| `src/controllers/http/contacorrente/rotas.ts` | `/contas-correntes` |
| `src/controllers/http/conta-corrente-lancamento/rotas.ts` | `/conta-corrente-lancamentos` (+ preview OFX) |
| `src/controllers/http/bancos/rotas.ts` | `/bancos` |
| `src/controllers/http/budgets/rotas.ts` | `/budgets` (+ `/acompanhamento`) |
| `src/controllers/http/centro-custo/rotas.ts` | `/centros-custo` |
| `src/controllers/http/condicao-pagamento/rotas.ts` | `/condicoes-pagamento` |
| `src/controllers/http/tipo-cobranca/rotas.ts` | `/tipos-cobranca` |
| `src/controllers/http/tipo-documento-financeiro/rotas.ts` | `/tipos-documento-financeiro` (+ `popular-padrao`) |
| `src/controllers/http/bandeira-cartao/rotas.ts` | `/bandeiras-cartao` (+ `popular-padrao`) |

Services espelhados em `src/service/financeiro/`, `financeirolancamento/`, `contacorrente/`, `contacorrentelancamento/`, `bancos/`, `budgets/`, `centro-custo/`, `condicao-pagamento/`, `tipo-cobranca/`, `tipo-documento-financeiro/`, `bandeira-cartao/`, `motivobaixafinanceiro/`.

Schema: `drizzle/tables/financeiro.ts`, `financeiro-lancamento.ts`, `conta-corrente.ts`, `conta-corrente-lancamento.ts`, `banco.ts`, `budget.ts`, `centro-custo.ts`, `condicao-pagamento.ts`, `tipo-cobranca.ts`, `tipo-documento-financeiro.ts`, `bandeira-cartao.ts`, `motivo-baixa-financeiro.ts`.

Conta caixa padrão nasce em `popularDadosPadraoEmpresa`.

## Contratos externos

ERP web. PDV grava pagamento de venda em fluxo próprio (`venda-pdv-pagamento`); o efeito financeiro da NFC-e/NF-e autorizada passa por `gerarContasReceberNfService`, não por estes CRUDs sozinhos. POS Android: não confirmado.

Feature `contas_pagar_receber` existe no catálogo SaaS. Hook `requireFeature` neste conjunto de rotas: não encontrado.

## Configuração crítica

Nenhuma env específica deste módulo no código lido. Jobs que leem financeiro: `alerta_vencimento`, `saldo_baixo`, `conciliacao_pendente` (módulo de automação). Exigem `AGENDADOR_HABILITADO=true`.

## Invariantes

- Registros carregam `idempresa`. Services checam `verificarUsuarioPertenceEmpresa` antes de gravar.
- Lançamento financeiro referencia título (`financeiro`) e pode movimentar conta corrente. Apagar o CRUD de lançamento sem o título deixa baixa órfã.
- Condição de pagamento é usada para parcelar contas a receber da nota (`src/service/nota-fiscal/gerar-contas-receber-nf.ts`).
- Tipos de documento padrão não devem ser removidos da população inicial: a geração de financeiro da nota procura esses tipos.
- Zod nos controllers (params UUID e body). Auditoria após operações bem-sucedidas quando o service chama `criarAuditoriaService`.
- Transação: operações que gravam título e lançamento juntos devem permanecer no service/repository, não no controller.

## O que quebra se alterar ou apagar

- Geração de parcelas na autorização de venda ou no fechamento de OS.
- Importação OFX (`POST /conta-corrente-lancamentos/importar-ofx/preview`).
- Dashboard e relatórios de fluxo de caixa, DRE, contas a pagar/receber (leem estas tabelas).
- Conta corrente “caixa” criada para empresa nova.
- Seed `seed:financeiro-dashboard` e `seed:budget` (scripts de dev, não apagar as tabelas por causa deles).

## Dependências de outros módulos da API

Empresas, entidades (cliente/fornecedor do título), plano de contas/centro de custo, notas fiscais, ordem de serviço, PDV (pagamentos), auditoria.

## Testes relacionados

- `src/service/contacorrente/criar-conta-corrente.test.ts`
- `src/service/contacorrente/atualizar-conta-corrente.test.ts`
- `src/service/bancos/excluir-banco.test.ts`
- `src/service/bancos/buscar-por-id.test.ts`
- `src/service/nota-fiscal/gerar-contas-receber-nf.test.ts`
- `src/util/lancamento-pagamento-pdv.test.ts`
