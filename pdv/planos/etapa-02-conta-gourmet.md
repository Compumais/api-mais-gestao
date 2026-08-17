# Etapa 2 — Conta gourmet

## Objetivo

Fechar mesa de grupo sem planilha: dividir a conta, transferir ou juntar mesas/comandas, aplicar taxa de serviço (10%) e couvert, conceder desconto com senha gerencial e emitir pré-conta (cupom de conferência, sem NFC-e).

## Lacuna vs mercado

No food service (Uniplus, Linx Menew, VR) a conta não é “um total + um meio”. O operador precisa:

| Capacidade | Quem tem | Situação hoje no Mais Gestão |
|---|---|---|
| Divisão por pessoa, item ou valor | Uniplus, Linx Menew, VR | Um único `valortotal`; `fecharContaMesa` recebe um meio |
| Transferir / juntar mesa ou comanda | Uniplus (ALT+F12), VR | `mesa.numero` e `conta_mesa` são 1:1; não há mover itens nem fundir contas |
| Taxa de serviço 10% e couvert | Uniplus, Linx, VR | Total = soma de `item_conta`; sem linha de taxa |
| Desconto com senha | Uniplus, Linx, VR | Sem desconto e sem senha gerencial no PDV |
| Pré-conta / conferência (cupom não fiscal) | Uniplus F3 | Só cupom fiscal / produção; cliente não confere antes de pagar |

A Etapa 1 (pagamento misto) cobre vários meios no **mesmo** total. Esta etapa cobre **como se forma e se parte** esse total.

## Dependências no código atual

- Modelo local: `mesa`, `conta_mesa`, `item_conta` em `pdv/electron/db/schema.ts`
- Regras: `listarMesas`, `abrirContaMesa`, `adicionarItemConta`, `enviarPedidoConta`, `fecharContaMesa` em `pdv/electron/db/repos.ts`
- UI da conta: `pdv/src/ui/pages/mesa-conta-page.tsx` (fila → itens da conta → um meio → fechar)
- Grade: `pdv/src/ui/pages/home-page.tsx` (livre / consumindo / ociosa; sem ação de transferir)
- LAN API: `GET/POST /pos/mesas`, `POST /pos/contas/:id/pedido`, `POST /pos/contas/:id/fechar` em `pdv/electron/lan-api/server.ts`
- POS: `MesasActivity`, `ContaMesaActivity`, `PagamentoActivity` em `POSmaisgestao/`
- Impressão: `pdv/electron/impressora/` (reutilizar ESC/POS para pré-conta; não emitir NFC-e)
- Catraca Tecnibra: `listarNumerosComPendencia` — transferência/juntar precisa manter o XML coerente com as comandas ocupadas
- Pressupõe Etapa 1: cada fatia da divisão fecha com lançamentos mistos (PIX + dinheiro, dois cartões)

Não há hoje remoção de item da conta, campo de taxa/desconto nem senha de supervisor.

## Escopo

**Entra**

- Divisão da conta aberta por:
  - pessoa (N partes iguais, com ajuste de centavos)
  - item (marcar linhas para cada pagador)
  - valor (rateio informado)
- Transferir itens ou a conta inteira para outra mesa/comanda livre ou ocupada
- Juntar duas contas abertas numa só (itens e total somados; origem fica livre)
- Taxa de serviço configurável (padrão 10%), aplicável/removível na conta; couvert como item ou taxa fixa por pessoa
- Desconto em valor ou percentual, só após senha gerencial (configurada no PDV)
- Pré-conta: cupom não fiscal com itens, subtotal, taxa, desconto e total, sem gravar venda e sem NFC-e
- Mesmas operações no POS via LAN API (dividir/transferir/juntar/taxa/desconto/pré-conta), alinhadas ao desktop

**Não entra neste bloco de escopo** — ver seção seguinte.

## Critérios de aceite

- Mesa de 6 fecha em 3 pagadores (por pessoa ou por item) sem recalcular na mão; cada fatia pode usar pagamento misto da Etapa 1
- Transferir a conta da mesa 4 para a 7 (livre) e juntar a 7 com a 8 (ocupada) preserva itens, observações, pizza meio a meio e total
- Taxa 10% e couvert entram no total da conta e no cupom; NFC-e, quando emitida no fechamento, reflete o mesmo total
- Desconto sem senha é recusado; com senha válida, o total e o cupom batem
- Pré-conta imprime conferência e a mesa continua aberta; só o fechamento gera venda/NFC-e
- POS executa divisão, transferência, taxa e pré-conta contra a LAN API sem divergir do PDV
- Comandas com Tecnibra habilitada continuam listadas no XML após transferir/juntar

## O que fica de fora

- TEF / SiTef e modelagem de lançamentos múltiplos (Etapa 1)
- Delivery, viagem e canais (Etapa 3)
- KDS / status de produção além do que `pedido_fila` já faz (Etapa 4)
- Garçom autenticado, estorno com motivo, opcionais/borda, CPF na NFC-e, mapa do salão (Etapa 5)
- P2: SAT, fidelidade, totem, crediário, recarga
- Reserva de mesa, planta do salão, comissão de garçom
- Integração com o financeiro da API além do sync/outbox já existente da venda
