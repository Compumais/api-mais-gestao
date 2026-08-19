<?php

declare(strict_types=1);

/**
 * Testes unitários do grupo PIS/COFINS (sem PHPUnit).
 * Executar: php tests/MontarPisCofinsItemNfeTest.php
 */

$autoload = __DIR__ . '/../vendor/autoload.php';
if (is_file($autoload)) {
	require_once $autoload;
} else {
	require_once __DIR__ . '/../src/Fiscal/MontarPisCofinsItemNfe.php';
}

use MaisGestao\NfeGateway\Fiscal\MontarPisCofinsItemNfe;

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

assertTrue(MontarPisCofinsItemNfe::normalizarCst('1') === '01', 'CST 1 dígito vira 01');
assertTrue(MontarPisCofinsItemNfe::normalizarCst('1.00') === '01', 'CST numeric 1.00 vira 01, não 00');
assertTrue(MontarPisCofinsItemNfe::normalizarCst(7) === '07', 'CST int 7 vira 07');
assertTrue(MontarPisCofinsItemNfe::normalizarCst('') === null, 'CST vazio é nulo');
assertTrue(MontarPisCofinsItemNfe::resolverGrupo('00') === null, 'CST 00 não é PIS válido');

$pisAliq = MontarPisCofinsItemNfe::montarPis(1, [
	'cstPis' => '01',
	'aliquotaPis' => 1.65,
], 100.0, 1.0);
$xmlAliq = MontarPisCofinsItemNfe::serializarXmlPis($pisAliq);
assertTrue($pisAliq->CST === '01', 'CST 01 permanece 01');
assertTrue(str_contains($xmlAliq, '<PISAliq>'), 'CST 01 gera PISAliq');
assertTrue(!preg_match('/<PIS>\s*<\/PIS>/', $xmlAliq), 'CST 01 não gera PIS vazio');

$pisNt = MontarPisCofinsItemNfe::montarPis(1, ['cstPis' => '07'], 100.0, 1.0);
$xmlNt = MontarPisCofinsItemNfe::serializarXmlPis($pisNt);
assertTrue($xmlNt === '<PIS><PISNT><CST>07</CST></PISNT></PIS>', 'CST 07 gera PISNT só com CST');

$pisVazio = MontarPisCofinsItemNfe::montarPis(1, ['cstPis' => ''], 50.0, 2.0);
$xmlVazio = MontarPisCofinsItemNfe::serializarXmlPis($pisVazio);
assertTrue($pisVazio->CST === MontarPisCofinsItemNfe::CST_FALLBACK_NT, 'CST vazio usa fallback 07');
assertTrue(str_contains($xmlVazio, '<PISNT>'), 'fallback gera PISNT');
assertTrue(!preg_match('/<PIS>\s*<\/PIS>/', $xmlVazio), 'fallback não gera PIS vazio');

$cofinsVazio = MontarPisCofinsItemNfe::montarCofins(1, [], 50.0, 2.0);
$xmlCofins = MontarPisCofinsItemNfe::serializarXmlCofins($cofinsVazio);
assertTrue(str_contains($xmlCofins, '<COFINSNT>'), 'COFINS sem CST gera COFINSNT');
assertTrue(!preg_match('/<COFINS>\s*<\/COFINS>/', $xmlCofins), 'COFINS nunca fica vazio');

$casos = [null, '', '1', '1.00', '01', '03', '07', '49', '00', 99];
foreach ($casos as $cst) {
	$pis = MontarPisCofinsItemNfe::montarPis(1, ['cstPis' => $cst, 'aliquotaPis' => 1.65], 100.0, 2.0);
	$cofins = MontarPisCofinsItemNfe::montarCofins(1, ['cstCofins' => $cst, 'aliquotaCofins' => 7.6], 100.0, 2.0);
	$xmlPis = MontarPisCofinsItemNfe::serializarXmlPis($pis);
	$xmlCof = MontarPisCofinsItemNfe::serializarXmlCofins($cofins);
	assertTrue(
		(bool) preg_match('/<PIS><(PISAliq|PISQtde|PISNT|PISOutr)>/', $xmlPis),
		'PIS com CST ' . var_export($cst, true) . ' sempre tem filho',
	);
	assertTrue(
		(bool) preg_match('/<COFINS><(COFINSAliq|COFINSQtde|COFINSNT|COFINSOutr)>/', $xmlCof),
		'COFINS com CST ' . var_export($cst, true) . ' sempre tem filho',
	);
}

if ($falhas > 0) {
	echo "\n{$falhas} falha(s)\n";
	exit(1);
}

echo "\nTodos os testes passaram.\n";
exit(0);
