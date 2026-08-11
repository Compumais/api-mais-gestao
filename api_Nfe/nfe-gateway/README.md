# NFe Gateway (PHP)

Microserviço HTTP que encapsula o `nfephp-org/sped-nfe` para a API Node do Mais Gestão.

## Opção recomendada: Docker (sem PHP/Composer no Windows)

Na pasta `api_Nfe/nfe-gateway`:

```powershell
# 1. Criar .env local (copie do exemplo)
copy .env.example .env

# 2. Subir o gateway (primeira vez faz build + composer install dentro da imagem)
docker compose up --build
```

O gateway ficará em `http://127.0.0.1:8088`.

**Importante:** use o **mesmo** `NFE_GATEWAY_SECRET` em:
- `api_Nfe/nfe-gateway/.env`
- `api/.env`

Exemplo em `api/.env`:

```env
NFE_GATEWAY_URL=http://127.0.0.1:8088
NFE_GATEWAY_SECRET=dev-secret-change-me
NFE_CERT_ENCRYPTION_KEY=<gerar com: openssl rand -base64 32>
```

Teste rápido:

```powershell
curl http://127.0.0.1:8088/health
```

## Opção alternativa: PHP local

Requisitos: PHP 8.1+, Composer, extensões `openssl`, `soap`, `dom`, `curl`, `mbstring`, `zip`.

Com OpenSSL 3 (PHP 8.2+/Debian Bookworm etc.), aponte `OPENSSL_CONF` para o arquivo na pasta `api_Nfe` — senão PFX A1 com cifragem legada falham com `error:0308010C:digital envelope routines::unsupported`.

```bash
cd api_Nfe/sped-nfe && composer install
cd ../nfe-gateway && composer install
# PowerShell: $env:OPENSSL_CONF = (Resolve-Path ..\openssl-legacy.cnf).Path
export OPENSSL_CONF="$(pwd)/../openssl-legacy.cnf"
NFE_GATEWAY_SECRET=dev-secret-change-me php -S 127.0.0.1:8088 -t public
```

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Healthcheck (sem auth) |
| POST | `/certificado/info` | Metadados do certificado A1 |
| POST | `/sefaz/status` | Status do serviço SEFAZ |
| POST | `/sefaz/dist-dfe` | Distribuição DF-e por NSU |
| POST | `/sefaz/dist-dfe/chave` | Distribuição DF-e por chave (`consChNFe`) |
| POST | `/sefaz/consulta-chave` | Consulta situação da NF-e na SEFAZ (`consSitNFe`) |
| POST | `/nfe/homologacao/emitir` | NF-e teste homologação |
| POST | `/nfe/emissao` | Emissão NF-e de venda |
| POST | `/nfe/emissao/preview-danfe` | Pré-visualização DANFE (monta/assina XML sem transmitir) |
| POST | `/nfe/cancelar` | Cancelamento de NF-e autorizada |
| POST | `/nfe/inutilizar` | Inutilização de numeração não utilizada |

Header obrigatório (exceto `/health`): `X-Nfe-Gateway-Secret`

## Problemas comuns

### `Impossivel ler o certificado` / `error:0308010C:digital envelope routines::unsupported`

Certificados A1 (PFX/P12) gerados com algoritmos legados (RC2/3DES) exigem o **OpenSSL legacy provider**. A imagem Docker já define `OPENSSL_CONF=/etc/ssl/openssl-legacy.cnf` (arquivo em `api_Nfe/openssl-legacy.cnf`).

Após puxar essa alteração, recrie o container:

```powershell
docker compose up -d --build
```

Em PHP local, exporte `OPENSSL_CONF` apontando para `api_Nfe/openssl-legacy.cnf` (veja seção acima).

### `Could not resolve host: hnfe.fazenda.mg.gov.br`

Emissão em **homologação** (ambiente 2) usa o host `hnfe.fazenda.mg.gov.br` (SEFAZ MG). O DNS interno do Docker Desktop no Windows às vezes não resolve esse nome.

O `docker-compose.yml` já define DNS público (`1.1.1.1`). Após alterar, recrie o container:

```powershell
docker compose down
docker compose up -d
```

Teste dentro do container:

```powershell
docker exec mais-gestao-nfe-gateway getent hosts hnfe.fazenda.mg.gov.br
```

Deve retornar um IP (ex.: `45.183.223.53`). Se continuar falhando, verifique firewall/VPN ou teste emissão em produção apenas com certificado e credenciamento válidos.
