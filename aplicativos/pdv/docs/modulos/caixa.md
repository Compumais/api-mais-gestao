# Caixa

## Propósito no caixa

Um turno por operador e número de PDV. Sem turno aberto a venda é recusada. O fechamento confere dinheiro físico com os lançamentos do período.

## Onde vive

- **Main:** `abrirCaixa`, `fecharCaixa`, `caixaAberto`, `calcularResumoTurno` em `electron/db/repos.ts`; conferência em `electron/db/resumo-turno-caixa.ts`; itens do turno em `electron/db/itens-vendidos-turno.ts`.
- **Renderer:** `src/ui/pages/abertura-caixa-page.tsx`, `src/ui/components/dialog-fechar-caixa.tsx`, guard `src/ui/guards/require-caixa.tsx`.
- **SQL:** `caixa_turno`.

Abertura: insert `status = 'aberto'`, `sync_status = 'pendente'`, outbox `abrir_caixa`. Se já houver turno aberto deste operador neste `numeropdv`, devolve o existente.

O resumo soma `venda` com `status = 'fechada'`, mesmo `numeropdv` e `criadoem >= abertoem`. Dinheiro/PIX/cartão preferem a tabela `pagamento`; cartão com `formapagamentonfe` `04` é débito.

Fechamento: grava `fechado`, `valorfechamento`, outbox `fechamento_caixa` com saldo apurado, informado, sobra e falta. Em seguida a UI dispara `processarOutbox` e um backup com motivo `caixa` (só gera arquivo se o backup estiver habilitado e a frequência for `caixa`).

Há turno de outro usuário no mesmo número: `caixaAberto` distingue por `idusuario`. Não apague essa coluna.

## Contrato com a API

Worker, prioridade 100 (depois de `criar_venda` e de contingência):

| Evento | Chamada |
| --- | --- |
| Abrir | `POST /fechamentos-caixa` com `status: 0` (`STATUS_CAIXA_ABERTO`), `local: 1`, `pdv`, suprimento e `datahora` |
| Já aberto na retaguarda | Se `caixa_turno.idremoto` existe, não cria outro |
| Fechar | `PUT /fechamentos-caixa/:id` com `status: 1` (`STATUS_CAIXA_FECHADO`), saldos, sobra, falta, `idusuariofechamento` |

`extrairIdFechamentoCaixa` lê `id` na raiz ou em `body`. Sem id, o worker falha e o turno local continua `sync_status` pendente.

`garantirCaixaRemoto` também roda no fechamento se a abertura ainda não tiver `idremoto`.

## Dados locais que não podem ser apagados no schema

`caixa_turno`: `id`, `idempresa`, `numeropdv`, `idusuario`, `username`, `abertoem`, `fechadoem`, `valorabertura`, `valorfechamento`, `status`, `idremoto`, `sync_status`.

Apagar turno aberto no meio do dia some o vínculo das vendas (elas não têm FK para o turno; o vínculo é `numeropdv` + `criadoem >= abertoem`). Recriar o turno muda o intervalo e o fechamento mente.

## Comportamento offline/outbox

Abre e fecha sem API. A fila manda depois.

Se o handler `abrir_caixa` / `fechamento_caixa` for removido e o item cair no `marcarOutboxConcluido` genérico, o ERP não abre/fecha o caixa e a fila não tenta de novo. A loja local continua; o financeiro da retaguarda fica aberto ou sem suprimento.

Erro de caixa **não** interrompe o ciclo (só `criar_venda` interrompe). Um fechamento com erro transitório volta a `pendente` com backoff. Erro permanente (4xx exceto 401/403/408/409/429) vai para `cancelado`.

## Configuração crítica

- `numeropdv` — coluna do turno e campo `pdv` do POST.
- Backup no fechamento: `backup_habilitado`, `backup_frequencia` (`caixa` para disparar neste momento). Ver [backup.md](backup.md).

## O que quebra na operação da loja se remover

- `RequireCaixa` ou `caixaAberto`: venda sem turno, ou operador travado na abertura.
- `idremoto`: cada retry abre outro fechamento na API.
- Cálculo por `pagamento` em vez dos totais agregados da `venda`: dinheiro conferido não bate com o misto.
- Impressão do comprovante (`electron/impressora/comprovante-caixa.ts`): o operador fica sem via do fechamento. A gravação do turno não depende da impressora.
