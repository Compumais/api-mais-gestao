<?php

use Nfse\Dto\Nfse\TomadorData;
use Nfse\Support\CpfCnpjGenerator;

it('can instantiate tomador as PF (Person)', function () {
    $cpf = CpfCnpjGenerator::generateCpf();
    $tomador = new TomadorData([
        'CPF' => $cpf,
        'xNome' => 'João da Silva',
        'end' => [
            'endNac.cMun' => '3550308',
            'endNac.CEP' => '01001000',
            'xLgr' => 'Praça da Sé',
            'nro' => '1',
            'xBairro' => 'Sé',
        ],
        'fone' => '11999999999',
        'email' => 'joao@email.com',
    ]);

    expect($tomador)->toBeInstanceOf(TomadorData::class);
    expect($tomador->cpf)->toBe($cpf);
    expect($tomador->cnpj)->toBeNull();
});

it('can instantiate tomador as PJ (Company)', function () {
    $cnpj = CpfCnpjGenerator::generateCnpj();
    $tomador = new TomadorData([
        'CNPJ' => $cnpj,
        'IM' => '123456',
        'xNome' => 'Empresa Legal Ltda',
        'end' => [
            'endNac.cMun' => '3550308',
            'endNac.CEP' => '01001000',
            'xLgr' => 'Av Paulista',
            'nro' => '1000',
            'xBairro' => 'Bela Vista',
            'xCpl' => 'Conj 101',
        ],
        'fone' => '1133334444',
        'email' => 'contato@empresa.com',
    ]);

    expect($tomador)->toBeInstanceOf(TomadorData::class);
    expect($tomador->cnpj)->toBe($cnpj);
    expect($tomador->cpf)->toBeNull();
});

it('can instantiate tomador as Foreigner (Estrangeiro)', function () {
    $tomador = new TomadorData([
        'NIF' => '123456789',
        'xNome' => 'John Doe',
        'end' => [
            'xLgr' => '5th Avenue',
            'nro' => '100',
            'xBairro' => 'Manhattan',
            'endExt' => [
                'cPais' => 'US',
                'cCEP' => '10001',
                'xCid' => 'New York',
                'xEst' => 'NY',
            ],
        ],
        'fone' => '15551234567',
        'email' => 'john.doe@email.com',
    ]);

    expect($tomador)->toBeInstanceOf(TomadorData::class);
    expect($tomador->nif)->toBe('123456789');
    expect($tomador->endereco->enderecoExterior->codigoPais)->toBe('US');
});
