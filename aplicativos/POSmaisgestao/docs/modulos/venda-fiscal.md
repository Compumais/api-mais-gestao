# Venda rápida, NFC-e e DAV

## Propósito na maquininha

Monta o carrinho (atalhos, busca, código de barras, peso) e, após o pagamento, registra a venda no ERP ou no PDV local. No cloud, o switch “Emitir NFC-e na venda” escolhe NFC-e ou DAV.

## Classes e pacotes de entrada

- `app/src/main/java/com/pos_mais_gestao/ui/venda/VendaActivity.java` — grade de atalhos, busca paginada, scan, balança, botão pagar.
- `app/src/main/java/com/pos_mais_gestao/domain/Carrinho.java` — singleton em memória. Morre se o processo morrer; não é a outbox.
- `app/src/main/java/com/pos_mais_gestao/ui/home/HomeActivity.java` — no cloud, venda rápida exige caixa aberto (`buscarCaixaAberto` / `abrirCaixa`). Mesas não passam por esse gate. No local, a venda abre direto.
- `app/src/main/java/com/pos_mais_gestao/data/api/ApiClient.java` — `criarVendaPdvRapida`, `criarPedidoDavPos`, `aplicarResultadoEmissaoNfce`, `abrirCaixa`, `fecharCaixa`, `calcularResumoTurno`.
- `app/src/main/java/com/pos_mais_gestao/ui/sucesso/SucessoActivity.java` e `ui/falha/FalhaNfceActivity.java`
- `app/src/main/java/com/pos_mais_gestao/ui/vendas/VendasActivity.java` e `VendaDetalheActivity.java` — consulta e reimpressão.
- `app/src/main/java/com/pos_mais_gestao/hardware/DanfceEscPos.java`

## Contrato com API ou hardware

Modo `pdv_local`: `POST /pos/vendas/rapida` com `itens`, `pagamentos` e `troco`. O resultado fiscal vem do objeto `fiscal.modo` (`online`, `contingencia`, `erro`, ou ausência → `nao_fiscal`). `erro` abre `FalhaNfceActivity` (`sucessoFiscalCompleto` falso). Emissão SEFAZ, nesse modo, é do PDV desktop — o app só lê o retorno.

Modo `cloud` com `isEmitirNfcePos() == true` (`criarVendaPdvRapida`), nesta ordem, sem transação única no app:

1. `POST /vendas-pdv-gourmet` com `vendalocal = 2` (origem POS; comentário no código: `1` = balcão web/gourmet, `0` = não local), `numeropdv`, totais e `pagamentos`.
2. Um `POST /vendas-pdv-item` por item (`idproduto` de `getProdutoFiscal()`).
3. `POST /estoque/baixa-venda` — a API devolve `deveEmitirNfce` e `emissaoNfce` (chave, protocolo, `cStat`, `qrCode`, `idnotafiscal`).

`vendalocal = 2` é o que o web usa para “Pedidos da maquininha”. Não troque esse número.

Se `deveEmitirNfce` e a nota não veio `emitida`, `sucessoFiscalCompleto` fica falso e a UI vai para `FalhaNfceActivity`. A venda e a baixa já foram pedidas antes. A tela de falha não desfaz o HTTP. Reemissão citada no cupom: “Reemitir em Consulta NFC-e” (fluxo do ERP, não deste app).

Com o switch desligado: `POST /davs` (`status` 0, `tipodocumento` 4, `extra1 = "POS"`, valores `dinheiro` / `pix` / `posavista` para cartão) e `POST /davs/{id}/itens`. Não emite NFC-e. `sucessoFiscalCompleto` fica verdadeiro. O web lista em `/pedidos?origem=POS` via `extra1`.

Caixa cloud: `GET/POST /fechamentos-caixa` e `PUT /fechamentos-caixa/{id}`. A query de caixa aberto filtra `pdv` + `status=0`. Fechamento imprime resumo (`FechamentoCaixaTexto` + `ImpressoraPos`). No local, caixa vem de `GET /pos/status` (`caixa`). `abrirCaixa` e `fecharCaixa` recusam o modo local (“Abra/Feche o caixa no PDV desktop”). `buscarCaixaAberto` só lê o status.

Cupom: se há `idnotafiscal`, `GET /nfce/{id}/cupom`. Impressão em [perifericos.md](perifericos.md).

Fichas de evento (`KEY_IMPRIMIR_FICHAS_EVENTO`) saem do carrinho da venda rápida, não da mesa.

## O que não remover

- A ordem venda → itens → `baixa-venda` e o flag `vendalocal = 2`.
- O ramo DAV com `extra1 = "POS"` e `tipodocumento` 4.
- `isEmitirNfcePos()` como decisão do app (não a coluna legada da API).
- Gate de caixa em `HomeActivity` no modo cloud.
- Tratamento de `emissaoNfce` / `deveEmitirNfce` e a ida para `FalhaNfceActivity` quando a nota era obrigatória e não autorizou.
- `getProdutoFiscal()` nos itens (pizza meio a meio usa outro id fiscal).

## Efeito se quebrar

A maquininha para de vender, ou vende e o ERP fica inconsistente: venda sem itens, itens sem baixa, estoque baixado sem NFC-e autorizada, ou DAV sem `extra1 = "POS"` invisível em Pedidos da maquininha. Caixa exigido no cloud: sem `fechamentos-caixa` a venda rápida nem abre. Falha de NFC-e com venda já gravada não é rollback — apagar a tela de falha esconde rejeição SEFAZ que o operador precisa ver.
