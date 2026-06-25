<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Services;

use NFePHP\DA\NFe\Danfe;

final class DanfeService
{
	public static function gerar(string $xml): array
	{
		$xml = trim($xml);
		if ($xml === '') {
			throw new \InvalidArgumentException('XML da NF-e é obrigatório');
		}

		$danfe = new Danfe($xml);
		$danfe->debugMode(false);
		$danfe->exibirTextoFatura = false;
		$danfe->creditsIntegratorFooter('Mais Gestão ERP');

		$pdf = $danfe->render();

		return [
			'pdfBase64' => base64_encode($pdf),
		];
	}
}
