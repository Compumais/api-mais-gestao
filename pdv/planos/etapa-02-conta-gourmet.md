# Etapa 2 — Conta gourmet (plano de implementação)

Status: **plano** — PDV Electron nesta leva. POS Android fica para uma leva seguinte.

A Etapa 1 já fecha a mesma conta com vários meios. Esta etapa cobre **como o total se forma e se parte**: taxa, couvert, desconto, pré-conta, divisão, transferir e juntar.

## Decisão de escopo

- **Entra agora:** PDV Electron (mesa/comanda), LAN API no principal (para o POS não quebrar e para o secundário continuar lendo contas), testes unitários das regras.
- **Não entra agora:** telas e fluxos novos no POS Android. O POS continua fechando a conta inteira com pagamento misto, sem dividir/transferir/taxa.

## Lacuna vs mercado

No food service (Uniplus, Linx Menew, VR) a conta não é “um total + um meio”. O operador precisa dividir, transferir, aplicar 10%, dar desconto com senha e imprimir conferência antes do fiscal.

Hoje no PDV local: `conta_mesa.valortotal` = soma de `item_conta`; `fecharContaMesa` cobra esse total de uma vez; não há mover itens, senha gerencial nem cupom de conferência.

## Fórmula do total (alinha ao ERP / NFC-e)

A API e o Web já usam:

`total = max(0, subtotal − desconto + taxaServico + couvert)`

(`web/src/lib/gourmet-utils.ts` → `calcularTotalComTaxas`; NFC-e em `api/src/service/nfce-emissao/atualizar-venda-nfce-pdv.ts`.)

O PDV local passa a gravar esses quatro números na conta e a usar **esse total** no pagamento misto, no cupom e no outbox. Sem isso a NFC-e diverge do que o cliente pagou.

Couvert é valor fixo por pessoa × `numeropessoas` (configurável). Taxa é percentual sobre o subtotal dos itens (padrão 10%), ligável/desligável na conta.

## Modelo local

Estender `conta_mesa` em [`pdv/electron/db/schema.ts`](pdv/electron/db/schema.ts) / [`pdv/db/schema.sql`](pdv/db/schema.sql):

- `numeropessoas` (int, default 1)
- `valordesconto`, `valortaxaservico`, `valorcouvert` (numeric)
- `taxa_ativa` (0/1) — se 1, taxa = % config × subtotal
- `subtotal` pode ser derivado da soma dos itens; `valortotal` passa a ser a fórmula acima, recalculada em todo mutate de item/ajuste

Config (aba Geral):

- `taxa_servico_percentual` (default `10`)
- `couvert_valor` (default `0`)
- `senha_gerencial` (hash, não texto puro) — só para desconto nesta etapa

Novo módulo de regras: `pdv/electron/db/conta-gourmet.ts` (puro, testável):

- `recalcularTotaisConta({ itens, numeropessoas, taxaAtiva, percentualTaxa, couvertUnitario, desconto })`
- `partirPorPessoas(total, n)` — N partes iguais, resto de centavos na última
- `partirPorValor(total, valores[])` — soma tem que bater
- `partirPorItens(itens, grupos)` — cada grupo vira uma fatia com seus itens; taxa/desconto/couvert rateados proporcionalmente ao subtotal da fatia

`fecharContaMesa` em [`pdv/electron/db/repos.ts`](pdv/electron/db/repos.ts) deixa de usar só `conta.valortotal` cru: usa o total recalculado e envia desconto/taxa/couvert no outbox para a API (`vendapdv` / gourmet) no mesmo formato que o Web já manda.

## Operações

### 1. Ajustes na conta (antes de pagar)

Na [`mesa-conta-page.tsx`](pdv/src/ui/pages/mesa-conta-page.tsx), barra de conta:

- pessoas (N)
- toggle taxa 10% (ou % da config)
- couvert (N × valor config, editável)
- desconto R$ ou % — **abre dialog de senha gerencial**; recusa se inválida
- totais visíveis: subtotal, desconto, taxa, couvert, a pagar

### 2. Pré-conta

Novo `imprimirPreConta(idconta)` em [`pdv/electron/impressora/escpos.ts`](pdv/electron/impressora/escpos.ts):

- cupom **não fiscal** (“CONFERÊNCIA — NÃO É DOCUMENTO FISCAL”)
- itens, subtotal, desconto, taxa, couvert, total
- **não** cria `venda`, **não** emite NFC-e, mesa permanece aberta
- reutiliza destino fiscal já configurado

Atalho na conta (ex. F3, alinhado ao Uniplus).

### 3. Divisão no fechamento

Não quebra a conta em N vendas no banco até cada fatia ser paga (evita mesa “meia fechada” sem rastreio).

Fluxo:

1. Operador escolhe modo: pessoas | itens | valor.
2. UI monta fatias (`valor` + itens da fatia).
3. Para cada fatia, reutiliza [`dialog-pagamento-misto.tsx`](pdv/src/ui/components/dialog-pagamento-misto.tsx) (Etapa 1).
4. Fatia paga → grava uma `venda` parcial (`origem: 'mesa'`, mesmos `idconta`, itens da fatia, totais da fatia).
5. Itens pagos saem da conta (ou ficam marcados `pago`); `valortotal` da conta cai.
6. Quando não restar saldo, fecha `conta_mesa` e libera a mesa como hoje.

Se o operador cancelar no meio, o que já foi pago permanece (vendas parciais); o restante fica na mesa.

### 4. Transferir

- **Conta inteira:** muda `numero_mesa` da conta aberta; origem fica livre; destino precisa estar livre **ou** vazio. Se destino já tem conta aberta → recusar e sugerir **juntar**.
- **Itens selecionados:** move linhas de `item_conta` para a conta do destino (abre conta se destino livre). Recalcula totais nas duas. Pizza meio a meio e observação vão junto.

Depois: `avisarTecnibra()` para o XML refletir comandas ocupadas.

### 5. Juntar

Origem + destino abertas → itens da origem vão para o destino; origem fecha vazia e mesa fica livre; destino soma totais (taxa/desconto: destino prevalece; origem não carrega desconto da outra mesa). Recalcular + Tecnibra.

## UI

- [`mesa-conta-page.tsx`](pdv/src/ui/pages/mesa-conta-page.tsx): ajustes, pré-conta, dividir, transferir itens.
- [`home-page.tsx`](pdv/src/ui/pages/home-page.tsx): ação na mesa ocupada — transferir conta / juntar (escolhe destino na grade).
- [`config-page.tsx`](pdv/src/ui/pages/config-page.tsx): aba **Geral** — % taxa, valor couvert, senha gerencial (definir/alterar).
- Dialogs novos: senha gerencial, dividir conta, escolher mesa destino.

IPC em [`local-api/index.ts`](pdv/electron/local-api/index.ts): `recalcularConta`, `aplicarAjustesConta`, `validarSenhaGerencial`, `imprimirPreConta`, `dividirFecharFatia`, `transferirConta`, `transferirItens`, `juntarContas`.

LAN API ([`lan-api/server.ts`](pdv/electron/lan-api/server.ts)): expor as mesmas operações (mesmo sem UI POS agora), para o secundário e para o POS na leva seguinte.

## NFC-e e sync

No outbox `criar_venda`, incluir `valordesconto`, `valortaxaservico`, `valorcouvert` (e, se a API gourmet já tiver os campos, mapear 1:1 com `contamesa` / venda PDV). Conferir `POST /vendas-pdv-gourmet` e estender só o mínimo para o XML da NFC-e bater com o total pago.

Itens de taxa/couvert: **não** inventar produto fantasma no cupom de produção. No DANFCE, seguir o que a API já faz (totalização no pagamento, não linha de produto), salvo se a emissão atual exigir item — nesse caso uma linha de serviço só no XML, nunca na cozinha.

## Tecnibra

`listarNumerosComPendencia` já olha mesa ocupada com itens. Transferir/juntar tem que atualizar `mesa.status` / `item_conta` **antes** do `avisarTecnibra()`, para a comanda origem sair do XML e a destino entrar.

## Testes (sem impressora)

`pdv/electron/db/conta-gourmet.test.ts`:

- 10% + couvert 2 pessoas + desconto → total da fórmula
- 3 pessoas em R$ 100,00 → 33,33 / 33,33 / 33,34
- partir por itens preserva soma
- senha errada não aplica desconto (função de hash)
- juntar/transferir: origem livre, destino com todos os itens

`npm run test:conta-gourmet` no [`pdv/package.json`](pdv/package.json).

## Critérios de aceite (esta leva)

- Mesa de 6 fecha em 3 pagadores (pessoa ou item) no **PDV**, cada fatia com pagamento misto da Etapa 1
- Transferir mesa 4 → 7 (livre) e juntar 7 + 8 (ocupada) preserva itens, observação, pizza meio a meio e total
- Taxa 10% e couvert entram no total, no pré-conta e na venda/NFC-e
- Desconto sem senha é recusado; com senha, total e cupom batem
- Pré-conta imprime conferência; mesa continua aberta; só o fechamento gera venda/NFC-e
- Tecnibra: XML coerente após transferir/juntar
- POS **não** precisa destas telas ainda; fechamento integral atual continua válido

## Fora desta etapa

- Telas POS (dividir/transferir/taxa/pré-conta)
- Delivery / canais (Etapa 3)
- KDS (Etapa 4)
- Garçom autenticado, estorno com motivo, opcionais, CPF na NFC-e, mapa do salão (Etapa 5)
- Reserva, planta, comissão
- ~~Compartilhar a **mesma** mesa aberta entre PDV principal e secundário~~ — feito via proxy LAN (`operacoes-remoto` no secundário)
