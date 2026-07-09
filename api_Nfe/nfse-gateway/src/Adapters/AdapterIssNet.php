<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Adapters;

use MaisGestao\NfseGateway\Contract\NfseProvedorAdapter;

/**
 * Slot ISSNet — implementação futura com overrides de namespace/WSDL.
 * Mantém contrato idêntico ao adapter ABRASF base.
 */
final class AdapterIssNet implements NfseProvedorAdapter
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
        $configJson['provedor'] = 'issnet';
        $resultado = $this->base->enviarLoteSincrono($configJson, $pfxBase64, $senha, $payloadNfse);
        $resultado['provedor'] = 'issnet';
        return $resultado;
    }

    public function cancelar(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $dados,
    ): array {
        $configJson['provedor'] = 'issnet';
        $resultado = $this->base->cancelar($configJson, $pfxBase64, $senha, $dados);
        $resultado['provedor'] = 'issnet';
        return $resultado;
    }

    public function consultarPorRps(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $dados,
    ): array {
        $configJson['provedor'] = 'issnet';
        $resultado = $this->base->consultarPorRps($configJson, $pfxBase64, $senha, $dados);
        $resultado['provedor'] = 'issnet';
        return $resultado;
    }
}
