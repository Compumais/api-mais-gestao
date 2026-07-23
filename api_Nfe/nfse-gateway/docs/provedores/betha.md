# Betha



Adapter: `AdapterBetha`



## Modos



### RPS legado (e-gov) — ABRASF 2.02 (padrão)

Alinhado ao **Manual de Integração ABRASF 2.02** e aos exemplos em `api_Nfe/ExemplosXML`.



WSDL por operação (`gerarNfse?wsdl`, `recepcionarLoteRps?wsdl`, `consultarLoteRps?wsdl`, `consultarNfsePorRps?wsdl`, `cancelarNfseV02?wsdl`).



Fluxo padrão (emissão unitária):

1. Monta `GerarNfseEnvio` com `InfDeclaracaoPrestacaoServico` (ExemplosXML/GerarNfse)

2. Namespace: `http://www.betha.com.br/e-nota-contribuinte-ws`

3. Assina `InfDeclaracaoPrestacaoServico`

4. SOAP com `nfseCabecMsg` (versão 2.02) + `nfseDadosMsg`

5. `GerarNfse` → NFS-e síncrona (manual §4.1)



Alternativas por configuração:

- `usarlotesincrono=true` → `EnviarLoteRpsSincronoEnvio` + `RecepcionarLoteRpsSincrono`

- `usarloteassincrono=true` → `EnviarLoteRpsEnvio` + protocolo + `ConsultarLoteRps`



### DPS (Nota Nacional) — opcional

Ativado quando a URL aponta para `/dps/` **ou** `versaolayout` contém `dps`/`nacional`.

WSDL único: `https://nota-eletronica.betha.cloud/dps/ws/service.wsdl`

Operações:
- `RecepcionarDps` + `ConsultarStatusDps` (EMISSAO)
- `RecepcionarEventoCancelamento` + `ConsultarStatusDps` (CANCELAMENTO)
- `RecepcionarEventoSubstituicao` + `ConsultarStatusDps` (CANCELAMENTO_POR_SUBSTITUICAO)

Alinhado aos exemplos oficiais Betha **NT004** (XML mínimo obrigatório).

Campos críticos no XML DPS:
- `cTribNac` (6 dígitos) — de `codigoTributacaoNacional` ou derivado do item LC 116 (ex.: `010101` para LC 01.01)
- `cNBS` (9 dígitos) — obrigatório (ex.: `115021000` para desenvolvimento de sistemas — Anexo VIII)
- `cIndOp` (6 dígitos) — indicador de operação IBS/CBS (Anexo VII; **não** reutilizar `cTribNac`). Ex.: `100301` = demais serviços onerosos no domicílio do adquirente
- `id` de `infDPS` — 45 chars: `DPS` + mun(7) + tpInsc(1: CPF=1/CNPJ=2) + doc(14) + série(5) + nDPS(15)
- `dhEmi` — com fuso (`-03:00`)
- `serie` — 5 dígitos no XML
- `pAliq` — sempre enviado com `tribISSQN=1`
- Grupo `IBSCBS` (`finNFSe`, `indFinal`, `cIndOp`, `indDest`, CST/`cClassTrib`) — NT 004
  - **Omitido** para optantes do Simples (MEI/`opSimpNac=2` ou ME-EPP/`opSimpNac=3`) — evita rejeição **E082** no piloto 2026
  - **Omitido** quando `cIndOp` não é informado (grupo ainda opcional até 03/08/2026)
  - Quando enviado: `indFinal` default `0` e `cIndOp` validado contra Anexo VII
- `regTrib/regApTribSN` — **somente** quando `opSimpNac=3` (ME/EPP no Simples Nacional)
- `opSimpNac`: `1`=não optante, `2`=MEI, `3`=ME/EPP
- `fone`/`email` de prestador e tomador — enviados quando disponíveis

Município (ex.: Sacramento/MG `3156908`) vem de `codigomunicipioibge` / `prestador.municipioIbge` → `cLocEmi` / `cLocPrestacao`.

### Rejeição E050 (DPS já recepcionada)

O `id` de `infDPS` inclui `série` + `nDPS`. Se esse ID já foi aceito pela Betha/ADN (mesmo que a nota tenha sido rejeitada depois por regra de negócio, ex. E082), **não pode ser reenviado**.

- **Retransmitir** na listagem agora reserva um **novo** nDPS (não reutiliza o payload antigo).
- Se a série local estiver atrás do Fly, ajuste o **próximo número** em Configurações → NFS-e para o valor do Fly (ex.: `8402`) antes de emitir/retransmitir.

### Rejeição E082 (código indicador de operação inválido)

Causa comum: envio do grupo `IBSCBS` por empresa do **Simples Nacional**. O piloto IBS/CBS 2026 não se aplica ao SN; a Betha rejeita o `cIndOp` mesmo quando o código é oficial (`100301`). O adapter omite `IBSCBS` automaticamente para MEI/ME-EPP.



## Detecção automática



Se o WSDL listar `RecepcionarDps`, o adapter usa o fluxo DPS; caso contrário, usa RPS ABRASF 2.02.



## Campos críticos (manual + ExemplosXML)



- `ItemListaServico`: sem ponto (`07.02` → `0702`)

- `IssRetido` fora de `Valores`; com retenção, incluir `ResponsavelRetencao`

- `CodigoMunicipio` + `MunicipioIncidencia` (IBGE 7 dígitos)

- Datas `AAAA-MM-DD`; valores com ponto decimal



## Erro comum (SOAP DPS)



`SOAP-ERROR: Encoding: object has no 'DPS' property`



Causa: WSDL DPS usa binding document/literal com parâmetro único; o adapter envia `[$soapVar]` em vez de `[[$soapVar]]`.

## Erro comum (HTTP 301 Moved Permanently)

`Falha SOAP NFS-e: Moved Permanently`

Causa: o WSDL Betha publica `soap:address` em `http://nota-eletronica.betha.cloud:80/dps/ws`. O POST SOAP no HTTP recebe 301 para HTTPS e o SoapClient PHP não segue o redirect.

Correção: após carregar o WSDL, o adapter força `__setLocation('https://nota-eletronica.betha.cloud/dps/ws')`.

## Erro comum (E001 Signature fora do DPS)

`cvc-complex-type.2.4.d: Conteúdo inválido encontrado ao iniciar com o elemento 'Signature'`

Causa: o assinador anexa `ds:Signature` como irmão de `<DPS>` no envelope `RecepcionarDpsEnvio`. O XSD exige Signature **dentro** de `<DPS>`, após `<infDPS>`.

Correção: após assinar, `reposicionarSignatureNoPai(..., 'DPS')` (e `'evento'` no cancelamento/substituição).

