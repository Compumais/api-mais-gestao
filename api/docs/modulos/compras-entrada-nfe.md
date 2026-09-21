# Compras e entrada de NF-e

## Propósito no produto

Pedido e cotação de compra, importação de XML de entrada (rascunho, vínculo de produto, custo e estoque) e distribuição DF-e (NF-e inbound / manifestação).

## Pastas e entrypoints

- `src/controllers/http/nota-fiscal/rotas.ts` — `/notas-fiscais` e `/notas-fiscais/rascunhos` e `/notas-fiscais/importar-xml`. `verifyJwt`.
- `src/controllers/http/pedidos-compra/rotas.ts` — `/pedidos-compra`, converter cotação, cancelar.
- `src/controllers/http/cotacoes-compra/rotas.ts` — `/cotacoes-compra`. Sem JWT: `GET /cotacoes-compra/publico/:token` e `POST /cotacoes-compra/publico/:token/propostas`. O restante está num `app.register` interno com `verifyJwt` (criar, listar, comparativo, `POST /cotacoes-compra/:id/gerar-pedidos`, abrir, encerrar, cancelar, buscar, atualizar, excluir).
- `src/controllers/http/nfe-inbound/rotas.ts` — `/nfe-inbound/sync-status`, `/documentos`, `/sincronizar`, diagnosticar chave, manifestar ciência, importar, baixar XML.

Services: `src/service/nota-fiscal/` (inclui `importacao/`), `pedidos-compra/`, `cotacoes-compra/`, `nfe-inbound/`.

Schema: `drizzle/tables/nota-fiscal.ts`, `nota-fiscal-item.ts`, `nota-fiscal-item-lote.ts`, `nota-fiscal-xml.ts`, `pedido-compra.ts`, `pedido-compra-item.ts`, `cotacao-compra.ts` e itens/propostas, `nfe-inbound-documento.ts`, `empresa-nfe-sync.ts`.

Finalizar rascunho de importação grava a nota e pode cadastrar produtos, custo e movimento de estoque. Não tratar “rascunho” como dado descartável sem ler `finalizar-rascunho`.

## Contratos externos

ERP web para importação e compras. Fornecedor responde cotação pelo link público (token). SEFAZ/distribuição passa pelo gateway NF-e (`src/lib/nfe-gateway-client.ts`), não direto da rota. Job `sync_inbound_nfe` a cada 10 minutos quando o agendador está ligado.

PDV não usa estes paths de compra. POS Android: não confirmado.

## Configuração crítica

- `NFE_GATEWAY_URL` (default `http://127.0.0.1:8088`)
- `NFE_GATEWAY_SECRET`
- `NFE_CERT_ENCRYPTION_KEY` (32 bytes base64; cifra o PFX)
- `NFE_STORAGE_PATH` (XML em disco; default `storage/xmls` relativo ao cálculo em `src/util/xml-storage.ts`)
- `AGENDADOR_HABILITADO` para o ciclo inbound

Certificado e configuração de NF-e da empresa estão no módulo de emissão. Inbound reutiliza o mesmo gateway e o certificado ativo.

## Invariantes

- Nota e itens são da empresa. Importação não autoriza nota de saída; emissão é outro módulo.
- Rascunho tem ciclo próprio (criar, item, grupo padrão, cadastrar em massa, finalizar, excluir). Finalizar é o ponto que efetiva cadastro/estoque/custo.
- Chave de acesso identifica documento inbound. Manifestação de ciência altera estado na SEFAZ; não repetir sem ler `manifestar-ciencia`.
- NSU de sincronização fica em `empresa-nfe-sync`. Zerar NSU rebusca ou perde o ponto de leitura (efeito colateral não detalhado aqui: não apagar a tabela).
- Cotação pública autentica pelo token da URL, não pela sessão. Não colocar `verifyJwt` nessas duas rotas.
- Zod nos schemas de `doc-schema` de nota, cotação e inbound.
- Transação na finalização quando grava nota, itens, produtos e estoque juntos — manter no service.

## O que quebra se alterar ou apagar

- Entrada de compra: custo (`POST /custos-produto/nf`), saldo e lote.
- Contas a pagar geradas a partir da compra (se o service de finalização ou de nota as criar — confirmar no service antes de remover a chamada).
- Fila DF-e e o lock `LOCK_AGENDADOR_INBOUND_NFE`.
- Download de XML e DANFE de compra (`baixar-xml`, `gerar-danfe` no plugin de nota).
- Pedido gerado a partir do comparativo da cotação (`converter-cotacao` / `gerarPedidosCotacaoCompra`).

## Dependências de outros módulos da API

Produtos, fatores de conversão, estoque, custo, entidades (fornecedor), certificado e gateway (emissão), empresas, financeiro.

## Testes relacionados

- `src/service/nota-fiscal/listar-notas-fiscais.test.ts`
- `src/service/nota-fiscal/montar-dados-produto-nf-importacao.test.ts`
- `src/service/pedidos-compra/criar-pedido-compra.test.ts`
- `src/service/nfe-inbound/tratar-erros-sefaz-dfe.test.ts`
- `src/service/nfe-inbound/montar-mensagem-consulta-chave-sefaz.test.ts`
- `src/service/lote/persistir-lotes-entrada-item-nf.test.ts`
