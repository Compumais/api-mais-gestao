# Separação de DPS e NFSe nos Fixtures de Teste

## Problema Identificado

Os testes de assinatura digital estavam usando XMLs completos de retorno da NFSe (que incluem o DPS + dados de autorização + assinatura da SEFIN), quando deveriam estar testando apenas a assinatura do DPS isolado.

## Solução Implementada

### 1. Estrutura de Diretórios

```
tests/fixtures/
├── README.md                    # Documentação da organização
├── certs/                       # Certificados para testes
│   ├── test.pfx
│   ├── certificate.crt
│   ├── private.key
│   └── ...
└── xml/
    ├── ExemploPisZeradoCofinsSobreFaturamentoPreenchido.xml  # NFSe completa
    ├── ExemploPrestadorPessoaFisica.xml                       # NFSe completa
    └── dps/                                                   # DPS isolados
        ├── ExemploPisZeradoCofinsSobreFaturamentoPreenchido.xml
        └── ExemploPrestadorPessoaFisica.xml
```

### 2. Arquivos Criados

#### `/tests/fixtures/xml/dps/`

Novos arquivos contendo apenas o DPS extraído dos exemplos completos:

-   **ExemploPisZeradoCofinsSobreFaturamentoPreenchido.xml** - DPS de prestador CNPJ
-   **ExemploPrestadorPessoaFisica.xml** - DPS de prestador CPF

Estes arquivos:

-   ✅ Contêm apenas a estrutura `<DPS><infDPS>...</infDPS></DPS>`
-   ✅ Não possuem assinatura digital prévia
-   ✅ Representam o documento que deve ser assinado antes do envio

#### `/tests/fixtures/README.md`

Documentação explicando:

-   Diferença entre NFSe (retorno) e DPS (envio)
-   Organização dos diretórios
-   Quando usar cada tipo de arquivo

### 3. Testes Atualizados

#### `tests/Unit/Signer/XmlSignerTest.php`

**Antes:**

```php
it('can sign a dps xml', function () {
    // Usava o XML completo da NFSe
    $xmlPath = __DIR__ . '/../../fixtures/xml/ExemploPrestadorPessoaFisica.xml';
    $xml = file_get_contents($xmlPath);

    // Precisava remover assinatura existente
    $xml = preg_replace('/<Signature[\s\S]*?<\/Signature>/', '', $xml);

    $signedXml = $signer->sign($xml, 'infDPS');
    // ...
});
```

**Depois:**

```php
it('can sign a DPS xml from CNPJ provider', function () {
    // Usa o DPS isolado
    $xmlPath = __DIR__ . '/../../fixtures/xml/dps/ExemploPisZeradoCofinsSobreFaturamentoPreenchido.xml';
    $xml = file_get_contents($xmlPath);

    // Não precisa remover assinatura
    $signedXml = $signer->sign($xml, 'infDPS');
    // ...
});

it('can sign a DPS xml from CPF provider (individual person)', function () {
    // Usa o DPS isolado
    $xmlPath = __DIR__ . '/../../fixtures/xml/dps/ExemploPrestadorPessoaFisica.xml';
    $xml = file_get_contents($xmlPath);

    $signedXml = $signer->sign($xml, 'infDPS');
    // ...
});
```

### 4. Benefícios

1. **Clareza**: Separação clara entre documentos de envio (DPS) e retorno (NFSe)
2. **Realismo**: Testes refletem o fluxo real de assinatura
3. **Manutenibilidade**: Fácil adicionar novos cenários de teste
4. **Documentação**: README explica a organização para novos desenvolvedores
5. **Cobertura**: Dois cenários testados (CNPJ e CPF)

### 5. Resultados dos Testes

```
✓ it can sign a DPS xml from CNPJ provider
✓ it can sign a DPS xml from CPF provider (individual person)

Tests: 2 passed (10 assertions)
```

Todos os 33 testes do projeto continuam passando.

## Conceitos Importantes

### DPS (Declaração de Prestação de Serviços)

-   Documento **criado pelo contribuinte**
-   Contém dados do serviço prestado
-   **Deve ser assinado digitalmente** antes do envio
-   É enviado para a SEFIN para autorização

### NFSe (Nota Fiscal de Serviços Eletrônica)

-   Documento **retornado pela SEFIN**
-   Contém o DPS original + dados de autorização
-   Possui assinatura da SEFIN
-   É o documento fiscal válido

## Fluxo de Assinatura

```
1. Contribuinte cria DPS
2. Contribuinte assina o DPS digitalmente  ← TESTES FOCAM AQUI
3. Contribuinte envia DPS assinado para SEFIN
4. SEFIN valida e autoriza
5. SEFIN retorna NFSe (com DPS + autorização + assinatura SEFIN)
```
