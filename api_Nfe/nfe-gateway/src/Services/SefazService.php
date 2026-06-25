<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Services;

use NFePHP\NFe\Common\Standardize;

final class SefazService
{
    public static function consultarStatus(array $configJson, string $pfxBase64, string $senha): array
    {
        $tools = SpedNfeFactory::criarTools($configJson, $pfxBase64, $senha);
        $uf = (string) ($configJson['siglaUF'] ?? '');
        $xml = $tools->sefazStatus($uf);

        $std = new Standardize($xml);
        $arr = $std->toStd();

        return [
            'xml' => $xml,
            'cStat' => (string) ($arr->cStat ?? ''),
            'xMotivo' => (string) ($arr->xMotivo ?? ''),
        ];
    }
}
