<?php

declare(strict_types=1);

/**
 * Testes unitários do AdapterSefinNacional / builders (sem PHPUnit).
 * Executar: php tests/AdapterSefinNacionalTest.php
 */

require_once __DIR__ . '/../vendor/autoload.php';

use MaisGestao\NfseGateway\Adapters\AdapterSefinNacional;
use MaisGestao\NfseGateway\Factory\ProvedorFactory;
use MaisGestao\NfseGateway\Sefin\DpsNacionalValidator;
use MaisGestao\NfseGateway\Sefin\DpsNacionalXmlBuilder;
use MaisGestao\NfseGateway\Sefin\EventoNacionalXmlBuilder;
use MaisGestao\NfseGateway\Sefin\SefinEndpointResolver;
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
assertTrue(!str_contains($xml, '<IBSCBS>'), 'IBSCBS omitido sem cIndOp');
assertTrue(str_contains($xml, '<serie>1</serie>'), 'serie sem pad no elemento');
assertTrue(str_contains($xml, '<vTotTribFed>0.00</vTotTribFed>'), 'vTotTribFed presente');
assertTrue(str_contains($xml, '<vTotTribEst>0.00</vTotTribEst>'), 'vTotTribEst presente');
assertTrue(str_contains($xml, '<vTotTribMun>0.00</vTotTribMun>'), 'vTotTribMun presente');
assertTrue(!str_contains($xml, '<indTotTrib>'), 'indTotTrib não é mais usado');
assertTrue(str_contains($xml, '<pAliq>2.00</pAliq>'), 'pAliq emitido quando > 0');

// Schema oficial DPS_v1.01.xsd (TCCServ): cTribNac -> xDescServ -> cNBS
assertTrue(
    (bool) preg_match(
        '/<cTribNac>010101<\/cTribNac>\s*<xDescServ>[\s\S]*?<\/xDescServ>\s*<cNBS>115021000<\/cNBS>/',
        $xml,
    ),
    'cServ: cTribNac → xDescServ → cNBS (Schema DPS_v1.01.xsd)',
);
assertTrue(
    !preg_match('/<cNBS>[\s\S]*?<xDescServ>/', $xml),
    'cNBS não pode aparecer antes de xDescServ no schema DPS_v1.01',
);

// finNFSe não pertence ao infDPS (pertence ao grupo IBSCBS)
assertTrue(
    (bool) preg_match('/<tpEmit>1<\/tpEmit>\s*<cLocEmi>/', $xml),
    'infDPS segue sequência tpEmit -> cLocEmi',
);

// Simples com cIndOp: IBSCBS obrigatório (portal nacional)
$payloadSnIbs = payloadNfseMinimo();
$payloadSnIbs['servico']['ibsCbs'] = [
    'cIndOp' => '050101',
    'finNFSe' => 0,
    'indFinal' => 0,
    'indDest' => 0,
    'cst' => '000',
    'cClassTrib' => '000001',
];
[, $xmlSnIbs] = $builder->montar($payloadSnIbs, [
    'ambiente' => 2,
    'cnpj' => '12345678000195',
    'codigomunicipioibge' => '3550308',
]);
assertTrue(str_contains($xmlSnIbs, '<IBSCBS>'), 'IBSCBS emitido para Simples com cIndOp');
assertTrue(str_contains($xmlSnIbs, '<cIndOp>050101</cIndOp>'), 'cIndOp 050101 no IBSCBS');
assertTrue(str_contains($xmlSnIbs, '<finNFSe>0</finNFSe>'), 'finNFSe=0 presente no grupo IBSCBS');
assertTrue(
    (bool) preg_match('/<trib>\s*<gIBSCBS>\s*<CST>000<\/CST>\s*<cClassTrib>000001<\/cClassTrib>\s*<\/gIBSCBS>\s*<\/trib>/', $xmlSnIbs),
    'CST/cClassTrib encapsulados em gIBSCBS no schema DPS_v1.01',
);

// Aliquota zero: omite pAliq
$payloadSemAliq = payloadNfseMinimo();
$payloadSemAliq['servico']['valores']['aliquota'] = 0;
[, $xmlSemAliq] = $builder->montar($payloadSemAliq, [
    'ambiente' => 2,
    'cnpj' => '12345678000195',
    'codigomunicipioibge' => '3550308',
]);
assertTrue(!str_contains($xmlSemAliq, '<pAliq>'), 'pAliq omitido quando aliquota=0');

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
assertTrue(
    (bool) preg_match('/^PRE[0-9]{56}$/', $idPed) && str_ends_with($idPed, '101101'),
    'Id do pedido de evento segue TSIdPedRegEvt (PRE + chave 50 + tipo 101101)',
);
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

$res400ErroSingular = $mapearEmissao->invoke(
    $adapterSefin,
    [
        'status' => 400,
        'json' => [
            'erro' => [
                'codigo' => 'E082',
                'descricao' => 'Indicador de operação inválido',
                'complemento' => 'cIndOp',
            ],
        ],
        'body' => '',
    ],
    $idInf,
    '<DPS/>',
);
assertTrue(
    ($res400ErroSingular['erros'][0]['codigo'] ?? '') === 'E082',
    '400 lê erro singular',
);
assertTrue(
    str_contains((string) ($res400ErroSingular['erros'][0]['mensagem'] ?? ''), 'Indicador'),
    '400 mensagem do erro singular',
);

$res400TopLevel = $mapearEmissao->invoke(
    $adapterSefin,
    [
        'status' => 400,
        'json' => [
            'codigoStatus' => 400,
            'motivoStatus' => 'DPS rejeitada pela validação',
        ],
        'body' => '',
    ],
    $idInf,
    '<DPS/>',
);
assertTrue(
    str_contains((string) ($res400TopLevel['erros'][0]['mensagem'] ?? ''), 'DPS rejeitada'),
    '400 lê motivoStatus top-level',
);

$res400Body = $mapearEmissao->invoke(
    $adapterSefin,
    [
        'status' => 400,
        'json' => null,
        'body' => '{"falha":"schema DPS inválido no envelope"}',
    ],
    $idInf,
    '<DPS/>',
);
assertTrue(
    str_contains((string) ($res400Body['erros'][0]['mensagem'] ?? ''), 'schema DPS'),
    '400 usa body bruto quando JSON não tem erros',
);
assertTrue(
    !str_contains((string) ($res400Body['erros'][0]['mensagem'] ?? ''), 'sem detalhe'),
    '400 com body não usa fallback sem detalhe',
);

$res400Pascal = $mapearEmissao->invoke(
    $adapterSefin,
    [
        'status' => 400,
        'json' => [
            'Erros' => [
                ['Codigo' => 'E1235', 'Descricao' => 'Elemento inválido', 'Complemento' => 'finNFSe'],
                ['Codigo' => 'E014', 'Descricao' => 'Município não conveniado'],
            ],
        ],
        'body' => '',
    ],
    $idInf,
    '<DPS/>',
);
assertTrue(
    ($res400Pascal['erros'][0]['codigo'] ?? '') === 'E1235',
    '400 lê Erros/Codigo/Descricao em PascalCase',
);
assertTrue(
    str_contains((string) ($res400Pascal['erro'] ?? ''), '[E1235]')
    && str_contains((string) ($res400Pascal['erro'] ?? ''), '[E014]'),
    '400 concatena múltiplos erros com seus códigos em erro',
);

$res400ValidationProblem = $mapearEmissao->invoke(
    $adapterSefin,
    [
        'status' => 400,
        'json' => [
            'title' => 'One or more validation errors occurred.',
            'status' => 400,
            'errors' => [
                'dpsXmlGZipB64' => ['O campo dpsXmlGZipB64 é obrigatório.'],
            ],
        ],
        'body' => '',
    ],
    $idInf,
    '<DPS/>',
);
assertTrue(
    str_contains((string) ($res400ValidationProblem['erro'] ?? ''), 'dpsXmlGZipB64'),
    '400 extrai ValidationProblemDetails (errors por campo) em vez de apenas title',
);

$res404Emissao = $mapearEmissao->invoke(
    $adapterSefin,
    [
        'status' => 404,
        'url' => 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse',
        'json' => null,
        'body' => '',
    ],
    $idInf,
    '<DPS/>',
);
assertTrue(($res404Emissao['pendente'] ?? true) === false, '404 na emissão não fica pendente');
assertTrue(
    str_contains((string) ($res404Emissao['erro'] ?? ''), 'HTTP 404'),
    '404 na emissão informa HTTP 404 e URL chamada',
);

$clientWsdlLegado = SefinHttpClient::criarAPartirConfig(
    ['ambiente' => 2, 'urlwsdl' => 'https://nota-eletronica.betha.cloud/dps/ws/service.wsdl'],
    base64_encode('fake'),
    'x',
);
assertTrue(
    $clientWsdlLegado->obterBaseUrl() === SefinHttpClient::URL_HOMOLOGACAO,
    'urlwsdl legado da Betha/WSDL é ignorado na Sefin Nacional',
);

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

// --- Omissão de <IM> quando omitirImPrestador = true ---
[, $xmlSemIm] = $builder->montar(payloadNfseMinimo(), [
    'ambiente' => 2,
    'cnpj' => '12345678000195',
    'codigomunicipioibge' => '3550308',
    'omitirImPrestador' => true,
]);
assertTrue(!str_contains($xmlSemIm, '<IM>'), 'omitirImPrestador omite tag <IM> do prestador');

// --- Sanitização de quebras de linha em xDescServ ---
$payloadMultilinha = payloadNfseMinimo();
$payloadMultilinha['servico']['discriminacao'] = "Linha 1\r\nLinha 2\nLinha 3";
[, $xmlMultilinha] = $builder->montar($payloadMultilinha, [
    'ambiente' => 2,
    'cnpj' => '12345678000195',
    'codigomunicipioibge' => '3550308',
]);
assertTrue(
    str_contains($xmlMultilinha, '<xDescServ>Linha 1 Linha 2 Linha 3</xDescServ>'),
    'xDescServ sanitiza quebras de linha para espaço simples',
);

// --- SefinEndpointResolver ---
assertTrue(
    SefinEndpointResolver::resolveSefinBaseUrl(['ambiente' => 2, 'codigomunicipioibge' => '3511102'])
    === 'https://catanduva.prefeitura.rlz.com.br/nota/nacional',
    'SefinEndpointResolver resolve endpoint municipal específico (Catanduva homologação)',
);
assertTrue(
    SefinEndpointResolver::resolveAdnBaseUrl(['ambiente' => 1]) === 'https://adn.nfse.gov.br',
    'SefinEndpointResolver resolve ADN produção',
);
assertTrue(
    SefinEndpointResolver::resolveAdnBaseUrl(['ambiente' => 2]) === 'https://adn.producaorestrita.nfse.gov.br',
    'SefinEndpointResolver resolve ADN homologação',
);
assertTrue(
    count(SefinEndpointResolver::pinnedHosts()) >= 1,
    'SefinEndpointResolver retorna pinnedHosts para CURLOPT_RESOLVE',
);

// --- DpsNacionalValidator ---
$errosValidos = DpsNacionalValidator::validar(payloadNfseMinimo(), ['ambiente' => 2]);
assertTrue($errosValidos === [], 'DpsNacionalValidator aprova payload válido');

$payloadInvalido = payloadNfseMinimo();
$payloadInvalido['prestador']['municipioIbge'] = '123';
$payloadInvalido['servico']['valores']['servicos'] = 0;
$errosInvalidos = DpsNacionalValidator::validar($payloadInvalido, ['ambiente' => 2]);
assertTrue(count($errosInvalidos) >= 2, 'DpsNacionalValidator detecta cLocEmi inválido e valor <= 0');

// --- Detecção de rejeição de IM no CNC ---
$detectarImCnc = $ref->getMethod('respostaIndicaRejeicaoImCnc');
$detectarImCnc->setAccessible(true);
$ehErroIm = $detectarImCnc->invoke($adapterSefin, [
    'status' => 400,
    'json' => [
        'erros' => [
            [
                'codigo' => 'E0120',
                'descricao' => 'IM do prestador não deve ser informado, pois não existem informações complementares registradas no CNC NFS-e do município emissor informado na DPS.',
            ],
        ],
    ],
    'body' => '',
]);
assertTrue($ehErroIm === true, 'Detecta rejeição de IM não cadastrada no CNC para auto-fallback');

echo "\n";
if ($falhas > 0) {
    echo "RESULTADO: {$falhas} falha(s)\n";
    exit(1);
}

echo "RESULTADO: todos os testes passaram\n";
exit(0);
