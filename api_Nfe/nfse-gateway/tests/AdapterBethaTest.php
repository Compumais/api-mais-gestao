<?php

declare(strict_types=1);

/**
 * Testes unitários simples do AdapterBetha (sem PHPUnit).
 * Executar: php tests/AdapterBethaTest.php
 */

require_once __DIR__ . '/../vendor/autoload.php';

use MaisGestao\NfseGateway\Adapters\AdapterBetha;
use MaisGestao\NfseGateway\Factory\ProvedorFactory;
use MaisGestao\NfseGateway\Services\AbstractAbrasfAdapter;

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

/**
 * @param list<mixed> $args
 */
function chamarProtegido(object $objeto, string $metodo, array $args = []): mixed
{
    $ref = new ReflectionMethod($objeto, $metodo);
    $ref->setAccessible(true);
    return $ref->invokeArgs($objeto, $args);
}

$adapter = new AdapterBetha();

$factory = ProvedorFactory::criar('betha');
assertTrue($factory instanceof AdapterBetha, 'ProvedorFactory cria AdapterBetha');

$emissao = 'https://e-gov.betha.com.br/e-nota-contribuinte-test-ws/recepcionarLoteRps?wsdl';
$consultaEsperada = 'https://e-gov.betha.com.br/e-nota-contribuinte-test-ws/consultarNfsePorRps?wsdl';
$gerarEsperado = 'https://e-gov.betha.com.br/e-nota-contribuinte-test-ws/gerarNfse?wsdl';

assertTrue(
    chamarProtegido($adapter, 'derivarUrlWsdlOperacao', [
        $emissao,
        AbstractAbrasfAdapter::OPERACAO_EMISSAO,
        [],
    ]) === $gerarEsperado,
    'Deriva WSDL GerarNfse por padrão (manual ABRASF 2.02)',
);

assertTrue(
    chamarProtegido($adapter, 'derivarUrlWsdlOperacao', [
        $emissao,
        AbstractAbrasfAdapter::OPERACAO_EMISSAO,
        ['usarlotesincrono' => true],
    ]) === 'https://e-gov.betha.com.br/e-nota-contribuinte-test-ws/RecepcionarLoteRpsSincrono?wsdl',
    'Com usarlotesincrono usa RecepcionarLoteRpsSincrono',
);

assertTrue(
    chamarProtegido($adapter, 'derivarUrlWsdlOperacao', [
        $emissao,
        AbstractAbrasfAdapter::OPERACAO_CONSULTA,
        ['ambiente' => 2],
    ]) === $consultaEsperada,
    'Deriva WSDL de consulta a partir da emissão',
);

assertTrue(
    chamarProtegido($adapter, 'derivarUrlWsdlOperacao', [
        $emissao,
        AbstractAbrasfAdapter::OPERACAO_CANCELAMENTO,
        ['ambiente' => 2],
    ]) === 'https://e-gov.betha.com.br/e-nota-contribuinte-test-ws/cancelarNfseV02?wsdl',
    'Deriva WSDL de cancelamento a partir da emissão',
);

$urlConsultaExplicita = 'https://exemplo.local/consultarNfsePorRps?wsdl';
$urlResolvida = chamarProtegido($adapter, 'obterUrlWsdlOperacao', [
    [
        'urlwsdl' => $emissao,
        'urlsWsdl' => ['consulta' => $urlConsultaExplicita],
    ],
    AbstractAbrasfAdapter::OPERACAO_CONSULTA,
]);
assertTrue($urlResolvida === $urlConsultaExplicita, 'Prioriza urlsWsdl.consulta');

$urlFallbackHomolog = chamarProtegido($adapter, 'obterUrlWsdlOperacao', [
    ['ambiente' => 2],
    AbstractAbrasfAdapter::OPERACAO_EMISSAO,
]);
assertTrue(
    $urlFallbackHomolog === 'https://e-gov.betha.com.br/e-nota-contribuinte-test-ws/gerarNfse?wsdl',
    'Fallback homologação usa GerarNfse e-gov (não DPS)',
);

$urlFallbackProd = chamarProtegido($adapter, 'obterUrlWsdlOperacao', [
    ['ambiente' => 1],
    AbstractAbrasfAdapter::OPERACAO_EMISSAO,
]);
assertTrue(
    $urlFallbackProd === 'https://e-gov.betha.com.br/e-nota-contribuinte-ws/gerarNfse?wsdl',
    'Fallback produção usa GerarNfse e-gov (não DPS forçado)',
);

$urlFallbackDps = chamarProtegido($adapter, 'obterUrlWsdlOperacao', [
    ['ambiente' => 1, 'versaolayout' => 'dps-1.01'],
    AbstractAbrasfAdapter::OPERACAO_EMISSAO,
]);
assertTrue(
    $urlFallbackDps === 'https://nota-eletronica.betha.cloud/dps/ws/service.wsdl',
    'Fallback DPS apenas quando versaolayout indica DPS',
);

/** @var list<string> $candidatos */
$candidatos = chamarProtegido($adapter, 'candidatosMetodoSoap', [
    AbstractAbrasfAdapter::OPERACAO_EMISSAO,
    [],
]);
assertTrue(
    in_array('GerarNfse', $candidatos, true),
    'Candidatos de emissão incluem GerarNfse',
);

$xmlConsulta = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<ConsultarNfseRpsResposta xmlns="http://www.betha.com.br/e-nota-contribuinte-ws">
  <CompNfse>
    <Nfse>
      <InfNfse>
        <Numero>12345</Numero>
        <CodigoVerificacao>ABCD1234</CodigoVerificacao>
        <IdentificacaoRps>
          <Numero>1</Numero>
          <Serie>1</Serie>
          <Tipo>1</Tipo>
        </IdentificacaoRps>
      </InfNfse>
    </Nfse>
  </CompNfse>
</ConsultarNfseRpsResposta>
XML;

/** @var array<string, mixed> $parse */
$parse = chamarProtegido($adapter, 'parseRespostaConsulta', [$xmlConsulta]);
assertTrue(($parse['sucesso'] ?? false) === true, 'parseRespostaConsulta marca sucesso');
assertTrue(($parse['numeroNfse'] ?? null) === '12345', 'parseRespostaConsulta extrai Numero da InfNfse');
assertTrue(
    ($parse['codigoVerificacao'] ?? null) === 'ABCD1234',
    'parseRespostaConsulta extrai CodigoVerificacao',
);

$xmlGerar = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<GerarNfseResposta xmlns="http://www.betha.com.br/e-nota-contribuinte-ws">
  <ListaMensagemRetorno>
    <MensagemRetorno>
      <Codigo>E160</Codigo>
      <Mensagem>Item Lista Servico invalido</Mensagem>
      <Correcao>Informe o item conforme LC 116</Correcao>
    </MensagemRetorno>
  </ListaMensagemRetorno>
</GerarNfseResposta>
XML;

/** @var array<string, mixed> $parseGerar */
$parseGerar = chamarProtegido($adapter, 'parseRespostaGerarNfseBetha', [$xmlGerar]);
assertTrue(($parseGerar['sucesso'] ?? true) === false, 'parseRespostaGerarNfseBetha marca rejeição');
assertTrue(
    ($parseGerar['erros'][0]['codigo'] ?? '') === 'E160',
    'parseRespostaGerarNfseBetha extrai codigo',
);

$payloadNfse = [
    'prestador' => [
        'cnpj' => '12345678000199',
        'im' => '12345',
        'municipioIbge' => '4205407',
        'optanteSimplesNacional' => '2',
        'incentivoFiscal' => '2',
    ],
    'tomador' => [
        'cnpjCpf' => '12345678901',
        'razaoSocial' => 'Tomador Teste',
        'endereco' => [
            'logradouro' => 'Rua A',
            'numero' => '100',
            'bairro' => 'Centro',
            'codigoMunicipioIbge' => '4205407',
            'uf' => 'SC',
            'cep' => '88000000',
        ],
    ],
    'rps' => [
        'numero' => '42',
        'serie' => '1',
        'tipo' => '1',
        'dataEmissao' => '2026-07-13',
        'competencia' => '2026-07-01',
    ],
    'servico' => [
        'itemListaServico' => '07.02',
        'discriminacao' => 'Servico de teste',
        'codigoMunicipioIncidencia' => '4205407',
        'exigibilidadeIss' => '1',
        'issRetido' => '2',
        'valores' => [
            'servicos' => 100.0,
            'deducoes' => 0,
            'pis' => 0,
            'cofins' => 0,
            'inss' => 0,
            'ir' => 0,
            'csll' => 0,
            'outrasRetencoes' => 0,
            'descontoIncondicionado' => 0,
            'descontoCondicionado' => 0,
        ],
    ],
];

$config = [
    'ambiente' => 2,
    'cnpj' => '12345678000199',
    'im' => '12345',
    'codigomunicipioibge' => '4205407',
];

/** @var array{0: string, 1: string} $declXml */
$declXml = chamarProtegido($adapter, 'montarXmlDeclaracaoBetha', [
    $payloadNfse,
    $config,
    'http://www.betha.com.br/e-nota-contribuinte-ws',
]);

assertTrue($declXml[0] === 'rps42', 'Id InfDeclaracaoPrestacaoServico = rps{numero}');
assertTrue(
    str_contains($declXml[1], 'InfDeclaracaoPrestacaoServico'),
    'Usa InfDeclaracaoPrestacaoServico (ExemplosXML)',
);
assertTrue(!str_contains($declXml[1], 'InfRps'), 'Não usa InfRps (layout 1.0)');
assertTrue(!str_contains($declXml[1], 'NaturezaOperacao'), 'Não inclui NaturezaOperacao');
assertTrue(!str_contains($declXml[1], 'BaseCalculo'), 'Não inclui BaseCalculo');
assertTrue(str_contains($declXml[1], '<ExigibilidadeISS>1</ExigibilidadeISS>'), 'ExigibilidadeISS presente');
assertTrue(str_contains($declXml[1], '<MunicipioIncidencia>4205407</MunicipioIncidencia>'), 'MunicipioIncidencia presente');
assertTrue(str_contains($declXml[1], '<IncentivoFiscal>2</IncentivoFiscal>'), 'IncentivoFiscal presente');
assertTrue(str_contains($declXml[1], '<Competencia>2026-07-01</Competencia>'), 'Competencia presente');
assertTrue(str_contains($declXml[1], '<DataEmissao>2026-07-13</DataEmissao>'), 'DataEmissao só data');
assertTrue(str_contains($declXml[1], '<CpfCnpj>'), 'Prestador/Tomador usam CpfCnpj');
assertTrue(
    str_contains($declXml[1], '<ItemListaServico>0702</ItemListaServico>'),
    'ItemListaServico normalizado sem ponto (ExemplosXML 0702)',
);

// IssRetido deve estar fora de Valores
$posValoresFecha = strpos($declXml[1], '</Valores>');
$posIssRetido = strpos($declXml[1], '<IssRetido>');
assertTrue(
    $posValoresFecha !== false && $posIssRetido !== false && $posIssRetido > $posValoresFecha,
    'IssRetido fora de Valores (ABRASF 2.02)',
);

$payloadRetido = $payloadNfse;
$payloadRetido['servico']['issRetido'] = '1';
/** @var array{0: string, 1: string} $declRetido */
$declRetido = chamarProtegido($adapter, 'montarXmlDeclaracaoBetha', [
    $payloadRetido,
    $config,
    'http://www.betha.com.br/e-nota-contribuinte-ws',
]);
assertTrue(
    str_contains($declRetido[1], '<ResponsavelRetencao>1</ResponsavelRetencao>'),
    'Com IssRetido=1 inclui ResponsavelRetencao (manual ABRASF 2.02)',
);

$cabecalho = chamarProtegido($adapter, 'montarCabecalhoBetha', []);
assertTrue(
    str_contains((string) $cabecalho, 'versaoDados>2.02'),
    'Cabeçalho SOAP com versaoDados 2.02',
);
assertTrue(
    str_contains((string) $cabecalho, 'http://www.betha.com.br/e-nota-contribuinte-ws'),
    'Cabeçalho usa xmlns Betha ExemplosXML',
);

assertTrue(
    chamarProtegido($adapter, 'obterNamespaceBetha', []) === 'http://www.betha.com.br/e-nota-contribuinte-ws',
    'Namespace Betha fixo (ExemplosXML)',
);

assertTrue(
    chamarProtegido($adapter, 'deveUsarGerarNfse', [[], $emissao]) === true,
    'deveUsarGerarNfse true por padrão',
);
assertTrue(
    chamarProtegido($adapter, 'deveUsarGerarNfse', [['usarlotesincrono' => true], $emissao]) === false,
    'deveUsarGerarNfse false com lote sincrono',
);

$dpsWsdl = 'https://nota-eletronica.betha.cloud/dps/ws/service.wsdl';
$soapVar = new SoapVar('<xml/>', XSD_ANYXML);
/** @var list<mixed> $argsDps */
$argsDps = chamarProtegido($adapter, 'montarArgumentosSoapCall', [
    AbstractAbrasfAdapter::OPERACAO_EMISSAO,
    'RecepcionarDps',
    [],
    $dpsWsdl,
    $soapVar,
]);
assertTrue(count($argsDps) === 1, 'DPS usa argumento SOAP único');

$payloadDps = $payloadNfse;
$payloadDps['prestador']['municipioIbge'] = '3156908';
$payloadDps['prestador']['opSimpNac'] = '1'; // não optante — permite IBSCBS
$payloadDps['servico']['codigoMunicipioIncidencia'] = '3156908';
$payloadDps['servico']['codigoTributacaoNacional'] = '010101';
$payloadDps['servico']['codigoNbs'] = '115021000';
$payloadDps['servico']['valores']['aliquota'] = 0;
$payloadDps['servico']['ibsCbs'] = [
    'finNFSe' => 0,
    'cIndOp' => '100301',
    'indDest' => 0,
    'cst' => '000',
    'cClassTrib' => '000001',
];
/** @var string $xmlDps */
$xmlDps = chamarProtegido($adapter, 'montarXmlDps', [
    $payloadDps,
    ['ambiente' => 2, 'codigomunicipioibge' => '3156908'],
]);
assertTrue(str_contains($xmlDps, '<cTribNac>010101</cTribNac>'), 'DPS inclui cTribNac');
assertTrue(str_contains($xmlDps, '<cNBS>115021000</cNBS>'), 'DPS inclui cNBS');
assertTrue(str_contains($xmlDps, '<IBSCBS>'), 'DPS inclui grupo IBSCBS mínimo');
assertTrue(str_contains($xmlDps, '<cIndOp>100301</cIndOp>'), 'DPS IBSCBS com cIndOp');
assertTrue(str_contains($xmlDps, '<indFinal>0</indFinal>'), 'DPS IBSCBS com indFinal');
assertTrue(str_contains($xmlDps, '<CST>000</CST>'), 'DPS IBSCBS com CST');
assertTrue(str_contains($xmlDps, '<pAliq>0.00</pAliq>'), 'DPS sempre envia pAliq com tribISSQN=1');
assertTrue(str_contains($xmlDps, '<indTotTrib>0</indTotTrib>'), 'DPS inclui totTrib/indTotTrib');
assertTrue(str_contains($xmlDps, '<cLocEmi>3156908</cLocEmi>'), 'DPS cLocEmi Sacramento/MG');
assertTrue(
    (bool) preg_match('/id="DPS315690821234567800019900001000000000000042"/', $xmlDps),
    'DPS id com 45 chars (tpInsc=2 + CNPJ 14)',
);
assertTrue(strlen('DPS315690821234567800019900001000000000000042') === 45, 'id DPS esperado tem 45 caracteres');
assertTrue(str_contains($xmlDps, '<serie>00001</serie>'), 'DPS série com 5 dígitos');
assertTrue(
    (bool) preg_match('/<dhEmi>[^<]*[+-]\d{2}:\d{2}<\/dhEmi>/', $xmlDps),
    'DPS dhEmi com fuso horário',
);
assertTrue(!str_contains($xmlDps, '<regApTribSN>'), 'DPS sem regApTribSN quando não ME/EPP');

$payloadDpsSn = $payloadDps;
$payloadDpsSn['prestador']['opSimpNac'] = '3';
$payloadDpsSn['prestador']['telefone'] = '34999998888';
$payloadDpsSn['prestador']['email'] = 'prestador@teste.com.br';
$payloadDpsSn['tomador']['telefone'] = '3433334444';
$payloadDpsSn['tomador']['email'] = 'tomador@teste.com.br';
/** @var string $xmlDpsSn */
$xmlDpsSn = chamarProtegido($adapter, 'montarXmlDps', [
    $payloadDpsSn,
    ['ambiente' => 2, 'codigomunicipioibge' => '3156908'],
]);
assertTrue(str_contains($xmlDpsSn, '<opSimpNac>3</opSimpNac>'), 'DPS opSimpNac=3 para ME/EPP');
assertTrue(str_contains($xmlDpsSn, '<regApTribSN>1</regApTribSN>'), 'DPS com regApTribSN quando ME/EPP');
assertTrue(!str_contains($xmlDpsSn, '<IBSCBS>'), 'DPS Simples omite IBSCBS (evita E082)');
assertTrue(str_contains($xmlDpsSn, '<fone>34999998888</fone>'), 'DPS inclui fone do prestador');
assertTrue(str_contains($xmlDpsSn, '<email>prestador@teste.com.br</email>'), 'DPS inclui email do prestador');
assertTrue(str_contains($xmlDpsSn, '<email>tomador@teste.com.br</email>'), 'DPS inclui email do tomador');

$payloadDpsSemIbs = $payloadDps;
unset($payloadDpsSemIbs['servico']['ibsCbs']);
/** @var string $xmlDpsSemIbs */
$xmlDpsSemIbs = chamarProtegido($adapter, 'montarXmlDps', [
    $payloadDpsSemIbs,
    ['ambiente' => 2, 'codigomunicipioibge' => '3156908'],
]);
assertTrue(!str_contains($xmlDpsSemIbs, '<IBSCBS>'), 'DPS sem cIndOp omite IBSCBS');

$xmlCancel = chamarProtegido($adapter, 'montarXmlEventoCancelamentoDps', [
    ['ambiente' => 2, 'cnpj' => '62240594000165'],
    [
        'chaveAcesso' => str_repeat('1', 50),
        'motivo' => 'Erro nos dados do servico prestado',
        'prestador' => ['cnpj' => '62240594000165'],
    ],
]);
assertTrue(
    str_contains((string) $xmlCancel, 'RecepcionarEventoCancelamentoEnvio'),
    'XML cancelamento DPS com envelope correto',
);
assertTrue(str_contains((string) $xmlCancel, '<e101101>'), 'XML cancelamento com e101101');

$xmlSubst = chamarProtegido($adapter, 'montarXmlEventoSubstituicaoDps', [
    ['ambiente' => 2, 'cnpj' => '62240594000165'],
    [
        'chaveAcesso' => str_repeat('1', 50),
        'chaveSubstituta' => str_repeat('2', 50),
        'motivo' => 'Erro na emissao da nota original',
        'prestador' => ['cnpj' => '62240594000165'],
    ],
]);
assertTrue(
    str_contains((string) $xmlSubst, 'RecepcionarEventoSubstituicaoEnvio'),
    'XML substituição DPS com envelope correto',
);
assertTrue(str_contains((string) $xmlSubst, '<e105102>'), 'XML substituição com e105102');
assertTrue(str_contains((string) $xmlSubst, '<chSubstituta>'), 'XML substituição com chSubstituta');

assertTrue(
    chamarProtegido($adapter, 'normalizarEndpointSoapDps', [
        'http://nota-eletronica.betha.cloud:80/dps/ws/service.wsdl',
    ]) === 'https://nota-eletronica.betha.cloud/dps/ws',
    'Endpoint DPS normaliza HTTP:80 + service.wsdl para HTTPS sem porta',
);

assertTrue(
    chamarProtegido($adapter, 'normalizarEndpointSoapDps', [
        'https://nota-eletronica.betha.cloud/dps/ws/service.wsdl',
    ]) === 'https://nota-eletronica.betha.cloud/dps/ws',
    'Endpoint DPS remove sufixo service.wsdl',
);

$xmlComDecl = '<?xml version="1.0" encoding="UTF-8"?><RecepcionarDpsEnvio xmlns="http://www.betha.com.br/e-nota-dps"><DPS/></RecepcionarDpsEnvio>';
assertTrue(
    chamarProtegido($adapter, 'removerDeclaracaoXml', [$xmlComDecl])
        === '<RecepcionarDpsEnvio xmlns="http://www.betha.com.br/e-nota-dps"><DPS/></RecepcionarDpsEnvio>',
    'removerDeclaracaoXml remove declaração antes do Body SOAP',
);

$xmlSigFora = '<?xml version="1.0" encoding="UTF-8"?>'
    . '<RecepcionarDpsEnvio xmlns="http://www.betha.com.br/e-nota-dps">'
    . '<DPS versao="1.01"><infDPS id="DPS1"><tpAmb>2</tpAmb></infDPS></DPS>'
    . '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo/></Signature>'
    . '</RecepcionarDpsEnvio>';
/** @var string $xmlSigDentro */
$xmlSigDentro = chamarProtegido($adapter, 'reposicionarSignatureNoPai', [$xmlSigFora, 'DPS']);
assertTrue(
    str_contains($xmlSigDentro, '</infDPS><Signature')
        && str_contains($xmlSigDentro, '</Signature></DPS>'),
    'reposicionarSignatureNoPai move Signature para dentro de DPS',
);
assertTrue(
    !str_contains($xmlSigDentro, '</DPS><Signature'),
    'reposicionarSignatureNoPai não deixa Signature irmã de DPS',
);

if ($falhas > 0) {
    echo "\n{$falhas} falha(s)\n";
    exit(1);
}

echo "\nTodos os testes passaram.\n";
exit(0);
