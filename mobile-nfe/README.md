# Mais Gestão NFe (React Native / Expo)

App Android para emissão e consulta de NFe, produtos, clientes e dashboard, consumindo a **mesma API** do sistema web (Better Auth + JWT).

## Pré-requisitos

- Node.js 20+
- [Expo CLI](https://docs.expo.dev/) (`npx expo`)
- Android Studio (emulador ou dispositivo) ou Expo Go para desenvolvimento

## Configuração

1. Instale dependências:

```bash
cd api-mais-gestao/mobile-nfe
npm install
```

2. URL da API:
   - Na tela de login, informe a base da API (ex.: `https://api.seudominio.com` ou `http://192.168.0.10:3333`).
   - Opcional: defina `EXPO_PUBLIC_API_URL` antes de `npm start`.

3. Login com o mesmo e-mail/senha da retaguarda web.

4. Selecione a empresa (header `x-empresa-id` é enviado automaticamente).

## Desenvolvimento

```bash
npm start
# ou
npm run android
```

## Build APK

### Windows (importante)

1. **Caminho curto e sem acentos** — `expo prebuild` falha em pastas como `...\mais gestão\...`. Use uma cópia em `C:\mnfe` (ou similar) e o pacote shared em `C:\packages\nfe-emissao-shared` (mesma estrutura `file:../packages/nfe-emissao-shared`).
2. **Caminhos longos (>260)** — com `newArchEnabled=true`, o CMake do `react-native-gesture-handler` costuma falhar no Windows. Use `newArchEnabled=false` em `android/gradle.properties`, limpe `android/app/.cxx` e rode de novo; ou ative [Long Paths](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation); ou use **EAS Build** na nuvem.
3. **`metro.config.js`** — inclui `extraNodeModules` para `@mais-gestao/nfe-emissao-shared` (obrigatório no Windows).

Exemplo local (PowerShell):

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
cd C:\mnfe\android
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
```

APK gerado: `android/app/build/outputs/apk/release/app-release.apk`

### EAS (recomendado na nuvem)

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

O perfil `preview` em [`eas.json`](eas.json) gera **APK** para instalação interna.

## Pacote compartilhado

Schemas e utilitários de emissão NFe ficam em [`../packages/nfe-emissao-shared`](../packages/nfe-emissao-shared) e são usados também pelo web (`@mais-gestao/nfe-emissao-shared`).

## Módulos

| Área | Endpoints principais |
|------|----------------------|
| Auth | `POST /api/auth/sign-in/email`, `GET /api/auth/perfil` |
| Dashboard | `GET /dashboard`, `GET /dashboard/executivo` |
| Produtos | `GET/POST/PUT /produtos`, `GET /unidades-medida` |
| Clientes | `GET/POST/PUT /entidades?cliente=1` |
| NFe | `GET/POST /nfe/emissao`, rascunhos, transmitir, cancelar, calcular tributos, preview DANFE |

O plano de assinatura precisa incluir a feature **Notas Fiscais** (`NOTAS_FISCAIS`).

## Estrutura

- `app/` — rotas Expo Router (auth, tabs, wizard NFe)
- `src/api/` — cliente HTTP e serviços
- `src/features/nfe-emissao/` — estado do wizard e mapeamento de produtos
