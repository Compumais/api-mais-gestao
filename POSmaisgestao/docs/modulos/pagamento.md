# Pagamento

## Propósito na maquininha

Quita a venda rápida ou a conta da mesa com um ou mais lançamentos (dinheiro, PIX, cartão) e só então pede à API para fechar. Não fala com adquirente.

## Classes e pacotes de entrada

- `app/src/main/java/com/pos_mais_gestao/ui/pagamento/PagamentoActivity.java`
- `app/src/main/res/layout/activity_pagamento.xml`, `dialog_valor.xml`, `dialog_pix_qr.xml`, `item_lancamento_pagamento.xml`
- `app/src/main/java/com/pos_mais_gestao/util/PagamentosMisto.java`
- `app/src/main/java/com/pos_mais_gestao/domain/LancamentoPagamento.java`
- `app/src/main/java/com/pos_mais_gestao/domain/MeioPagamento.java` — `DINHEIRO`, `PIX`, `CARTAO`
- `app/src/main/java/com/pos_mais_gestao/util/PixPayloadBuilder.java`
- `app/src/main/java/com/pos_mais_gestao/util/QrBitmapHelper.java`
- `app/src/main/java/com/pos_mais_gestao/hardware/PagamentoHardware.java`
- `app/src/main/java/com/pos_mais_gestao/hardware/StubPagamentoHardware.java`

Entrada: `VendaActivity` (carrinho em memória, `Carrinho`) ou fechamento de mesa (`EXTRA_MODO_MESA`, `EXTRA_ID_CONTA`, `EXTRA_TOTAL_MESA`).

## Contrato com API ou hardware

`PagamentoHardware` documenta o encaixe futuro de TEF/PIX do fabricante (comentário cita Stone, PagSeguro, Sunmi). `StubPagamentoHardware.estaDisponivel()` é `false` e `pagar()` devolve `aprovado=false`. `PosApplication` guarda o stub. **Nenhuma tela chama `getPagamentoHardware()`.** O confirmar em `PagamentoActivity.confirmarFechamento` não espera NSU de hardware.

Regras de `PagamentosMisto` (há teste em `app/src/test/.../PagamentosMistoTest.java`):

- Só lançamento `status=ok` entra na soma. `pendente` bloqueia o fechamento. `cancelado` não soma.
- Troco só com dinheiro. PIX e cartão não podem passar do restante (`valorExcedeRestante`).
- JSON do lançamento: `meio`, `valor`, `status`, e opcionais `nsu`, `autorizacao`, `bandeira`, `id`.

No cloud, `ApiClient.aplicarTotaisPagamento` grava:

- `valordinheiro`, `valorpix`, `valorcartaocredito` (todo `CARTAO` cai aqui)
- `valorcartaodebito`, `valorcartao`, `valorprepago` fixos em `"0"`
- `valortroco`
- array `pagamentos`

No modo local o mesmo array segue em `POST /pos/vendas/rapida` ou `POST /pos/contas/{id}/fechar`.

PIX: se `isPixQrHabilitado()` é falso, o lançamento PIX entra direto como `ok`. Se é verdadeiro, a tela monta o payload EMV com a chave/nome/cidade das prefs e o operador confirma depois de mostrar o QR. Isso não liquida PIX no banco; só registra o meio.

Cliente opcional: `SelecionarClienteActivity` preenche `identidade` (e nome/documento na venda rápida). No cloud a busca é `GET /entidades`.

Sem rede no modo cloud, venda rápida (não mesa) vai para a outbox e a tela de sucesso mostra código `OFFLINE` e texto “NAO FISCAL — sem NFC-e”. Mesa sem rede lança erro e não fecha. Ver [persistencia-offline.md](persistencia-offline.md).

## O que não remover

- Os três meios e a validação de `PagamentosMisto` antes do HTTP.
- Mapeamento `CARTAO` → `valorcartaocredito` enquanto o ERP e o PDV local esperarem esse campo. Mudar o campo sem alinhar API e PDV deixa o financeiro zerado no cartão.
- `PixPayloadBuilder` e as chaves de prefs do PIX. Não grave valor de chave PIX em documentação nem em log.
- A interface `PagamentoHardware`. Não ligue o stub no confirmar.

## Efeito se quebrar

A venda na maquininha para na tela de pagamento, ou confirma um meio que o ERP não reconhece. Pagamento “não confirma” aqui significa: a API não recebeu `pagamentos` / totais, ou um `pendente` bloqueou o fechamento, ou alguém passou a exigir o stub (sempre reprovado). Não há confirmação de adquirente neste código — NSU de TEF não existe no fluxo atual. Chamar o stub como se fosse aprovação impede a baixa no ERP.
