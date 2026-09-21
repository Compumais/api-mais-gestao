# Impressora, balança e câmera

## Propósito na maquininha

Imprime cupom, DANFC-e e fichas; lê peso de produto a granel; lê código de barras e o QR de conexão do PDV. Nenhum destes periféricos autoriza pagamento.

## Classes e pacotes de entrada

Impressão:

- `hardware/ImpressoraPos.java`, `hardware/EscPosPrinter.java`, `hardware/ImpressoraDiscovery.java`, `hardware/ImpressoraInfo.java`
- `hardware/DanfceEscPos.java`, `hardware/FichasEventoEscPos.java`
- Seleção em `ui/config/ConfigActivity.java`

Balança Toledo Prix 3 Fit (protocolo Prt3):

- `hardware/balanca/BalancaManager.java`, `BalancaTransport.java`
- `hardware/balanca/usb/UsbSerialBalancaTransport.java`, `BalancaUsbPermissionReceiver.java`
- `hardware/balanca/protocol/Prt3Protocol.java`, `Prt3Parser.java`
- `domain/balanca/BalancaConfig.java` (baud padrão da config), `SessaoPesagem.java`
- `ui/config/BalancaConfigActivity.java`, `BalancaDiagnosticoActivity.java`
- `ui/venda/PesagemBalancaDialog.java` — usado pela venda rápida quando a unidade é KG

Câmera:

- `util/CodigoScanHelper.java`, `util/CodigoCaptureActivity.java`
- ZXing `com.journeyapps:zxing-android-embedded`
- `util/PosConnectionQrParser.java`

`PosApplication` cria `EscPosPrinter` e `BalancaManager`.

## Contrato com API ou hardware

Impressora: Bluetooth SPP (`UUID 00001101-0000-1000-8000-00805F9B34FB`) quando o tipo salvo é Bluetooth e há MAC em `KEY_IMPRESSORA_ID`. Sem impressora selecionada, o cupom vai para log. Tipo USB lança exceção pedindo driver do fabricante ou Bluetooth — não há SDK de impressora interna da maquininha. Bytes ESC/POS: init `1B 40`, corte `1D 56 00`, texto IBM437; DANFC-e acrescenta QR.

Balança: USB host + conversor serial (lib `usb-serial-for-android`, JitPack). Protocolo Prt3, padrão 2400 8N1 nas prefs (`KEY_BALANCA_BAUD` e bits). VID/PID/serial do conversor ficam nas prefs. Permissão USB via `BalancaUsbPermissionReceiver` (`exported=false`). Com balança desligada, desconectada ou cancelada, a venda rápida aceita quantidade digitada. O diagnóstico pode logar hex TX/RX; o código comenta que isso não inclui venda nem pagamento.

Câmera: permissão `CAMERA` em runtime para scan de produto e do QR `mgpos://connect?v=1&url=...`. Feature de câmera é `required=false`.

Bluetooth: `BLUETOOTH` e `BLUETOOTH_ADMIN` até API 30, `BLUETOOTH_CONNECT` sem teto. Feature bluetooth `required=false`.

## O que não remover

- Permissões e `uses-feature` de câmera, Bluetooth e `usb.host` no manifest.
- Receiver de permissão USB da balança.
- Dependências ZXing, `usb-serial` e o repositório JitPack.
- UUID SPP e o ramo que não bloqueia a venda se a impressão falhar na tela de sucesso (impressão é depois do HTTP; falha de impressora não desfaz a venda — não inverta essa ordem).
- Fallback de digitação de peso.

Não há SDK de fabricante de maquininha (Sunmi/Stone/PagSeguro) no Gradle. Tratar a impressora interna como já implementada é incorreto.

## Efeito se quebrar

A venda já gravada fica sem cupom na mão do cliente (DANFC-e não sai). Não confirma nem cancela o pagamento no ERP. Balança quebrada sem fallback impede item a KG ou, se o diálogo passar a ser obrigatório, trava a venda rápida. Sem `CAMERA` / ZXing o operador não lê o QR do PDV nem o EAN. Sem USB host a Prix 3 Fit não conecta.
