# API Mais Gestão — guia para agentes

Leia este arquivo e [docs/modulos/README.md](docs/modulos/README.md) antes de editar a API.

Documentação do monorepo (outro agente): [../AGENTS.md](../AGENTS.md) e [../docs/sistema/pontos-criticos.md](../docs/sistema/pontos-criticos.md).

## O que é

Backend HTTP do SaaS Mais Gestão. Fastify 5, Drizzle, PostgreSQL, Better Auth, Zod. Entrypoint: `src/index.ts`. Porta de escuta fixa `3333` (não há `PORT` no código lido). Swagger em `/docs`.

Scripts reais em `package.json`: `dev`, `build`, `start`, `test` / `test:unit` / `test:e2e`, seeds (`seed`, `seed:cest`, `seed:servicos-nfse`, `seed:products`, `seed:financeiro-dashboard`, `seed:budget`), worker (`worker:run`) e migrations (`db:generate`, `db:migrate`, `db:migrate:producao`, `db:push`, `db:migrate:status`, entre outros).

## Arquitetura em camadas

Rules locais:

- `api/.cursor/rules/back-end.mdc`
- `src/controllers/.cursor/rules/controllers.mdc`
- `src/service/.cursor/rules/services.mdc`
- `src/repositories/.cursor/rules/repositories.mdc`

Camadas obrigatórias neste pacote:

- **Controller** (`src/controllers/http/<dominio>/`): request, Zod/schema, chamada de service, resposta HTTP. Sem regra de negócio e sem acesso ao banco.
- **Service** (`src/service/<dominio>/`): regra de negócio. Retorno `HttpResponse` via `src/util/http-util.ts`.
- **Repository** (`src/repositories/`): somente Drizzle. Tipos com `$inferSelect` / `$inferInsert`.
- **Schema** (`drizzle/schema.ts` reexporta `drizzle/tables/`). Migrations SQL em `drizzle/`. Aplicação: `scripts/aplicar-migrations-pendentes.ts`.

Não misture com padrões do `web/` (React, hooks, services de front). A API não importa código de `web/` nem de `pdv/`.

Nomenclatura de arquivos e variáveis em português. UUID v4. Transação quando há várias escritas no banco (rule de service/back-end).

## Autenticação e empresa

- Sessão Better Auth em `src/lib/auth.ts`, base path `/api/auth`. Cookie ou `Authorization: Bearer`.
- Quase todo plugin chama `verifyJwt` (`src/controllers/middleware/verify-jwt.ts`) em `onRequest`.
- Contexto de empresa: header `x-empresa-id` e/ou `idempresa` em params, body ou query (`resolve-empresa-context.ts`). Super não passa por essa checagem. Vínculo em `usuario_empresa` via `verificarUsuarioPertenceEmpresa`.
- Perfil `garcom` só acessa um conjunto fixo de rotas (`verificar-acesso-garcom.ts`).
- Plano/módulo: `requireFeature` e `requireModulo` (`verify-plano.ts`, códigos em `src/constants/saas-catalog.ts`).

`src/index.ts` também registra esses preHandlers no app raiz **depois** dos `app.register`. O que protege cada plugin é o hook declarado dentro do próprio `rotas.ts`.

## Nunca “simplificar”

- Auth Better Auth, tabelas `usuarios` / `sessoes` / `contas` / `verificacoes` e `verifyJwt`.
- Tenant: `empresas`, `usuario_empresa`, `x-empresa-id`, checagem de pertencimento.
- Migrations Drizzle e `drizzle/schema.ts` / `drizzle/tables/`.
- Emissão fiscal (NF-e, NFC-e, NFS-e), certificado, numeração de série, gateway e XML.
- Estoque: saldos, movimentos, lotes e efeitos disparados por nota, venda e produção.

## Módulos

Índice com risco: [docs/modulos/README.md](docs/modulos/README.md).

- [Plataforma e auth](docs/modulos/plataforma-auth.md)
- [Empresas, tenancy e planos](docs/modulos/empresas-tenancy.md)
- [Financeiro](docs/modulos/financeiro.md)
- [Contabilidade](docs/modulos/contabilidade.md)
- [Entidades](docs/modulos/entidades.md)
- [Produtos](docs/modulos/produtos.md)
- [Estoque](docs/modulos/estoque.md)
- [Compras e entrada de NF-e](docs/modulos/compras-entrada-nfe.md)
- [Emissão fiscal](docs/modulos/emissao-fiscal.md)
- [Obrigações fiscais](docs/modulos/obrigacoes-fiscais.md)
- [PDV](docs/modulos/pdv.md)
- [Vendas DAV](docs/modulos/vendas-dav.md)
- [Ordem de serviço](docs/modulos/ordem-servico.md)
- [Produção](docs/modulos/producao.md)
- [Relatórios e dashboard](docs/modulos/relatorios-dashboard.md)
- [Automação, e-mail e jobs](docs/modulos/automacao-email.md)
- [Admin, IA e conteúdo](docs/modulos/admin-ia-conteudo.md)
- [Cadastros auxiliares](docs/modulos/cadastros-auxiliares.md)
