# Integração HTTP (API cloud e PDV local)

## Propósito na maquininha

Única porta de saída para o ERP e para o PDV Electron na LAN. Não há banco compartilhado, não há import de `api/` nem de `pdv/`.

## Classes e pacotes de entrada

- `app/src/main/java/com/pos_mais_gestao/data/api/ApiClient.java` — fachada usada pelas Activities.
- `app/src/main/java/com/pos_mais_gestao/data/api/LocalPdvApi.java` — cliente `/pos/*`. Comentário da classe: “API LAN do PDV desktop”.
- `app/src/main/java/com/pos_mais_gestao/data/api/ApiException.java` — mensagem + `statusCode` (`0` em IO).
- DTOs no mesmo pacote: `EmpresaDto`, `ContaMesaDto`, `ContaMesaItemDto`, `VendaResultadoDto`, `VendaResumoDto`, `VendaItemDetalheDto`, `FechamentoCaixaDto`, `PedidoFilaDto`, `DavCriadoDto`, `PaginaVendas`, `ClienteDto`.
- Teste do cliente local: `app/src/test/java/com/pos_mais_gestao/data/api/LocalPdvApiTest.java` (MockWebServer).

Rede: OkHttp + Gson. Não há Retrofit. Timeouts de `ApiClient`: connect/read/write 20/30/30 s. `LocalPdvApi`: 8/30/20 s; ping 3/4 s.

`isLocal()` lê `PrefsStore.isModoPdvLocal()` em toda chamada. A base é `getBaseUrl()` sem barra final.

## Contrato com API ou hardware

Auth: `Authorization: Bearer` + token da sessão. Login cloud não envia o header. Imagens de produto no cloud repetem o Bearer (`ProdutoImagemHelper`, `CatalogImageCache`).

Rotas cloud usadas pelo app (prefixo = `KEY_BASE_URL`):

| Uso | Método e caminho |
|---|---|
| Sessão | `GET /api/auth/get-session`, `POST /api/auth/sign-in/email` |
| Empresa | `GET /empresas` |
| Produtos | `GET /produtos`, `GET/PUT /produtos/{id}` (preço) |
| Clientes | `GET /entidades` |
| Caixa | `GET/POST /fechamentos-caixa`, `PUT /fechamentos-caixa/{id}` |
| Atalhos | `GET/PUT /atalhos-pdv` |
| Venda | `POST /vendas-pdv-gourmet`, `POST /vendas-pdv-item`, `GET /vendas-pdv-gourmet`, `GET /vendas-pdv-item` |
| Estoque e NFC-e | `POST /estoque/baixa-venda`, `GET /nfce/{id}/cupom` |
| DAV | `POST /davs`, `POST /davs/{id}/itens`, `GET /davs`, `GET /davs/{id}/itens` |
| Mesa | `GET/POST /contas-mesa`, `PUT /contas-mesa/{id}`, `GET/POST /contas-mesa-item`, `DELETE /contas-mesa-item/{id}` |

Rotas locais:

| Uso | Método e caminho |
|---|---|
| Saúde | `GET /pos/health` |
| Login / empresa | `POST /pos/login`, `GET /pos/empresas`, `POST /pos/empresa` |
| Estado e catálogo | `GET /pos/status`, `GET /pos/sync` |
| Mesas e contas | `GET /pos/mesas`, `POST /pos/mesas/{n}/abrir`, `GET /pos/contas/{id}`, `POST /pos/contas/{id}/itens`, `PUT /pos/contas/{id}/nome`, `POST /pos/contas/{id}/fechar`, `POST /pos/contas/{id}/pedido` |
| Fila | `GET /pos/pedidos`, `POST /pos/pedidos/{id}/entregue`, `POST /pos/pedidos/limpar-fila` |
| Venda | `POST /pos/vendas/rapida`, `GET /pos/vendas`, `GET /pos/vendas/{id}` |

`exigirModoCloud` recusa operação da API web com o texto de que o POS está no PDV local. Vários métodos simplesmente retornam cedo no modo errado (`sincronizarAtalhos` no local não chama a API).

Catálogo cloud é busca online (`buscarProdutos`). Catálogo SQLite enche só com `GET /pos/sync` no modo local (`carregarCatalogo`).

Corpo de erro: campo `error` ou `"HTTP {code}"`. IO no local vira “PDV local indisponível…”.

## O que não remover

- Os dois clientes e o branch `isLocal()`.
- Bearer, timeouts e `usesCleartextTraffic` (URLs `http`).
- Campos de contrato já citados em [venda-fiscal.md](venda-fiscal.md) e [pagamento.md](pagamento.md): `vendalocal`, `extra1`, totais de pagamento, `fiscal.modo`.
- JitPack não é desta camada; OkHttp e Gson são.

Não duplicar cliente HTTP novo ao lado destes dois.

## Efeito se quebrar

Nenhuma venda, mesa ou login conclui. Misturar rota cloud no modo local (ou o contrário) grava no sistema errado: ERP cloud vs banco do PDV desktop. O ERP fica inconsistente se a sequência venda → itens → baixa for reordenada ou se um POST for engolido sem erro. Timeout curto demais no `baixa-venda` / NFC-e marca falha na maquininha com a API ainda processando a nota.
