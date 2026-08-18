<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Services;

use NFePHP\NFe\Common\Standardize;

final class NfeInutilizacaoService
{
	/**
	 * @param array{modelo?:int|string,serie:int|string,numeroInicial:int|string,numeroFinal?:int|string,justificativa:string,ano?:int|string} $dados
	 */
	public static function inutilizar(
		array $configJson,
		string $pfxBase64,
		string $senha,
		array $dados,
	): array {
		$modelo = (int) ($dados['modelo'] ?? $configJson['modelo'] ?? 55);
		$serie = (int) ($dados['serie'] ?? 0);
		$numeroInicial = (int) ($dados['numeroInicial'] ?? 0);
		$numeroFinal = (int) ($dados['numeroFinal'] ?? $numeroInicial);
		$justificativa = trim((string) ($dados['justificativa'] ?? ''));
		$ano = self::normalizarAnoInutilizacao($dados['ano'] ?? null);

		if ($modelo !== 55 && $modelo !== 65) {
			throw new \InvalidArgumentException(
				'Modelo inválido para inutilização. Use 55 (NF-e) ou 65 (NFC-e)',
			);
		}

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

		$configJson['modelo'] = $modelo;
		$tools = SpedNfeFactory::criarTools($configJson, $pfxBase64, $senha);
		$tools->model($modelo);
		$response = $tools->sefazInutiliza(
			$serie,
			$numeroInicial,
			$numeroFinal,
			$justificativa,
			null,
			$ano !== null ? (string) $ano : null,
		);

		$std = (new Standardize($response))->toStd();
		$inf = $std->infInut ?? $std;
		$cStat = (string) ($inf->cStat ?? $std->cStat ?? '');
		$xMotivo = (string) ($inf->xMotivo ?? $std->xMotivo ?? '');
		$sucesso = in_array($cStat, ['102', '563'], true);

		return [
			'sucesso' => $sucesso,
			'cStat' => $cStat,
			'xMotivo' => $xMotivo,
			'xmlRetorno' => $response,
			'protocolo' => (string) ($inf->nProt ?? ''),
		];
	}

	private static function normalizarAnoInutilizacao(mixed $ano): ?string
	{
		if ($ano === null || $ano === '') {
			return null;
		}
		$numero = (int) $ano;
		if ($numero >= 100) {
			$numero %= 100;
		}
		if ($numero < 0) {
			return null;
		}
		return str_pad((string) $numero, 2, '0', STR_PAD_LEFT);
	}
}
