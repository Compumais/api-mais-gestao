# Compras

## Propósito

Cotação e pedido de compra no ERP, mais a página em que o fornecedor responde pelo link. A comparação de preços e o vínculo com a NF de entrada ficam na API; o front lista, edita e envia.

## Rotas

ERP (`src/app/(auth)/compras`):

- `/compras/cotacoes`
- `/compras/cotacoes/novo`
- `/compras/cotacoes/[id]`
- `/compras/cotacoes/[id]/editar`
- `/compras/cotacoes/[id]/comparativo`
- `/compras/pedidos`
- `/compras/pedidos/novo`
- `/compras/pedidos/[id]`

Pública (sem grupo `(auth)`): `/cotacao-compra/[token]`. Ver [publico.md](publico.md).

## Services / hooks

- `src/services/cotacoes-compra.service.ts` — query `["cotacao-compra", id]` na edição
- `src/services/pedidos-compra.service.ts` — `["pedidos-compra", empresa.id, page]`
- Schemas: `cotacao-compra.schema.ts`, `pedido-compra.schema.ts`
- Itens da cotação usam produto/unidade/fornecedor dos cadastros ([cadastros.md](cadastros.md)). Não há hook dedicado em `src/hooks` para compras: a página chama o service via React Query.

## Estado compartilhado

- Lista e detalhe não compartilham a mesma chave (`pedidos-compra` vs `cotacao-compra`). Invalidar só uma deixa a outra velha.
- Fornecedor vem de `entidades` / `fornecedores`.
- A NF de compra é outro módulo ([fiscal.md](fiscal.md)); não há invalidate automático confirmado de `["notas-fiscais-compra"]` ao salvar pedido de compra.

## Permissões / guards

Menu Compras: `PERFIS_GESTAO`. Prefixo `/compras` **não** está em `REGRAS_ACESSO_ROTAS` (URL direta não é barrada por feature). A página pública do token não passa por `ProtectedRoute`.

## O que não remover

- Zod da cotação e do pedido (itens, quantidades, fornecedor).
- Rota `/cotacao-compra/[token]` fora do shell autenticado.
- Tela de comparativo (`[id]/comparativo`): é rota real, não um modo da listagem.

## Regressões típicas

- Exigir empresa no link público do fornecedor.
- Reusar a chave `["pedidos"]` dos DAV de venda. Pedido de compra é `["pedidos-compra"]`.
- Apagar o comparativo achando que a listagem basta: a rota existe e a busca/menu apontam para a lista, não para o comparativo.
