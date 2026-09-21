# Sessão e configuração

## Propósito no caixa

Amarra o terminal a um usuário, uma empresa e um número de PDV. Sem sessão não abre caixa. Sem `numeropdv` a venda e a série fiscal saem no terminal errado.

## Onde vive

- **Main:** `electron/db/acesso.ts` (perfis e chaves permitidas), `electron/db/database.ts` (`getConfig` / `setConfig` / `seedDefaults`), `electron/local-api/index.ts` (`login`, `selecionarEmpresa`, `logout`, `saveConfig`).
- **Renderer:** `src/ui/pages/login-page.tsx`, `config-page.tsx`, guards `require-sessao.tsx`, `require-config.tsx`, `require-caixa.tsx`.
- **SQL:** `sessao` (sempre `id = 1`), `config` (`chave` / `valor`).

Perfis que podem gravar a config completa do PDV: `admin`, `proprietario`, `super` (`podeConfigurarPdv`). Operador logado só grava `CHAVES_CONFIG_OPERADOR`. Antes do login só `CHAVES_CONFIG_PRE_LOGIN`.

## Contrato com a API

Cliente em `electron/api/client.ts`. Base = chave `api_url` sem barra final. Header `Authorization: Bearer` com `sessao.token`.

| Uso | Método e caminho |
| --- | --- |
| Login | `POST /api/auth/sign-in/email` |
| Perfil | `GET /api/auth/perfil` |
| Plano (módulo gourmet) | `GET /planos/meu-plano` |
| Empresas | `GET /empresas`, `GET /empresas/:id`, `GET /empresas/:id/fiscal` |
| Saúde | `GET /health` (`pingApi` exige JSON com `service === "api-mais-gestao"` ou `status` `ok`/`degraded`) |

Selecionar outra empresa dispara backup e limpeza operacional. Ver [backup.md](backup.md).

## Dados locais que não podem ser apagados no schema

- `sessao`: `token`, `userid`, `username`, `idempresa`, `nomeempresa`, `roles`, `modulogourmet`.
- `config`: não troque o nome das chaves. O seed e o PDV secundário copiam por nome.

Chaves de negócio copiadas do principal para o secundário: `CHAVES_CONFIG_NEGOCIO` em `electron/pdv-secundario/regras.ts` (`qtd_mesas`, `emitir_nfce`, `nfce_meios_pagamento`, `api_url`, `terminais_pdv_json`, etiqueta de balança, taxas, etc.).

Chaves só deste computador: `CHAVES_CONFIG_LOCAL` (`numeropdv`, `pdv_modo`, `database_url`, impressora, certificado, SiTef, balança, `senha_gerencial_hash`, `senha_gerencial_salt`, …). Não replicar hardware nem senha gerencial a partir de outro PDV.

## Comportamento offline/outbox

O primeiro login precisa da API. Depois o token fica em `sessao` e a venda segue local. `pullCatalogo` com HTTP 403 de empresa limpa `idempresa` da sessão (`acessoNegado`).

Simplificar o login para “não persistir token” impede o worker de outbox: `executarCicloOutbox` sai cedo sem `idempresa`, `token` e `userid`.

## Configuração crítica

- `api_url` — host da API. URLs legadas no seed são reescritas para o host padrão do código (`API_URLS_LEGADAS` em `database.ts`).
- `numeropdv` — inteiro do terminal. Default de seed `"1"`.
- `emitir_nfce` — `"1"` emite; outro valor não emite na baixa.
- `nfce_meios_pagamento` — JSON dinheiro/cartão/PIX/pré-pago.
- `pdv_modo` — `principal` ou `secundario`.
- `fiscal_ambiente_ativo`, `fiscal_ultima_sync`, `fiscal_sync_erro`.
- `certificado_path`, `certificado_senha`, `certificado_apelido`, `certificado_validade` — arquivo em `userData/certificados`. Não versionar.
- `senha_gerencial_hash`, `senha_gerencial_salt`, `senha_gerencial_habilitada` — cancelamento de item no salão.

Não copie valores de senha, CSC ou token para documentação.

## O que quebra na operação da loja se remover

- Guard `RequireCaixa`: operador vende sem turno, e o fechamento não fecha o que foi vendido.
- `numeropdv`: série e `pdv-fiscal` da API passam a ser de outro caixa; dois terminais emitem o mesmo número.
- `saveConfig` sem filtro de chaves: operador troca `api_url` ou `database_url` e o caixa perde a retaguarda ou o banco.
- Apagar `sessao` no schema: todo boot pede login e o sync para.
