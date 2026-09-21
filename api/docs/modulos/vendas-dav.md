# Vendas DAV

## Propósito no produto

Pedido de venda (DAV): itens, lotes, cancelamento e faturamento em NF-e ou NFC-e.

## Pastas e entrypoints

- `src/controllers/http/dav/rotas.ts` — `verifyJwt`:
  - CRUD `/davs`
  - `POST /davs/:id/cancelar`
  - `POST /davs/:id/faturar-nfe`
  - `POST /davs/:id/faturar-nfce`
  - `GET /davs/:id/contexto-emissao-nfe` e `GET /davs/contexto-emissao-nfe-lote`
  - itens `/davs/:id/itens`
- `src/controllers/http/modelo-impressao-pedido/rotas.ts` — `/empresas/:idempresa/modelos-impressao-pedido` (CRUD, seed, definir primário, duplicar).
- Services: `src/service/dav/`, `src/service/dav-item/`. Contexto de emissão: `resolver-contexto-emissao-nfe-pedido.ts`. Faturamento NFC-e: `faturar-dav-nfce.ts`.
- Schema: `drizzle/tables/dav.ts`, `dav-item.ts`, `dav-item-lote.ts`, `modelo-impressao-pedido.ts`.

## Contratos externos

ERP web. O faturamento reutiliza a emissão NF-e/NFC-e (feature `notas_fiscais` naqueles plugins, não neste arquivo de rotas DAV). PDV não é o dono do DAV no código lido. POS Android: não confirmado.

## Configuração crítica

Nenhuma env própria. Depende das env de gateway, certificado e série do módulo de emissão.

## Invariantes

- Faturar não é só mudar status: dispara rascunho/emissão e pode reservar lote (`dav-item-lote`).
- Cancelar DAV não cancela nota já autorizada. Nota autorizada segue o fluxo de cancelamento SEFAZ.
- Contexto de emissão em lote existe para faturar vários pedidos com a mesma leitura fiscal. Não fundir com o GET de um id.
- Itens e lotes são filhos do DAV. Excluir o pedido sem tratar itens/lotes quebra FK ou deixa lote reservado (conferir o service de exclusão antes de mudar a ordem).
- Modelo de impressão é por empresa; seed cria o primário. Apagar todos os modelos quebra a impressão do pedido.

## O que quebra se alterar ou apagar

- Transformação de pedido em NF-e/NFC-e.
- Reserva de lote do item do pedido.
- Impressão do pedido na web.
- Integração pós-autorização que lê DAVs ligados à nota (`buscarDavsPorIds` em `integrar-nota-fiscal-venda-autorizada.ts`).

## Dependências de outros módulos da API

Emissão fiscal, produtos, estoque/lotes, entidades, empresas, financeiro (via integração da nota).

## Testes relacionados

Não há `src/service/dav/*.test.ts` confirmado na listagem usada para este doc. Testes de emissão e de lote cobrem o efeito do faturamento. Marcar cobertura direta do DAV como não confirmada.
