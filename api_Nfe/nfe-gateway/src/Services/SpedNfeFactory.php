<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Services;

use NFePHP\Common\Certificate;
use NFePHP\NFe\Tools;

final class SpedNfeFactory
{
    public static function criarTools(array $configJson, string $pfxBase64, string $senha): Tools
    {
        $configString = json_encode($configJson, JSON_UNESCAPED_UNICODE);
        $pfxContent = base64_decode($pfxBase64, true);

        if ($pfxContent === false) {
            throw new \InvalidArgumentException('PFX base64 inválido');
        }

        $certificate = Certificate::readPfx($pfxContent, $senha);
        $tools = new Tools($configString, $certificate);
        $modelo = (int) ($configJson['modelo'] ?? 55);
        $tools->model($modelo);

        return $tools;
    }
}
