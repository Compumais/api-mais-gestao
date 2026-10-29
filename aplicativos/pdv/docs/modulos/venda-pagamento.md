# Venda e pagamento

## Propósito no caixa

Fecha o cupom no Postgres local (balcão, venda rápida ou conta de mesa/delivery) e só então pede NFC-e e enfileira a retaguarda. A venda existe antes da API responder.

## Onde vive

- **Main:** `criarVendaRapida` e o fechamento de conta em `electron/db/repos.ts`; totais em `electron/db/pagamento.ts`; orquestração em `localApi.criarVendaRapida` (`electron/local-api/index.ts`), que chama `concluirFiscalVenda` e `processarOutbox`.
- **Renderer:** `src/ui/pages/home-page.tsx`, `balcao-page.tsx`, `vendas-page.tsx`, `notas-nao-sincronizadas-page.tsx`, `src/lib/pagamento.ts`, `dialog-pagamento-misto.tsx`.
- **SQL:** `venda`, `item_venda`, `pagamento`. Conta gourmet usa também `conta_pagamento` até virar venda.

`venda.origem`: `rapida` na venda direta. Conta de mesa/delivery grava `idconta`. Status inicial da venda fechada: `status = 'fechada'`, `sync_status = 'pendente'`, `nfce_status = 'pendente'`.

Exige sessão com empresa e `caixaAberto()`. Sem turno, `criarVendaRapida` lança erro. O renderer ainda bloqueia a rota com `RequireCaixa`.

Meios nativos no código: `DINHEIRO`, `PIX`, `CARTAO`, e pagamento misto. Cartão débito na conferência de caixa é `formapagamentonfe` normalizado para `04`; o restante de cartão conta como crédito. Lançamento a prazo usa `aprazo` e `idtipodocumentofinanceiro` vindos de `meio_pagamento`.

SiTef preenche `nsu`, `autorizacao` e `bandeira` em `pagamento`. Ver [integracoes-perifericos.md](integracoes-perifericos.md).

## Contrato com a API

Não é chamado no clique de vender. Entra na outbox `criar_venda` e o worker (`syncCriarVenda`) faz:

1. `POST /vendas-pdv-gourmet` com `vendalocal = 3` (`VENDA_LOCAL_PDV_HIBRIDO`), `idvendalocal` e valores em string decimal (`asApiDecimal`).
2. Se a rede falhar (status 0, 408 ou ≥ 500), `GET /vendas-pdv-gourmet/por-id-local` para achar a venda já criada.
3. `validarConfirmacaoVenda`: a API precisa devolver o mesmo `idvendalocal` e um `id`/`idremoto`. Senão erro `VENDA_PDV_NAO_CONFIRMADA` e a fila não marca concluído.
4. `POST /vendas-pdv-item` para cada item (`iditemlocal`).
5. `POST /estoque/baixa-venda` com `emitirNfce` conforme config e meio. A resposta pode trazer a NFC-e online (`extrairNfceDaBaixa`).

Cancelamento não fiscal: `POST /vendas-pdv-gourmet/:id/cancelar` (`cancelarVendaNaoFiscalPdv`). Cancelamento com NFC-e está em [fiscal-nfce.md](fiscal-nfce.md).

Decimais monetários vão como string. Número JS solto quebra validação Zod na API.

## Dados locais que não podem ser apagados no schema

`venda`: `id`, `idempresa`, `numeropdv`, `origem`, `idconta`, `status`, totais por meio, desconto/acréscimo/taxa/couvert/entrega, `idremoto`, `sync_status`, `nfce_status`, `idnfce_local`, `nfce_sync_em`, cliente (`idcliente`, `nomecliente`, `cnpjcpf`).

`item_venda`: quantidade e preços copiados. Não dependa só do `produto_cache` para reimprimir.

`pagamento`: `meio`, `valor`, `nsu`, `autorizacao`, `bandeira`, `status`, `descricao`, `formapagamentonfe`, `idtipodocumentofinanceiro`, `aprazo`.

`sync_status = 'pendente'` com outbox concluído à força deixa o ERP sem o cupom e o caixa local achando que já enviou.

## Comportamento offline/outbox

A venda grava e o cupom imprime sem API. `enfileirarOutbox("criar_venda", …)` usa idempotência `criar_venda:{idlocal}`.

Prioridade 5 (antes de contingência e de caixa). Se `syncCriarVenda` falha, o ciclo **para**. Contingência e vendas posteriores não passam na frente.

Marcar `criar_venda` como concluído sem `idremoto` dessincroniza estoque e NFC-e. O worker só conclui depois do `try` sem exceção.

Itens são enviados de novo no retry (`criarItemVendaPdv` com `iditemlocal`). Não troque o `id` do `item_venda` depois de enfileirar.

PDV secundário não grava venda no próprio banco: `criarVendaRapida` delega ao principal em `/pos/vendas/rapida`. A fila com a API fica no principal.

## Configuração crítica

- `numeropdv` — vai no insert e no POST.
- `emitir_nfce` e `nfce_meios_pagamento` — decidem se a baixa pede NFC-e (`deveEmitirNfceNaBaixa`). Meio desligado grava `nfce_status = 'nao_fiscal'`.
- `pix_chave` — exibida no comprovante; não é o pagamento em si.

## O que quebra na operação da loja se remover

- Insert local antes da API: a loja para offline e um timeout no POST perde o cupom ou cobra duas vezes, conforme o retry.
- `validarConfirmacaoVenda`: aceita `idremoto` de outra venda e o estoque baixa no pedido errado.
- Barreira FIFO de `criar_venda`: a NFC-e de contingência sobe sem a venda confirmada (`syncTransmitirContingencia` devolve 409, mas só se o item ainda for processado depois).
- `pagamento` / totais: caixa físico, DANFC-e e `pagamentosErp` divergem.
- Tela `/vendas/nao-sincronizadas`: o operador não vê cupom preso na fila.
