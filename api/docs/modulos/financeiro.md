# Financeiro

## Propósito no produto

Contas a pagar e a receber, baixas, contas correntes, lançamentos (incluindo OFX), bancos, orçamentos, centros de custo (apropriação, rateio, orçamento por CC — ver [centro-custo.md](./centro-custo.md)), condições de pagamento, tipos de cobrança e de documento, bandeiras de cartão.

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
| `src/controllers/http/retorno-bancario/rotas.ts` | `/retornos-bancarios` |
| `src/controllers/http/conciliacao-cielo/rotas.ts` | `/conciliacoes-cielo` |

Services espelhados em `src/service/financeiro/`, `financeirolancamento/`, `contacorrente/`, `contacorrentelancamento/`, `bancos/`, `budgets/`, `centro-custo/`, `condicao-pagamento/`, `tipo-cobranca/`, `tipo-documento-financeiro/`, `bandeira-cartao/`, `motivobaixafinanceiro/`, `retorno-bancario/`, `conciliacao-cielo/`.

Schema: `drizzle/tables/financeiro.ts`, `financeiro-lancamento.ts`, `conta-corrente.ts`, `conta-corrente-lancamento.ts`, `banco.ts`, `budget.ts`, `centro-custo.ts`, `condicao-pagamento.ts`, `tipo-cobranca.ts`, `tipo-documento-financeiro.ts`, `bandeira-cartao.ts`, `motivo-baixa-financeiro.ts`, `retorno-bancario.ts`, `conciliacao-cielo.ts`, `conciliacao-cielo-item.ts`.

Conta caixa padrão nasce em `popularDadosPadraoEmpresa`.

## Contratos externos

ERP web. PDV grava pagamento de venda em fluxo próprio (`venda-pdv-pagamento`); o efeito financeiro da NFC-e/NF-e autorizada passa por `gerarContasReceberNfService`, não por estes CRUDs sozinhos. POS Android: não confirmado.

Feature `contas_pagar_receber` existe no catálogo SaaS. Hook `requireFeature` neste conjunto de rotas: não encontrado.

## Configuração crítica

Nenhuma env específica deste módulo no código lido. Jobs que leem financeiro: `alerta_vencimento`, `saldo_baixo`, `conciliacao_pendente` (módulo de automação). Exigem `AGENDADOR_HABILITADO=true`.

## Conciliação Cielo

- Importa CSV Cielo **Recebíveis Detalhado - Lançamentos** (`POST /conciliacoes-cielo/importar`), deduplica por `checksum` SHA-256.
- Parser: `src/util/parse-csv-cielo.ts`. Sugestão de match com títulos a receber abertos: `src/util/sugerir-match-cielo.ts` (NSU, autorização, valor, data, bandeira, parcela; score ≥ 40).
- Usuário associa/desassocia item (`PUT /conciliacoes-cielo/itens/:iditem/associar`) pela ação **Conciliar** (busca de documento a receber) e confirma (`POST /conciliacoes-cielo/:id/confirmar`) com `idcontacorrente`; a confirmação baixa os títulos selecionados via `criarFinanceiroLancamentoService` (líquido na conta + taxa como desconto). O histórico da baixa registra data da conciliação e o usuário.
- Migration: `drizzle/0128_conciliacao_cielo.sql`.

## Invariantes

- Registros carregam `idempresa`. Services checam `verificarUsuarioPertenceEmpresa` antes de gravar.
- Baixa de título **somente** via `POST /financeiro-lancamentos` (não via `PUT /financeiro` de status). Quitação total grava `status = P`; parcial mantém `A` com `saldo` reduzido. Estorno: `POST /financeiro-lancamentos/:id/estornar`.
- Conciliação Cielo **não** baixa automaticamente no import; só após confirmação explícita do usuário.
- Título legado `status = P` com `saldo ≈ valor` e `valorpagorecebido` vazio = pago sem rastreio (atalho antigo); não reprocessar automaticamente.
- Lançamento financeiro referencia título (`financeiro`) e movimenta conta corrente (crédito em receber, débito em pagar). Apagar o CRUD de lançamento sem o título deixa baixa órfã.
- Origem do título: contrato de serviço `tipoorigem = 5`; locação de equipamento `tipoorigem = 6`, criada no fechamento da locação.
- Condição de pagamento é usada para parcelar contas a receber da nota (`src/service/nota-fiscal/gerar-contas-receber-nf.ts`).
- Tipos de documento padrão não devem ser removidos da população inicial: a geração de financeiro da nota procura esses tipos.
- Zod nos controllers (params UUID e body). Auditoria após operações bem-sucedidas quando o service chama `criarAuditoriaService`.
- Transação: operações que gravam título e lançamento juntos devem permanecer no service/repository, não no controller.

## O que quebra se alterar ou apagar

- Geração de parcelas na autorização de venda ou no fechamento de OS.
- Importação OFX (`POST /conta-corrente-lancamentos/importar-ofx/preview`).
- Conciliação Cielo (`/conciliacoes-cielo`) e baixas geradas na confirmação.
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
- `src/util/parse-csv-cielo.test.ts`
