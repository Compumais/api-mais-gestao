# Configuração do aparelho e build

## Propósito na maquininha

Define para onde o POS fala (API cloud ou PDV na LAN), se a venda emite NFC-e ou vira DAV, PIX estático, impressora, balança, número do PDV e quantidade de mesas. O build não escolhe ambiente.

## Classes e pacotes de entrada

- `app/src/main/java/com/pos_mais_gestao/ui/config/ConfigActivity.java`
- `app/src/main/java/com/pos_mais_gestao/ui/login/LoginActivity.java` — a mesma URL e o mesmo rádio de modo, antes do login.
- `app/src/main/java/com/pos_mais_gestao/data/local/PrefsStore.java`
- Gradle: `settings.gradle.kts`, `build.gradle.kts`, `app/build.gradle.kts`, `gradle/libs.versions.toml`, `gradle.properties`, `gradle/wrapper/gradle-wrapper.properties`

Não há `productFlavors`, `buildConfigField` nem `signingConfig`. `buildTypes.release` só desliga otimização (`optimization.enable = false`). Não há arquivo ProGuard no pacote.

## Contrato com API ou hardware

Chaves de prefs (nomes, sem valores secretos):

| Constante | Efeito |
|---|---|
| `KEY_CONEXAO_MODO` | `cloud` ou `pdv_local` (`MODO_CLOUD` / `MODO_PDV_LOCAL`) |
| `KEY_BASE_URL` | Base HTTP. Padrão cloud `DEFAULT_BASE_URL`, padrão local `DEFAULT_PDV_URL` |
| `KEY_EMITIR_NFCE_POS` | Padrão `true`. `false` faz a venda rápida cloud criar DAV em vez de NFC-e |
| `KEY_NUMERO_PDV` | Query e corpo de caixa/venda (`numeropdv`). Padrão 1 |
| `KEY_QUANTIDADE_MESAS` | Grade 1..N (1 a 500). No modo local o status do PDV pode sobrescrever |
| `KEY_PIX_QR_HABILITADO`, `KEY_CHAVE_PIX`, `KEY_NOME_PIX`, `KEY_CIDADE_PIX` | QR PIX estático |
| `KEY_IMPRESSORA_*` | Destino ESC/POS |
| `KEY_BALANCA_*` | USB serial da balança |
| `KEY_MODELO_ATENDIMENTO` | `mesa` ou `comanda` (comanda só vale com `pdv_local`) |
| `KEY_MODAL_ABRIR_MESA` | Se pede nome ao abrir mesa |

Trocar o rádio de cloud para local (ou a URL) deve ir junto com novo login: `ConfigActivity` trata mudança de conexão como troca de destino. `ApiClient.exigirModoCloud` bloqueia rotas da API web quando o modo é local.

`android.overridePathCheck=true` em `gradle.properties` existe por causa do diretório `mais gestão`. Remover quebra o build neste Windows.

Repositórios: Google, Maven Central e `https://jitpack.io` (`usb-serial-for-android`). `RepositoriesMode.FAIL_ON_PROJECT_REPOS`.

Wrapper: Gradle `9.5.0` (`gradle-wrapper.properties`). AGP `9.3.0` no version catalog. Comando de APK debug: `./gradlew assembleDebug` a partir de `POSmaisgestao/`. Testes JVM: a task `testDebugUnitTest` exclui tudo e depende de `runPosDebugUnitTests` (classpath explícito). Não “simplifique” isso para o teste padrão vazio.

## O que não remover

- Os dois padrões de URL e a sugestão ao trocar o rádio (`sugerirUrlPadrao`).
- `usesCleartextTraffic` — as URLs padrão e a LAN do PDV são `http://`.
- JitPack e a lib `usb-serial`.
- `android.overridePathCheck=true`.
- Switch `switchEmitirNfcePos` e a chave `emitir_nfce_pos`. O README do pacote cita a coluna legada `nfceconfiguracao.emitirnfcepos` na API; o modo efetivo da maquininha é esta prefs do app.

Não há nome de build config de URL. Inventar `BuildConfig.API_URL` e ignorar `PrefsStore` faz o aparelho ignorar o que o operador configurou.

## Efeito se quebrar

URL ou modo errados: login falha e a venda não chega ao ERP nem ao PDV. Apagar o switch de NFC-e muda o default (`true` = emite). Quebrar o Gradle (path check, JitPack, wrapper) impede gerar o APK da maquininha. Não há keystore neste pacote; assinatura de release não está declarada aqui — não confirmado fora do `app/build.gradle.kts`.
