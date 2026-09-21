# Contratos entre pacotes

Fronteiras que um agente não atravessa. Cada afirmação abaixo vem de `.cursor/rules/monorepo.mdc`, dos READMEs ou de um caminho de código citado.

## Quem chama quem

```
Web  --HTTP (services/hooks)-->  API  --HTTP-->  nfe-gateway (SEFAZ)
POS  --HTTP-->  API                              nfse-gateway (NFS-e)
POS  --HTTP :5050 /pos/*-->  PDV (modo PDV local)
PDV  --HTTP + outbox-->  API
PDV  --não-->  PostgreSQL da API
Web  --não-->  PostgreSQL da API
```

| Origem | Destino | Contrato |
|--------|---------|----------|
| `web/` | `api/` | HTTP. Chamadas em `web/src/services/*.service.ts` e hooks em `web/src/hooks/`. React Query é a regra de estado assíncrono em `web/.cursor/rules/front-end.mdc`. O CI de build da web fixa `NEXT_PUBLIC_API_URL` |
| `pdv/` | `api/` | HTTP a partir de `pdv/electron/api/client.ts`, disparado pela fila em `pdv/electron/sync/outbox.ts`. A URL da API é configurada no app |
| `pdv/` | PostgreSQL local | Banco `pdv_local` (porta 5433 no compose de desenvolvimento). Schema de referência em `pdv/electron/db/schema.ts` |
| `POSmaisgestao/` | `api/` | Cliente HTTP em `POSmaisgestao/app/src/main/java/com/pos_mais_gestao/data/api/`. Login Better Auth e seleção de empresa (README do POS) |
| `POSmaisgestao/` | `pdv/` | Modo PDV local: `http://IP-DO-PDV:5050`. Fachada `pdv/electron/local-api` e API LAN. Catálogo em `GET /pos/sync`. Caixa e NFC-e ficam no PDV |
| `api/` | `api_Nfe/nfe-gateway/` | Cliente `api/src/lib/nfe-gateway-client.ts`. Header `X-Nfe-Gateway-Secret` (README do gateway). Emissão, cancelamento, inutilização, consulta e distribuição DF-e |
| `api/` | `api_Nfe/nfse-gateway/` | README do gateway NFS-e: a API usa `NFSE_GATEWAY_URL` e `NFSE_GATEWAY_SECRET`. Rotas de emissão municipal ficam no gateway, não na API Node |
| `infra/` | API e Web na VPS | Docker/PM2/Nginx e `./up.sh`. Não é chamada de runtime entre pacotes de código |

O POS é cliente separado. Não importa `web/` nem `pdv/`. O modo “PDV local” só fala com o desktop pela rede; o modo contra a API fala com o backend.

## Web: services e hooks

A web não abre conexão com o PostgreSQL da API e não reimplementa regra de negócio do backend. A regra do monorepo é explícita: consome a API via services/hooks.

Pastas confirmadas: `web/src/services/` e `web/src/hooks/`. A regra `web/.cursor/rules/front-end.mdc` ainda cita uma pasta `acoes` na estrutura sugerida; o código de chamada encontrado neste levantamento está em `services/`.

Quebra se violar: a tela passa a depender de schema e de SQL, ignora autenticação e o isolamento por empresa feitos na API, e uma correção fiscal ou financeira deixa de valer para todos os clientes.

## PDV: PostgreSQL local e outbox

O PDV é cliente desacoplado. Não importa código de `web/` e não acessa o banco `mais_gestao`.

A tabela `outbox` está em `pdv/electron/db/schema.ts`. O processamento está em `pdv/electron/sync/outbox.ts` (fila para a API: venda, itens, baixa de estoque, fechamento de caixa, atalhos, transmissão de NFC-e em contingência, entre outras chamadas do client). Há índice único de idempotência (`idempotency_key`) no schema e ajuste da mesma coluna em `pdv/electron/db/database.ts`.

Com a API fora, o README do PDV descreve operação no Postgres local e envio da fila ao voltar online. NFC-e online documentada via `/vendas-pdv-gourmet` e `/estoque/baixa-venda`. Contingência: `tpEmis=9` local e `POST /nfce/contingencia/transmitir`.

Quebra se violar:

- Gravar no PostgreSQL da API a partir do Electron acopla o caixa ao banco de produção e perde o offline.
- Importar módulos de `web/` mistura App Router, sessão do browser e o processo main do Electron.
- Remover a outbox ou a chave de idempotência faz venda offline sumir ou duplicar na retaguarda (estoque, financeiro e NFC-e deixam de bater com o caixa).

Certificado A1 (`.pfx`) e senha ficam só no storage local do app. Não versionar.

## POS Android

Dois destinos, documentados em READMEs diferentes:

1. API Mais Gestão: atalhos `GET/PUT /atalhos-pdv`, DAV com `extra1 = "POS"` quando o switch de NFC-e está desligado, mesas e pagamento. A web lista esses pedidos em `/pedidos?origem=POS`.
2. PDV local na porta 5050: o tablet baixa o catálogo e opera mesas/vendas no desktop. Caixa e NFC-e permanecem no PDV.

Há classe `POSmaisgestao/.../data/local/OutboxDb.java`. O comportamento dessa fila local não foi mapeado neste levantamento da raiz.

Quebra se violar: apontar o POS para o banco da API, ou fazer o POS emitir NFC-e sem o contrato do PDV/gateway, desalinha estoque, DAV e documento fiscal. Tratar o POS como módulo dentro de `web/` ou `pdv/` quebra o build Android e o instalador do desktop.

## Fiscal cruza vários pacotes

A regra do monorepo: alteração em NF-e, NFC-e ou entrada de notas pode impactar `api/`, `web/`, `pdv/` e `api_Nfe/`. Considere o ciclo completo.

Papel de cada um, confirmado por pastas e READMEs:

| Pacote | Papel no fiscal |
|--------|-----------------|
| `api/` | Persistência, numeração, configuração, emissão orquestrada, entrada (`nfe-inbound`), SINTEGRA, EFD, estoque e custo ligados à nota |
| `web/` | Telas de nota de venda, compra, NFC-e, NFS-e, tributos, certificados |
| `pdv/` | NFC-e online e contingência no caixa; XML e DANFC-e locais em `pdv/electron/fiscal/` |
| `POSmaisgestao/` | Switch NFC-e versus DAV; no modo PDV local não emite sozinho |
| `api_Nfe/nfe-gateway/` | Único encapsulamento documentado do `sped-nfe` / SEFAZ. A API Node não substitui esse processo |
| `api_Nfe/nfse-gateway/` | Emissão municipal (ABRASF e slots de provedores no README). Porta distinta da NF-e |
| `infra/` | Sobe API e Web na VPS. O gateway precisa estar alcançável pela API no ambiente publicado. O detalhe de compose do gateway na VPS não foi confirmado neste levantamento |

Quebra se violar: emitir SEFAZ direto do Node, ou mudar CFOP/CST/numeração só na tela, deixa XML, estoque, financeiro e o arquivo do gateway inconsistentes. Remover o secret compartilhado entre `api/.env` e o `.env` do gateway corta a emissão (o header é obrigatório fora do `/health`).

## O que não é contrato de código

`infra/` não é biblioteca importável. É deploy e operação. O README da raiz manda publicar API e Web com `./up.sh` e avisa que workflow com nome de deploy não é evidência de produção.

PDV e POS não entram no `ci.yml`. Mudança neles não é barrada pelo lint/build da API ou da Web. O instalador do PDV tem workflow próprio (`pdv-release.yml`, citado pelo README do PDV como “PDV instalador”). Não confirme publicação só porque o CI da API passou.
