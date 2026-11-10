# Sefin Nacional (Emissor Público)

Adapter: `AdapterSefinNacional`  
Provedor: `sefin_nacional`

## Protocolo

- REST + JSON + mTLS (certificado A1 ICP-Brasil com "Autenticação Cliente")
- DPS XML assinada (XMLDSig), compactada em GZip e enviada em Base64 (`dpsXmlGZipB64`)
- Namespace: `http://www.sped.fazenda.gov.br/nfse` **sem prefixo**
- Layout: `dps-1.01` (sequência **NT 009** na produção restrita)

## Sequência crítica de `infDPS` (NT 009)

Após `tpEmit`, o schema exige `finNFSe` (obrigatório) **antes** de `cLocEmi`:

`tpAmb` → `dhEmi` → `verAplic` → `serie` → `nDPS` → `dCompet` → `tpEmit` → (`cMotivoEmisTI` se tpEmit≠1) → **`finNFSe`** → `cLocEmi` → …

- `finNFSe`: `0` regular (default), `1` crédito, `2` débito
- Com `tpEmit=1` (prestador), **não** enviar `cMotivoEmisTI`
- `finNFSe` **não** deve mais aparecer dentro de `IBSCBS` (campo deslocado da NT 004 → NT 009)

Sem `finNFSe` em `infDPS`, a Sefin rejeita com E1235 (`cLocEmi` inválido; esperava `cMotivoEmisTI, finNFSe`).

## Sequência de `cServ` (NT 009)

`cTribNac` → `cTribMun`? → **`cNBS`**? → `cAtvSN`? → `cIntContrib`? → **`xDescServ`**

- `xDescServ` ficou no **fim** do grupo (antes vinha antes de `cNBS`)
- Sem essa ordem, a Sefin rejeita com E1235 (`cNBS` inválido após `xDescServ`)

## Grupos alinhados ao XML autorizado (portal nacional)

- `serie` no elemento sem zero à esquerda (pad só no `Id` da `infDPS`)
- `totTrib` com `vTotTrib` / `vTotTribFed|Est|Mun` (não `indTotTrib`)
- `pAliq` só quando alíquota > 0
- **`IBSCBS` também para Simples/MEI** quando `cIndOp` informado (`indFinal`, `cIndOp`, `indDest`, `valores/trib/CST` + `cClassTrib`)
- NT 009: `CST`/`cClassTrib` são filhos diretos de `trib` (sem wrapper `gIBSCBS`)
- `cIndOp` é obrigatório na API para layout DPS (Anexo VII)

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
