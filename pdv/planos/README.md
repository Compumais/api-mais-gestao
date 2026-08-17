# Planos do PDV Mais Gestão

Roadmaps das etapas do PDV gourmet (Electron + PostgreSQL local + POS Android na LAN). São documentos de consulta — **não implementam** feature.

A Etapa 1 (SiTef + pagamento misto) e a Etapa 2 no **PDV Electron** (taxa, couvert, desconto, pré-conta, divisão, transferir/juntar) já foram implementadas. O POS ainda fecha a conta inteira, sem essas telas.

Também já entrou fora das etapas numeradas: config só para admin/proprietário/super; modo PDV secundário na tela de login.

A Etapa 3 tem plano de implementação em [etapa-03-delivery-canais.md](etapa-03-delivery-canais.md) (leva A: delivery próprio e retirada no PDV; canais depois).

## As 5 etapas

| Etapa | Documento | Foco |
|---|---|---|
| 1 | *(plano de execução, não este arquivo)* | SiTef no PDV Electron + pagamento parcial/misto no PDV e no POS |
| 2 | [etapa-02-conta-gourmet.md](etapa-02-conta-gourmet.md) | Divisão, transferência/juntar mesa, taxa 10%/couvert, desconto com senha, pré-conta |
| 3 | [etapa-03-delivery-canais.md](etapa-03-delivery-canais.md) | Delivery próprio (cliente, endereço, taxa) + para viagem/retirada; depois iFood/99Food/Aiqfome |
| 4 | [etapa-04-kds-producao.md](etapa-04-kds-producao.md) | KDS / monitor de produção em cima de `pedido_fila` |
| 5 | [etapa-05-salao-auditoria.md](etapa-05-salao-auditoria.md) | Garçom autenticado, estorno com motivo/senha, opcionais, permissões no PDV, CPF na NFC-e |

P2 (SAT, fidelidade, totem, crediário, recarga) fica **fora** destas 5 etapas.

## O que já existe

O PDV já cobre o núcleo gourmet. Os planos 2–5 partem daqui, sem reescrever o que funciona.

### Mesa, comanda e balcão

- Grade de mesas/comandas (`modelo_atendimento`) em `pdv/src/ui/pages/home-page.tsx`
- Conta aberta com itens e fechamento em `pdv/src/ui/pages/mesa-conta-page.tsx`
- Venda rápida em `pdv/src/ui/pages/balcao-page.tsx`
- Persistência local: `mesa`, `conta_mesa`, `item_conta`, `venda` em `pdv/electron/db/schema.ts`
- Regras de conta/pedido em `pdv/electron/db/repos.ts` (`abrirContaMesa`, `enviarPedidoConta`, `fecharContaMesa`)

### POS Android na LAN

- App em `POSmaisgestao/`
- LAN API do PDV em `pdv/electron/lan-api/server.ts` (mesas, pedido, fechamento, fila do dia)

### Pizza meio a meio

- Flag `espizza` no catálogo local
- Montagem do item (maior preço entre as metades, 1 pizza) em `pdv/src/lib/pizza-meio-a-meio.ts` e `pdv/electron/util/pizza-meio-a-meio.ts`
- Dialog no PDV (`dialog-pizza-meio-a-meio.tsx`) e equivalente no POS

### Impressoras (fiscal e produção)

- Destino por grupo gourmet: `impressora_grupo_gourmet` + `pdv/electron/impressora/destino.ts`
- Cupom de produção ESC/POS em `pdv/electron/impressora/producao.ts` e `escpos.ts`
- Configuração na tela de config do PDV

### Catraca Tecnibra

- Integração XML (`Comandas.xml`) em `pdv/electron/integracao/tecnibra/`
- Polling das comandas com pendência, escrita atômica, testes sem hardware
- Card na tela de config (`tecnibra_habilitada`, caminho, intervalo)

### NFC-e, caixa e sync

- Emissão online/contingência, outbox e histórico local de vendas
- Login único da API (sem perfil de garçom/operador no PDV)
- Cliente na conta hoje é só `nomecliente` (texto), sem CPF/endereço persistidos no fechamento
