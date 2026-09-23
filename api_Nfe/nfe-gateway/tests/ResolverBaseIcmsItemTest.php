<?php

declare(strict_types=1);

/**
 * Testes de resolverBaseIcmsItem (rejeição 531).
 * Executar: php tests/ResolverBaseIcmsItemTest.php
 */

$autoload = __DIR__ . '/../vendor/autoload.php';
if (is_file($autoload)) {
	require_once $autoload;
}

use MaisGestao\NfeGateway\Services\NfeEmissaoService;

$falhas = 0;

function assertEq(float $esperado, float $obtido, string $mensagem): void
{
	global $falhas;
	if (abs($esperado - $obtido) > 0.001) {
		echo "FAIL: {$mensagem} (esperado={$esperado}, obtido={$obtido})\n";
		$falhas++;
		return;
	}
	echo "OK: {$mensagem}\n";
}

assertEq(
	90.0,
	NfeEmissaoService::resolverBaseIcmsItem(['baseIcms' => 0], 90.0),
	'baseIcms 0 usa líquido',
);

assertEq(
	90.0,
	NfeEmissaoService::resolverBaseIcmsItem([], 90.0),
	'sem baseIcms usa líquido',
);

assertEq(
	100.0,
	NfeEmissaoService::resolverBaseIcmsItem(['baseIcms' => 100], 90.0),
	'baseIcms explícita é respeitada',
);

assertEq(
	85.5,
	NfeEmissaoService::resolverBaseIcmsItem(['baseIcms' => 85.5], 90.0),
	'baseIcms parcial é respeitada',
);

$sum = 0.0;
foreach ([['baseIcms' => 33.333], ['baseIcms' => 33.333], ['baseIcms' => 33.334]] as $item) {
	$vBc = NfeEmissaoService::resolverBaseIcmsItem($item, 33.33);
	$sum = round($sum + $vBc, 2);
}
assertEq(100.0, $sum, 'soma de bases arredondadas por item = 100.00');

if ($falhas > 0) {
	echo "\n{$falhas} falha(s)\n";
	exit(1);
}

echo "\nTodos os testes passaram.\n";
exit(0);
