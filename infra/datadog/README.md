# Datadog na VPS — Mais Gestão

Guia para monitorar **API (Docker)**, **Postgres (Docker)**, **Web (PM2)** e **Nginx** com o Datadog Agent instalado **no host** (systemd).

> **Arquitetura recomendada:** Agent no host + labels no `docker-compose.prod.yml` + tail de logs PM2.  
> Não rode dois Agents (host + container) ao mesmo tempo.

---

## 1) Instalar o Agent no host

Execute **tudo numa única linha** (a key não herda entre comandos separados):

```bash
export DD_API_KEY="<SUA_API_KEY>"
export DD_SITE="us5.datadoghq.com"
export DD_ENV="prod"

bash -c "$(curl -L https://install.datadoghq.com/scripts/install_script_agent7.sh)"
```

Verifique:

```bash
sudo datadog-agent status
sudo datadog-agent configcheck
```

Adicione o usuário `deploy` ao grupo `docker` (se ainda não estiver) e garanta que o Agent acesse o socket:

```bash
sudo usermod -aG docker dd-agent
sudo systemctl restart datadog-agent
```

---

## 2) Configurar o Agent (`/etc/datadog-agent/datadog.yaml`)

Mesclie o conteúdo de [`datadog.yaml.snippet`](./datadog.yaml.snippet) no arquivo principal:

```bash
sudo nano /etc/datadog-agent/datadog.yaml
```

Copie as integrações:

```bash
sudo cp infra/datadog/conf.d/docker.d/conf.yaml   /etc/datadog-agent/conf.d/docker.d/conf.yaml
sudo cp infra/datadog/conf.d/postgres.d/conf.yaml /etc/datadog-agent/conf.d/postgres.d/conf.yaml
sudo cp infra/datadog/conf.d/pm2.d/conf.yaml      /etc/datadog-agent/conf.d/pm2.d/conf.yaml
# opcional:
sudo cp infra/datadog/conf.d/nginx.d/conf.yaml    /etc/datadog-agent/conf.d/nginx.d/conf.yaml
```

Ajuste senhas/caminhos e reinicie:

```bash
sudo datadog-agent configcheck
sudo systemctl restart datadog-agent
```

---

## 3) Docker Compose — labels e APM

O [`docker-compose.prod.yml`](../../docker-compose.prod.yml) na raiz do repo já inclui:

| Serviço   | Labels Datadog                         | Função                          |
|-----------|----------------------------------------|---------------------------------|
| `api`     | `service:api-mais-gestao`, `source:nodejs` | Logs + service map           |
| `postgres`| `service:mais-gestao-db`, `source:postgresql` | Logs do container         |

Métricas do Postgres vêm da integração estática [`conf.d/postgres.d/conf.yaml`](./conf.d/postgres.d/conf.yaml) apontando para `127.0.0.1:5432` (Agent no host, porta publicada pelo compose).

Variáveis opcionais em `/opt/mais-gestao/.env.api` (para quando integrar `dd-trace` na API):

```env
DD_ENV=prod
DD_SERVICE=api-mais-gestao
DD_VERSION=1.0.0
DD_TRACE_ENABLED=true
DD_LOGS_INJECTION=true
DD_AGENT_HOST=host.docker.internal
```

O compose define `extra_hosts: host.docker.internal:host-gateway` para o container da API enviar traces ao Agent no host (porta `8126`).

Subir com as novas labels:

```bash
cd /opt/mais-gestao
docker compose -f docker-compose.prod.yml up -d
```

---

## 4) Postgres — usuário de monitoramento

Conecte no banco e crie o usuário (substitua a senha):

```sql
CREATE USER datadog WITH PASSWORD '<SENHA_FORTE>';
GRANT pg_monitor TO datadog;
GRANT SELECT ON pg_stat_database TO datadog;
```

Atualize a senha em `/etc/datadog-agent/conf.d/postgres.d/conf.yaml`.

Para **DBM** (Database Monitoring), habilite `track_activity_query_size` e `pg_stat_statements` conforme [doc Datadog Postgres](https://docs.datadoghq.com/database_monitoring/setup_postgres/selfhosted/).

---

## 5) PM2 — logs da Web

### Caminhos padrão de log

Com o processo `mais-gestao-web`, o PM2 grava em:

```
/home/deploy/.pm2/logs/mais-gestao-web-out.log
/home/deploy/.pm2/logs/mais-gestao-web-error.log
```

O Agent faz tail via [`conf.d/pm2.d/conf.yaml`](./conf.d/pm2.d/conf.yaml).

### Migrar para ecosystem (recomendado)

```bash
cp /opt/mais-gestao/web/infra/datadog/ecosystem.config.cjs /opt/mais-gestao/web/ecosystem.config.cjs
# ou copie de infra/datadog/ecosystem.config.cjs após git pull

cd /opt/mais-gestao/web
pm2 delete mais-gestao-web 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
```

Confirme os arquivos de log:

```bash
pm2 show mais-gestao-web | grep -E "out log|error log"
ls -la /home/deploy/.pm2/logs/mais-gestao-web*
```

Permissões — o Agent (`dd-agent`) precisa ler os logs:

```bash
sudo chmod o+r /home/deploy/.pm2/logs/mais-gestao-web-*.log
# ou: sudo usermod -aG deploy dd-agent  (e chmod g+r nos logs)
```

---

## 6) Nginx (opcional)

Para métricas HTTP, adicione um server block interno (ex.: porta `8081`) com `stub_status` e use [`conf.d/nginx.d/conf.yaml`](./conf.d/nginx.d/conf.yaml).

Alternativa mais simples: **Synthetic Test** no painel Datadog apontando para `https://api.seudominio.com/health`.

---

## 7) Validar no Datadog

| O que verificar        | Comando / local                          |
|------------------------|------------------------------------------|
| Agent saudável         | `sudo datadog-agent status`              |
| Logs Docker            | Infrastructure → Containers              |
| Logs API               | Logs → `service:api-mais-gestao`         |
| Logs Web               | Logs → `service:web-mais-gestao`         |
| Postgres               | Infrastructure → PostgreSQL              |
| APM (futuro)           | APM → Services → `api-mais-gestao`       |

Teste envio de log manual:

```bash
sudo datadog-agent flare --help   # diagnóstico se algo falhar
```

---

## 8) Troubleshooting

### `API key not available in DD_API_KEY`

A key foi definida em comando separado sem `export`. Use uma linha só ou `export DD_API_KEY=...` antes do script.

### Logs de container não aparecem

1. `logs_enabled: true` em `datadog.yaml`
2. `dd-agent` no grupo `docker`
3. Labels no compose (`com.datadoghq.ad.logs`)
4. `sudo datadog-agent configcheck`

### Logs PM2 não aparecem

1. Caminho correto em `pm2.d/conf.yaml`
2. Permissão de leitura para `dd-agent`
3. Processo PM2 rodando: `pm2 status`

### APM não conecta (quando habilitar dd-trace)

1. `apm_config.enabled: true` no Agent
2. `DD_AGENT_HOST=host.docker.internal` no container API
3. `extra_hosts` no compose
4. Teste: `docker exec mais-gestao-api wget -qO- http://host.docker.internal:8126/info`

---

## Arquivos deste diretório

```
infra/datadog/
  README.md                    ← este guia
  .env.datadog.example         ← variáveis para referência na VPS
  datadog.yaml.snippet         ← trechos para /etc/datadog-agent/datadog.yaml
  ecosystem.config.cjs         ← PM2 com paths de log explícitos
  conf.d/
    docker.d/conf.yaml
    postgres.d/conf.yaml
    pm2.d/conf.yaml
    nginx.d/conf.yaml          ← opcional
```
