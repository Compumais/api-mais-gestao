<?php

namespace Nfse\Tests\Unit\Dto;

use Nfse\Dto\Nfse\InfDpsData;

it('can instantiate inf dps data', function () {
    $infDps = new InfDpsData([
        '@attributes' => ['Id' => 'DPS123'],
        'tpAmb' => 2,
        'dhEmi' => '2023-10-27T10:00:00',
        'verAplic' => '1.0',
        'serie' => '1',
        'nDPS' => '1001',
        'dCompet' => '2023-10-27',
        'tpEmit' => 1,
        'cLocEmi' => '3550308',
        'cMotivoEmisTI' => null,
        'chNFSeRej' => null,
        'subst' => null,
        'prest' => null,
        'toma' => null,
        'interm' => null,
        'serv' => null,
        'valores' => null,
    ]);

    expect($infDps)->toBeInstanceOf(InfDpsData::class)
        ->and($infDps->id)->toBe('DPS123');
});
