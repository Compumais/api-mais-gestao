<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Fiscal;

final class MontarRastroItemNfe
{
	/**
	 * @param array<int, mixed> $rastros
	 * @return list<object{
	 *   item: int,
	 *   nLote: string,
	 *   qLote: string,
	 *   dFab: string,
	 *   dVal: string,
	 *   cAgreg?: string
	 * }>
	 */
	public static function montar(int $item, array $rastros, ?string $dataEmissao = null): array
	{
		$resultado = [];
		$dataPadrao = self::normalizarData($dataEmissao) ?? date('Y-m-d');

		foreach ($rastros as $rastro) {
			if (!is_array($rastro)) {
				continue;
			}

			$nLote = trim((string) ($rastro['nLote'] ?? ''));
			if ($nLote === '') {
				continue;
			}

			$qLote = (float) ($rastro['qLote'] ?? 0);
			if ($qLote <= 0) {
				continue;
			}

			$dFab = self::normalizarData($rastro['dFab'] ?? null) ?? $dataPadrao;
			$dVal = self::normalizarData($rastro['dVal'] ?? null) ?? $dFab;

			$std = (object) [
				'item' => $item,
				'nLote' => substr($nLote, 0, 20),
				'qLote' => number_format($qLote, 3, '.', ''),
				'dFab' => $dFab,
				'dVal' => $dVal,
			];

			$cAgreg = trim((string) ($rastro['cAgreg'] ?? ''));
			if ($cAgreg !== '') {
				$std->cAgreg = substr($cAgreg, 0, 20);
			}

			$resultado[] = $std;
		}

		return $resultado;
	}

	public static function serializarXml(object $rastro): string
	{
		$xml = '<rastro>';
		$xml .= '<nLote>' . htmlspecialchars((string) $rastro->nLote, ENT_XML1) . '</nLote>';
		$xml .= '<qLote>' . htmlspecialchars((string) $rastro->qLote, ENT_XML1) . '</qLote>';
		$xml .= '<dFab>' . htmlspecialchars((string) $rastro->dFab, ENT_XML1) . '</dFab>';
		$xml .= '<dVal>' . htmlspecialchars((string) $rastro->dVal, ENT_XML1) . '</dVal>';
		if (!empty($rastro->cAgreg)) {
			$xml .= '<cAgreg>' . htmlspecialchars((string) $rastro->cAgreg, ENT_XML1) . '</cAgreg>';
		}
		$xml .= '</rastro>';

		return $xml;
	}

	private static function normalizarData(mixed $valor): ?string
	{
		if ($valor === null) {
			return null;
		}

		$texto = trim((string) $valor);
		if ($texto === '') {
			return null;
		}

		if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $texto, $match) === 1) {
			return $match[1];
		}

		return null;
	}
}
