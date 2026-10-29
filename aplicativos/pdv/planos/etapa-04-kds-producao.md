# Etapa 4 — KDS / monitor de produção

## Objetivo

Dar à cozinha (e ao pass) uma tela de produção — não só o cupom ESC/POS — lendo e atualizando `pedido_fila`: pendente → preparando → pronto → entregue, com agrupamento por mesa/origem e destino (grupo gourmet).

## Lacuna vs mercado

| Capacidade | Quem tem | Situação hoje no Mais Gestão |
|---|---|---|
| KDS / monitor (tela, não só papel) | Linx, Uniplus, ARPA | Produção é cupom em `pdv/electron/impressora/producao.ts` |
| Status “preparando / pronto” | Linx, Uniplus, ARPA | `pedido_fila.status` só tem `pendente` e `entregue` |
| Fila visível no PDV desktop | — | Não há rota de KDS no Electron (`App.tsx`: home, mesa, balcão, vendas, config) |
| Fila no POS | POS `PedidosActivity` | Lista do dia com poll 5s, filtro pendentes/todos, agrupar por mesa; marcar entregue / limpar fila — ainda não é KDS (sem colunas de status, sem destino de impressora) |

O papel continua útil (backup, chapa). O gap é o **monitor** e o ciclo de status.

## Dependências no código atual

- Tabela `pedido_fila` em `pdv/electron/db/schema.ts`: `client_order_id`, `idconta`, `numero_mesa`, `nomecliente`, `idproduto`, `descricao`, `quantidade`, `observacao`, `status`, `criadoem`, `entregueem`
- Índice `idx_pedido_fila_status (status, criadoem)`
- Escrita: `enviarPedidoConta` em `pdv/electron/db/repos.ts` (idempotente por `client_order_id`; status inicial `pendente`)
- Leitura/ação: `listarPedidosFila`, `marcarPedidoEntregue`, `limparFilaPedidos` (só o dia corrente)
- Impressão por `idgrupogourmet` → `impressora_grupo_gourmet` em `pdv/electron/impressora/producao.ts` e `destino.ts`
- LAN API: `GET /pos/pedidos`, `POST /pos/pedidos/:id/entregue`, `POST /pos/pedidos/limpar-fila` em `pdv/electron/lan-api/server.ts`
- POS: `PedidosActivity` + `PedidoFilaDto` + `LocalPdvApi.listarPedidos`
- Origem do rótulo: `rotuloOrigemMesa` (`Mesa` ou `Comanda`); delivery (Etapa 3) deve aparecer como origem extra quando existir

Não há status intermediário, station/KDS por destino, som nem tela cheia no desktop.

## Escopo

**Entra**

- Tela KDS no PDV (rota nova, fullscreen / segunda janela se o hardware tiver segundo monitor)
- Colunas ou kanban: **Pendente → Preparando → Pronto → Entregue**
- Toque/atalho para avançar status; “entregue” reutiliza `marcarPedidoEntregue`
- Agrupar por mesa/comanda/origem e por destino de produção (mesmo mapeamento da impressora)
- Destacar atraso (tempo desde `criadoem`)
- Estender `pedido_fila.status` (migração leve, no estilo de `database.ts`) e a LAN API
- POS: evoluir `PedidosActivity` para os mesmos status (tablet de pass/cozinha)
- Manter o cupom ESC/POS como está — o KDS não substitui a impressão
- Pedidos de mesa, balcão e, se a Etapa 3 já existir, delivery/retirada na mesma fila

**Não entra neste bloco de escopo** — ver seção seguinte.

## Critérios de aceite

- Item enviado da mesa (`enviarPedidoConta`) aparece no KDS do PDV em segundos, sem reimprimir para “ver” o pedido
- Cozinha avança Pendente → Preparando → Pronto; o pass marca Entregue; o POS mostra o mesmo estado via LAN
- Dois destinos (ex.: pizza e bebida) podem ser filtrados/agrupados sem misturar as filas
- Pedido já impresso em ESC/POS continua válido se o KDS estiver fechado
- `client_order_id` segue idempotente: reenvio do POS não duplica card no KDS
- Limpar fila e virada do dia não apagam histórico do dia; só concluem pendentes, como hoje
- Sem segundo monitor, a tela KDS abre em janela/rota no mesmo PDV

## O que fica de fora

- Multi-PDV com fila única orquestrada entre vários caixas (P2 / Linx-VR); o desenho atual é 1 PDV + N POS na LAN
- App nativo de KDS separado do Electron/POS
- Integração com equipamentos de chapa (impressora de produção já existe)
- Estoque baixado por status de KDS (baixa continua no fechamento/sync da venda)
- Mapa do salão, reserva, tempo de mesa como planta (citado nas lacunas P1; não é KDS)
- Garçom autenticado e estorno com senha (Etapa 5)
- Divisão de conta e delivery (Etapas 2 e 3) — o KDS só **consome** a fila que essas etapas alimentarem
- P2: SAT, fidelidade, totem, crediário, recarga
