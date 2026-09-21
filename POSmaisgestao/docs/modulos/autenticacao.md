# Autenticação e empresa

## Propósito na maquininha

Identifica o operador e a empresa antes de vender. O token fica no aparelho e vai em `Authorization: Bearer` em toda chamada autenticada.

## Classes e pacotes de entrada

- `app/src/main/java/com/pos_mais_gestao/ui/login/LoginActivity.java` — e-mail, senha, modo de conexão e URL. Pode ler o QR do PDV (`PosConnectionQrParser`).
- `app/src/main/java/com/pos_mais_gestao/ui/empresa/EmpresaActivity.java` — lista e seleção de empresa.
- `app/src/main/java/com/pos_mais_gestao/data/api/ApiClient.java` — `login`, `validarSessao`, `listarEmpresas`, `selecionarEmpresaNoPdv`.
- `app/src/main/java/com/pos_mais_gestao/data/api/LocalPdvApi.java` — `POST /pos/login` (corpo com `email`, `password`, `identificador` = `terminalId`), `GET /pos/empresas`, `POST /pos/empresa`.
- `app/src/main/java/com/pos_mais_gestao/data/local/PrefsStore.java` — sessão e empresa.
- `app/src/main/java/com/pos_mais_gestao/util/PosConnectionQrParser.java` — esquema `mgpos://connect?v=1&url=http://host:porta`.

## Contrato com API ou hardware

Modo `cloud`:

- `POST /api/auth/sign-in/email` (Better Auth). `extrairToken` lê `session.token` e, se faltar, o campo `token` na raiz.
- `GET /api/auth/get-session` na abertura (`validarSessao`).
- `GET /empresas?page=1&limit=100`.

Modo `pdv_local`:

- Login e empresas só em `/pos/*`. `selecionarEmpresaNoPdv` também dispara `GET /pos/sync` (carga do catálogo).
- `validarSessao` usa `GET /pos/status` e aplica modelo de atendimento, quantidade de mesas e número do PDV (`aplicarConfigPdv`).

`PrefsStore.setToken` usa `commit()` (síncrono) para o token existir antes da Activity de login terminar. `isLoggedIn()` é “token não vazio”. `hasEmpresa()` é id de empresa não vazio.

`getTerminalId()` gera um UUID uma vez e reutiliza. Esse valor é o `identificador` do login local. Apagar a chave faz o PDV desktop tratar o aparelho como outro terminal.

Logout (`PrefsStore.logout`) remove token, usuário e empresa. `clearEmpresa` tira só a empresa e zera atalhos em prefs, mantendo o token.

## O que não remover

- Prefs cifradas `pos_mais_gestao_session` / chave `session_token`, com `MasterKeys` + `EncryptedSharedPreferences` (`androidx.security:security-crypto`).
- Migração `migrarTokenLegado` da prefs plana `pos_mais_gestao` para a sessão cifrada.
- Fallback que devolve as prefs comuns se o Keystore falhar — sem ele o aparelho não loga.
- Header Bearer em `ApiClient` e `LocalPdvApi`.
- Exclusão de backup de `pos_mais_gestao_session.xml` (o Keystore não viaja no backup; restaurar o ciphertext quebra a sessão).

Não documentar nem commitar o valor do token.

## Efeito se quebrar

Sem token a maquininha para no login e nenhuma venda sobe. Trocar o path de sign-in ou o campo do token deixa o ERP e o PDV local inacessíveis. Apagar `terminalId` mistura ou duplica o terminal na LAN. Tratar erro de rede como sessão inválida (só 401/403 devem deslogar em `MainActivity`) expulsa o operador.
