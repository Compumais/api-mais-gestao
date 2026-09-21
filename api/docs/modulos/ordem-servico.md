# Ordem de serviço

## Propósito no produto

OS com itens, lotes, eventos/status, faturamento (contas a receber), rascunho de NF-e e preparação de NFS-e. Configuração de campos, CFOPs e impressão por empresa.

## Pastas e entrypoints

`verifyJwt` + `requireFeature(ordem_servico)` em `src/controllers/http/ordem-servico/rotas.ts`:

- CRUD `/ordens-servico`
- itens `/ordens-servico/:id/itens`
- lotes do item
- eventos
- faturamentos
- gerar contas a receber
- gerar rascunho de NF-e
- preparar NFS-e

Plugins ligados, com `verifyJwt` (feature da OS não repetida nestes arquivos):

- `src/controllers/http/configuracao-ordem-servico/rotas.ts` — `GET|PUT /empresas/:idempresa/configuracao-ordem-servico`
- `src/controllers/http/tipo-ordem-servico-evento/rotas.ts` — catálogo de status/eventos
- `src/controllers/http/modelo-impressao-os/rotas.ts` — `/empresas/:idempresa/modelos-impressao-os`
- `src/controllers/http/tipo-problema/rotas.ts` — `/tipos-problema`
- `src/controllers/http/objeto/rotas.ts` — `/objetos`

Services: `src/service/ordem-servico/` (inclui `item/gerenciar-lotes-ordem-servico.ts`), `configuracao-ordem-servico` não tem pasta service com esse nome exato — repository `configuracao-ordem-servico-repositories.ts`. Também `modelo-impressao-os/`, `tipo-problema/`, `objeto/`.

Schema: `drizzle/tables/ordem-servico.ts`, `ordem-servico-item.ts`, `ordem-servico-item-lote.ts`, `ordem-servico-evento.ts`, `ordem-servico-faturamento.ts`, `configuracao-ordem-servico.ts`, `tipo-ordem-servico-evento.ts`, `modelo-impressao-ordem-servico.ts`, `tipo-problema.ts`, `objeto.ts`.

## Contratos externos

ERP web. Emissão de NF-e/NFS-e da OS entra nos módulos fiscais. PDV e POS: não confirmado como clientes destas rotas.

## Configuração crítica

Feature SaaS `ordem_servico`. Sem env própria no código lido. NFS-e da OS ainda exige módulo `nfse` na rota de emissão.

## Invariantes

- Feature gate está no plugin da OS. Configuração, tipos de evento, modelos, tipos de problema e objetos continuam acessíveis sem essa feature, no código atual.
- Gerar contas a receber e gerar rascunho de NF-e são ações separadas. Uma não substitui a outra.
- Lote do item da OS conversa com estoque. Excluir OS com lote alocado sem o service de exclusão deixa saldo inconsistente.
- Eventos são o histórico de status. O catálogo é por empresa e personalizável; apagar tipos usados quebra OS abertas.
- Modelo de impressão tem primário, seed e duplicar — o mesmo desenho do modelo de pedido.

## O que quebra se alterar ou apagar

- Faturamento da OS (financeiro) e rascunho fiscal.
- Rastreio de peça por lote.
- Impressão da OS.
- Teste de geração de rascunho deixa de refletir produção se o contrato do service mudar.

## Dependências de outros módulos da API

Empresas, entidades, produtos, estoque/lotes, financeiro, emissão NF-e e NFS-e, auditoria.

## Testes relacionados

- `src/service/ordem-servico/gerar-nfe-rascunho-ordem-servico.test.ts`
