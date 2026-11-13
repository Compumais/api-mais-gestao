<?php

use Nfse\Support\CpfCnpjFormatter;

test('it can format CPF', function () {
    $cpf = '12345678901';
    $formatted = CpfCnpjFormatter::formatCpf($cpf);
    expect($formatted)->toBe('123.456.789-01');
});

test('it can format CPF with extra characters', function () {
    $cpf = '123.456.789-01';
    $formatted = CpfCnpjFormatter::formatCpf($cpf);
    expect($formatted)->toBe('123.456.789-01');
});

test('it can format CNPJ', function () {
    $cnpj = '12345678000199';
    $formatted = CpfCnpjFormatter::formatCnpj($cnpj);
    expect($formatted)->toBe('12.345.678/0001-99');
});

test('it can format CNPJ with extra characters', function () {
    $cnpj = '12.345.678/0001-99';
    $formatted = CpfCnpjFormatter::formatCnpj($cnpj);
    expect($formatted)->toBe('12.345.678/0001-99');
});

test('it can unformat a value', function () {
    $value = '12.345.678/0001-99';
    $unformatted = CpfCnpjFormatter::unformat($value);
    expect($unformatted)->toBe('12345678000199');
});

test('it can format CEP', function () {
    $cep = '12345678';
    $formatted = CpfCnpjFormatter::formatCep($cep);
    expect($formatted)->toBe('12345-678');
});

test('it can format CEP with extra characters', function () {
    $cep = '12345-678';
    $formatted = CpfCnpjFormatter::formatCep($cep);
    expect($formatted)->toBe('12345-678');
});
