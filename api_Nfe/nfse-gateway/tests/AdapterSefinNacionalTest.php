<?php

declare(strict_types=1);

/**
 * Testes unitários do AdapterSefinNacional / builders (sem PHPUnit).
 * Executar: php tests/AdapterSefinNacionalTest.php
 */

require_once __DIR__ . '/../vendor/autoload.php';

use MaisGestao\NfseGateway\Adapters\AdapterSefinNacional;
use MaisGestao\NfseGateway\Factory\ProvedorFactory;
use MaisGestao\NfseGateway\Sefin\DpsNacionalXmlBuilder;
use MaisGestao\NfseGateway\Sefin\EventoNacionalXmlBuilder;
use MaisGestao\NfseGateway\Sefin\SefinHttpClient;

$falhas = 0;

function assertTrue(bool $condicao, string $mensagem): void
{
    global $falhas;
    if (!$condicao) {
        echo "FAIL: {$mensagem}\n";
        $falhas++;
        return;
    }
    echo "OK: {$mensagem}\n";
}

function payloadNfseMinimo(): array
{
    return [
        'prestador' => [
            'cnpj' => '12345678000195',
            'im' => '12345',
            'municipioIbge' => '3550308',
            'opSimpNac' => '3',
            'regApTribSN' => '1',
        ],
        'tomador' => [
            'cnpjCpf' => '98765432000100',
            'razaoSocial' => 'TOMADOR TESTE',
            'endereco' => [
                'logradouro' => 'Rua A',
                'numero' => '100',
                'bairro' => 'Centro',
                'codigoMunicipioIbge' => '3550308',
                'cep' => '01001000',
            ],
        ],
        'rps' => [
            'numero' => 42,
            'serie' => '1',
            'dataEmissao' => '2026-11-06T10:00:00-03:00',
            'competencia' => '2026-11-06',
        ],
        'servico' => [
            'itemListaServico' => '0101',
            'codigoTributacaoNacional' => '010101',
            'codigoNbs' => '115021000',
            'discriminacao' => 'Desenvolvimento de software',
            'issRetido' => '2',
            'valores' => [
                'servicos' => 1000.50,
                'aliquota' => 2.00,
            ],
        ],
    ];
}

// --- Factory ---
$adapter = ProvedorFactory::criar('sefin_nacional');
assertTrue($adapter instanceof AdapterSefinNacional, 'Factory resolve sefin_nacional');

$adapterAlias = ProvedorFactory::criar('adn');
assertTrue($adapterAlias instanceof AdapterSefinNacional, 'Factory resolve alias adn');

// --- Id DPS 45 chars ---
$builder = new DpsNacionalXmlBuilder();
[$idInf, $xml] = $builder->montar(payloadNfseMinimo(), [
    'ambiente' => 2,
    'cnpj' => '12345678000195',
    'codigomunicipioibge' => '3550308',
]);

assertTrue(strlen($idInf) === 45, 'Id infDPS tem 45 caracteres');
assertTrue(str_starts_with($idInf, 'DPS35503082'), 'Id começa com DPS + mun + tpInsc CNPJ');
assertTrue(str_contains($idInf, '000000000000042'), 'Id contém nDPS padded 15');

// --- Namespace nacional sem prefixo ---
assertTrue(str_contains($xml, 'xmlns="http://www.sped.fazenda.gov.br/nfse"'), 'XML usa namespace nacional default');
assertTrue(!preg_match('/<[a-zA-Z0-9]+:DPS/', $xml), 'Raiz DPS sem prefixo de namespace');
assertTrue(str_contains($xml, '<DPS'), 'Raiz é DPS (sem envelope SOAP)');
assertTrue(str_contains($xml, 'Id="' . $idInf . '"'), 'infDPS traz atributo Id');
assertTrue(str_contains($xml, '<cTribNac>010101</cTribNac>'), 'cTribNac presente');
assertTrue(str_contains($xml, '<cNBS>115021000</cNBS>'), 'cNBS presente');
assertTrue(!str_contains($xml, '<IBSCBS>'), 'IBSCBS omitido para Simples (opSimpNac=3)');

$idExtraido = DpsNacionalXmlBuilder::extrairIdInfDps($xml);
assertTrue($idExtraido === $idInf, 'extrairIdInfDps retorna o mesmo Id');

// --- Evento cancelamento ---
$eventoBuilder = new EventoNacionalXmlBuilder();
$chave50 = str_repeat('1', 50);
[$idPed, $xmlEvento] = $eventoBuilder->montarCancelamento(
    ['ambiente' => 2, 'cnpj' => '12345678000195'],
    [
        'chaveAcesso' => $chave50,
        'motivo' => 'Erro de digitação',
        'codigoMotivo' => '1',
        'prestador' => ['cnpj' => '12345678000195'],
    ],
);
assertTrue(str_starts_with($idPed, 'PRE'), 'Id do pedido de evento começa com PRE');
assertTrue(str_contains($xmlEvento, '<pedRegEvento'), 'Raiz pedRegEvento');
assertTrue(str_contains($xmlEvento, '<e101101>'), 'Evento e101101 presente');
assertTrue(str_contains($xmlEvento, '<chNFSe>' . $chave50 . '</chNFSe>'), 'chNFSe no evento');

try {
    $eventoBuilder->montarCancelamento(['ambiente' => 2], ['chaveAcesso' => '123']);
    assertTrue(false, 'Evento com chave curta deveria falhar');
} catch (\Throwable $e) {
    assertTrue(str_contains($e->getMessage(), '50'), 'Evento rejeita chave != 50 dígitos');
}

// --- GZip roundtrip ---
$original = '<?xml version="1.0"?><DPS>teste</DPS>';
$b64 = SefinHttpClient::gzipBase64($original);
$volta = SefinHttpClient::gunzipBase64($b64);
assertTrue($volta === $original, 'gzipBase64/gunzipBase64 roundtrip');

// --- URL base por ambiente ---
$clientHom = SefinHttpClient::criarAPartirConfig(
    ['ambiente' => 2],
    base64_encode('fake'),
    'x',
);
assertTrue(
    $clientHom->obterBaseUrl() === SefinHttpClient::URL_HOMOLOGACAO,
    'Ambiente 2 usa produção restrita',
);

$clientProd = SefinHttpClient::criarAPartirConfig(
    ['ambiente' => 1],
    base64_encode('fake'),
    'x',
);
assertTrue(
    $clientProd->obterBaseUrl() === SefinHttpClient::URL_PRODUCAO,
    'Ambiente 1 usa produção',
);

$clientOverride = SefinHttpClient::criarAPartirConfig(
    ['ambiente' => 2, 'urlwsdl' => 'https://exemplo.local/SefinNacional/'],
    base64_encode('fake'),
    'x',
);
assertTrue(
    $clientOverride->obterBaseUrl() === 'https://exemplo.local/SefinNacional',
    'urlwsdl sobrescreve URL base',
);

// --- Mapeamento respostas via reflection ---
$adapterSefin = new AdapterSefinNacional();
$ref = new ReflectionClass($adapterSefin);

$mapearEmissao = $ref->getMethod('mapearRespostaEmissao');
$mapearEmissao->setAccessible(true);

$chaveOk = str_repeat('9', 50);
$nfseXml = '<?xml version="1.0"?><NFSe><infNFSe><nNFSe>123</nNFSe></infNFSe></NFSe>';
$res201 = $mapearEmissao->invoke(
    $adapterSefin,
    [
        'status' => 201,
        'json' => [
            'idDps' => $idInf,
            'chaveAcesso' => $chaveOk,
            'nfseXmlGZipB64' => SefinHttpClient::gzipBase64($nfseXml),
            'alertas' => [
                ['codigo' => 'A001', 'descricao' => 'Alerta teste', 'complemento' => 'detalhe'],
            ],
        ],
        'body' => '',
    ],
    $idInf,
    '<DPS/>',
);

assertTrue(($res201['sucesso'] ?? false) === true, '201 mapeia sucesso');
assertTrue(($res201['chaveAcesso'] ?? '') === $chaveOk, '201 grava chaveAcesso');
assertTrue(($res201['codigoVerificacao'] ?? '') === $chaveOk, '201 codigoVerificacao = chave');
assertTrue(($res201['numeroNfse'] ?? '') === '123', '201 extrai nNFSe');
assertTrue(($res201['modo'] ?? '') === 'dps', '201 modo dps');
assertTrue(($res201['provedor'] ?? '') === 'sefin_nacional', '201 provedor sefin_nacional');
assertTrue(count($res201['alertas'] ?? []) === 1, '201 mapeia alertas');

$res400 = $mapearEmissao->invoke(
    $adapterSefin,
    [
        'status' => 400,
        'json' => [
            'idDPS' => $idInf,
            'erros' => [
                ['codigo' => 'E050', 'descricao' => 'DPS já utilizada', 'complemento' => ''],
            ],
        ],
        'body' => '',
    ],
    $idInf,
    '<DPS/>',
);
assertTrue(($res400['sucesso'] ?? true) === false, '400 mapeia rejeição');
assertTrue(($res400['erros'][0]['codigo'] ?? '') === 'E050', '400 preserva codigo E050');
assertTrue(($res400['pendente'] ?? true) === false, '400 não fica pendente');

$mapearErro = $ref->getMethod('mapearRespostaErroGenerico');
$mapearErro->setAccessible(true);
$res404 = $mapearErro->invoke(
    $adapterSefin,
    ['status' => 404, 'json' => null, 'body' => ''],
    $idInf,
    null,
);
assertTrue(($res404['sucesso'] ?? true) === false, '404 consulta = falha');
assertTrue(str_contains((string) ($res404['erros'][0]['mensagem'] ?? ''), 'não encontrada'), '404 mensagem clara');

echo "\n";
if ($falhas > 0) {
    echo "RESULTADO: {$falhas} falha(s)\n";
    exit(1);
}

echo "RESULTADO: todos os testes passaram\n";
exit(0);
