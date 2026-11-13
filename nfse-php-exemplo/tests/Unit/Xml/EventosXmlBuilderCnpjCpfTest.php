<?php

use Nfse\Dto\Nfse\InfPedRegData;
use Nfse\Dto\Nfse\PedRegEventoData;
use Nfse\Xml\EventosXmlBuilder;

it('includes both CNPJAutor and CPFAutor if both are provided', function () {
    $ch = '12345678901234567890123456789012345678901234567890';

    $inf = new InfPedRegData([
        'tpAmb' => 2,
        'verAplic' => '1.0',
        'dhEvento' => '2025-01-01T12:00:00-03:00',
        'chNFSe' => $ch,
        'CNPJAutor' => '12345678000199',
        'CPFAutor' => '11122233344',
        'nPedRegEvento' => 5,
        'e101101' => [
            'xDesc' => 'x',
            'cMotivo' => '1',
            'xMotivo' => 'm',
        ],
    ]);

    $pedido = new PedRegEventoData(['infPedReg' => $inf]);
    $xml = (new EventosXmlBuilder)->buildPedRegEvento($pedido);

    expect($xml)->toContain('<CNPJAutor>12345678000199</CNPJAutor>');
    expect($xml)->toContain('<CPFAutor>11122233344</CPFAutor>');
});
