# Plataforma e autenticação

## Propósito no produto

Sobe o servidor HTTP, autentica usuários com Better Auth e decide se a sessão pode usar a plataforma. Sem este módulo nenhuma rota de negócio autenticada funciona.

## Pastas e entrypoints

- Entrypoint: `src/index.ts` (Fastify, CORS, Swagger `/docs`, listen na porta `3333`, `registrarAgendador()`).
- Auth: `src/lib/auth.ts` (Better Auth + adapter Drizzle). Tabelas mapeadas: `usuarios`, `sessoes`, `contas`, `verificacoes`.
- Rotas no próprio `src/index.ts` (não via plugin `auth/rotas.ts`, que está comentado):
  - `POST /api/auth/sign-in/email`
  - `POST /api/auth/sign-up/email`
  - catch-all `GET|POST|PUT|DELETE /api/auth/*`
  - `GET /api/auth/perfil` (`preHandler: verifyJwt`)
  - `GET /api/auth/get-session`
- Handler: `src/controllers/http/authentication.ts`. Perfil: `src/controllers/http/auth/obter-perfil.ts`.
- Plugin de usuários: `src/controllers/http/usuarios/rotas.ts` — CRUD `/usuarios` com `verifyJwt`. Services em `src/service/usuarios/`.
- Health público: `src/controllers/http/health/rotas.ts` — `GET /health` (checa banco).
- Middlewares: `src/controllers/middleware/verify-jwt.ts`, `resolve-empresa-context.ts`, `verificar-acesso-garcom.ts`, `verify-super.ts`, `require-perfil.ts`, `verify-plano.ts`.
- Conexão: `src/repositories/connection.ts` (`DATABASE_URL`).

## Contratos externos

- Web: cookie de sessão Better Auth e/ou `Authorization: Bearer`.
- PDV: o middleware aceita Bearer; rotas específicas de PDV estão no módulo PDV.
- POS Android: não confirmado neste pacote.

Rotas sem JWT no código lido: `/health`, `/docs`, `/api/auth/*`, `/pdv/updates/*`, `GET /planos/catalogo`, `POST /webhook/asaas`, cotação pública de compra. `verifyJwt` ignora checagem de acesso à plataforma nos prefixos `/health`, `/docs`, `/api/auth`, `/pdv/updates`.

## Configuração crítica

Nomes apenas: `DATABASE_URL`, `API_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` (em `.env.example` e README; leitura explícita de `process.env.BETTER_AUTH_SECRET` em `src/` não encontrada — a lib Better Auth usa essa convenção), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CLIENT_ORIGIN`, `FRONTEND_URL`, `CORS_ORIGINS`, `COOKIE_DOMAIN`.

`USE_SECURE_COOKIES` está em `.env.example`. Em `src/lib/auth.ts` o cookie seguro depende de a origem do cliente começar com `https://`. Uso de `USE_SECURE_COOKIES` no código não confirmado.

Prefixo de cookie: `mais-gestao`. `advanced.disableOriginCheck` está `true` em `src/lib/auth.ts`. Sessão: 7 dias, update age 1 dia.

Na criação do usuário, hook grava `perfil` e `plano` inicial (primeiro plano SaaS ativo ou fallback `BASIC`).

## Invariantes

- Controllers não acessam banco; sessão é resolvida no middleware e em `src/lib/auth.ts`.
- `request.user` precisa existir nas rotas protegidas. Sem usuário: 401.
- Acesso à plataforma (`verificarUsuarioPodeAcessarPlataforma`) roda dentro de `verifyJwt`, exceto perfil super.
- Perfil `garcom` só nas rotas listadas em `verificar-acesso-garcom.ts` (empresas GET, produtos GET, hierarquias GET, saldos/movimentos de estoque, contas de mesa, vendas PDV, fechamento de caixa, usuários GET).
- Super ignora a checagem de pertencimento à empresa.
- Zod nos controllers de usuário e nos bodies documentados. Entrada do Better Auth segue o schema declarado em `src/index.ts` para sign-in/sign-up.

## O que quebra se alterar ou apagar

- Renomear tabelas/campos mapeados em `src/lib/auth.ts` (`nome`, `emailverificado`, `idusuario`, `token`, etc.).
- Remover `/api/auth/*`, cookie prefix ou `trustedOrigins`.
- Remover `verifyJwt` dos plugins.
- Apagar `usuarios`, `sessoes`, `contas`, `verificacoes`.
- Trocar a porta 3333 sem alinhar `API_URL` / `BETTER_AUTH_URL` e o front.
- Tratar `GET /health` como rota autenticada (monitoramento e README dependem dela pública).

## Dependências de outros módulos da API

Planos SaaS (`src/service/planos/`, `src/repositories/saas-catalog-repositories.ts`) no plano inicial e no bloqueio de acesso. Empresas no contexto `x-empresa-id`.

## Testes relacionados

- `src/util/validar-usuario-empresa.test.ts`
- `src/service/usuarios/listar-usuarios.test.ts`
- `src/service/admin/gerenciar-usuarios.test.ts`
