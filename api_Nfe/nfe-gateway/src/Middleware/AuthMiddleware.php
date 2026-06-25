<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Middleware;

final class AuthMiddleware
{
    public static function verificar(): void
    {
        $secret = getenv('NFE_GATEWAY_SECRET') ?: '';
        $header = $_SERVER['HTTP_X_NFE_GATEWAY_SECRET'] ?? '';

        if ($secret === '' || !hash_equals($secret, $header)) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['sucesso' => false, 'erro' => 'Não autorizado']);
            exit;
        }
    }
}
