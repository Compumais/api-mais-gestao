# PDV Mais Gestão (Híbrido Desktop)

Aplicação Electron desacoplada para PDV Windows com PostgreSQL local, sync outbox e NFC-e (online + contingência quando a API/SEFAZ está fora).

## Stack

- Electron + React + Vite + TypeScript
- Tailwind v4 + shadcn/ui (tokens alinhados ao `web/src/app/globals.css`)
- PostgreSQL 17 local (`pg` no processo main) — banco `pdv_local`, separado da API
- Impressão via impressoras do Windows (ESC/POS textual / silent print)
- Sync FIFO com a API Mais Gestão

## Funcionalidades

| Área | Comportamento |
|------|----------------|
| Venda rápida | Atalhos + busca no cache local, pagamento Dinheiro/PIX/Cartão |
| Mesas | Grade local, lançar itens, receber/fechar conta |
| Vendas | Listagem local com status sync e NFC-e |
| Caixa | Abrir/fechar turno |
| Config | URL API, Postgres local, PDV, mesas, impressora, PIX, certificado A1, tema |
| Offline (API) | Opera no Postgres local; fila outbox envia ao voltar online |
| NFC-e online | Via `/vendas-pdv-gourmet` + `/estoque/baixa-venda` |
| Contingência | `tpEmis=9` local + `POST /nfce/contingencia/transmitir` |

## Desenvolvimento

Requer **Node.js 20+** e **PostgreSQL 17** (Docker ou instalado na máquina).

```bash
cd pdv
nvm use   # ou: nvm install
docker compose up -d
npm install
npm run dev
```

URL padrão do banco: `postgresql://pdv:pdv@127.0.0.1:5433/pdv_local`.

Ordem de resolução da URL: `PDV_DATABASE_URL` → arquivo `database-url.txt` no `userData` do Electron → default acima.

No Linux, o script `dev` já desativa o sandbox do Chromium (`ELECTRON_DISABLE_SANDBOX=1`), necessário quando o `chrome-sandbox` não está com setuid root.

Build Windows:

```bash
npm run pack:win
```

Instalador Windows com PostgreSQL local (Inno Setup):

```bash
npm run pack:iss
```

Requer [Inno Setup 6](https://jrsoftware.org/isinfo.php). Sem o compilador `ISCC`, o script fica em `installer/pdv-mais-gestao.iss`. Para um setup offline, copie o instalador Windows x64 do PostgreSQL 17 para `installer/vendor/postgresql-17-windows-x64.exe` antes de `pack:iss`.

### Automatizar (GitHub Actions)

O workflow **PDV instalador** gera, em um runner Windows:

- executável portátil (`PDV-Mais-Gestao-portable.zip`)
- instalador NSIS (`pdv/release/*.exe`)
- instalador Inno Setup com PostgreSQL (`pdv/installer/output/*.exe`)

Disparo manual (depois de enviar o código). No Linux use o `.sh`; o `.bat` é só para o `cmd.exe` do Windows:

```bash
gh workflow run "PDV instalador"
# Linux:
bash pdv/scripts/gerar-instalador.sh
# Windows (dois cliques abre um menu e a janela permanece aberta):
pdv\scripts\gerar-instalador.bat
```

Também roda ao publicar a tag `pdv-v*` (exemplo: `git tag pdv-v0.1.2 && git push origin pdv-v0.1.2`), e nesse caso cria um GitHub Release com os arquivos.

No Windows, para gerar neste computador (sem GitHub Actions): escolha a opção **1** no menu, ou `pdv\scripts\gerar-instalador.bat local`, ou `npm run pack:release`.

O script local faz **bump automático do patch** (consulta `installer/output` + `package.json`, ex.: `0.1.2` → `0.1.3`), gera o Setup Inno e grava `installer/output/version.json`. Commitar `pdv/package.json` e `pdv/installer/output/*` (somente o Setup mais recente).

### Auto-update (API/VPS)

Na abertura do PDV empacotado, o app consulta `{api_url}/pdv/updates/version.json`. Se a versão remota for maior, ofereceixa o Setup e instala com `/SILENT /NORESTART`.

1. Gerar: `npm run pack:release`
2. Commitar e enviar `installer/output/version.json` + `PDV-Mais-Gestao-Setup-*.exe`
3. Publicar na VPS:

```powershell
pdv\scripts\publicar-update-pdv.ps1 -HostName api.compuchat.space -User deploy
```

Na VPS, sirva a pasta `/opt/mais-gestao/pdv-updates/` em `/pdv/updates/` (veja `nginx/mais-gestao.conf`).

Se o PDV já estiver instalado, o setup compara a versão: pacote mais antigo é recusado; mesma versão repara os arquivos; versão mais nova só atualiza o aplicativo e **preserva o PostgreSQL e os dados**.

## Arquitetura

```
pdv/
  electron/          # main, preload, db, sync, fiscal, impressora, local-api
  src/               # UI React
  db/schema.sql      # referência do schema (fonte em electron/db/schema.ts)
  docker-compose.yml # Postgres local na porta 5433
```

A fachada `electron/local-api` é o contrato da UI (IPC) e da **API LAN** (`GET/POST /pos/*` na porta **5050**) para o POS Android.

No POS, escolha o modo **PDV local** e informe `http://IP-DO-PDV:5050`. O tablet baixa o catálogo (`GET /pos/sync`) e opera mesas/vendas no desktop. Caixa e NFC-e ficam no PDV.

O PDV **não** acessa o PostgreSQL da API (`mais_gestao`). Sync continua via HTTP + outbox.

## Configuração inicial

1. Suba o Postgres local (`docker compose up -d`) ou aponte a URL em **Config**
2. Informe a URL da API em **Config**
3. Faça login (requer internet na primeira autenticação)
4. Selecione a empresa (puxa produtos/atalhos/CSC)
5. Abra o caixa
6. Opere vendas/mesas mesmo com a API offline

Certificado A1 (`.pfx`) e senha ficam só no storage local do app — não versionar.
