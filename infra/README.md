# Deploy e Operação na VPS

Este guia cobre deploy automático (GitHub Actions + SSH), execução da API em Docker, Web com PM2 e backup do Postgres.

## 1) Pré-requisitos na VPS

- Ubuntu/Debian com acesso sudo
- Docker e Docker Compose Plugin
- Node.js 20 e pnpm
- PM2 (`npm i -g pm2`)
- Nginx
- Certbot (`python3-certbot-nginx`)
- Git
- `pg_dump` e `psql` (cliente PostgreSQL)

## 2) Estrutura de diretórios recomendada

```bash
/opt/mais-gestao/
  docker-compose.prod.yml
  .env.api
  .env.web
  web/                   # clone do projeto (para deploy da web via PM2)
  scripts/backup-postgres.sh

/opt/backups/mais-gestao/
```

## 3) Variáveis de ambiente

### API (`/opt/mais-gestao/.env.api`)

Baseie-se em `api/.env.prod.example`:

```env
DATABASE_URL=postgresql://mais_gestao:<PASSWORD>@127.0.0.1:5432/mais_gestao
BETTER_AUTH_SECRET=<GERAR_COM_openssl_rand_base64_32>
BETTER_AUTH_URL=https://api.seudominio.com
CLIENT_ORIGIN=https://app.seudominio.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Web (`/opt/mais-gestao/.env.web`)

```env
NEXT_PUBLIC_API_URL=https://api.seudominio.com
```

`CLIENT_ORIGIN` deve ser a URL do **frontend** (`app.seudominio.com`), não da API. Sem isso, o login trava na tela de carregamento por bloqueio de CORS / Better Auth.

## 4) Configuração do Nginx

1. Copie `nginx/mais-gestao.conf` para `/etc/nginx/sites-available/mais-gestao`.
2. Crie symlink:

```bash
sudo ln -s /etc/nginx/sites-available/mais-gestao /etc/nginx/sites-enabled/mais-gestao
```

3. Teste e recarregue:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

4. Gere TLS:

```bash
sudo certbot --nginx -d api.seudominio.com -d app.seudominio.com
```

## 5) GitHub Secrets (Environment: `production`)

- `VPS_HOST`: IP ou domínio da VPS
- `VPS_USER`: usuário SSH (ex: `deploy`)
- `VPS_SSH_KEY`: chave privada Ed25519
- `GHCR_USERNAME` (opcional, recomendado para imagem privada)
- `GHCR_TOKEN` (opcional, recomendado para imagem privada)

A chave pública correspondente ao `VPS_SSH_KEY` deve estar em `~/.ssh/authorized_keys` na VPS.

## 6) Primeiro deploy manual (bootstrap)

### API (Docker)

```bash
cd /opt/mais-gestao
docker compose -f docker-compose.prod.yml up -d postgres
docker compose -f docker-compose.prod.yml up -d api
```

### Web (PM2)

```bash
cd /opt/mais-gestao/web
pnpm install --frozen-lockfile
pnpm run build
pm2 start "pnpm start -- -p 3000" --name mais-gestao-web
pm2 save
pm2 startup
```

## 7) Deploy automático

O workflow `.github/workflows/deploy.yml` executa:

- Deploy da API via SSH:
  - `docker compose pull api`
  - `docker compose up -d api`
- Deploy da Web via SSH:
  - `git pull` (main)
  - `pnpm install --frozen-lockfile`
  - `pnpm run build`
  - `pm2 restart mais-gestao-web`

## 8) Backup e restore do Postgres

### Agendar backup diário (03:00)

```bash
chmod +x /opt/mais-gestao/scripts/backup-postgres.sh
crontab -e
```

Adicionar:

```cron
0 3 * * * POSTGRES_PASSWORD=<PASSWORD> /opt/mais-gestao/scripts/backup-postgres.sh >> /var/log/mais-gestao-backup.log 2>&1
```

### Restore

```bash
gunzip -c /opt/backups/mais-gestao/backup-YYYYMMDD-HHMMSS.sql.gz | psql -h 127.0.0.1 -U mais_gestao mais_gestao
```

## 9) Operação rápida

- Health check: `curl -s https://api.seudominio.com/health` (200 = API e banco OK; 503 = banco indisponível)
- Logs API: `docker logs -f mais-gestao-api`
- Logs DB: `docker logs -f mais-gestao-db`
- Status PM2: `pm2 status`
- Logs Web PM2: `pm2 logs mais-gestao-web`
