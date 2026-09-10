# Mais Gestão

Monorepo da plataforma Mais Gestão. Os pacotes principais são:

- `api/`: API Node.js/Fastify e migrações Drizzle/PostgreSQL;
- `web/`: aplicação Next.js;
- `pdv/`: PDV desktop;
- `POSmaisgestao/`: aplicativo Android;
- `api_Nfe/`: gateways fiscais;
- `infra/`: arquivos e referências de infraestrutura.

Cada pacote possui documentação própria quando necessário. Para detalhes de
infraestrutura, consulte também [`infra/README.md`](infra/README.md).

## Deploy de produção é manual

> **Não existe deploy automatizado em uso na produção.** Um `git push` apenas
> atualiza o repositório remoto e **não implanta** a alteração na VPS.

Após o commit e o push, um responsável deve acessar a VPS e executar
manualmente a atualização, as migrações necessárias, a instalação, o build e
o reinício dos processos.

Arquivos em `.github/workflows/`, inclusive workflows com nome de deploy,
**não representam o fluxo operacional atual de produção** e não devem ser
usados como evidência de que a aplicação foi implantada.

### Ordem segura

Antes de iniciar, confirme a branch e o commit que serão publicados, preserve
as variáveis de ambiente existentes na VPS e tenha um backup válido do banco
quando a versão alterar o schema.

#### 1. Atualizar o código

No checkout do monorepo existente na VPS:

```bash
git checkout main
git pull --ff-only origin main
```

Confirme que o commit esperado está presente antes de prosseguir.

#### 2. Aplicar a migration específica da versão

Se o commit publicado incluir migration, aplique **o arquivo específico
exigido por essa versão antes de atualizar ou reiniciar a API**. Identifique o
arquivo na alteração revisada; não execute uma migration genérica ou
desconhecida por suposição.

Exemplo para PostgreSQL executado pelo Compose atual, sem expor credenciais:

```bash
docker compose -f docker-compose.prod.yml up -d postgres
docker compose -f docker-compose.prod.yml exec -T postgres \
  sh -c 'psql --single-transaction -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "api/drizzle/<migration-especifica-da-versao>.sql"
```

Substitua o placeholder pelo arquivo confirmado para a versão. Se o ambiente
de produção não usa esse Compose para o banco, use o cliente PostgreSQL já
configurado na VPS, mantendo transação e interrupção em caso de erro. Não
prossiga com a API se a migration falhar.

#### 3. Instalar, compilar e reiniciar a API

```bash
cd api
pnpm install --frozen-lockfile
pnpm run build
```

Após o build terminar com sucesso, reinicie a API pelo gerenciador realmente
configurado na VPS:

```bash
<comando-de-reinicio-do-processo-da-api>
```

O nome e o gerenciador do processo da API não estão definidos de forma
confiável neste README. Consulte a configuração ativa na VPS (por exemplo,
PM2, systemd ou Docker Compose) e substitua o placeholder pelo comando
correto; não crie nem presuma um nome de processo.

Verifique o status, os logs e o endpoint de saúde da API antes de atualizar o
frontend.

#### 4. Instalar, compilar e recarregar a web

Continuando a partir da pasta `api/` usada na etapa anterior:

```bash
cd ../web
pnpm install --frozen-lockfile
pnpm run build:live
pm2 reload mais-gestao-web --update-env
```

`build:live` prepara e publica o build da web somente após a compilação
terminar com sucesso. Não execute o `pm2 reload` se a instalação ou o build
falhar.

#### 5. Validar a publicação

- confira o commit em execução na VPS;
- valide o health check e os logs da API;
- valide a aplicação web e os logs do PM2;
- registre manualmente quem publicou, quando e qual commit foi implantado.

