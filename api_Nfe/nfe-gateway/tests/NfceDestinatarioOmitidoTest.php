<?php

declare(strict_types=1);

/**
 * Testes da regra de destinatário NFC-e sem consumidor identificado.
 * Executar: php tests/NfceDestinatarioOmitidoTest.php
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

verificar(
	NfeEmissaoService::deveOmitirDestinatarioNfce(65, 1, null) === true,
	'NFC-e produção sem documento omite dest',
);

verificar(
	NfeEmissaoService::deveOmitirDestinatarioNfce(65, 1, '') === true,
	'NFC-e produção com documento vazio omite dest',
);

verificar(
	NfeEmissaoService::deveOmitirDestinatarioNfce(
		65,
		1,
		NfeEmissaoService::CNPJ_DESTINATARIO_HOMOLOGACAO,
	) === true,
	'NFC-e produção com CNPJ fictício omite dest',
);

verificar(
	NfeEmissaoService::deveOmitirDestinatarioNfce(65, 1, '12345678901') === false,
	'NFC-e produção com CPF real mantém dest',
);

verificar(
	NfeEmissaoService::deveOmitirDestinatarioNfce(65, 1, '12345678000190') === false,
	'NFC-e produção com CNPJ real mantém dest',
);

verificar(
	NfeEmissaoService::deveOmitirDestinatarioNfce(65, 2, null) === false,
	'NFC-e homologação mantém dest SEFAZ mesmo sem documento',
);

verificar(
	NfeEmissaoService::deveOmitirDestinatarioNfce(55, 1, null) === false,
	'NF-e não omite dest por esta regra',
);

verificar(
	NfeEmissaoService::documentoDestinatarioIdentificado('123.456.789-01') === true,
	'CPF formatado é considerado identificado',
);

verificar(
	NfeEmissaoService::documentoDestinatarioIdentificado(
		NfeEmissaoService::CNPJ_DESTINATARIO_HOMOLOGACAO,
	) === false,
	'CNPJ fictício não é considerado identificado',
);

exit($falhas === 0 ? 0 : 1);
