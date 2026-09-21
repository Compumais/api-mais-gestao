# Visão geral

## Proposta

Mais Gestão é uma plataforma SaaS multi-empresa para controle financeiro e fiscal (`.cursor/rules/monorepo.mdc`). O README da API descreve o núcleo financeiro: empresas e usuários, plano de contas, contas a pagar e receber, entidades, contas correntes, lançamentos, autenticação e auditoria. O monorepo também cobre fiscal (NF-e, NFC-e, NFS-e, entrada de notas, SINTEGRA, EFD), estoque, PDV desktop e POS Android. Esses domínios aparecem como pastas de rotas em `api/src/controllers/http/` e telas em `web/src/app/`.

O repositório agrupa pacotes independentes, com deploy e CI separados.

## Pacotes e stacks

| Pacote | Caminho | Stack |
|--------|---------|-------|
| API | `api/` | Node.js, TypeScript, Fastify, Drizzle, PostgreSQL, Better Auth, Zod. README da API cita Fastify 5, Drizzle 0.44, PostgreSQL 17, Better Auth e Zod. Regras locais em `api/.cursor/rules/` |
| Web | `web/` | Next.js (App Router), React Query, shadcn/ui, Zod. `web/package.json` declara Next 16, React 19, `@tanstack/react-query`, `better-auth`, Tailwind 4 e `packageManager` pnpm 11. Regras locais em `web/.cursor/rules/` |
| PDV híbrido | `pdv/` | Electron, React, Vite, TypeScript, PostgreSQL 17 local, Tailwind 4, shadcn/ui. Banco `pdv_local`, separado da API |
| POS Android | `POSmaisgestao/` | Java/Android (maquininha). Build Gradle (`./gradlew`) |
| NFe Gateway | `api_Nfe/nfe-gateway/` | PHP, `nfephp-org/sped-nfe`, integração SEFAZ. Porta documentada: `8088` |
| NFS-e Gateway | `api_Nfe/nfse-gateway/` | PHP, emissão municipal. Porta documentada: `8089` |
| Infra | `infra/` | Deploy na VPS: Docker, PM2, Nginx. Não é documentação de produto |

Pastas de primeiro nível confirmadas neste levantamento: `api/`, `web/`, `pdv/`, `POSmaisgestao/`, `api_Nfe/`, `infra/`, `.github/`, `.cursor/`. Na raiz há `README.md`, `package.json`, `biome.json` (citado pelo CI) e `up.sh` (citado pelo README da raiz).

## Como rodar

Comandos abaixo são os que constam nos READMEs ou nos `package.json`. Instalar e executar dentro do pacote.

### Raiz

Lint e formatação do monorepo (Biome), em `package.json` da raiz:

```bash
npm run check
npm run format
npm run lint
npm run check:fix
```

Não há script de aplicação na raiz. `npm test` na raiz apenas encerra com erro (“no test specified”).

### API (`api/`)

Pré-requisitos no README: Node.js 18+, npm ou yarn, Docker e Docker Compose. O CI usa Node 20.

```bash
cd api
npm install
docker-compose up -d
npx drizzle-kit push
npm run dev
```

O README também cita, no lugar do `push`:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Servidor de desenvolvimento documentado em `http://localhost:3333`. Health check: `GET /health`.

Scripts em `api/package.json` (não inventar outros): `start`, `dev`, `build`, `test`, `test:ui`, `test:coverage`, `test:unit`, `test:e2e`, `test:watch`, `seed`, `seed:cest`, `seed:servicos-nfse`, `seed:products`, `seed:financeiro-dashboard`, `seed:budget`, `worker:run`, `clean`, `db:patch-roles`, `db:push`, `db:generate`, `db:studio`, `db:migrate`, `db:migrate:kit`, `db:migrate:status`, `db:migrate:producao`, `db:migrate:baseline-producao`, `db:migrate:baseline`, `db:migrate:diagnostico`, `db:diagnostico:produtos-csv`, `corrigir-itens-efd-nfe`, `auditar-numeracao-fiscal`, `popular-cfops-padrao`, `popular-fatores-conversao-padrao`, `popular-taxas-padrao`, `popular-parametrizacao-tributos-padrao`. Há ainda aliases `db:migrate:undo`, `latest`, `rollback`, `reset`, `force` e `revert` apontando para o drizzle-kit.

`db:migrate` executa `scripts/aplicar-migrations-pendentes.ts`. O README do POS cita `cd api && npm run db:migrate` para a migration de atalhos do PDV.

Variáveis citadas no README da API, sem valores: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, e opcionais `IBPT_API_BASE_URL`, `IBPT_API_TIMEOUT_MS`.

### Web (`web/`)

O README do web é o texto padrão do create-next-app. Desenvolvimento:

```bash
cd web
npm run dev
```

O mesmo README também mostra `yarn dev`, `pnpm dev` e `bun dev`. URL documentada: `http://localhost:3000`.

O CI e o deploy usam pnpm com lockfile congelado. Scripts em `web/package.json`: `dev`, `build`, `build:live`, `build:rollback`, `start`, `lint`, `format`, `generate:pwa-icons`, `slicemachine`.

`build:live` é o script de publicação sem derrubar o site no meio do build (README da raiz e `infra/README.md`). Processo PM2 citado: `web-mais-gestao`.

### PDV (`pdv/`)

Requer Node.js 20+ e PostgreSQL 17.

```bash
cd pdv
docker compose up -d
npm install
npm run dev
```

Banco local documentado: `postgresql://pdv:pdv@127.0.0.1:5433/pdv_local`. Ordem da URL: `PDV_DATABASE_URL`, depois `database-url.txt` no `userData` do Electron, depois o default acima.

Build e instalador, em `pdv/package.json` e no README:

```bash
npm run pack:win
npm run pack:iss
npm run pack:release
```

Outros scripts: `build`, `preview`, `typecheck`, `pack:dir`, e vários `test:*` (tecnibra, conta-gourmet, pedido-entrega, acesso, sitef, balanca, comanda, catalogo, pdv-secundario, xml, caixa, teclas, producao, nfce-meios, nfce-sync, observacao, update).

### POS Android (`POSmaisgestao/`)

```bash
cd POSmaisgestao
./gradlew assembleDebug
```

APK debug citado no README: `app/build/outputs/apk/debug/app-debug.apk`. Testes unitários da balança: `./gradlew testDebugUnitTest`.

### Gateways fiscais (dependência, não rodar “dentro” da API)

NF-e, na pasta `api_Nfe/nfe-gateway`:

```bash
docker compose up --build
```

Health: `http://127.0.0.1:8088/health`. A API fala com esse processo pelas variáveis `NFE_GATEWAY_URL` e `NFE_GATEWAY_SECRET` (nomes no README do gateway; o cliente está em `api/src/lib/nfe-gateway-client.ts`).

NFS-e fica em `api_Nfe/nfse-gateway`, porta `8089`, variáveis `NFSE_GATEWAY_URL` e `NFSE_GATEWAY_SECRET`. Não há documentação completa desse pacote neste índice.

### Produção

Não existe deploy automatizado em uso na produção. `git push` não implanta a VPS. O fluxo documentado no README da raiz é manual: no clone da VPS, `./up.sh` (pull fast-forward, dependências, migrations, build da API, PM2 `api-mais-gestao`, depois `pnpm run build:live` da Web). Não republica PDV nem POS.

O README da raiz afirma que arquivos em `.github/workflows/`, inclusive os com nome de deploy, não representam o fluxo operacional atual e não provam que a aplicação foi implantada. O `infra/README.md` descreve um fluxo automático via `.github/workflows/deploy.yml`. Em caso de dúvida operacional, siga o README da raiz e o cabeçalho de `up.sh`.

## O que o CI protege

`.github/workflows/ci.yml` dispara em pull request e em push na branch `main`.

Filtro de paths:

- `api/**` → lint (Biome) e build da API; testes unitários (`npm run test:unit`) com PostgreSQL 17
- `web/**` → `pnpm run lint` e `pnpm run build` (Node 20, pnpm 11)
- `.github/workflows/**` e `biome.json` → reexecuta os jobs de API e Web

Em push para `main`, os jobs de API e Web rodam mesmo sem mudança nesses paths (`github.event_name == 'push'`).

O CI não cobre `pdv/`, `POSmaisgestao/`, `api_Nfe/` nem `infra/`. Existem outros workflows (`deploy.yml`, `api-image.yml`, `pdv-release.yml`, `publish-pdv-update.yml`). O papel operacional deles na produção não está confirmado além do aviso do README da raiz.
