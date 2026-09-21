# Produção

## Propósito no produto

Ficha técnica (composição) e registro de produção. Na venda, a ficha pode explodir componentes no estoque.

## Pastas e entrypoints

- `src/controllers/http/ficha-producao/rotas.ts` — CRUD `/fichas-producao` com `verifyJwt`.
- `src/controllers/http/producao/rotas.ts` — somente `GET /producoes` e `GET /producoes/:id` com `verifyJwt`. Não há POST de produção neste plugin.
- Services: `src/service/ficha-producao/`, `src/service/producao/` (`garantir-producao-na-venda.ts` é chamado por `registrar-movimentos-estoque-nf.ts`).
- Schema: `drizzle/tables/ficha-producao.ts`, `ficha-producao-item.ts`, `registro-producao.ts`, `registro-producao-item.ts`.
- Repositórios: `ficha-producao-repositories.ts`, `registro-producao-repositories.ts`.

## Contratos externos

ERP web para ficha e consulta de produção. A gravação automática nasce da movimentação de estoque da nota de venda, não de uma rota POST. PDV/POS: não confirmado como clientes diretos; o efeito chega se a venda baixar estoque.

## Configuração crítica

Nenhuma env própria no código lido.

## Invariantes

- Ficha liga produto acabado a componentes e quantidades. Alterar a ficha muda a próxima venda; não reprocessa produção já gravada.
- `garantirProducaoNaVendaService` precisa continuar sendo chamado no fluxo de movimento da NF. Remover a chamada produz venda sem baixa dos insumos.
- O plugin HTTP de produção é consulta. Criar produção “só pela API REST” não existe no `rotas.ts` lido. Não inventar POST sem o service que já grava pelo fluxo de venda.
- Itens da ficha referenciam produtos. Apagar componente quebra a explosão.

## O que quebra se alterar ou apagar

- Custo e saldo de insumos na venda de produto produzido.
- Consulta de produções já registradas.
- Composição usada por relatórios de produto, se lerem a ficha (não confirmado em todos os relatórios).

## Dependências de outros módulos da API

Produtos, estoque, notas fiscais (venda).

## Testes relacionados

Teste dedicado `garantir-producao-na-venda.test.ts`: não confirmado. O acoplamento está em `src/service/nota-fiscal/registrar-movimentos-estoque-nf.ts`.
