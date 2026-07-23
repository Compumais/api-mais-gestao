<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Middleware;

final class AuthMiddleware
{
    public static function verificar(): void
    {
        $secret = self::obterSecret();
        $header = (string) (
            $_SERVER['HTTP_X_NFSE_GATEWAY_SECRET']
            ?? $_SERVER['REDIRECT_HTTP_X_NFSE_GATEWAY_SECRET']
            ?? ''
        );

        if ($secret === '' || $header === '' || !hash_equals($secret, $header)) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['sucesso' => false, 'erro' => 'Não autorizado']);
            exit;
        }
    }

    private static function obterSecret(): string
    {
        $candidatos = [
            getenv('NFSE_GATEWAY_SECRET'),
            $_ENV['NFSE_GATEWAY_SECRET'] ?? null,
            $_SERVER['NFSE_GATEWAY_SECRET'] ?? null,
        ];

        foreach ($candidatos as $valor) {
            if (is_string($valor) && $valor !== '') {
                return $valor;
            }
        }

        return '';
    }
}
