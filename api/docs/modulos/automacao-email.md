# Automação, e-mail e jobs

## Propósito no produto

Regras agendadas por empresa, notificações, histórico de execução de tarefas, SMTP e o processo cron embutido no servidor HTTP.

## Pastas e entrypoints

- `src/controllers/http/automacao/rotas.ts` — `/automacoes` CRUD, `POST /automacoes/:id/executar`, `GET /automacoes/:id/execucoes`. `verifyJwt`.
- `src/controllers/http/notificacoes/rotas.ts` — `/notificacoes` (listar, buscar, marcar lida, contar não lidas).
- `src/controllers/http/tarefas/rotas.ts` — `GET /tarefas/execucoes`.
- `src/controllers/http/email/rotas.ts` — `/emails/smtp`, testar, `POST /emails/enviar`.
- Worker: `src/worker/registrar-agendador.ts` chamado no `listen` de `src/index.ts`. Implementação: `src/worker/agendador.ts`. Script avulso: `npm run worker:run` → `scripts/worker-run.ts`.

Jobs e cron (somente se `AGENDADOR_HABILITADO=true`):

| Job | Intervalo no código | Lock |
| --- | --- | --- |
| `alerta_vencimento`, `saldo_baixo`, `conciliacao_pendente`, `relatorios_automaticos` | `*/5 * * * *` | `LOCK_AGENDADOR_PRINCIPAL` |
| `verificar_ciclos_plano` | `0 6 * * *` | sem lock no trecho lido |
| `sync_inbound_nfe` | `*/10 * * * *` | `LOCK_AGENDADOR_INBOUND_NFE` |
| `processar_automacoes` | `*/5 * * * *` | `LOCK_AGENDADOR_AUTOMACOES` |
| `sync_dominio` | `*/2 * * * *` | `LOCK_AGENDADOR_DOMINIO` |

Funções de automação: `src/service/automacao/` (inclui `funcoes/envio-fiscal-contabilidade.ts`). Retry de pendência: 6 horas em `executar-automacao.ts`.

Schema: `drizzle/tables/automacao.ts`, `notificacoes.ts`, `tarefa-execucao.ts`, `configuracao-email-smtp.ts`.

## Contratos externos

ERP web configura regras e lê notificações. Jobs chamam serviços internos (inbound, Domínio, financeiro). SMTP é o servidor do cliente, gravado por empresa, não uma env global no código lido. PDV/POS: não confirmado.

## Configuração crítica

- `AGENDADOR_HABILITADO` precisa ser a string `true`. Qualquer outro valor deixa o cron desligado (log explícito).
- Locks em `tarefa-execucao` impedem dois processos de rodarem o mesmo ciclo. Não remover `tentarAdquirirLockAgendador`.
- Credenciais SMTP ficam na tabela `configuracao-email-smtp`, não em env. Não logar senha.

Feature `suporte_email` existe no catálogo. Hook nas rotas de e-mail: não encontrado.

## Invariantes

- Automação executa função nomeada no código (`funcoes/`). Apagar uma função quebra regras já salvas que apontam para ela.
- Notificação é por usuário e pode filtrar `idempresa`.
- Job de ciclo de plano altera `plano` do usuário. Não é só leitura.
- Inbound e Domínio neste ciclo são os mesmos services das rotas manuais. Mudar um muda o outro.
- `worker:run` e o cron dentro do `listen` não devem ser ligados juntos sem o lock (o lock existe para isso).

## O que quebra se alterar ou apagar

- Alertas de vencimento e saldo baixo.
- Sync automático de NF-e de entrada e envio Domínio.
- Troca de plano no fim do ciclo.
- Envio de e-mail de nota (`enviar-email` de nota fiscal usa esta configuração — confirmar o service de nota antes de remover SMTP).
- Relatórios automáticos.

## Dependências de outros módulos da API

Financeiro, estoque, inbound NF-e, Domínio, planos, notas, empresas.

## Testes relacionados

- `src/service/dominio/processar-envios-dominio.test.ts` (efeito do job)
- Teste de `executar-automacao`: não confirmado na busca usada para este doc.
