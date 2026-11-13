<?php

use Nfse\Dto\Nfse\InfPedRegData;
use Nfse\Dto\Nfse\PedRegEventoData;
use Nfse\Xml\EventosXmlBuilder;

it('includes CPFAutor when cpfAutor is provided and omits CNPJAutor', function () {
    $inf = new InfPedRegData([
        'tpAmb' => 2,
        'verAplic' => '1.0',
        'dhEvento' => '2025-01-01T12:00:00-03:00',
        'chNFSe' => '12345678901234567890123456789012345678901234567890',
        'CPFAutor' => '11122233344',
        'nPedRegEvento' => 7,
    ]);

    $pedido = new PedRegEventoData(['infPedReg' => $inf]);

    $xml = (new EventosXmlBuilder)->buildPedRegEvento($pedido);

    expect($xml)->toContain('<CPFAutor>11122233344</CPFAutor>');
    expect($xml)->not()->toContain('<CNPJAutor>');
    // nPedRegEvento não existe no schema XSD, não deve aparecer no XML
    expect($xml)->not()->toContain('nPedRegEvento');
    $ch = '12345678901234567890123456789012345678901234567890';
    $tipo = '101101';
    expect($xml)->toContain('Id="PRE'.$ch.$tipo.'"');
});

it('does not include e101101 when no cancellation provided', function () {
    $inf = new InfPedRegData([
        'tpAmb' => 2,
        'verAplic' => '1.0',
        'dhEvento' => '2025-01-01T12:00:00-03:00',
        'chNFSe' => '12345678901234567890123456789012345678901234567890',
        'nPedRegEvento' => 2,
    ]);

    $pedido = new PedRegEventoData(['infPedReg' => $inf]);
    $xml = (new EventosXmlBuilder)->buildPedRegEvento($pedido);

    expect($xml)->not()->toContain('<e101101>');
});
