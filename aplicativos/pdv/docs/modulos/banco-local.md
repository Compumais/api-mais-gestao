# Banco local

## Propósito no caixa

Todo cupom, turno, NFC-e, catálogo e fila de sync nascem no PostgreSQL local do PDV. Sem esse banco a loja não vende, mesmo com a API no ar.

## Onde vive

- **Main:** `electron/db/database.ts` (pool `pg`, `initDb`, migrações), `electron/db/schema.ts` (DDL), `electron/db/repos.ts` (SQL de negócio).
- **Renderer:** nenhum acesso. A UI só usa IPC.
- **SQL:** tabelas criadas em `SCHEMA_TABLES_SQL`. Índices em `SCHEMA_INDEXES_SQL`, aplicados depois das migrações leves. `db/schema.sql` não é a fonte em execução.
- **Dev:** `docker-compose.yml` sobe um Postgres local. O instalador Windows sobe outro cluster (ver [atualizacao-installer.md](atualizacao-installer.md)).

Resolução da conexão, nesta ordem: variável `PDV_DATABASE_URL`, arquivo `database-url.txt` em `app.getPath("userData")`, depois o default do código. A chave de config `database_url` existe na UI; não documente o valor.

`initDb` faz `SELECT 1`, cria tabelas, `aplicarMigracoesLeves` (só `ADD COLUMN` / ajuste de constraint, ignorando coluna já existente), índices e `seedDefaults` (`INSERT ... ON CONFLICT DO NOTHING`).

## Contrato com a API

Nenhum. Este módulo não chama HTTP. A API nunca lê este Postgres.

## Dados locais que não podem ser apagados no schema

Não drope tabela, coluna ou índice abaixo. Migração nova é aditiva.

| Tabela | Por quê |
| --- | --- |
| `config` | URL da API, número do PDV, fiscal, hardware |
| `sessao` | Uma linha `id = 1` com token e empresa |
| `venda`, `item_venda`, `pagamento` | Cupom e meios |
| `caixa_turno` | Turno aberto/fechado e `idremoto` |
| `nfce_local`, `numeracao_nfce` | XML, chave, série e próximo número. `numeracao_nfce.id` só 1 ou 2 e `ambiente = id` |
| `outbox`, `sync_meta` | Fila e cursor de reconciliação |
| `produto_cache`, `atalho`, `grupo`, `grupo_gourmet` | Venda offline |
| `cliente`, `meio_pagamento`, `bandeira_cartao` | Pagamento e identificação |
| `mesa`, `conta_mesa`, `item_conta`, `conta_pagamento`, `pedido_fila`, `cliente_pdv` | Salão, delivery e pagamento parcial de conta |
| `impressora_grupo_gourmet` | Roteamento de produção |

Índice `idx_outbox_idempotencia_pendente`: único parcial em `idempotency_key` enquanto `status` é `pendente` ou `processando`. Sem ele o retry duplica evento na API.

Colunas fiscais de `produto_cache` (`ncm`, `cfop`, `cst`, `csosn`, alíquotas) entram por migração leve. Tirar a coluna quebra a contingência.

## Comportamento offline/outbox

O banco local é o modo offline. Se o sync for simplificado para “só gravar na API”, a loja para quando a rede cai e o cupom deixa de existir antes da confirmação.

`TRUNCATE` operacional existe só na troca de empresa, depois de backup (`electron/sync/troca-empresa.ts`). Não reuse essa limpeza no boot nem no update.

## Configuração crítica

Nomes, sem valores secretos: `PDV_DATABASE_URL`, arquivo `database-url.txt`, chave `database_url`. Serviço, porta, nome do banco e usuário do instalador estão em `installer/pdv-mais-gestao.iss` (`PostgresService`, `PostgresPort`, `PostgresDatabase`, `PostgresUser`). Não altere esses identificadores num upgrade: o app deixaria de achar o cluster que já tem venda.

## O que quebra na operação da loja se remover

- Pool, `initDb` ou o cluster local: tela sobe sem venda, caixa e NFC-e.
- Recriar o banco no update: perde turno aberto, fila e numeração.
- Apagar `outbox` “para limpar pendência”: a venda local fica sem `idremoto` e o estoque/NFC-e da retaguarda não fecham.
- Rebobinar `numeracao_nfce.proximo_numero`: risco de número já usado.
