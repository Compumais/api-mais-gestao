# Provedores NFS-e

Contrato interno estável entre API Node e gateway PHP. Cada adapter implementa `NfseProvedorAdapter`.

## abrasf (piloto)

- Layout ABRASF 2.02
- SOAP Document/Literal
- Assinatura XML A1
- Requer `urlwsdl` na configuração da empresa

## issnet

Slot preparado. Overrides esperados:

- Namespace/WSDL específicos do ISSNet
- Métodos SOAP podem divergir do ABRASF puro

## ginfes

Slot preparado. Overrides esperados:

- Cabeçalho/credenciais GINFES
- XSD municipal

## ipm

Slot preparado. Overrides esperados:

- Autenticação adicional IPM
- Campos extras no RPS

## betha

Implementado em `AdapterBetha`. Ver [betha.md](./betha.md).

- WSDL por operação
- Métodos SOAP camelCase
- Derivação automática de URL a partir de `urlwsdl`

## sefin_nacional

Implementado em `AdapterSefinNacional`. Ver [sefin-nacional.md](./sefin-nacional.md).

- REST + mTLS (Sefin Nacional / Emissor Público)
- DPS GZip+Base64 síncrona (`POST /nfse`)
- Cancelamento por evento `e101101`
- URL por ambiente (produção restrita / produção); override em `urlwsdl`

## Adicionar novo provedor

1. Criar `src/Adapters/Adapter{Nome}.php` implementando `NfseProvedorAdapter`
2. Registrar em `ProvedorFactory`
3. Adicionar valor em `nfseconfiguracao.provedor` (API)
4. Documentar quirks nesta pasta
