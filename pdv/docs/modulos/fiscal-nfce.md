# Fiscal NFC-e

## Propósito no caixa

Emite NFC-e modelo 65 na venda, ou guarda XML em contingência offline (`tpEmis=9`) até a API/SEFAZ voltar. Não há NF-e modelo 55 neste pacote (**não confirmado** qualquer fluxo 55). O elemento XML `<NFe>` é o leiaute da NFC-e, não um segundo documento.

## Onde vive

- **Main:** `electron/fiscal/` (`contingencia.ts`, `numeracao-nfce.ts`, `persistir-nfce-online.ts`, `avaliar-emissao-nfce-venda.ts`, `meios-pagamento-nfce.ts`, `exportar-xml-nfce.ts`, `reemitir-contingencia-nova-numeracao.ts`, `datas-xml-nfce.ts`, `nfce-portais.ts`, `xml-local.ts`). Sync fiscal em `electron/sync/outbox.ts` (`sincronizarFiscalPdv`, `syncTransmitirContingencia`) e `electron/sync/reconciliar-nfce.ts`.
- **Renderer:** diálogos `dialog-cancelar-nfce.tsx`, `dialog-inutilizar-nfce.tsx`, `dialog-rejeicao-nfce.tsx`, página de notas não sincronizadas. A UI não monta XML.
- **SQL:** `nfce_local`, `numeracao_nfce`. Arquivos em `userData/xml-nfce`. Certificado em `userData/certificados`.

`concluirFiscalVenda` (`local-api`): se `emitir_nfce` está desligado ou o meio não emite, cupom não fiscal. Senão `emitirOuContingencia`: tenta online; falha de rede gera XML local.

`reservarNumeroNfce` pega `proximo_numero`, pula número já usado em `nfce_local` na mesma série/ambiente e grava o próximo. Não rebobina.

`sincronizarFiscalPdv` (também no início de cada ciclo de outbox) busca a série remota e aplica `resolverProximoNumeroMonotonico`: o próximo número é o máximo entre remoto, local atual e maior número já gravado + 1.

Conflito (dois registros com o mesmo número ocupado) marca `conflito_numeracao`. Reemissão com número novo está em `reemitirContingenciaComNovaNumeracao` e pode inutilizar o número abandonado.

## Contrato com a API

| Uso | Caminho |
| --- | --- |
| Série, próximo número, CSC, CNPJ, UF, certificado | `GET /empresas/:id/pdv-fiscal?numeropdv=` |
| Meios que emitem | `GET /empresas/:id/nfce-configuracao` |
| Emissão online | dentro de `POST /estoque/baixa-venda` (`emitirNfce`) |
| Cupom já emitido | `GET /nfce/:idnotafiscal/cupom` |
| Transmitir XML de contingência | `POST /nfce/contingencia/transmitir` |
| Retransmitir / inutilizar / cancelar venda | `POST /nfce/venda/:idvenda/retransmitir`, `.../inutilizar`, `.../cancelar` |
| Inutilizar número solto | `POST /nfce/numeracao/inutilizar` |
| Reconciliar status | `POST /nfce/pdv/reconciliar` |

CSC e PFX trafegam nessa resposta e vão para `numeracao_nfce` / disco. Não logar nem documentar o valor.

Transmissão de contingência só segue se a venda local tem `idremoto` e `sync_status = 'sincronizado'`. XML legado, sem `<mod>65</mod>`, sem `<tpEmis>9</tpEmis>`, sem `Id="NFe{chave}"` ou com SHA-256 divergente vai para `revisao_manual` e não é reenviado automaticamente.

Gateway PHP `api_Nfe/`: **não confirmado** no PDV. O cliente HTTP é a API.

## Dados locais que não podem ser apagados no schema

`numeracao_nfce`: duas linhas, `id` 1 e 2, `ambiente = id`, `serie`, `proximo_numero`, `csc_id`, `csc_token`, `cnpj`, `uf`. A constraint impede um terceiro ambiente e impede `ambiente` diferente do `id`.

`nfce_local`: `serie`, `numero`, `ambiente` (1 ou 2), `chave`, `tpemis`, `status`, `xml`, `xml_autorizado`, `xml_sha256`, `qrcode`, `protocolo`, `motivo_contingencia`, `data_contingencia`, `revisao_manual`, `ultimo_erro`, `transmitida`.

`venda.nfce_status` e `venda.idnfce_local` precisam acompanhar a nota. Status usados no código incluem `pendente`, `nao_fiscal`, `contingencia`, `pendente_contingencia`, `autorizada`, `transmitida`, `erro`, `erro_config`, `conflito_numeracao`, `revisao_manual`, `cancelada`, `inutilizada`.

Troca de empresa zera numeração e apaga a pasta `xml-nfce` **depois** do backup. Não faça isso no update do aplicativo.

## Comportamento offline/outbox

Sem CSC/CNPJ/UF em `numeracao_nfce`, a contingência recusa (“sincronize CSC/CNPJ”). A última sync fiscal bem-sucedida é a rede de segurança do offline.

Tipo de fila `transmitir_nfce_contingencia` (prioridade 10). Idempotência pela venda/chave. Se a venda ainda não foi confirmada, o item falha com 409 transitório e espera.

Simplificar para “não guardar XML, só o número” impede transmitir quando a SEFAZ voltar e impede reimprimir DANFC-e.

`transmitirTodasNfcePendentes` recusa o lote se ainda existe venda com `sync_status = 'pendente'`. Não inverta essa ordem.

Reconciliação periódica (60 s após 5 s do boot) puxa status da retaguarda. Cursor em `sync_meta`. Apagar `sync_meta` refaz o ciclo; não apaga nota, mas pode remarcar status. `podeAplicarStatusNfce` (`electron/sync/nfce-retaguarda.ts`) não deixa `cancelada`/`inutilizada` voltar atrás; `autorizada` só aceita `cancelada`; `conflito_numeracao` só aceita `autorizada`, `cancelada` ou `inutilizada`. Não alargue essa função.

## Configuração crítica

- `emitir_nfce`, `nfce_meios_pagamento` (`CHAVE_CONFIG_MEIOS_NFCE`).
- `numeropdv` — escolhe a série em `pdv-fiscal`.
- `fiscal_ambiente_ativo`, `fiscal_ultima_sync`, `fiscal_sync_erro`.
- `emitente_danfce_json` — cache do emitente para impressão offline.
- `certificado_path`, `certificado_senha`, `certificado_apelido`, `certificado_validade`.

Ambiente 1 e 2 vêm da API (`fiscal.ambiente`). O código não documenta no schema qual número é produção; não assuma e não troque o `id` da linha.

## O que quebra na operação da loja se remover

- Reserva monotônica de número: NFC-e rejeitada por duplicidade ou faixa inutilizada errada.
- XML + hash: contingência não transmite ou transmite documento alterado.
- Ordem venda → baixa/NFC-e: nota sem venda na retaguarda, ou estoque sem documento.
- Pasta `xml-nfce`: exportação e DANFC-e de contingência ficam só com o que ainda estiver na coluna `xml` (se a coluna também for esvaziada, perde os dois).
- Cancelar/inutilizar: a SEFAZ fica com número usado e o caixa reutiliza.
