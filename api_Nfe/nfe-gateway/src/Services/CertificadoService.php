<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Services;

use NFePHP\Common\Certificate;

final class CertificadoService
{
	public static function obterInfo(string $pfxBase64, string $senha): array
	{
		$pfxContent = base64_decode($pfxBase64, true);
		if ($pfxContent === false) {
			throw new \InvalidArgumentException('PFX base64 inválido');
		}

		$certificate = Certificate::readPfx($pfxContent, $senha);
		$publicKey = $certificate->publicKey;
		$cnpj = preg_replace('/\D/', '', (string) $certificate->getCnpj());

		return [
			'cnpj' => $cnpj,
			'validadeInicio' => $publicKey->validFrom->format('Y-m-d\TH:i:s\Z'),
			'validadeFim' => $publicKey->validTo->format('Y-m-d\TH:i:s\Z'),
			'serial' => (string) $publicKey->serialNumber,
		];
	}
}
