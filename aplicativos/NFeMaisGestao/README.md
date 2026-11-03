# Mais Gestão NFe (Android)

App Android nativo (Java) para emissão e consulta de NF-e, produtos, clientes e dashboard, consumindo a mesma API da retaguarda (Better Auth + `x-empresa-id`).

## Requisitos

- JDK 11+
- Android SDK (API 36) — configure `ANDROID_HOME` ou `sdk.dir` em `local.properties`

## Gerar APK debug

No PowerShell, na pasta do projeto:

```powershell
.\build_apk.ps1
```

Saída: `build\apk\Mais-Gestao-NFe-<versão>.apk` (versão em `app/build.gradle.kts`).

O build roda no próprio monorepo (`mais_gestao`); não é necessário copiar para caminho curto.

## Gradle manual

```powershell
.\gradlew.bat assembleDebug
```

APK em `app\build\outputs\apk\debug\app-debug.apk`.

## Fluxo

1. Login: e-mail/senha (`POST /api/auth/sign-in/email`); URL da API já vem como `https://apimaisgestao.compumais.com` (editável)
2. Seleção de empresa (`GET /empresas`)
3. Hub: Início, NF-e, Produtos, Clientes, Mais
4. NF-e: listagem/rascunhos, detalhe (transmitir/cancelar/inutilizar/DANFE), wizard de emissão em 7 etapas

## Estrutura

- `data/api/` — OkHttp + Gson (`ApiClient`)
- `data/local/` — sessão criptografada (`PrefsStore`)
- `domain/` — estado do wizard e montagem de payload
- `ui/` — Activities/Fragments
