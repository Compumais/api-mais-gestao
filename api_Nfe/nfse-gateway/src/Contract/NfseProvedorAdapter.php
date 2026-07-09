<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Contract;

interface NfseProvedorAdapter
{
    /**
     * @param array<string, mixed> $configJson
     * @param array<string, mixed> $payloadNfse
     * @return array<string, mixed>
     */
    public function enviarLoteSincrono(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $payloadNfse,
    ): array;

    /**
     * @param array<string, mixed> $configJson
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    public function cancelar(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $dados,
    ): array;

    /**
     * @param array<string, mixed> $configJson
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    public function consultarPorRps(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $dados,
    ): array;
}
