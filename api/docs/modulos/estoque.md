# Estoque

## Propósito no produto

Saldo por local, movimento, lote (FEFO) e ajuste. É efeito colateral de compra, venda autorizada, PDV e produção — não só um CRUD.

## Pastas e entrypoints

| Plugin | Prefixo |
| --- | --- |
| `src/controllers/http/estoque/rotas.ts` | `/estoque/saldos`, `/estoque/movimentos`, `POST /estoque/baixa-venda`, `POST /estoque/ajustes`, `/lotes`, `POST /lotes/sugerir-fefo` |
| `src/controllers/http/saldo-estoque/rotas.ts` | `/saldos-estoque` |
| `src/controllers/http/movimento-estoque/rotas.ts` | `/movimentos-estoque` |
| `src/controllers/http/local-estoque/rotas.ts` | `/locais-estoque` |
| `src/controllers/http/motivo-rebaixa/rotas.ts` | `/motivos-rebaixa` |

Services centrais:

- `src/service/estoque/registrar-movimento-estoque.ts` — escrita de movimento e saldo.
- `src/service/nota-fiscal/registrar-movimentos-estoque-nf.ts` — entrada/saída ligada à nota; evita duplicar movimento do mesmo documento.
- `src/service/lote/` — persistência de lote na entrada, FEFO, lotes da emissão.
- `src/service/estoque/complementar-baixa-fiscal-venda-pdv.ts` (há teste).

Schema: `drizzle/tables/saldo-estoque.ts`, `movimento-estoque.ts`, `local-estoque.ts`, `lote.ts`, `motivo-rebaixa.ts`, `nota-fiscal-item-lote.ts`, `dav-item-lote.ts`, `ordem-servico-item-lote.ts`.

Constantes de tipo: `src/util/tipo-estoque.ts`.

## Contratos externos

- Web: saldos, ajustes, lotes.
- PDV: `POST /estoque/baixa-venda` e rotas de saldo/movimento (garçom pode acessar saldos e movimentos). Sugestão FEFO no caixa.
- POS Android: não confirmado.

## Configuração crítica

Nenhuma env própria no código lido. Local de estoque padrão da empresa é buscado na integração da nota (`buscarPrimeiroLocalEstoqueEmpresa`).

## Invariantes

- Movimento é a fonte do saldo. Não atualizar `saldo-estoque` sem movimento correspondente, exceto se o service de ajuste já fizer os dois na mesma transação — ler `registrar-movimento-estoque.ts` antes de mudar.
- Nota autorizada chama `registrarMovimentosEstoqueNf` dentro de `integrarNotaFiscalVendaAutorizada` (`gerarEstoque`). Sentido `entrada` ou `saida`. Devolução usa CFOP/finalidade (`src/util/cfop-devolucao-emissao-nfe.ts`).
- Lote: quantidade do item pode ser explodida por lote (`src/util/explodir-itens-movimento-lote-nf.ts`). FEFO em `resolver-lotes-fefo`.
- Produção na venda: `garantirProducaoNaVendaService` é chamado a partir do registro de movimento da NF.
- Idempotência: `listarMovimentosEstoquePorDocumento` impede lançar de novo o mesmo documento.
- Pertencimento à empresa em saldo, movimento e local.

## O que quebra se alterar ou apagar

- Estoque negativo ou dobrado após autorização, cancelamento ou reprocessamento de nota.
- Baixa do PDV e complementação fiscal da venda.
- Rastreio de lote em OS, DAV e item de nota.
- Ajuste em massa (`POST /estoque/ajustes`) usado pela gestão.
- Job `saldo_baixo` (alerta), que lê saldo.

## Dependências de outros módulos da API

Produtos, locais, notas fiscais, PDV, produção, empresas.

## Testes relacionados

- `src/service/lote/resolver-lotes-fefo.test.ts`
- `src/service/lote/persistir-lotes-entrada-item-nf.test.ts`
- `src/service/estoque/complementar-baixa-fiscal-venda-pdv.test.ts`
- `src/util/explodir-itens-movimento-lote-nf.test.ts`
