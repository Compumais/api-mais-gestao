# Sefin Nacional — leiautes

XSDs e anexos oficiais do Sistema Nacional NFS-e (Emissor Público / Sefin Nacional).

Baixe os pacotes atualizados em:

- [Documentação técnica NFS-e](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica)
- Anexo I — Leiautes e RN DPS/NFS-e
- Anexo II — Eventos

Swagger (produção restrita):

- `https://sefin.producaorestrita.nfse.gov.br/SefinNacional/docs/index`

Namespace XML esperado pelo adapter: `http://www.sped.fazenda.gov.br/nfse` (sem prefixo).

## NT 009 (produção restrita desde ~20/10/2026)

O leiaute da DPS passou a exigir `finNFSe` como filho direto de `infDPS` (após `tpEmit`), e não mais dentro de `IBSCBS`. O `DpsNacionalXmlBuilder` já gera nessa ordem.

Baixe o pacote XSD atualizado no portal (esquemas v1.01 / Anexo VI NT 009) e coloque aqui (`DPS_v1.01.xsd`, eventos, xmldsig) quando for validar localmente.
