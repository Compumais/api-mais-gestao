# App shell

## Propósito na maquininha

Sobe dependências globais e decide a primeira tela: login, escolha de empresa ou hub de venda. Toda a UI é Activity + layout XML. Não há Compose nem fragments de navegação.

## Classes e pacotes de entrada

- `app/src/main/java/com/pos_mais_gestao/PosApplication.java` — `android:name` no manifest. Cria `PrefsStore`, `ApiClient`, `OutboxSync`, `EscPosPrinter`, `StubPagamentoHardware`, `BalancaManager`. Aplica tema e insets em toda Activity.
- `app/src/main/java/com/pos_mais_gestao/ui/MainActivity.java` — launcher. Se há token, chama `ApiClient.validarSessao()`. Só faz logout em HTTP 401 ou 403. Falha de rede mantém a sessão.
- `app/src/main/java/com/pos_mais_gestao/ui/PosDestino.java` — hub: `MesasActivity` no modo `pdv_local`, `HomeActivity` no modo `cloud`.
- `app/src/main/AndroidManifest.xml` — lista de Activities. Só `MainActivity` é `exported`.

Activities de fluxo (pacote `com.pos_mais_gestao.ui`): `login.LoginActivity`, `empresa.EmpresaActivity`, `home.HomeActivity`, `venda.VendaActivity`, `mesas.MesasActivity`, `mesas.OccupyActivity`, `mesas.ContaMesaActivity`, `pedido.PedidoActivity`, `pedido.PedidosActivity`, `pagamento.PagamentoActivity`, `cliente.SelecionarClienteActivity`, `sucesso.SucessoActivity`, `falha.FalhaNfceActivity`, `config.ConfigActivity`, `config.BalancaConfigActivity`, `config.BalancaDiagnosticoActivity`, `atalhos.AtalhosActivity`, `vendas.VendasActivity`, `vendas.VendaDetalheActivity`, `produtos.ProdutosActivity`, `util.CodigoCaptureActivity`.

`applicationId` e `namespace`: `com.pos_mais_gestao`. `minSdk` 24, `targetSdk` 36, Java 11. `versionName` `1.12` / `versionCode` 14 em `app/build.gradle.kts` (valores no momento desta leitura).

## Contrato com API ou hardware

O shell não chama hardware de pagamento. `PosApplication.getPagamentoHardware()` existe e não é usado por nenhuma Activity. Rede e periféricos são dos módulos seguintes.

`WindowInsetsHelper` roda no ciclo de vida para a barra do sistema da maquininha. Remover o callback deixa campos sob a barra de navegação.

## O que não remover

- `android:name=".PosApplication"` e a ordem de construção em `onCreate`.
- Intent filters `MAIN` / `LAUNCHER` só em `MainActivity`.
- Flags `FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_CLEAR_TASK` em `MainActivity.abrirDestino` e `PosDestino.intentHub` — sem elas o usuário volta para uma tela de sessão antiga.
- `usesCleartextTraffic` (HTTP de API e do PDV na LAN).

## Efeito se quebrar

Sem `PosApplication` o app não abre API, outbox, impressora nem balança. Sem `MainActivity`/`PosDestino` a maquininha não chega na venda. Logout indevido em erro de rede (qualquer status que não seja 401/403) derruba o operador no meio do turno.
