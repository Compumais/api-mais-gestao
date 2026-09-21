# Persistência local e fila offline

## Propósito na maquininha

Guarda sessão, configuração, catálogo do PDV local e uma fila de vendas/atalhos quando o modo cloud está sem rede. Não substitui o PostgreSQL do ERP nem o do PDV Electron.

## Classes e pacotes de entrada

- `app/src/main/java/com/pos_mais_gestao/data/local/PrefsStore.java` — `pos_mais_gestao` + sessão `pos_mais_gestao_session`.
- `app/src/main/java/com/pos_mais_gestao/data/local/CatalogDb.java` — SQLite `pos_catalogo.db`, versão 4.
- `app/src/main/java/com/pos_mais_gestao/data/local/CatalogRepository.java`
- `app/src/main/java/com/pos_mais_gestao/data/sync/CatalogImageSync.java`, `CatalogImageCache.java`
- `app/src/main/java/com/pos_mais_gestao/data/local/OutboxDb.java` — SQLite `pos_outbox.db`, versão 1.
- `app/src/main/java/com/pos_mais_gestao/data/sync/OutboxSync.java`
- `app/src/main/java/com/pos_mais_gestao/domain/Carrinho.java` — só RAM.

Quem dispara a fila: `HomeActivity` chama `processarPendentes()` no modo cloud quando há rede. `AtalhosActivity` enfileira atalhos se o PUT falhar ou não houver rede. `PagamentoActivity` enfileira venda rápida cloud sem rede.

## Contrato com API ou hardware

Tabela `outbox`: `id`, `tipo`, `payload`, `status` (`pendente` / `ok`), `tentativas`, `criadoem`. Lote de até 50 pendentes, ordem `id ASC`.

| Tipo | Quem grava | O que o sync faz |
|---|---|---|
| `venda_pdv` | `enfileirarVenda` | `ApiClient.criarVendaPdvRapida` com os itens e pagamentos do JSON |
| `atalhos` | `enfileirarAtalhos` | `PUT /atalhos-pdv` |
| `item_mesa` | ninguém no código atual | `processarPendentes` ignora |

Replay da venda usa o modo e o switch NFC-e **do momento do sync**, não um snapshot fiscal dentro do payload. Se o operador mudou cloud→local, ou ligou/desligou NFC-e, o reenvio segue a configuração nova (`criarVendaPdvRapida`).

Sucesso marca `status=ok`. Falha só incrementa `tentativas` e deixa `pendente` (não há teto que desista). Não há cancelamento de venda na fila. Se a API gravou e o processo morreu antes de `marcarConcluido`, o próximo sync envia de novo — risco de venda duplicada no ERP. Não confirmado idempotência dessa rota no app (o corpo da outbox não manda chave própria de deduplicação).

Catálogo local (`substituirCarga` apaga e regrava): `catalogo_grupo`, `catalogo_grupo_gourmet`, `catalogo_produto` (EAN, grupo gourmet, imagem, `espizza`), `catalogo_atalho`, `catalogo_meta`. `onUpgrade` cobre versões 2–4; `onUpgrade` vazio da outbox não migra colunas novas.

Imagens: cache em disco via `CatalogImageSync` durante `GET /pos/sync`. Não é a fila de venda.

Carrinho não sobrevive a kill do processo. A outbox sobrevive.

## O que não remover

- Os dois arquivos SQLite e os `CREATE TABLE` / upgrades do catálogo.
- `commit()` do token e o prefs de `terminal_id`.
- Chamada de `processarPendentes` na `HomeActivity` cloud.
- Payload com `itens`, `pagamentos`, `meio` e `troco` — o leitor aceita payload antigo só com `meio`.
- Contador `contarPendentes` mostrado na home (`txtSyncPendente`).

Não apague `pos_outbox.db` num “clear data” de desenvolvimento sem avisar: vendas offline ainda não foram para o ERP.

## Efeito se quebrar

Sem rede, a venda rápida cloud deixa de enfileirar e o operador não conclui, ou conclui na UI (`OFFLINE`) e o ERP nunca recebe. Sync quebrado deixa `tentativas` subindo e o financeiro atrasado. Sync que ignora `pagamentos` sobe venda com meio errado. Catálogo local corrompido (upgrade pulado) esvazia a grade da maquininha no modo PDV. Mesa offline não usa esta fila — ver [mesas-comandas.md](mesas-comandas.md).
