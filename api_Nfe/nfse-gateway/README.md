# NFS-e Gateway

Gateway HTTP PHP para emissão municipal de NFS-e com arquitetura multi-adapter.

## Porta

`8089` (NF-e usa `8088`)

## Variáveis

- `NFSE_GATEWAY_SECRET` — mesmo valor em API (`NFSE_GATEWAY_SECRET`) e container

## Rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check |
| POST | `/certificado/info` | Info certificado A1 |
| POST | `/nfse/emissao` | Emissão síncrona (lote 1 RPS) |
| POST | `/nfse/cancelar` | Cancelamento |
| POST | `/nfse/consultar-rps` | Consulta por RPS |

## Provedores

Registrados em `ProvedorFactory`:

- `abrasf` — ABRASF 2.02 (piloto)
- `issnet` — slot ISSNet
- `ginfes` — slot GINFES
- `ipm` — slot IPM

Documentação por provedor: `docs/provedores/`

## Subir

```bash
cd api_Nfe/nfse-gateway
docker compose up -d --build
```
