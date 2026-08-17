# Etapa 3 — Delivery e canais

## Objetivo

Tratar delivery e retirada como modalidades de atendimento ao lado de mesa/comanda/balcão: pedido com cliente, endereço e taxa no delivery próprio; para viagem / retirar depois no balcão; e, numa segunda leva, ingestão de iFood, 99Food e Aiqfome no mesmo PDV (estoque, produção e NFC-e).

## Lacuna vs mercado

| Capacidade | Quem tem | Situação hoje no Mais Gestão |
|---|---|---|
| Delivery próprio (cliente, endereço, taxa por região, motoboy) | Uniplus, Linx, VR Food | Só `nomecliente` texto em `conta_mesa` / `mesa`; sem endereço, taxa de entrega ou status de rota |
| Para viagem / retirar depois / senha de retirada | Uniplus, Linx | Balcão (`origem = 'rapida'`) é venda imediata; mesa/comanda é consumo no local |
| iFood / 99Food / Aiqfome | Linx, Uniplus, VR, Clipp Pro | Pedido do marketplace não entra no PDV; produção e NFC-e ficam manuais |

O gourmet brasileiro espera delivery no mesmo caixa. Sem isso o pedido cai em outro sistema.

## Dependências no código atual

- Modalidades atuais: `modelo_atendimento` (`mesa` \| `comanda`) + rota `/balcao` em `pdv/src/App.tsx`
- `venda.origem` em `pdv/electron/db/schema.ts` hoje é `'rapida'` ou `'mesa'` (`criarVendaRapida` / `fecharContaMesa` em `pdv/electron/db/repos.ts`)
- Identificação: apenas `nomecliente` (abertura da mesa em `home-page.tsx`, edição na conta)
- Fila de produção: `enviarPedidoConta` grava `pedido_fila` e `imprimirProducaoPedido` (`pdv/electron/impressora/producao.ts`) — delivery deve reutilizar a mesma fila
- POS: `SelecionarClienteActivity` + `ClienteDto` (`id`, `nome`, `cnpjcpf`) já buscam cliente da API, sem endereço de entrega no PDV local
- LAN API: venda rápida e conta de mesa; não há recurso `/pos/delivery`
- Catálogo e NFC-e: iguais às outras origens (outbox + emissão)
- Pizza meio a meio e grupos gourmet → impressora já servem para a cozinha do delivery

Não há tabela local de endereço, região/taxa, motoboy nem webhook de marketplace.

## Escopo

**Leva A — delivery próprio e retirada (implementar primeiro)**

- Nova origem de venda/pedido: `delivery` e `retirada` (além de mesa/balcão)
- Cadastro rápido de cliente no PDV: nome, telefone, CPF/CNPJ opcional, um ou mais endereços
- Taxa de entrega por região/bairro ou valor fixo configurável; soma no total antes do pagamento
- Fluxo: montar pedido → produção (`pedido_fila` + cupom) → pagamento (misto da Etapa 1) → NFC-e
- Para viagem no balcão e “retirar depois” com senha/número de chamada
- Status simples do delivery próprio: recebido, em produção, saiu para entrega, entregue (sem app de motoboy nesta etapa)
- POS: abrir pedido delivery/retirada via LAN API com os mesmos campos

**Leva B — canais (depois da leva A estável)**

- Ingestão de pedidos iFood, 99Food e Aiqfome para o mesmo `pedido_fila` e catálogo local
- Mapeamento item do canal → produto do PDV; rejeição explícita se não houver vínculo
- Pagamento do canal marcado como já quitado no marketplace (não pedir PIX/cartão de novo)
- NFC-e e produção iguais ao delivery próprio

**Não entra neste bloco de escopo** — ver seção seguinte.

## Critérios de aceite

**Leva A**

- Operador lança um delivery com cliente, endereço e taxa; a cozinha recebe o pedido (cupom e/ou fila); o total inclui a taxa; o fechamento gera venda com origem `delivery`
- Balcão registra “para viagem” e “retirar depois”; a retirada usa senha/número visível no PDV e no POS
- Pagamento misto (Etapa 1) funciona nessas origens
- Pedido sem endereço no delivery próprio é recusado; retirada não exige endereço
- POS cria e fecha delivery/retirada pela LAN API sem segundo cadastro

**Leva B**

- Pedido de teste de um canal aparece no PDV com itens mapeados, vai para produção e fecha NFC-e sem redigitar o cardápio
- Item sem mapeamento não some: fica pendente de vínculo, não some do canal

## O que fica de fora

- App ou roteirização de motoboy, rastreio em tempo real, integração com logística terceira
- Cardápio digital / WhatsApp Business como canal próprio
- Drive-thru (P2 / Uniplus)
- Multi-loja com um único aggregator
- Divisão de conta e taxa 10% de salão (Etapa 2) — no delivery a taxa é de **entrega**, não de serviço
- KDS avançado (Etapa 4) — a leva A só reutiliza `pedido_fila` e a impressão já existentes
- Garçom, estorno auditado, opcionais além do meio a meio, CPF na nota como feature isolada (Etapa 5; o cadastro de cliente desta etapa pode **alimentar** o CPF depois)
- P2: SAT, fidelidade, totem, crediário, recarga
- Implementar os três marketplaces na mesma sprint que o delivery próprio
