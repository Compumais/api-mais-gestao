<?php

use Nfse\Dto\Nfse\CancelamentoData;
use Nfse\Dto\Nfse\InfPedRegData;
use Nfse\Dto\Nfse\PedRegEventoData;
use Nfse\Xml\EventosXmlBuilder;

it('constructs Id without nPedRegEvento and preserves large numbers', function () {
    $ch = str_repeat('9', 50);
    $cancel = new CancelamentoData([
        'xDesc' => 'x',
        'cMotivo' => '1',
        'xMotivo' => 'm',
    ]);

    $inf = new InfPedRegData([
        'tpAmb' => 2,
        'verAplic' => '1.0',
        'dhEvento' => '2025-01-01T12:00:00-03:00',
        'chNFSe' => $ch,
        'nPedRegEvento' => 123,
        'e101101' => $cancel,
    ]);

    $pedido = new PedRegEventoData(['infPedReg' => $inf]);
    $xml = (new EventosXmlBuilder)->buildPedRegEvento($pedido);

    // nPedRegEvento não existe no schema XSD, não deve aparecer no XML
    expect($xml)->not()->toContain('nPedRegEvento');
    expect($xml)->toContain('Id="PRE'.$ch.'101101"');
});
