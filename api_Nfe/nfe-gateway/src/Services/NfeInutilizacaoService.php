<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Services;

use NFePHP\NFe\Common\Standardize;

final class NfeInutilizacaoService
{
	/**
	 * @param array{serie:int|string,numeroInicial:int|string,numeroFinal?:int|string,justificativa:string} $dados
	 */
	public static function inutilizar(
		array $configJson,
		string $pfxBase64,
		string $senha,
		array $dados,
	): array {
		$serie = (int) ($dados['serie'] ?? 0);
		$numeroInicial = (int) ($dados['numeroInicial'] ?? 0);
		$numeroFinal = (int) ($dados['numeroFinal'] ?? $numeroInicial);
		$justificativa = trim((string) ($dados['justificativa'] ?? ''));

		if ($serie <= 0) {
			throw new \InvalidArgumentException('Série inválida para inutilização');
		}

		if ($numeroInicial <= 0 || $numeroFinal <= 0) {
			throw new \InvalidArgumentException('Número da NF-e inválido para inutilização');
		}

		if ($numeroFinal < $numeroInicial) {
			throw new \InvalidArgumentException(
				'Número final não pode ser menor que o número inicial',
			);
		}

		if (strlen($justificativa) < 15) {
			throw new \InvalidArgumentException(
				'A justificativa deve ter no mínimo 15 caracteres',
			);
		}

		$tools = SpedNfeFactory::criarTools($configJson, $pfxBase64, $senha);
		$response = $tools->sefazInutiliza($serie, $numeroInicial, $numeroFinal, $justificativa);

		$std = (new Standardize($response))->toStd();
		$cStat = (string) ($std->cStat ?? '');
		$xMotivo = (string) ($std->xMotivo ?? '');
		$sucesso = $cStat === '102';

		return [
			'sucesso' => $sucesso,
			'cStat' => $cStat,
			'xMotivo' => $xMotivo,
			'xmlRetorno' => $response,
			'protocolo' => (string) ($std->infInut->nProt ?? ''),
		];
	}
}
