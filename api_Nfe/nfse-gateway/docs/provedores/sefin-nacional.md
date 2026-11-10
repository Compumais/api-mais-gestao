# Sefin Nacional (Emissor Público)

Adapter: `AdapterSefinNacional`  
Provedor: `sefin_nacional`

## Protocolo

- REST + JSON + mTLS (certificado A1 ICP-Brasil com "Autenticação Cliente")
- DPS XML assinada (XMLDSig), compactada em GZip e enviada em Base64 (`dpsXmlGZipB64`)
- Namespace: `http://www.sped.fazenda.gov.br/nfse` **sem prefixo**
- Layout: `dps-1.01`

## URLs

| Ambiente | Base |
|----------|------|
| Homologação (produção restrita) | `https://sefin.producaorestrita.nfse.gov.br/SefinNacional` |
| Produção | `https://sefin.nfse.gov.br/SefinNacional` |

Override opcional via `configJson.urlwsdl` (URL base, não WSDL SOAP).

## Operações mapeadas

| Método adapter | HTTP Sefin |
|----------------|------------|
| `enviarLoteSincrono` | `POST /nfse` |
| `consultarPorRps` | `GET/HEAD /dps/{id}` e/ou `GET /nfse/{chave}` |
| `cancelar` | `POST /nfse/{chave}/eventos` (evento `e101101`) |

## Contrato de saída

Campos padronizados do gateway + `chaveAcesso`, `idDps`, `alertas`, `pendente`.

- **201** emissão → `sucesso=true`, chave 50 dígitos, XML NFS-e
- **400** → rejeição com `erros[]`
- **timeout/rede** → `pendente=true` + `idDps` (API deve consultar antes de reemitir)

## Substituição

Fora do escopo desta entrega. A API Node bloqueia substituição para este provedor.

## Diferença vs Betha DPS

Betha usa SOAP (`RecepcionarDps` + protocolo assíncrono). Sefin é síncrona REST. Não reutilize WSDL Betha neste provedor.

## Referências

- Swagger: `https://sefin.producaorestrita.nfse.gov.br/SefinNacional/docs/index`
- XSDs: `docs/sefin-nacional/`
