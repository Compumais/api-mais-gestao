# Sync e outbox

## Propósito no caixa

A fila local é a única ponte com o ERP. A venda, o caixa e a NFC-e de contingência já valem no PDV; a outbox repete até a API confirmar.

## Onde vive

- **Main:** `electron/sync/outbox.ts` (ciclo), `enfileirarOutbox` / `reivindicarOutboxPendentes` em `electron/db/repos.ts`, HTTP em `electron/api/client.ts`. Boot em `electron/main.ts`: `iniciarSyncPeriodico(20000)` e um `processarOutbox` após `initDb`.
- **Renderer:** status na barra (`getStatus` / `syncAgora` / `enviarParaRetaguarda` na local-api). Não insere na fila direto.
- **SQL:** `outbox`, `sync_meta`. Colunas de estado também em `venda.sync_status`, `venda.idremoto`, `caixa_turno.sync_status`, `caixa_turno.idremoto`.

Um ciclo por vez (`cicloEmAndamento`). Worker com lease de 15 min (`worker_id`, `bloqueado_ate`). Item preso em `processando` volta a `pendente` quando o lease vence.

Ordem de leitura da fila: `prioridade ASC`, `criadoem ASC`, `FOR UPDATE SKIP LOCKED`.

| `tipo` | Prioridade | O que o worker faz |
| --- | --- | --- |
| `criar_venda` | 5 | Cria venda, itens e baixa estoque/NFC-e. Falha **interrompe o ciclo** |
| `transmitir_nfce_contingencia` | 10 | `POST /nfce/contingencia/transmitir` depois da venda confirmada |
| `abrir_caixa` | 100 | `POST /fechamentos-caixa` |
| `fechamento_caixa` | 100 | `PUT /fechamentos-caixa/:id` |
| `atalhos_pdv` | 100 | `PUT /atalhos-pdv` |
| `conta_mesa` | 100 | Nada. Comentário no código: espelhamento remoto best-effort; marca concluído para não travar a fila |

Tipo desconhecido também cai em `marcarOutboxConcluido`. Incluir um tipo novo sem `else if` apaga o evento sem enviar.

Backoff: `atrasoBackoffOutboxMs` = 30 s × 2^tentativas, teto 15 min. Erro transitório (rede, 401, 403, 408, 409, 429, ≥500) volta a `pendente`. Outro 4xx vai para `cancelado` (`classificacao_erro = permanente`).

Idempotência: `chaveIdempotenciaOutbox` = `tipo` + primeiro id útil do payload (`idlocal`, `idvenda`, chave, etc.). O insert faz `ON CONFLICT` no índice parcial e atualiza o payload do pendente em vez de criar outra linha.

## Contrato com a API

Além dos POST/PUT acima, cada ciclo online com sessão chama `sincronizarFiscalPdv` (`GET /empresas/:id/pdv-fiscal` e `GET .../nfce-configuracao`). Detalhe em [fiscal-nfce.md](fiscal-nfce.md).

Confirmação de venda: `idvendalocal` ecoado e `idremoto` obrigatórios (`VENDA_PDV_NAO_CONFIRMADA`).

`GET /vendas-pdv-gourmet/por-id-local` recupera venda criada quando o POST estourou timeout.

Reconciliação de NFC-e: `POST /nfce/pdv/reconciliar` em `electron/sync/reconciliar-nfce.ts`, timer próprio (60 s). Não substitui a outbox: o ciclo de reconciliação também chama `processarOutbox`.

Pull de catálogo não passa pela outbox (é download). Ver [catalogo.md](catalogo.md).

## Dados locais que não podem ser apagados no schema

`outbox`: `id`, `tipo`, `payload`, `status`, `tentativas`, `ultimo_erro`, `idempotency_key`, `prioridade`, `proxima_tentativa`, `classificacao_erro`, `bloqueado_ate`, `worker_id`, `criadoem`, `processadoem`.

Índice único parcial `idx_outbox_idempotencia_pendente`.

`sync_meta`: chave/valor do cursor de reconciliação. Não é a fila.

Não apague linha `pendente`/`processando` para “zerar erro”. A venda local permanece e o ERP não recebe.

## Comportamento offline/outbox

`pingApi` falso: o ciclo retorna sem mexer na fila. A loja segue no Postgres.

Simplificar de fila para chamada síncrona no fechamento da venda:

- timeout no POST deixa o operador sem cupom ou com cupom sem `idremoto`;
- retry sem idempotência duplica venda e baixa estoque duas vezes;
- remover a barreira de `criar_venda` deixa a contingência subir antes da venda existir na API (o transmissor responde 409, mas o cupom fica preso se o item de contingência for cancelado como permanente).

`conta_mesa` já não espelha conta aberta. Simplificar esse tipo não muda o ERP hoje. Não use esse vazio como modelo para `criar_venda`.

PDV secundário: o timer chama `sincronizarSecundarioPeriodico` e o `processarOutbox` local. A venda do secundário está no banco do principal; a fila que importa é a do principal. Ver [pdv-secundario.md](pdv-secundario.md).

## Configuração crítica

`api_url`, token em `sessao`, `numeropdv` (vai no corpo da venda). Sem os três o ciclo não envia.

## O que quebra na operação da loja se remover

- Worker ou tabela `outbox`: cupom só existe no caixa; estoque, financeiro e NFC-e da retaguarda não fecham.
- Idempotência: cada retry cria outra venda no ERP.
- Barreira da `criar_venda`: notas e vendas seguintes passam na frente de um cupom rejeitado.
- Lease/`SKIP LOCKED`: dois ciclos (timer + botão “enviar”) processam o mesmo item e disputam a API.
- Marcar concluído no `catch`: a pendência some da tela e o ERP nunca vê a venda.
