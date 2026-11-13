<?php

use Nfse\Dto\Nfse\CancelamentoData;

it('can be instantiated from array-like input and maps names', function () {
    $data = new CancelamentoData([
        'xDesc' => 'Desc',
        'cMotivo' => '1',
        'xMotivo' => 'Teste motivo',
    ]);

    expect($data->descricao)->toBe('Desc');
    expect($data->codigoMotivo)->toBe('1');
    expect($data->motivo)->toBe('Teste motivo');
});
