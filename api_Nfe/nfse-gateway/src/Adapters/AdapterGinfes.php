<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Adapters;

use MaisGestao\NfseGateway\Contract\NfseProvedorAdapter;

/**
 * Slot GINFES — implementação futura com overrides de namespace/WSDL.
 */
final class AdapterGinfes implements NfseProvedorAdapter
{
    private AdapterAbrasfV202 $base;

    public function __construct()
    {
        $this->base = new AdapterAbrasfV202();
    }

    public function enviarLoteSincrono(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $payloadNfse,
    ): array {
        $configJson['provedor'] = 'ginfes';
        $resultado = $this->base->enviarLoteSincrono($configJson, $pfxBase64, $senha, $payloadNfse);
        $resultado['provedor'] = 'ginfes';
        return $resultado;
    }

    public function cancelar(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $dados,
    ): array {
        $configJson['provedor'] = 'ginfes';
        $resultado = $this->base->cancelar($configJson, $pfxBase64, $senha, $dados);
        $resultado['provedor'] = 'ginfes';
        return $resultado;
    }

    public function consultarPorRps(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $dados,
    ): array {
        $configJson['provedor'] = 'ginfes';
        $resultado = $this->base->consultarPorRps($configJson, $pfxBase64, $senha, $dados);
        $resultado['provedor'] = 'ginfes';
        return $resultado;
    }
}
