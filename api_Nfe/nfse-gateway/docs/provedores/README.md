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

## Adicionar novo provedor

1. Criar `src/Adapters/Adapter{Nome}.php` implementando `NfseProvedorAdapter`
2. Registrar em `ProvedorFactory`
3. Adicionar valor em `nfseconfiguracao.provedor` (API)
4. Documentar quirks nesta pasta
