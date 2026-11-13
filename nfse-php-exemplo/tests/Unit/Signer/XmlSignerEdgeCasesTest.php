<?php

namespace Nfse\Tests\Unit\Signer;

use Nfse\Signer\Certificate;
use Nfse\Signer\XmlSigner;

it('throws when content is empty', function () {
    $pfxPath = __DIR__.'/../../fixtures/certs/test.pfx';
    $password = '1234';

    $certificate = new Certificate($pfxPath, $password);
    $signer = new XmlSigner($certificate);

    expect(fn () => $signer->sign('', 'infDPS'))->toThrow(\Exception::class, 'Conteúdo XML vazio.');
});

it('throws when tag not found', function () {
    $pfxPath = __DIR__.'/../../fixtures/certs/test.pfx';
    $password = '1234';

    $certificate = new Certificate($pfxPath, $password);
    $signer = new XmlSigner($certificate);

    $xml = '<DPS></DPS>';

    expect(fn () => $signer->sign($xml, 'infDPS'))->toThrow(\Exception::class, 'Tag infDPS não encontrada para assinatura.');
});

it('throws when mark attribute is present but empty', function () {
    $pfxPath = __DIR__.'/../../fixtures/certs/test.pfx';
    $password = '1234';

    $certificate = new Certificate($pfxPath, $password);
    $signer = new XmlSigner($certificate);

    $xml = '<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
    <infDPS Id=""></infDPS>
</DPS>';

    expect(fn () => $signer->sign($xml, 'infDPS'))->toThrow(\Exception::class, "Tag a ser assinada deve possuir um atributo 'Id'.");
});

it('can sign when using a custom mark attribute', function () {
    $pfxPath = __DIR__.'/../../fixtures/certs/test.pfx';
    $password = '1234';

    $certificate = new Certificate($pfxPath, $password);
    $signer = new XmlSigner($certificate);

    $xml = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<Root>
    <Element MyId="ABC123">
        <Child>v</Child>
    </Element>
</Root>
XML;

    $signed = $signer->sign($xml, 'Element', 'MyId');
    expect($signed)->toContain('Reference URI="#ABC123"');
});
