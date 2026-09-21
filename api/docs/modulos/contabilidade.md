# Contabilidade

## Propósito no produto

Plano de contas gerencial, contas contábeis, de-para com entidades, códigos reduzidos, exportação de XML para o contador e integração com a API Domínio/Onvio.

## Pastas e entrypoints

| Plugin | Prefixo |
| --- | --- |
| `src/controllers/http/plano-contas/rotas.ts` | `/plano-contas` (CRUD, mover, importar CSV/XLSX, template, exportar) |
| `src/controllers/http/conta-contabil/rotas.ts` | `/conta-contabil` |
| `src/controllers/http/plano-contas-conta-contabil/rotas.ts` | `/plano-contas-conta-contabil` |
| `src/controllers/http/codigo-reduzido-conta-contabil/rotas.ts` | `/codigos-reduzidos-conta-contabil` |
| `src/controllers/http/entidade-conta-contabil/rotas.ts` | `/entidades-conta-contabil` |
| `src/controllers/http/integracao-contabil-configuracao/rotas.ts` | `/integracoes-contabil-configuracao` |
| `src/controllers/http/contabilidade/rotas.ts` | `/contabilidade/cadastro`, `POST /contabilidade/exportar-xmls` |
| `src/controllers/http/dominio/rotas.ts` | `/dominio/integracao`, `/dominio/envios` |

Services: `src/service/planocontas/`, `contacontabil/`, `plano-contas-conta-contabil/`, `codigo-reduzido-conta-contabil/`, `entidade-conta-contabil/`, `integracao-contabil-configuracao/`, `contabilidade/`, `dominio/`. Cliente HTTP: `src/lib/dominio-client.ts`.

Schema: `drizzle/tables/plano-contas.ts`, `conta-contabil.ts`, `plano-contas-conta-contabil.ts`, `codigo-reduzido-conta-contabil.ts`, `entidade-conta-contabil.ts`, `integracao-contabil-configuracao.ts`, `contabilidade-empresa.ts`, `dominio-integracao.ts`, `dominio-envio.ts`.

Plano padrão: `src/service/planocontas/criar-plano-contas-padrao.ts`, chamado na criação da empresa. Script `popular-cfops-padrao` é fiscal; o de plano de contas padrão da empresa está no service, não como script npm separado.

## Contratos externos

ERP web. Job `sync_dominio` (`src/worker/jobs/sync-dominio.ts`) envia à API Onvio em nome da empresa. Não há cliente PDV nestes paths.

## Configuração crítica

Credenciais globais do ERP (um token para todos os tenants), nomes apenas:

- `DOMINIO_CLIENT_ID`
- `DOMINIO_CLIENT_SECRET`
- `DOMINIO_AUDIENCE` (há default no client)
- `DOMINIO_AUTH_URL` (default Thomson Reuters OAuth)
- `DOMINIO_API_URL` (default `https://api.onvio.com.br`)

`AGENDADOR_HABILITADO=true` liga o ciclo Domínio (a cada 2 minutos, com lock).

## Invariantes

- Plano de contas é por `idempresa`. Importação recusa referência circular (`PLANO_CONTAS_MOVER_REFERENCIA_CIRCULAR`) e arquivo vazio ou acima do limite em `src/util/plano-contas-importacao.ts`.
- `criarPlanoContasPadraoService` não reinsere se a empresa já tem contas.
- Movimentação de nó (`PUT /plano-contas/mover`) altera árvore usada por DRE e dashboard. Não “achatar” a hierarquia.
- Exportação de XML lê notas já persistidas; não reemite SEFAZ.
- Envios Domínio são fila (`dominio-envio`), com reenvio `POST /dominio/envios/:id/reenviar`. Apagar a fila perde o estado do que já foi enviado.

## O que quebra se alterar ou apagar

- DRE, controle de plano de contas no dashboard e relatórios gerenciais.
- De-para entidade/conta usado na integração contábil.
- Autenticação Onvio se as env forem removidas ou o client for trocado de audience/URL sem conferir o código.
- Lock do agendador (`LOCK_AGENDADOR_DOMINIO`): dois processos passariam a enviar em paralelo.

## Dependências de outros módulos da API

Empresas, entidades, notas fiscais (XML), automação/worker, auditoria.

## Testes relacionados

- `src/service/planocontas/criar-plano-contas-padrao.test.ts`
- `src/service/planocontas/atualizar-plano-contas.test.ts`
- `src/service/planocontas/mover-plano-contas.test.ts`
- `src/service/planocontas/importar-plano-contas.test.ts`
- `src/service/contacontabil/atualizar-conta-contabil.test.ts`
- `src/service/dominio/processar-envios-dominio.test.ts`
- `src/lib/dominio-client.test.ts`
- `src/lib/dominio-mapeamento.test.ts`
