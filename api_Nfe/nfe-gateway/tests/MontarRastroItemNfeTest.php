<?php

declare(strict_types=1);

/**
 * Testes unitários do grupo rastro (sem PHPUnit).
 * Executar: php tests/MontarRastroItemNfeTest.php
 */

$autoload = __DIR__ . '/../vendor/autoload.php';
if (is_file($autoload)) {
	require_once $autoload;
} else {
	require_once __DIR__ . '/../src/Fiscal/MontarRastroItemNfe.php';
}

use MaisGestao\NfeGateway\Fiscal\MontarRastroItemNfe;

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

$rastros = MontarRastroItemNfe::montar(1, [
	[
		'nLote' => 'ABC123',
		'qLote' => 2.5,
		'dFab' => '2026-01-10',
		'dVal' => '2026-12-31',
		'cAgreg' => 'X1',
	],
], '2026-08-20');

assertTrue(count($rastros) === 1, 'monta um rastro válido');
assertTrue($rastros[0]->nLote === 'ABC123', 'nLote preservado');
assertTrue($rastros[0]->qLote === '2.500', 'qLote com 3 decimais');
assertTrue($rastros[0]->dFab === '2026-01-10', 'dFab informado');
assertTrue($rastros[0]->dVal === '2026-12-31', 'dVal informado');
assertTrue($rastros[0]->cAgreg === 'X1', 'cAgreg informado');

$xml = MontarRastroItemNfe::serializarXml($rastros[0]);
assertTrue(str_contains($xml, '<rastro><nLote>ABC123</nLote>'), 'XML contém nLote');
assertTrue(str_contains($xml, '<qLote>2.500</qLote>'), 'XML contém qLote');

$semDatas = MontarRastroItemNfe::montar(2, [
	['nLote' => 'SEMDATA', 'qLote' => 1],
], '2026-08-20');
assertTrue($semDatas[0]->dFab === '2026-08-20', 'dFab cai na data de emissão');
assertTrue($semDatas[0]->dVal === '2026-08-20', 'dVal cai na data de emissão');

$vazio = MontarRastroItemNfe::montar(3, [], '2026-08-20');
assertTrue($vazio === [], 'array vazio não gera rastro');

$semNumero = MontarRastroItemNfe::montar(4, [['nLote' => '', 'qLote' => 1]], '2026-08-20');
assertTrue($semNumero === [], 'rastro sem nLote é ignorado');

if ($falhas > 0) {
	echo "\n{$falhas} falha(s)\n";
	exit(1);
}

echo "\nTodos os testes de rastro passaram.\n";
