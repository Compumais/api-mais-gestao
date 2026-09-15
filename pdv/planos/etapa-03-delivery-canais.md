# Etapa 3 — Delivery e retirada (plano de implementação)

Status: **próximo plano** — leva A no PDV Electron. POS pela LAN API na mesma etapa, telas Android numa leva seguinte. Canais (iFood / 99Food / Aiqfome) são **leva B**, depois desta estável.

A Etapa 2 já fecha mesa com taxa de serviço, couvert, desconto e divisão. Esta etapa cobre **pedido que não é mesa**: delivery próprio e retirada / para viagem, com cliente, endereço, taxa de entrega e senha de chamada.

## Decisão de escopo

- **Entra agora (leva A):** PDV Electron, regras testáveis, LAN API no principal (secundário e POS não quebram), sync/NFC-e com origem e taxa de entrega.
- **Não entra agora:** telas novas no POS Android; motoboy; marketplace. O POS continua mesa/balcão como hoje.
- **Fora desta etapa:** KDS (Etapa 4), garçom/estorno/CPF na nota como feature isolada (Etapa 5). O cadastro de cliente daqui **alimenta** o CPF depois.

## Lacuna vs mercado

| Capacidade | Quem tem | Situação hoje |
|---|---|---|
| Delivery próprio (cliente, endereço, taxa) | Uniplus, Linx, VR Food | Só `nomecliente` texto; sem endereço, taxa de entrega ou status de rota |
| Para viagem / retirar depois / senha | Uniplus, Linx | Balcão (`origem = 'rapida'`) é venda imediata; mesa é consumo no local |
| iFood / 99Food / Aiqfome | Linx, Uniplus, VR | Pedido do canal não entra no PDV (leva B) |

O gourmet brasileiro espera delivery no mesmo caixa. Sem isso o pedido cai em outro sistema.

## Fórmula do total

Reaproveita a da Etapa 2 e soma **taxa de entrega** (não confundir com taxa de serviço do salão):

`total = max(0, subtotal − desconto + taxaServico + couvert + taxaEntrega)`

No delivery/retirada desta leva: taxa de serviço e couvert ficam **0** (não há salão). Desconto com senha gerencial continua válido.

Taxa de entrega: valor fixo da config **ou** valor do bairro, gravado na conta no momento do pedido (não recalcula sozinha se a config mudar no meio).

## Modelo local

Não usar a grade de mesas para delivery. A conta continua sendo o núcleo (`item_conta`, `pedido_fila`, pagamento misto, NFC-e), com modalidade nova.

Estender `conta_mesa` em [`pdv/electron/db/schema.ts`](pdv/electron/db/schema.ts) / [`pdv/db/schema.sql`](pdv/db/schema.sql):

- `modalidade` TEXT NOT NULL DEFAULT `'mesa'` — `mesa` \| `delivery` \| `retirada`
- `telefone` TEXT
- `endereco` TEXT
- `bairro` TEXT
- `valorentrega` DOUBLE PRECISION NOT NULL DEFAULT 0
- `status_entrega` TEXT — `recebido` \| `producao` \| `saiu` \| `entregue` (só delivery/retirada)
- `senha_chamada` TEXT — número curto visível no PDV (retirada e delivery)
- `idcliente` TEXT — cache local, opcional

Para delivery/retirada, `numero_mesa` fica **0** (não ocupa slot da grade). Listagem é outra tela, não a home de mesas.

Tabela nova `cliente_pdv` (cache local, sem obrigar sync com a API nesta leva):

- `id`, `nome`, `telefone`, `cnpjcpf`, `endereco`, `bairro`, `atualizadoem`
- Busca por telefone/nome na abertura do pedido
- Cadastro rápido se não existir

Config (aba Geral, só admin/proprietário):

- `taxa_entrega_padrao` (default `0`)
- `bairros_entrega` JSON texto — `[{ "bairro": "Centro", "taxa": "8.00" }]` (opcional; se vazio, usa o valor padrão)

`venda.origem` passa a aceitar `delivery` e `retirada` além de `rapida` e `mesa`.

Novo módulo puro `pdv/electron/db/pedido-entrega.ts` (testável):

- `gerarSenhaChamada(seq)` — 3–4 dígitos, único no dia
- `resolverTaxaEntrega({ bairro, padrao, tabelaBairros })`
- `recalcularTotaisEntrega` — envolve `recalcularTotaisConta` da Etapa 2 + `valorentrega`
- `podeFecharDelivery(conta)` — delivery exige endereço; retirada não
- `proximoStatusEntrega(atual)` — recebido → producao → saiu → entregue (retirada: recebido → producao → entregue, sem “saiu”)

## Operações

### 1. Abrir pedido delivery / retirada

Home: botão **Delivery** ao lado de Balcão (atalho F6).

Dialog: modalidade (delivery | retirada), busca cliente (telefone), nome, endereço/bairro se delivery, taxa (preenchida pelo bairro ou padrão, editável).

Cria conta `modalidade=delivery|retirada`, `numero_mesa=0`, senha de chamada, status `recebido`. Abre a mesma tela de conta (itens, pizza meio a meio, enviar à cozinha).

### 2. Montar, produzir, pagar

Reutiliza [`mesa-conta-page.tsx`](pdv/src/ui/pages/mesa-conta-page.tsx) (ou rota `/delivery/:id` com o mesmo componente):

- Itens, observação, meio a meio, enviar pedido → `pedido_fila` + cupom de produção (origem “Delivery” / “Retirada” + senha)
- **Não** mostra transferir/juntar/pessoas/taxa 10%/couvert
- Mostra senha, endereço, taxa de entrega, status
- Pagamento misto da Etapa 1; fechamento gera `venda` com `origem` correspondente e `valorentrega` no total
- NFC-e igual às outras origens (outbox)

Enviar à cozinha avança status para `producao` se ainda estava `recebido`.

### 3. Painel de pedidos abertos

Tela `/delivery`: lista contas `modalidade IN (delivery, retirada)` com status `aberta`.

Colunas: senha, cliente, telefone, modalidade, status, total, tempo. Filtro por status. Ações: abrir, marcar saiu/entregue (delivery), chamar retirada.

Retirada “para viagem” no balcão: na [`balcao-page.tsx`](pdv/src/ui/pages/balcao-page.tsx), opção **consumo / viagem / retirar depois**. Viagem imediata continua `origem=rapida`. Retirar depois abre conta `retirada` (senha + fila), em vez de fechar na hora.

### 4. Cliente

Cadastro rápido local. Não bloqueia se a API de entidades estiver offline. Sync de cliente com o ERP fica para depois (Etapa 5 / CPF na nota pode reutilizar `cnpjcpf`).

## UI

- [`home-page.tsx`](pdv/src/ui/pages/home-page.tsx): botão Delivery + F6
- Nova [`delivery-page.tsx`](pdv/src/ui/pages/delivery-page.tsx): lista + dialog abrir pedido
- [`mesa-conta-page.tsx`](pdv/src/ui/pages/mesa-conta-page.tsx): ramo modalidade (esconde salão, mostra entrega)
- [`balcao-page.tsx`](pdv/src/ui/pages/balcao-page.tsx): consumo / viagem / retirar depois
- [`config-page.tsx`](pdv/src/ui/pages/config-page.tsx): taxa padrão e bairros
- [`App.tsx`](pdv/src/App.tsx): rotas `/delivery` e `/delivery/:id`

IPC em [`local-api/index.ts`](pdv/electron/local-api/index.ts): `abrirPedidoEntrega`, `listarPedidosEntrega`, `buscarClientesPdv`, `salvarClientePdv`, `atualizarStatusEntrega`, `aplicarTaxaEntrega`.

LAN API ([`lan-api/server.ts`](pdv/electron/lan-api/server.ts)): `GET/POST /pos/delivery`, status, clientes locais — mesmo sem UI POS agora.

## NFC-e e sync

No outbox `criar_venda`, incluir `origem` (`delivery` \| `retirada`) e `valorentrega`. Estender `POST /vendas-pdv-gourmet` só o mínimo para o total da NFC-e bater com o pago (taxa de entrega no total, **não** como item de cozinha).

`CHAVES_CONFIG_NEGOCIO` do secundário: incluir `taxa_entrega_padrao` e `bairros_entrega` (negócio da loja). Hardware continua local.

## Testes (sem impressora)

`pdv/electron/db/pedido-entrega.test.ts`:

- delivery sem endereço é recusado; retirada sem endereço é aceita
- bairro “Centro” R$ 8 + subtotal 40 → total 48
- senha de chamada única no dia
- status delivery não pula `saiu`; retirada não tem `saiu`
- fórmula Etapa 2 + entrega: desconto 5 + entrega 8 em subtotal 40 → 43
- origem da venda `delivery` / `retirada`

`npm run test:pedido-entrega` no [`pdv/package.json`](pdv/package.json).

## Critérios de aceite (leva A)

- Operador lança delivery com cliente, endereço e taxa; a cozinha recebe cupom/fila; o total inclui a entrega; o fechamento gera venda `origem=delivery`
- Retirada gera senha visível; “retirar depois” não fecha no ato; para viagem no balcão continua venda rápida
- Pagamento misto (Etapa 1) funciona nessas origens
- Pedido delivery sem endereço é recusado
- Grade de mesas **não** lista delivery; painel próprio
- POS **não** precisa das telas ainda; LAN API já existe para a leva seguinte
- PDV secundário puxa taxa/bairros do principal; mesas/comandas/delivery/fila são operados no principal via proxy LAN (`operacoes-remoto`)

## Leva B (depois)

Ingestão iFood / 99Food / Aiqfome para o mesmo `pedido_fila` e catálogo. Item sem mapeamento fica pendente, não some. Pagamento do canal já quitado (não pedir PIX/cartão de novo). NFC-e e produção iguais ao delivery próprio.

## Fora desta etapa

- Telas POS (delivery/retirada)
- App ou roteirização de motoboy
- Cardápio digital / WhatsApp Business
- Drive-thru, totem, fidelidade (P2)
- KDS avançado (Etapa 4) — esta leva só reutiliza `pedido_fila` e a impressão já existentes
- Garçom autenticado, estorno auditado, opcionais, CPF na NFC-e como feature isolada (Etapa 5)
- ~~Compartilhar o mesmo pedido delivery entre PDV principal e secundário~~ — feito via proxy LAN
- Implementar os três marketplaces na mesma sprint que o delivery próprio
