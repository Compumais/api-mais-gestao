# Mesas, gourmet e delivery

## Propósito no caixa

Conta aberta (mesa, comanda ou entrega) acumula itens e pagamentos parciais até virar `venda`. A fila `pedido_fila` é o pedido que a cozinha imprime. Isso só aparece se a sessão tiver módulo `gourmet`.

## Onde vive

- **Main:** `electron/db/conta-gourmet.ts`, `electron/db/pedido-entrega.ts`, funções de mesa/conta em `electron/db/repos.ts` (`abrirContaMesa`, receber conta, `enfileirarOutbox("conta_mesa")` e `criar_venda` no fechamento).
- **Renderer:** `src/ui/pages/mesa-conta-page.tsx`, `delivery-page.tsx`, `pedidos-page.tsx`, `src/ui/guards/require-gourmet.tsx`, `src/lib/conta-gourmet.ts`, `src/lib/pizza-meio-a-meio.ts`, leitor `src/lib/comanda-scanner.ts`.
- **SQL:** `mesa`, `conta_mesa`, `item_conta`, `conta_pagamento`, `pedido_fila`, `cliente_pdv`.

`mesa.numero` é a grade local (`garantirMesas` pela chave `qtd_mesas`). `conta_mesa.modalidade` default `mesa`; delivery usa endereço, `valorentrega`, `status_entrega`, `senha_chamada`.

`item_conta.pago` marca o que já entrou num recebimento parcial. `conta_pagamento` guarda o parcial até o fechamento, quando o código apaga esses parciais e grava `pagamento` na venda.

Pizza meio a meio e observação de item/pedido ficam no item (`observacao`) e na fila (`observacao_pedido`). São texto operacional da cozinha, não vão para a NFC-e como campo próprio (**não confirmado** campo de observação no XML).

Plano: `sessao.modulogourmet`, vindo de `GET /planos/meu-plano` (`planoTemGourmet` exige o módulo `gourmet`). Sem isso `RequireGourmet` esconde mesa, delivery e pedidos. Balcão (`/balcao`) não exige gourmet.

## Contrato com a API

Conta aberta não é espelhada. O worker trata `conta_mesa` como no-op e marca concluído (ver [sync-outbox.md](sync-outbox.md)).

O que chega ao ERP é a `venda` gerada no recebimento (`criar_venda`), com `idconta` local. Itens copiados para `item_venda`.

Catálogo gourmet: `GET /grupos-gourmet` no pull. Não há endpoint de mesa na API dentro do `pdv/` (**não confirmado** rota remota de mesa/comanda).

POS Android opera mesa pela LAN do PDV, não pela API. Ver [lan-pos.md](lan-pos.md).

## Dados locais que não podem ser apagados no schema

Não drope colunas de delivery em `conta_mesa` (`modalidade`, `telefone`, `endereco`, `bairro`, `complemento`, `referencia`, `valorentrega`, `status_entrega`, `senha_chamada`, `idcliente`, `orderidintegracao`, `obs`, taxas, `numeropessoas`, `taxa_ativa`). Bancos antigos ganham essas colunas em `aplicarMigracoesLeves`.

`pedido_fila.client_order_id` identifica reimpressão. Índice `idx_pedido_fila_client`.

`cliente_pdv` é cadastro local de entrega (telefone/endereço), distinto de `cliente` (cache da API).

Troca de empresa faz `TRUNCATE` dessas tabelas depois do backup. Mesa aberta sem backup se perde.

## Comportamento offline/outbox

Mesa, lançamento e cozinha são locais. A fila `conta_mesa` não atualiza o ERP se for “simplificada”: ela já não envia. O risco é o contrário: fazer o worker falhar nesse tipo e segurar a fila. Hoje a falha de `conta_mesa` não ocorre porque o ramo não chama rede; se passar a chamar rede e lançar exceção, o ciclo continua (não é `criar_venda`), mas o item retenta.

O fechamento que gera `criar_venda` segue a barreira normal. Receber a conta offline e apagar `conta_mesa` antes da venda sincronizar não apaga a venda; apagar a venda apaga o cupom.

Tecnibra lê números com pendência e grava XML de comandas. Ver [integracoes-perifericos.md](integracoes-perifericos.md).

## Configuração crítica

Chaves gourmet (`CHAVES_CONFIG_GOURMET`): `modelo_atendimento` (`mesa` ou `comanda`), `qtd_mesas`, `modal_abrir_mesa_habilitado`, `taxa_servico_percentual`, `couvert_valor`, `taxa_entrega_padrao`, `bairros_entrega`, senha gerencial, chaves `tecnibra_*`.

`tempo_ociosidade_min` está no seed e em `CHAVES_CONFIG_NEGOCIO`. O efeito na UI **não foi reauditado** além da existência da chave.

`filtro_apenas_abertas` é preferência do operador.

Senha gerencial (`senha_gerencial_hash` / `senha_gerencial_salt`) protege cancelamento de item. Zerar a chave sem fluxo de redefinição libera ou bloqueia o cancelamento conforme `senha_gerencial_habilitada`.

## O que quebra na operação da loja se remover

- `mesa` / `conta_mesa`: salão e delivery param; item lançado some.
- `pago` em `item_conta`: recebimento parcial cobra de novo ou fecha conta pela metade.
- `pedido_fila`: cozinha não recebe pedido e a reimpressão não acha o `client_order_id`.
- Guard gourmet: loja sem módulo passa a ver mesa, ou loja com módulo perde o salão.
- Tratar `conta_mesa` como venda: duplica documento no ERP ou trava a outbox com payload que a API não tem.
