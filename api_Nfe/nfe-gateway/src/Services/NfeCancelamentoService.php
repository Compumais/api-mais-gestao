<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Services;

use NFePHP\NFe\Common\Standardize;
use NFePHP\NFe\Complements;

final class NfeCancelamentoService
{
	/**
	 * @param array{chave:string,protocolo:string,justificativa:string} $dados
	 */
	public static function cancelar(
		array $configJson,
		string $pfxBase64,
		string $senha,
		array $dados,
	): array {
		$chave = preg_replace('/\D/', '', (string) ($dados['chave'] ?? ''));
		$protocolo = preg_replace('/\D/', '', (string) ($dados['protocolo'] ?? ''));
		$justificativa = trim((string) ($dados['justificativa'] ?? ''));

		if (strlen($chave) !== 44) {
			throw new \InvalidArgumentException('Chave NF-e inválida para cancelamento');
		}

		if ($protocolo === '') {
			throw new \InvalidArgumentException('Protocolo de autorização é obrigatório');
		}

		if (strlen($justificativa) < 15) {
			throw new \InvalidArgumentException(
				'A justificativa deve ter no mínimo 15 caracteres',
			);
		}

		$tools = SpedNfeFactory::criarTools($configJson, $pfxBase64, $senha);
		$response = $tools->sefazCancela($chave, $justificativa, $protocolo);

		$std = (new Standardize($response))->toStd();
		$cStatLote = (string) ($std->cStat ?? '');
		$cStatEvento = (string) ($std->retEvento->infEvento->cStat ?? '');
		$xMotivo = (string) ($std->retEvento->infEvento->xMotivo ?? $std->xMotivo ?? '');

		$xmlProtocolado = null;
		$sucesso = $cStatLote === '128'
			&& in_array($cStatEvento, ['101', '135', '155'], true);

		if ($sucesso) {
			$xmlProtocolado = Complements::toAuthorize($tools->lastRequest, $response);
		}

		return [
			'sucesso' => $sucesso,
			'cStat' => $cStatEvento !== '' ? $cStatEvento : $cStatLote,
			'cStatLote' => $cStatLote,
			'xMotivo' => $xMotivo,
			'xmlRetorno' => $response,
			'xmlProtocolado' => $xmlProtocolado,
			'protocolo' => (string) ($std->retEvento->infEvento->nProt ?? ''),
		];
	}
}
