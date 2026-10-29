# Atualização e instalador

## Propósito no caixa

Atualiza o aplicativo Windows sem jogar fora o PostgreSQL local, as vendas e a numeração. A versão que o PDV compara é a do app empacotado.

## Onde vive

- **Versão do app:** campo `version` em `pdv/package.json`. `app.getVersion()` na local-api (`health`, `statusUpdatePdv`). Electron Builder usa esse pacote (`electron.vite` / `build` no mesmo JSON).
- **Manifesto publicado:** `pdv/installer/output/version.json` (`version`, `artifact`, `url`, `releasedAt`, `sha256`, `size`). O cliente baixa esse JSON em `{api_url}/pdv/updates/version.json` (`electron/update/verificar-update.ts`).
- **Comparação:** `electron/update/semver.ts` (`versaoRemotaMaior`).
- **Setup:** `installer/pdv-mais-gestao.iss`, compilado por `installer/compilar-iss.ps1` com `/DMyAppVersion=`. O `.iss` tem default `0.1.1` só se essa define não for passada. Não edite o default achando que ele é a versão da loja.
- **Bump:** `scripts/bump-versao-instalador.ps1` olha `package.json` e o maior semver em `installer/output` (manifesto e `PDV-Mais-Gestao-Setup-x.y.z.exe`). `npm run pack:iss` e `pack:release` disparam bump. Não rode bump numa tarefa que não seja gerar instalador.
- **Postgres do setup:** `installer/scripts/instalar-postgres.ps1` e as defines no `.iss` (serviço, porta, banco, usuário). Senha e URL ficam no script; não as copie para doc nem as troque num upgrade.

Auto-update no boot (`verificarEAtualizarPdv` em `main.ts`): se a versão remota for maior, baixa o artefato, confere `size` e `sha256`, instala com `/SILENT /NORESTART`.

`InitializeSetup` no `.iss`:

- pacote mais antigo que o instalado: recusa;
- mesma versão: repara arquivos, mensagem de que o PostgreSQL e os dados de venda permanecem;
- versão mais nova: substitui o aplicativo e declara que o PostgreSQL local e o banco são preservados.

Se o Postgres da porta já responde, tarefa de instalar Postgres não roda de novo no upgrade (`PrecisaInstalarPostgres` / `PostgresJaPronto`).

O efeito do manifesto dentro da API (`GET /pdv/updates/...`) está fora deste pacote. O PDV só consome a URL. Publicação: `scripts/publicar-update-pdv.ps1` (não alterar daqui sem pedido de release).

## Contrato com a API

`GET /pdv/updates/version.json` e o arquivo do `artifact` (caminho relativo `/pdv/updates/{arquivo}` ou `url` do manifesto). Sem Bearer no código de `buscarManifestoUpdate` (o `fetch` não manda o token da sessão).

Não há fila outbox de update. Falha de rede deixa a versão atual.

## Dados locais que não podem ser apagados no schema

O instalador não migra SQL. Quem migra é `initDb` no próximo boot (`ADD COLUMN` apenas). Um setup que apague o data directory do Postgres zera `venda`, `outbox` e `numeracao_nfce` mesmo com o schema intacto no código.

Não empacote `userData` (`database-url.txt`, `xml-nfce`, `certificados`, `backups-empresa`) dentro do diretório `{app}` como se fosse lixo de build. **Não confirmado** o caminho exato de `userData` no Windows além de `app.getPath("userData")`.

## Comportamento offline/outbox

Update offline não roda. A loja fica na versão instalada e a outbox continua.

Simplificar o update para reinstalar o Postgres “para garantir schema novo” apaga a loja. Schema novo tem de ser migração leve no app.

Não alinhe `version.json` para uma versão menor que `package.json`: o cliente não instala pacote mais antigo, e o bump seguinte pode calcular o patch errado.

## Configuração crítica

- `package.json` → `version` (semver `n.n.n`).
- `installer/output/version.json` → os mesmos campos, versão igual ao setup gerado.
- Defines do `.iss`: `MyAppVersion`, `MyAppId` / `MyAppGuid` (trocar o GUID faz o Windows tratar como outro produto e o upgrade não acha a instalação), `PostgresService`, `PostgresPort`, `PostgresDatabase`, `PostgresUser`.
- `api_url` para achar o manifesto.
- Chaves de diagnóstico: `update_check_em` (lida em `statusUpdatePdv`). Outras chaves de update **não confirmadas** além dessa leitura.

Artefato esperado: `PDV-Mais-Gestao-Setup-{versão}.exe`.

## O que quebra na operação da loja se remover

- Preservação do Postgres no upgrade: o caixa abre vazio, sem turno, sem fila e com numeração 1. NFC-e seguinte colide com nota já autorizada na SEFAZ.
- GUID do Inno: dois PDVs instalados ou o update não acha o anterior e oferece instalar o banco de novo.
- Checagem sha256/size: instala binário truncado e o caixa não abre.
- Bump automático fora do release: a loja recebe versão que não foi gerada, ou o manifesto anuncia exe que não está na VPS.
- Porta/serviço do Postgres diferentes do cluster já instalado: o app procura o banco novo e abandona o antigo.
