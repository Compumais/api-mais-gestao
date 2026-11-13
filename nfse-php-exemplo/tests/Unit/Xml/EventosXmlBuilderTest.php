<?php

use Nfse\Dto\Nfse\InfPedRegData;
use Nfse\Dto\Nfse\PedRegEventoData;
use Nfse\Xml\EventosXmlBuilder;

it('builds a pedRegEvento xml for cancelamento', function () {
    $inf = new InfPedRegData([
        'tpAmb' => 2,
        'verAplic' => '1.0',
        'dhEvento' => '2025-01-01T12:00:00-03:00',
        'CNPJAutor' => '12345678000199',
        'chNFSe' => '12345678901234567890123456789012345678901234567890',
        'nPedRegEvento' => 1,
        'e101101' => [
            'xDesc' => 'Cancelamento de NFS-e',
            'cMotivo' => '1',
            'xMotivo' => 'Teste',
        ],
    ]);

    $pedido = new PedRegEventoData(['infPedReg' => $inf]);

    $xml = (new EventosXmlBuilder)->buildPedRegEvento($pedido);

    expect($xml)->toContain('<pedRegEvento');
    expect($xml)->toContain('<infPedReg Id="PRE12345678901234567890123456789012345678901234567890101101"');
    expect($xml)->toContain('<e101101>');
    expect($xml)->toContain('<xMotivo>Teste</xMotivo>');
});
