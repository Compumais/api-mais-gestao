<?php

namespace Nfse\Tests\Unit\Signer;

use Nfse\Signer\Certificate;
use Nfse\Signer\XmlSigner;

it('can sign a DPS xml from CNPJ provider', function () {
    $pfxPath = __DIR__.'/../../fixtures/certs/test.pfx';
    $password = '1234';

    $certificate = new Certificate($pfxPath, $password);
    $signer = new XmlSigner($certificate);

    // Use the isolated DPS XML, not the complete NFSe return
    $xmlPath = __DIR__.'/../../fixtures/xml/dps/ExemploPisZeradoCofinsSobreFaturamentoPreenchido.xml';
    $xml = file_get_contents($xmlPath);

    $signedXml = $signer->sign($xml, 'infDPS');

    expect($signedXml)->toContain('Signature xmlns')
        ->and($signedXml)->toContain('http://www.w3.org/2000/09/xmldsig#')
        ->and($signedXml)->toContain('Reference URI="#DPS330455721190597100010500333000000000000006"')
        ->and($signedXml)->toContain('DigestValue>')
        ->and($signedXml)->toContain('SignatureValue>');
});

it('can sign a DPS xml from CPF provider (individual person)', function () {
    $pfxPath = __DIR__.'/../../fixtures/certs/test.pfx';
    $password = '1234';

    $certificate = new Certificate($pfxPath, $password);
    $signer = new XmlSigner($certificate);

    // Use the isolated DPS XML, not the complete NFSe return
    $xmlPath = __DIR__.'/../../fixtures/xml/dps/ExemploPrestadorPessoaFisica.xml';
    $xml = file_get_contents($xmlPath);

    $signedXml = $signer->sign($xml, 'infDPS');

    expect($signedXml)->toContain('Signature xmlns')
        ->and($signedXml)->toContain('http://www.w3.org/2000/09/xmldsig#')
        ->and($signedXml)->toContain('Reference URI="#DPS231400310000667299238300001000000000000046"')
        ->and($signedXml)->toContain('DigestValue>')
        ->and($signedXml)->toContain('SignatureValue>');
});
