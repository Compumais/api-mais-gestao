# Catálogo

## Propósito no caixa

A busca, o código de barras, o atalho e o preço da venda leem o cache local. A loja continua vendendo com a API fora.

## Onde vive

- **Main:** `electron/sync/outbox.ts` (`pullCatalogo` / `puxarCatalogoDaEmpresa`), `electron/sync/imagens-produtos.ts`, `electron/sync/imagens-grupos-gourmet.ts`, `electron/sync/carga-local.ts`, `electron/db/repos.ts` (`upsertProdutos`, `salvarAtalhos`, `buscarProdutos`).
- **Renderer:** `src/lib/catalogo-produtos.ts`, `src/ui/pages/home-page.tsx`, `balcao-page.tsx`, `produto-card.tsx`, `barcode-input.tsx`.
- **SQL:** `produto_cache`, `atalho`, `grupo`, `grupo_gourmet`, `cliente`, `bandeira_cartao`, `meio_pagamento`.

Imagens baixadas ficam em disco e são servidas pelo protocolo local registrado em `electron/sync/protocolo-imagens.ts` (`electron/main.ts` chama `registrarEsquemaImagemLocal` antes do `whenReady`).

## Contrato com a API

Pull paginado, com sessão:

| Recurso | Caminho |
| --- | --- |
| Produtos preferencial | `GET /produtos/catalogo-pdv` |
| Fallback | `GET /produtos` (`tipo=P`, `inativo=0`) se o catálogo PDV responder 404 ou 400 de validação de `:id` (`isCatalogoPdvIndisponivel`) |
| Imagem | `GET /produtos/:uuid/imagem` |
| Unidades | `GET /unidades-medida` |
| Grupos | `GET /hierarquias` |
| Grupos gourmet | `GET /grupos-gourmet` |
| Clientes | `GET /entidades?cliente=1` |
| Bandeiras | `GET /bandeiras-cartao` |
| Meios financeiros | `GET /tipos-documento-financeiro` |
| Atalhos | `GET /atalhos-pdv`, `PUT /atalhos-pdv` (`substituirAtalhosRemotos`) |

`marcarProdutosAusentesInativos` marca como inativo o produto que sumiu do pull. Não apague a linha: venda antiga referencia `idproduto`.

Atalho alterado no caixa entra na outbox como `atalhos_pdv`.

## Dados locais que não podem ser apagados no schema

`produto_cache`: `id`, `descricao`, `preco`, `ean`, `codigo`, `idgrupo`, `idgrupogourmet`, `espizza`, `inativo`, campos fiscais (`ncm`, `cest`, `cfop`, `cst`, `csosn`, `origem`, alíquotas PIS/COFINS/ICMS). Sem NCM/CFOP a contingência não monta o item.

`atalho`: `ordem` + `idproduto`. `salvarAtalhos` apaga e reinsere a grade; isso é operação de UI, não de schema.

`meio_pagamento.formapagamentonfe` e `aprazo` ligam o lançamento ao código da NFC-e e ao financeiro.

## Comportamento offline/outbox

Sem pull, vende o cache que já está no disco. Preço desatualizado é o custo do offline; apagar o cache para “forçar online” zera a loja sem rede.

Simplificar o sync do catálogo para substituir `produto_cache` por delete total a cada ciclo apaga produto no meio do carrinho e quebra item já vendido se a UI ainda resolver descrição pelo cache. O código faz upsert e inativa ausentes.

`atalhos_pdv` na fila, se o worker deixar de chamar `substituirAtalhosRemotos` e apenas marcar concluído, o ERP fica com a grade antiga. A venda local não depende disso.

## Configuração crítica

Não há chave só de catálogo além do que a sessão e `api_url` já exigem. Imagem usa o caminho gravado em `caminhoimagem` / `imagemremota`.

Etiqueta de balança (código embutido no EAN) usa as chaves `etiqueta_balanca_*` em [integracoes-perifericos.md](integracoes-perifericos.md).

## O que quebra na operação da loja se remover

- Cache: busca e leitor param; venda rápida não acha produto.
- Fallback `GET /produtos`: API antiga sem `catalogo-pdv` deixa o caixa sem carga.
- Inativar em vez de deletar: se passar a `DELETE` do produto ausente, histórico e reimpressão perdem o vínculo. O efeito exato na tela de vendas antigas depende de join com `item_venda.descricao` (a descrição está copiada no item). O preço corrente some.
- Atalhos: o operador perde a grade de um toque. A fila `atalhos_pdv` deixa de espelhar a grade no ERP.
