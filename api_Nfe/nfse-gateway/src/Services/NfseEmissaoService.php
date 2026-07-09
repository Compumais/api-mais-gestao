<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Services;

use MaisGestao\NfseGateway\Factory\ProvedorFactory;

final class NfseEmissaoService
{
    /**
     * @param array<string, mixed> $configJson
     * @param array<string, mixed> $payloadNfse
     * @return array<string, mixed>
     */
    public static function emitir(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $payloadNfse,
    ): array {
        $provedor = (string) ($configJson['provedor'] ?? 'abrasf');
        $adapter = ProvedorFactory::criar($provedor);

        return $adapter->enviarLoteSincrono($configJson, $pfxBase64, $senha, $payloadNfse);
    }
}
