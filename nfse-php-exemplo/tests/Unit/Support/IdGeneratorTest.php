<?php

namespace Nfse\Tests\Unit\Support;

use Nfse\Support\IdGenerator;

it('can generate a valid DPS ID for CPF', function () {
    // Example from XML: DPS231400310000667299238300001000000000000046
    $cpf = '06672992383';
    $codIbge = '2314003';
    $serie = '1';
    $num = '46';

    $id = IdGenerator::generateDpsId($cpf, $codIbge, $serie, $num);

    expect($id)->toBe('DPS231400310000667299238300001000000000000046');
    expect(strlen($id))->toBe(45);
});

it('can generate a valid DPS ID for CNPJ', function () {
    $cnpj = '12345678000199';
    $codIbge = '3550308'; // Sao Paulo
    $serie = 'A';
    $num = 123;

    $id = IdGenerator::generateDpsId($cnpj, $codIbge, $serie, $num);

    // DPS + 3550308 + 2 + 12345678000199 + 0000A + 000000000000123
    // Note: Serie usually is numeric but standard says 5 chars. If it's 'A', it pads to '0000A'.
    // Wait, standard for serie might be alphanumeric?
    // The user code uses str_pad with 0. '0000A'.

    $expected = 'DPS35503082123456780001990000A000000000000123';

    expect($id)->toBe($expected);
    expect(strlen($id))->toBe(45);
});
