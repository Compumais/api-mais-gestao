<?php

namespace Nfse\Tests\Unit\Signer;

use Nfse\Signer\Certificate;
use Nfse\Signer\XmlSigner;

it('can sign with custom parameters', function () {
    $pfxPath = __DIR__.'/../../fixtures/certs/test.pfx';
    $password = '1234';

    $certificate = new Certificate($pfxPath, $password);
    $signer = new XmlSigner($certificate);

    $xmlPath = __DIR__.'/../../fixtures/xml/dps/ExemploPisZeradoCofinsSobreFaturamentoPreenchido.xml';
    $xml = file_get_contents($xmlPath);

    // Sign with custom parameters
    $signedXml = $signer->sign(
        content: $xml,
        tagname: 'infDPS',
        mark: 'Id',
        algorithm: OPENSSL_ALGO_SHA1,
        canonical: [true, false, null, null],
        rootname: 'DPS'
    );

    expect($signedXml)->toContain('Signature xmlns')
        ->and($signedXml)->toContain('http://www.w3.org/2000/09/xmldsig#')
        ->and($signedXml)->toContain('Reference URI="#DPS330455721190597100010500333000000000000006"')
        ->and($signedXml)->toContain('DigestValue>')
        ->and($signedXml)->toContain('SignatureValue>');
});

it('can sign with SHA256 algorithm', function () {
    $pfxPath = __DIR__.'/../../fixtures/certs/test.pfx';
    $password = '1234';

    $certificate = new Certificate($pfxPath, $password);
    $signer = new XmlSigner($certificate);

    $xmlPath = __DIR__.'/../../fixtures/xml/dps/ExemploPrestadorPessoaFisica.xml';
    $xml = file_get_contents($xmlPath);

    // Sign with SHA256
    $signedXml = $signer->sign(
        content: $xml,
        tagname: 'infDPS',
        algorithm: OPENSSL_ALGO_SHA256
    );

    expect($signedXml)->toContain('Signature xmlns')
        ->and($signedXml)->toContain('http://www.w3.org/2001/04/xmldsig-more#rsa-sha256')
        ->and($signedXml)->toContain('http://www.w3.org/2001/04/xmlenc#sha256')
        ->and($signedXml)->toContain('DigestValue>')
        ->and($signedXml)->toContain('SignatureValue>');
});

it('validates root element when rootname is specified', function () {
    $pfxPath = __DIR__.'/../../fixtures/certs/test.pfx';
    $password = '1234';

    $certificate = new Certificate($pfxPath, $password);
    $signer = new XmlSigner($certificate);

    $xmlPath = __DIR__.'/../../fixtures/xml/dps/ExemploPisZeradoCofinsSobreFaturamentoPreenchido.xml';
    $xml = file_get_contents($xmlPath);

    // Should throw exception when rootname doesn't match
    expect(fn () => $signer->sign(
        content: $xml,
        tagname: 'infDPS',
        rootname: 'NFSe'  // Wrong root element
    ))->toThrow(\Exception::class, 'Elemento raiz esperado: NFSe, encontrado: DPS');
});

it('throws exception when mark attribute is missing', function () {
    $pfxPath = __DIR__.'/../../fixtures/certs/test.pfx';
    $password = '1234';

    $certificate = new Certificate($pfxPath, $password);
    $signer = new XmlSigner($certificate);

    $xml = '<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
    <infDPS>
        <tpAmb>1</tpAmb>
    </infDPS>
</DPS>';

    // Should throw exception when Id attribute is missing
    expect(fn () => $signer->sign(
        content: $xml,
        tagname: 'infDPS'
    ))->toThrow(\Exception::class, "Tag a ser assinada deve possuir um atributo 'Id'.");
});
