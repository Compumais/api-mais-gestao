<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Services;

use MaisGestao\NfseGateway\Factory\ProvedorFactory;

final class NfseConsultaService
{
    /**
     * @param array<string, mixed> $configJson
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    public static function consultarPorRps(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $dados,
    ): array {
        $provedor = (string) ($configJson['provedor'] ?? 'abrasf');
        $adapter = ProvedorFactory::criar($provedor);

        return $adapter->consultarPorRps($configJson, $pfxBase64, $senha, $dados);
    }
}
