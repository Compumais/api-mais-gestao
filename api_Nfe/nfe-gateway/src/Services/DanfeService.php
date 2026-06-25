<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Services;

use NFePHP\DA\NFe\Danfce;
use NFePHP\DA\NFe\Danfe;

final class DanfeService
{
	public static function gerar(string $xml): array
	{
		$xml = trim($xml);
		if ($xml === '') {
			throw new \InvalidArgumentException('XML da NF-e é obrigatório');
		}

		$modelo = self::detectarModelo($xml);

		if ($modelo === 65) {
			$danfce = new Danfce($xml);
			$danfce->debugMode(false);
			$pdf = $danfce->render();
		} else {
			$danfe = new Danfe($xml);
			$danfe->debugMode(false);
			$danfe->exibirTextoFatura = false;
			$danfe->creditsIntegratorFooter('Mais Gestão ERP');
			$pdf = $danfe->render();
		}

		return [
			'pdfBase64' => base64_encode($pdf),
			'modelo' => $modelo,
		];
	}

	private static function detectarModelo(string $xml): int
	{
		if (preg_match('/<mod>(\d+)<\/mod>/', $xml, $matches)) {
			return (int) $matches[1];
		}

		return 55;
	}
}
