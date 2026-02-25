# Certificado HTTPS – Passo a passo

Este documento descreve como obter e usar certificados para servir a aplicação em HTTPS, necessário para que **notificações nativas do navegador** funcionem em produção (em localhost elas funcionam sem HTTPS).

São apresentados dois fluxos:

1. **Certbot (Let's Encrypt)** – para produção com domínio real.
2. **Certificado autoassinado** – para desenvolvimento/testes em HTTPS local.

---

## 1. Certbot (Let's Encrypt) – Produção

O Certbot obtém e renova certificados gratuitos da Let's Encrypt, válidos e confiáveis para o navegador.

### 1.1 Instalação do Certbot

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install certbot
```

**Ou usando snap (recomendado pela Let's Encrypt):**

```bash
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

**macOS (Homebrew):**

```bash
brew install certbot
```

### 1.2 Obter o certificado

**Com Nginx (parando o Nginx durante o desafio):**

```bash
sudo certbot certonly --standalone -d seudominio.com.br
```

Siga as instruções (e-mail, termos). Os arquivos ficarão em:

- Certificado: `/etc/letsencrypt/live/seudominio.com.br/fullchain.pem`
- Chave privada: `/etc/letsencrypt/live/seudominio.com.br/privkey.pem`

**Com Nginx em execução (plugin webroot):**

```bash
sudo certbot certonly --webroot -w /var/www/html -d seudominio.com.br
```

Ajuste `-w` para o diretório que o Nginx usa como raiz do site.

### 1.3 Configurar o Nginx para HTTPS

Exemplo de bloco `server`:

```nginx
server {
    listen 443 ssl;
    server_name seudominio.com.br;

    ssl_certificate     /etc/letsencrypt/live/seudominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com.br/privkey.pem;

    # Front (Next.js, por exemplo)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # API (Fastify, por exemplo)
    location /api {
        proxy_pass http://127.0.0.1:3333;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Recarregue o Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 1.4 Renovação automática

A Let's Encrypt emite certificados com validade curta. Renove com:

```bash
sudo certbot renew
```

Para renovar automaticamente (cron, duas vezes ao dia):

```bash
sudo crontab -e
```

Adicione:

```
0 0,12 * * * certbot renew --quiet
```

Após renovar, recarregue o Nginx (ou use `--deploy-hook "systemctl reload nginx"` no Certbot).

---

## 2. Certificado autoassinado – Desenvolvimento

Útil para testar HTTPS (e notificações) em máquina local sem domínio.

### 2.1 Gerar certificado com OpenSSL

No diretório do projeto (ou em uma pasta `certs/`):

```bash
mkdir -p certs
cd certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/CN=localhost"
```

Isso gera:

- `cert.pem` – certificado.
- `key.pem` – chave privada.

**Não use esses arquivos em produção** (não são confiáveis pelo navegador).

### 2.2 Servir o front em HTTPS local com Nginx

Exemplo de configuração Nginx para `localhost`:

```nginx
server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate     /caminho/para/certs/cert.pem;
    ssl_certificate_key /caminho/para/certs/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Acesse `https://localhost`. O navegador exibirá aviso de segurança (esperado para autoassinado); aceite para esse ambiente de desenvolvimento.

### 2.3 Alternativa: Next.js com HTTPS local

É possível rodar o Next em HTTPS usando os mesmos arquivos:

```bash
# No package.json, script de dev com HTTPS (exemplo)
"dev:https": "node server.js"
```

Onde `server.js` usa `https.createServer({ key, cert }, app)` com `cert.pem` e `key.pem`. Ou use um pacote como `next-https` conforme a documentação do Next.js.

---

## Resumo

| Cenário              | Ferramenta   | Uso                          |
|----------------------|-------------|------------------------------|
| Produção (domínio)   | Certbot     | Certificado confiável + renovação |
| Desenvolvimento local| OpenSSL     | Certificado autoassinado em `localhost` |

Com o site sendo servido em HTTPS (produção com Certbot ou local com autoassinado), as notificações nativas do navegador poderão ser exibidas após o usuário conceder permissão.
