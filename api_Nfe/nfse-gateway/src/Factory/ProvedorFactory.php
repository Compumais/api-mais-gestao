<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Factory;

use MaisGestao\NfseGateway\Adapters\AdapterAbrasfV202;
use MaisGestao\NfseGateway\Adapters\AdapterGinfes;
use MaisGestao\NfseGateway\Adapters\AdapterIpm;
use MaisGestao\NfseGateway\Adapters\AdapterIssNet;
use MaisGestao\NfseGateway\Contract\NfseProvedorAdapter;

final class ProvedorFactory
{
    public static function criar(string $provedor): NfseProvedorAdapter
    {
        return match (strtolower(trim($provedor))) {
            'ipm' => new AdapterIpm(),
            'issnet' => new AdapterIssNet(),
            'ginfes' => new AdapterGinfes(),
            default => new AdapterAbrasfV202(),
        };
    }
}
