# Test Fixtures

Este diretório contém os arquivos de teste (fixtures) utilizados pelos testes automatizados.

## Estrutura

### `/certs`

Certificados digitais para testes de assinatura:

-   `test.pfx` - Certificado de teste (senha: 1234)
-   `certificate.crt` - Certificado público
-   `private.key` - Chave privada
-   `expired.csr` / `expired.key` - Certificados expirados para testes de validação

### `/xml`

Exemplos de XMLs completos de retorno da SEFIN:

-   `ExemploPisZeradoCofinsSobreFaturamentoPreenchido.xml` - NFSe completa com PIS zerado e COFINS sobre faturamento
-   `ExemploPrestadorPessoaFisica.xml` - NFSe completa de prestador pessoa física

**Importante:** Estes arquivos contêm a **NFSe completa** retornada pela SEFIN, incluindo:

-   Dados da NFSe autorizada (`<infNFSe>`)
-   DPS original (`<DPS>`)
-   Assinaturas (da SEFIN e do DPS)

### `/xml/dps`

DPS isolados extraídos dos exemplos acima, **sem assinatura**:

-   `ExemploPisZeradoCofinsSobreFaturamentoPreenchido.xml` - DPS isolado (prestador CNPJ)
-   `ExemploPrestadorPessoaFisica.xml` - DPS isolado (prestador CPF)

**Uso:** Estes arquivos devem ser usados para:

-   Testes de assinatura digital
-   Testes de geração de XML
-   Validação de estrutura do DPS

## Diferença entre NFSe e DPS

### NFSe (Nota Fiscal de Serviços Eletrônica)

É o **documento fiscal autorizado** retornado pela SEFIN após o processamento do DPS. Contém:

-   Informações de autorização (número da NFSe, data de processamento, etc.)
-   Dados do emitente
-   Valores calculados
-   DPS original
-   Assinatura da SEFIN

### DPS (Declaração de Prestação de Serviços)

É o **documento enviado** pelo contribuinte para a SEFIN. Contém:

-   Dados do prestador
-   Dados do tomador
-   Informações do serviço
-   Valores
-   Tributação

**O DPS é assinado digitalmente pelo contribuinte antes do envio.**

## Testes de Assinatura

Os testes de assinatura digital (`XmlSignerTest.php`) devem usar os arquivos em `/xml/dps`, pois:

1. Assinamos apenas o DPS, não a NFSe completa
2. Os arquivos DPS não contêm assinaturas prévias
3. Representam o cenário real de envio para a SEFIN
