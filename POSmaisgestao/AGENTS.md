# POS Mais Gestão — instruções para agentes

App Android da maquininha (`POSmaisgestao/`). Cliente separado: **não importa nem compartilha código** com `web/` nem com `pdv/` (Electron). A integração é só HTTP.

- Índice dos fluxos: [docs/modulos/README.md](docs/modulos/README.md)
- Regras do monorepo: [../AGENTS.md](../AGENTS.md)
- Contratos entre pacotes: [../docs/sistema/contratos-entre-pacotes.md](../docs/sistema/contratos-entre-pacotes.md)

Stack confirmada no código: Java 11, Android Views (XML + `AppCompatActivity`), OkHttp 4 + Gson. Não há Kotlin de app, Jetpack Compose, Retrofit, Room, nem `productFlavors`. Não há `signingConfig` nem keystore no Gradle deste pacote.

## Dois modos de conexão

A URL e o modo ficam em `SharedPreferences` (`PrefsStore`), não em `BuildConfig`.

| Modo (`KEY_CONEXAO_MODO`) | Destino | Cliente |
|---|---|---|
| `cloud` (padrão) | API do ERP | `ApiClient` → rotas `/api/auth/*`, `/vendas-pdv-gourmet`, `/davs`, etc. |
| `pdv_local` | API LAN do PDV desktop | `LocalPdvApi` → prefixo `/pos/*` |

Padrões de URL em `PrefsStore`: `DEFAULT_BASE_URL` (`http://10.0.2.2:3333`, emulador → API) e `DEFAULT_PDV_URL` (`http://10.0.2.2:5050`). `usesCleartextTraffic="true"` no manifest é o que permite HTTP na LAN.

No modo local o hub após o login é `MesasActivity`. No modo cloud é `HomeActivity` (`PosDestino`).

## Pagamento na maquininha

Não há SDK de adquirente ligado. `PosApplication` instancia `StubPagamentoHardware`, e **nenhuma Activity chama** `getPagamentoHardware()`. Dinheiro, PIX e cartão são lançamentos gravados na API (`PagamentoActivity` + `PagamentosMisto`). PIX com QR é payload EMV local (`PixPayloadBuilder`), não TEF.

Não insira `StubPagamentoHardware.pagar()` no confirmar: o stub devolve `aprovado=false` e a venda para de registrar.

Cartão inteiro vai para `valorcartaocredito`. `valorcartaodebito` e `valorcartao` saem `"0"` em `ApiClient.aplicarTotaisPagamento`.

## Checklist — não apagar ao “limpar” o projeto

- Permissões e features do `AndroidManifest.xml`: `INTERNET`, `ACCESS_NETWORK_STATE`, `CAMERA`, `BLUETOOTH` / `BLUETOOTH_ADMIN` / `BLUETOOTH_CONNECT`, `android.hardware.usb.host`, `android.hardware.camera`, `android.hardware.bluetooth`, e `android:usesCleartextTraffic="true"`.
- Activities exportadas só o launcher (`MainActivity`). As demais `android:exported="false"` e o receiver `BalancaUsbPermissionReceiver`.
- `PosApplication`: criação de `PrefsStore`, `ApiClient`, `OutboxSync`, `EscPosPrinter`, `StubPagamentoHardware`, `BalancaManager`.
- Interface `PagamentoHardware` e o stub. São o ponto de encaixe de TEF; o fluxo atual não depende deles para concluir a venda.
- `ApiClient` e `LocalPdvApi` (paths, `Authorization: Bearer`, `vendalocal = 2`, DAV `extra1 = "POS"`).
- `PrefsStore`: prefs `pos_mais_gestao` e sessão `pos_mais_gestao_session` (`EncryptedSharedPreferences`). Fallback para prefs comuns se o Keystore falhar.
- Exclusão de backup de `pos_mais_gestao_session.xml` em `res/xml/backup_rules.xml` e `res/xml/data_extraction_rules.xml`.
- SQLite `pos_outbox.db` (`OutboxDb`) e `pos_catalogo.db` (`CatalogDb`), inclusive `onUpgrade` do catálogo (versão 4).
- Dependências: OkHttp, Gson, `androidx.security:security-crypto`, ZXing (`zxing-android-embedded`), `usb-serial-for-android` (JitPack em `settings.gradle.kts`).
- `gradle.properties`: `android.overridePathCheck=true` (o caminho do repo tem acento).
- `applicationId` `com.pos_mais_gestao`, `minSdk` 24, `namespace` igual ao pacote Java.
- A task `runPosDebugUnitTests` em `app/build.gradle.kts`. `testDebugUnitTest` está filtrada de propósito e delega para ela.

Build: dentro de `POSmaisgestao/`, `./gradlew assembleDebug`. Não há flavor de ambiente; trocar URL de produção é configuração do aparelho, não constante de compile.
