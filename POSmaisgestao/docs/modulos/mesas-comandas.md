# Mesas, comandas e fila de pedidos

## Propósito na maquininha

Abre mesa ou comanda, lança itens e fecha a conta no pagamento. No modo PDV local também envia pedido para a cozinha/fila do desktop. Mesas não exigem caixa aberto no hub cloud.

## Classes e pacotes de entrada

- `app/src/main/java/com/pos_mais_gestao/ui/mesas/MesasActivity.java` — grade livre/ocupada.
- `app/src/main/java/com/pos_mais_gestao/ui/mesas/OccupyActivity.java` — abrir mesa.
- `app/src/main/java/com/pos_mais_gestao/ui/mesas/AberturaMesaPolicy.java` — pede nome só se o flag está ligado e a conta ainda não existe.
- `app/src/main/java/com/pos_mais_gestao/ui/mesas/ContaMesaActivity.java` — itens da conta e caminho para pagamento.
- `app/src/main/java/com/pos_mais_gestao/ui/pedido/PedidoActivity.java` — catálogo gourmet (grupos, pizza meio a meio) no modo local; grava sacola e chama `enviarPedidoMesa`.
- `app/src/main/java/com/pos_mais_gestao/ui/pedido/PedidosActivity.java` — fila, poll a cada 5 s.
- `app/src/main/java/com/pos_mais_gestao/ui/pedido/CatalogoGourmetFiltro.java`, `SacolaLinha.java`, `util/PizzaMeioAMeio.java`
- Fechamento: `PagamentoActivity` com `EXTRA_MODO_MESA` → `ApiClient.fecharContaMesa`.

No modo local o hub inicial já é `MesasActivity` (`PosDestino`).

## Contrato com API ou hardware

Cloud:

- Grade: contas abertas `GET /contas-mesa?idempresa=&status=1&page=1&limit=100`, completada até `KEY_QUANTIDADE_MESAS`.
- Abrir: `POST /contas-mesa`. Nome: `PUT /contas-mesa/{id}`.
- Itens: `GET/POST /contas-mesa-item`, `DELETE /contas-mesa-item/{id}`.
- Fechar (`fecharContaMesa`), nesta ordem:
  1. `PUT /contas-mesa/{id}` com `status = 2` e totais de pagamento.
  2. `POST /vendas-pdv-gourmet` com `idcontamesa` e `vendalocal = 2`.
  3. `POST /vendas-pdv-item` por item.
  4. `POST /estoque/baixa-venda` (mesma leitura de NFC-e da venda rápida).

O PUT de status 2 acontece antes da venda. Se o passo 2 ou 3 falhar, a conta já foi marcada fechada e a venda pode ter ficado pela metade.

`enviarPedidoMesa` no cloud lança “Envio de pedido só no modo PDV local”. A cozinha da maquininha no cloud não usa essa fila.

Local (`LocalPdvApi`):

- `GET /pos/mesas`, `POST /pos/mesas/{numero}/abrir`, `GET /pos/contas/{id}`, `POST /pos/contas/{id}/itens`, `PUT /pos/contas/{id}/nome`.
- `POST /pos/contas/{id}/fechar` com `pagamentos` + `troco`, ou `meio` no atalho legado.
- `POST /pos/contas/{id}/pedido` com `clientOrderId` e itens (`idproduto`, `quantidade`, `idprodutomeio`, `observacao`).
- Fila: `GET /pos/pedidos?pendentes=1|0`, `POST /pos/pedidos/{id}/entregue`, `POST /pos/pedidos/limpar-fila`.

`GET /pos/status` pode gravar `modeloAtendimento` (`mesa` ou `comanda`), `modalAbrirMesaHabilitado`, `qtdMesas` e `numeropdv`. `isModeloComanda()` só é verdadeiro no modo local.

Sem rede no modo local, `MesasActivity` bloqueia ações que dependem do desktop (`!online`). Fechar mesa no cloud sem rede é recusado em `PagamentoActivity` (`fechar_mesa_requer_rede`) — mesa não entra na outbox.

`OutboxDb.TIPO_ITEM_MESA` (`item_mesa`) existe e não tem `enfileirar` nem tratamento em `OutboxSync`. Não é fila offline de mesa.

## O que não remover

- `status = 2` no fechamento cloud e `vendalocal = 2` na venda da mesa.
- `clientOrderId` no pedido local (idempotência do desktop; o app gera UUID em `PedidoActivity`).
- `AberturaMesaPolicy` e o flag vindo do PDV.
- Poll e rotas `/pos/pedidos` se o salão usa a fila na maquininha.
- Permissão de rede; mesa local não funciona offline.

## Efeito se quebrar

O salão para de lançar ou de fechar mesa. Fechar com PUT antecipado e HTTP seguinte falho deixa mesa fechada no ERP sem venda/estoque/NFC-e completos — o operador vê erro e a conta não volta sozinha para aberta. Pedido local sem `clientOrderId` pode duplicar comanda na cozinha do PDV. Tratar `TIPO_ITEM_MESA` como fila pronta não persiste item de mesa: ninguém grava esse tipo hoje.
