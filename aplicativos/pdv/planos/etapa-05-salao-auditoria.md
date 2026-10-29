# Etapa 5 — Salão e auditoria

## Objetivo

Fechar o ciclo de operação no salão: garçom autenticado no POS/PDV, estorno/cancelamento de item com motivo e senha, opcionais (adicional/borda) além do meio a meio, permissões no PDV (não só o login da API) e CPF/CNPJ do destinatário na NFC-e.

## Lacuna vs mercado

| Capacidade | Quem tem | Situação hoje no Mais Gestão |
|---|---|---|
| App garçom com usuário (trava de conta, gorjeta/comissão) | Uniplus POS, ARPA App Garçom, Linx mobile | POS é “um tablet = um caixa”; `sessao` no PDV tem um `userid` da API |
| Cancelar / estornar item com motivo e senha | Uniplus, VR, Clipp | Não há remoção de `item_conta` no PDV; fluxo de estorno é fraco |
| Opcionais / adicionais / borda | Uniplus F10/F11 | Só pizza meio a meio (`espizza` + `idprodutomeio`) |
| Operador + permissões no PDV | Todos os comparados | Login em `login-page.tsx` é o usuário da API; sem perfil caixa/garçom/gerente |
| CPF na nota / identificar cliente na conta | Todos | NFC-e emite sem destinatário; conta tem só `nomecliente`; POS `ClienteDto` já traz `cnpjcpf` da API, sem gravar na venda local |

Mapa do salão (planta, reserva) é lacuna P1 relacionada, mas **não** entra nesta etapa.

## Dependências no código atual

- Sessão: tabela `sessao` (`userid`, `username`, `idempresa`) em `pdv/electron/db/schema.ts`; um operador por PDV
- Conta: `item_conta` só cresce (`adicionarItemConta` / `enviarPedidoConta`); sem cancelar linha
- Venda: `venda` + `item_venda` + `pagamento`; outbox envia `usuarioquefechouvenda` (sempre o userid da sessão)
- NFC-e: `nfce_local` sem CPF/CNPJ de destinatário; contingência monta XML do emitente em `pdv/electron/fiscal/contingencia.ts`
- Pizza: `pdv/src/lib/pizza-meio-a-meio.ts` e dialog correspondente — modelo a estender para opcionais, sem misturar com metades
- POS: `LoginActivity` (API), `PedidoActivity` (sacola + meio a meio), `SelecionarClienteActivity` (`ClienteDto.cnpjcpf`)
- LAN API: pedido e fechamento sem `idgarcom`, sem estorno, sem destinatário
- Config: `pdv/src/ui/pages/config-page.tsx` — lugar natural para senha gerencial e perfis locais
- Etapa 2 (desconto com senha) e Etapa 4 (KDS) devem **reutilizar** o mesmo mecanismo de senha/perfil, não criar um segundo

## Escopo

**Entra**

- Identidade de garçom/operador no PDV e no POS (PIN ou login curto), independente do usuário da API que abriu o caixa
- Permissões locais: lançar item, fechar conta, desconto, estorno, config, sangria/abertura — por perfil (garçom, caixa, gerente)
- Estorno ou cancelamento de item da conta aberta: motivo obrigatório, senha se o perfil não permitir, registro de auditoria (quem, quando, motivo, valor)
- Opcionais com preço: adicional, borda, extra; quantidade e valor somam no item; descrição vai para produção e NFC-e
- CPF/CNPJ na conta e na venda; NFC-e com destinatário quando informado (online e contingência)
- Trava: garçom A não fecha/estorna conta do garçom B sem permissão de gerente (regra configurável)
- LAN API e POS alinhados (identificar garçom no pedido, estornar, informar CPF)

**Não entra neste bloco de escopo** — ver seção seguinte.

## Critérios de aceite

- Garçom autentica no POS, lança pedido na mesa e o `pedido_fila` / conta registram quem lançou
- Cancelar um item pede motivo; sem senha/perfil adequado a linha permanece; com autorização, o total da conta e a produção (KDS/cupom de cancelamento, se houver) ficam consistentes
- Item com borda/adicional imprime na produção e fecha na NFC-e com o preço cheio, sem perder o meio a meio
- Caixa sem permissão não abre config nem aplica desconto; gerente com senha consegue
- Fechamento com CPF válido inclui destinatário no XML/autorização; sem CPF a nota segue como consumidor não identificado
- Relatório ou log local permite ver estornos do dia (quem, mesa, motivo, valor)
- POS e PDV não divergem: mesmo PIN, mesmas permissões, mesmo CPF na conta

## O que fica de fora

- Mapa do salão, reserva e planta (lacuna P1 à parte)
- Comissão/gorjeta automática de garçom (pode usar a identidade desta etapa depois)
- Crediário / fiado (P2; CPF na nota não é fiado)
- Totem de autoatendimento, fidelidade, SAT, recarga (P2)
- TEF, divisão de conta, delivery e KDS (Etapas 1–4) — esta etapa só **atribui responsável e audita** o que essas etapas já fazem
- Segundo fator, biometria ou SSO corporativo
- Permissões no ERP (`web/` / `api/`) além do necessário para sync do destinatário e do usuário que fechou a venda
