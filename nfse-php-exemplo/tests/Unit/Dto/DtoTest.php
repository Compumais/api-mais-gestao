<?php

use Nfse\Dto\Nfse\DpsData;
use Nfse\Dto\Nfse\InfDpsData;
use Nfse\Enums\EmitenteDPS;
use Nfse\Enums\TipoAmbiente;

it('can instantiate DTO using original property names', function () {
    $data = [
        'versao' => '1.00',
        'infDps' => [
            'id' => 'DPS123',
            'tipoAmbiente' => TipoAmbiente::Homologacao,
            'dataEmissao' => '2023-01-01',
            'versaoAplicativo' => '1.0',
            'serie' => '1',
            'numeroDps' => '100',
            'dataCompetencia' => '2023-01-01',
            'tipoEmitente' => EmitenteDPS::Prestador,
            'codigoLocalEmissao' => '1234567',
            'prestador' => [
                'cnpj' => '12345678000199',
                'inscricaoMunicipal' => '12345',
                'nome' => 'Prestador Teste',
            ],
        ],
    ];

    $dps = new DpsData($data);

    expect($dps->versao)->toBe('1.00');
    expect($dps->infDps)->toBeInstanceOf(InfDpsData::class);
    expect($dps->infDps->id)->toBe('DPS123');
    expect($dps->infDps->tipoAmbiente)->toBe(TipoAmbiente::Homologacao);
    expect($dps->infDps->prestador->cnpj)->toBe('12345678000199');
});

it('can instantiate DTO using mixed keys (original and mapped)', function () {
    $data = [
        '@attributes' => ['versao' => '1.00'], // Mapped
        'infDPS' => [ // Mapped
            'id' => 'DPS123', // Original
            'tpAmb' => 2, // Mapped
            'dataEmissao' => '2023-01-01', // Original
            'verAplic' => '1.0', // Mapped
            'serie' => '1',
            'nDPS' => '100', // Mapped
            'dataCompetencia' => '2023-01-01', // Original
            'tpEmit' => 1, // Mapped
            'cLocEmi' => '1234567', // Mapped
            'prest' => [ // Mapped
                'CNPJ' => '12345678000199', // Mapped
                'inscricaoMunicipal' => '12345', // Original
                'xNome' => 'Prestador Teste', // Mapped
            ],
        ],
    ];

    $dps = new DpsData($data);

    expect($dps->versao)->toBe('1.00');
    expect($dps->infDps->id)->toBe('DPS123');
    expect($dps->infDps->tipoAmbiente)->toBe(TipoAmbiente::Homologacao);
    expect($dps->infDps->prestador->cnpj)->toBe('12345678000199');
    expect($dps->infDps->prestador->inscricaoMunicipal)->toBe('12345');
    expect($dps->infDps->prestador->nome)->toBe('Prestador Teste');
});
