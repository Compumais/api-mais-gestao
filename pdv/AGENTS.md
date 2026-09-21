# AGENTS — PDV Mais Gestão

Cliente desktop próprio (`Electron` + React + Vite + PostgreSQL local). Não é uma tela do `web/` e não compartilha o banco da API.

## Limites do pacote

- Trabalhe só em `pdv/`. Não importe código de `web/`, `api/` ou `api_Nfe/`.
- O processo main fala com a retaguarda só por HTTP (`electron/api/client.ts`), com o token da tabela `sessao`.
- O PostgreSQL do PDV é local. Não aponte este cliente para o banco da API (`mais_gestao` ou equivalente). Não há evidência no `pdv/` de conexão com esse banco.
- O renderer (`pdv/src`) não abre Postgres. A UI chama `window.pdv.invoke` → IPC `pdv:invoke` → `electron/local-api/index.ts`.
- NFC-e (modelo 65) existe neste pacote. NF-e modelo 55 e chamada direta ao gateway PHP `api_Nfe/` **não confirmadas** no `pdv/`. O XML de contingência usa o elemento `<NFe>` do leiaute 4.00 com `<mod>65</mod>`.

## Ordem de leitura

1. Este arquivo.
2. [`docs/modulos/README.md`](docs/modulos/README.md) e o módulo que a tarefa tocar.
3. [../docs/sistema/contratos-entre-pacotes.md](../docs/sistema/contratos-entre-pacotes.md) — leia antes de mudar o contrato HTTP com a API.

A fonte do schema em execução é `electron/db/schema.ts` mais `aplicarMigracoesLeves` em `electron/db/database.ts`. `db/schema.sql` é referência e pode ficar atrás do TypeScript.

## Pontos intocáveis

Remover ou “simplificar” qualquer item abaixo para a loja ou dessincroniza o ERP.

| Ponto | Onde | Efeito se quebrar |
| --- | --- | --- |
| Postgres local | `electron/db/database.ts`, serviço/banco do instalador | Caixa, venda e fiscal não sobem |
| Schema operacional | tabelas em `electron/db/schema.ts` | Venda, caixa, NFC-e ou fila somem |
| Outbox + worker | `outbox`, `electron/db/repos.ts` (`enfileirarOutbox`), `electron/sync/outbox.ts` | Venda local não chega ao ERP, ou some da fila sem confirmação |
| Barreira da venda | falha em `criar_venda` interrompe o ciclo | Contingência e vendas seguintes avançam sem a venda confirmada |
| Idempotência | índice único parcial `idx_outbox_idempotencia_pendente` | Retry duplica venda/caixa na API |
| Numeração NFC-e | `numeracao_nfce` (`id` = `ambiente`, linhas 1 e 2) e `reservarNumeroNfce` | Número repetido, rejeição SEFAZ ou inutilização |
| NFC-e local | `nfce_local` + arquivos em `userData/xml-nfce` | Cupom sem XML, contingência sem transmissão |
| Caixa | `caixa_turno` + tipos `abrir_caixa` / `fechamento_caixa` | Operador não vende (`RequireCaixa`) ou o fechamento não fecha no ERP |
| Terminal | `config.numeropdv` alinhado a `/empresas/:id/pdv-fiscal` e `/terminais-pdv` | Série/CSC/número de outro caixa |
| Versão do instalador | `package.json` `version`, `installer/output/version.json`, `MyAppVersion` no Inno | Auto-update recusa, reinstala por cima ou o setup acha que já está atualizado |
| Upgrade do setup | `installer/pdv-mais-gestao.iss` (`InitializeSetup`) | Atualizar o app apaga o PostgreSQL local e as vendas |

Não grave segredo em documentação nem no git: senha do banco, URL completa, CSC, senha de certificado, token de sessão, token SiTef/LAN.

## O que o boot faz

`electron/main.ts`, depois de `app.whenReady`:

1. Registra IPC e abre a janela.
2. Agenda sync a cada 20 s (`iniciarSyncPeriodico`).
3. Sobe a API LAN (padrão porta `lan_porta`, default no seed `5050`).
4. `initDb()` aplica tabelas, migrações leves e índices.
5. Processa outbox, reconcilia NFC-e (ciclo ~60 s), Tecnibra, backup agendado e verificação de update.

Se o Postgres local não conectar, a janela abre e o update ainda é tentado, mas venda e caixa não operam.

## Renderer

Rotas em `src/App.tsx`: `/boot`, `/login`, `/abertura-caixa`, `/config`, `/` (venda), `/balcao`, `/vendas`, `/vendas/nao-sincronizadas`, e com módulo gourmet `/mesas/:numero`, `/delivery`, `/pedidos`.

Guards: `RequireSessao`, `RequireConfig`, `RequireCaixa`, `RequireGourmet`. Sem caixa aberto a venda não entra.
