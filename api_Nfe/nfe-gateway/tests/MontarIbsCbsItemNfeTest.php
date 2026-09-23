<?php

declare(strict_types=1);

/**
 * Testes unitários do grupo IBSCBS (sem PHPUnit).
 * Executar: php tests/MontarIbsCbsItemNfeTest.php
 */

$autoload = __DIR__ . '/../vendor/autoload.php';
if (is_file($autoload)) {
	require_once $autoload;
} else {
	require_once __DIR__ . '/../src/Fiscal/MontarIbsCbsItemNfe.php';
}

use MaisGestao\NfeGateway\Fiscal\MontarIbsCbsItemNfe;

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

assertTrue(MontarIbsCbsItemNfe::normalizarCst('0') === '000', 'CST 0 vira 000');
assertTrue(MontarIbsCbsItemNfe::normalizarCst('000') === '000', 'CST 000 permanece');
assertTrue(MontarIbsCbsItemNfe::normalizarClassTrib('1') === '000001', 'cClassTrib 1 vira 000001');
assertTrue(MontarIbsCbsItemNfe::normalizarClassTrib('000001') === '000001', 'cClassTrib 000001 permanece');

$xmlBase = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe35260100000000000000550010000000011000000010" versao="4.00">
    <det nItem="1">
      <prod>
        <cProd>1</cProd>
        <xProd>PRODUTO TESTE</xProd>
        <vProd>100.00</vProd>
      </prod>
      <imposto>
        <ICMS><ICMS00><CST>00</CST></ICMS00></ICMS>
        <PIS><PISNT><CST>07</CST></PISNT></PIS>
        <COFINS><COFINSNT><CST>07</CST></COFINSNT></COFINS>
      </imposto>
    </det>
    <total>
      <ICMSTot>
        <vProd>100.00</vProd>
        <vNF>100.00</vNF>
      </ICMSTot>
    </total>
  </infNFe>
</NFe>
XML;

$itensLp = [[
	'quantidade' => 1,
	'valorUnitario' => 100,
	'desconto' => 0,
	'ibsCbs' => [
		'cst' => '000',
		'cClassTrib' => '000001',
		'aliquotaIbs' => 0.1,
		'aliquotaCbs' => 0.9,
	],
]];

$xmlLp = MontarIbsCbsItemNfe::injetarNoXml($xmlBase, ['crt' => 3], $itensLp);
assertTrue(str_contains($xmlLp, '<IBSCBS>'), 'LP inclui grupo IBSCBS');
assertTrue(str_contains($xmlLp, '<CST>000</CST>'), 'LP com CST 000');
assertTrue(str_contains($xmlLp, '<cClassTrib>000001</cClassTrib>'), 'LP com cClassTrib');
assertTrue(str_contains($xmlLp, '<gIBSCBS>'), 'LP com gIBSCBS');
assertTrue(str_contains($xmlLp, '<pIBSUF>0.1000</pIBSUF>'), 'LP com pIBSUF');
assertTrue(str_contains($xmlLp, '<pCBS>0.9000</pCBS>'), 'LP com pCBS');
assertTrue(str_contains($xmlLp, '<IBSCBSTot>'), 'LP inclui totais IBSCBS');

$xmlSn = MontarIbsCbsItemNfe::injetarNoXml($xmlBase, ['crt' => 1], $itensLp);
assertTrue(!str_contains($xmlSn, '<IBSCBS>'), 'SN omite IBSCBS mesmo com dados no item');

$xmlMei = MontarIbsCbsItemNfe::injetarNoXml($xmlBase, ['crt' => 4], $itensLp);
assertTrue(!str_contains($xmlMei, '<IBSCBS>'), 'MEI (CRT 4) omite IBSCBS');

$itensCst410 = [[
	'quantidade' => 1,
	'valorUnitario' => 50,
	'ibsCbs' => [
		'cst' => '410',
		'cClassTrib' => '410001',
	],
]];
$xml410 = MontarIbsCbsItemNfe::injetarNoXml($xmlBase, ['crt' => 3], $itensCst410);
assertTrue(str_contains($xml410, '<CST>410</CST>'), 'CST 410 no XML');
assertTrue(!str_contains($xml410, '<gIBSCBS>'), 'CST 410 sem gIBSCBS');

if ($falhas > 0) {
	echo "\n{$falhas} falha(s)\n";
	exit(1);
}

echo "\nTodos os testes OK\n";
exit(0);
