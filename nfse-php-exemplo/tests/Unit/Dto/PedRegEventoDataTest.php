<?php

use Nfse\Dto\Nfse\InfPedRegData;
use Nfse\Dto\Nfse\PedRegEventoData;

it('defaults versao to 1.01 when not provided', function () {
    $inf = new InfPedRegData([
        'tpAmb' => 2,
        'verAplic' => '1.0',
        'dhEvento' => '2025-01-01T12:00:00-03:00',
        'chNFSe' => 'ABC',
        'nPedRegEvento' => 1,
    ]);

    $pedido = new PedRegEventoData(['infPedReg' => $inf]);
    expect($pedido->versao)->toBe('1.01');
});
