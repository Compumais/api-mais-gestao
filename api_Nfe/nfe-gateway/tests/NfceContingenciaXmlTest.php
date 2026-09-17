<?php

declare(strict_types=1);

/**
 * Testes da validação de XML NFC-e pré-montado.
 * Executar: php tests/NfceContingenciaXmlTest.php
 */

require_once __DIR__ . '/../vendor/autoload.php';

use MaisGestao\NfeGateway\Services\NfeEmissaoService;

$falhas = 0;

function verificar(bool $condicao, string $mensagem): void
{
	global $falhas;
	if (!$condicao) {
		echo "FAIL: {$mensagem}\n";
		$falhas++;
		return;
	}
	echo "OK: {$mensagem}\n";
}

function deveFalhar(callable $executar, string $trecho, string $mensagem): void
{
	try {
		$executar();
		verificar(false, $mensagem);
	} catch (InvalidArgumentException $erro) {
		verificar(str_contains($erro->getMessage(), $trecho), $mensagem);
	}
}

$chave = '35260812345678000190650010000000049000000019';
$xml = <<<XML
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe{$chave}" versao="4.00">
    <ide><mod>65</mod><dhEmi>2026-08-17T15:00:00-03:00</dhEmi><tpEmis>9</tpEmis><tpAmb>2</tpAmb><dhCont>2026-08-17T15:00:00-03:00</dhCont></ide>
    <emit><CNPJ>12345678000190</CNPJ><enderEmit><xLgr>Rua Teste</xLgr></enderEmit></emit>
    <det nItem="1"><prod><NCM>12345678</NCM><CFOP>5102</CFOP></prod><imposto><ICMS /></imposto></det>
    <total><ICMSTot><vNF>10.00</vNF></ICMSTot></total>
    <transp><modFrete>9</modFrete></transp>
    <pag><detPag><tPag>01</tPag><vPag>10.00</vPag></detPag></pag>
  </infNFe>
</NFe>
XML;
$config = ['tpAmb' => 2, 'cnpj' => '12345678000190'];

$validado = NfeEmissaoService::validarXmlContingenciaPreMontado($config, $xml, $chave);
verificar($validado['chave'] === $chave, 'aceita chave, modelo, ambiente e emitente consistentes');
verificar(strlen($validado['hashInfNFe']) === 64, 'calcula hash canônico de infNFe');

deveFalhar(
	static fn () => NfeEmissaoService::validarXmlContingenciaPreMontado(
		$config,
		str_replace('<tpEmis>9</tpEmis>', '<tpEmis>1</tpEmis>', $xml),
		$chave,
	),
	'tpEmis=9',
	'rejeita reconstrução como emissão normal',
);

deveFalhar(
	static fn () => NfeEmissaoService::validarXmlContingenciaPreMontado(
		$config,
		preg_replace('/<det nItem="1">.*<\/det>/s', '', $xml) ?? '',
		$chave,
	),
	'revisão manual',
	'rejeita XML legado incompleto',
);

exit($falhas === 0 ? 0 : 1);
