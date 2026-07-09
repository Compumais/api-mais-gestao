<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use MaisGestao\NfseGateway\Middleware\AuthMiddleware;
use MaisGestao\NfseGateway\Services\CertificadoService;
use MaisGestao\NfseGateway\Services\NfseCancelamentoService;
use MaisGestao\NfseGateway\Services\NfseConsultaService;
use MaisGestao\NfseGateway\Services\NfseEmissaoService;

header('Content-Type: application/json; charset=utf-8');

ini_set('display_errors', '0');
ini_set('html_errors', '0');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = rtrim((string) $uri, '/') ?: '/';

function jsonResponse(array $data, int $status = 200): void
{
    http_response_code($status);
    $json = json_encode(
        $data,
        JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR,
    );

    if ($json === false) {
        $json = json_encode([
            'sucesso' => false,
            'erro' => 'Falha ao serializar resposta do gateway NFS-e',
        ], JSON_UNESCAPED_UNICODE);
        http_response_code(500);
    }

    echo $json;
    exit;
}

function lerBodyJson(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '[]', true);
    return is_array($data) ? $data : [];
}

try {
    if ($method === 'GET' && $path === '/health') {
        jsonResponse(['sucesso' => true, 'status' => 'ok', 'servico' => 'nfse-gateway']);
    }

    AuthMiddleware::verificar();
    $body = lerBodyJson();

    if ($method === 'POST' && $path === '/certificado/info') {
        $pfxBase64 = (string) ($body['pfxBase64'] ?? '');
        $senha = (string) ($body['senha'] ?? '');
        $info = CertificadoService::obterInfo($pfxBase64, $senha);
        jsonResponse(['sucesso' => true, ...$info]);
    }

    if ($method === 'POST' && $path === '/nfse/emissao') {
        $configJson = is_array($body['configJson'] ?? null) ? $body['configJson'] : [];
        $pfxBase64 = (string) ($body['pfxBase64'] ?? '');
        $senha = (string) ($body['senha'] ?? '');
        $payloadNfse = is_array($body['payloadNfse'] ?? null) ? $body['payloadNfse'] : [];

        $resultado = NfseEmissaoService::emitir($configJson, $pfxBase64, $senha, $payloadNfse);

        jsonResponse([
            'sucesso' => (bool) ($resultado['sucesso'] ?? false),
            ...$resultado,
        ]);
    }

    if ($method === 'POST' && $path === '/nfse/cancelar') {
        $configJson = is_array($body['configJson'] ?? null) ? $body['configJson'] : [];
        $pfxBase64 = (string) ($body['pfxBase64'] ?? '');
        $senha = (string) ($body['senha'] ?? '');
        $dados = is_array($body['dados'] ?? null) ? $body['dados'] : [];

        $resultado = NfseCancelamentoService::cancelar($configJson, $pfxBase64, $senha, $dados);

        jsonResponse([
            'sucesso' => (bool) ($resultado['sucesso'] ?? false),
            ...$resultado,
        ]);
    }

    if ($method === 'POST' && $path === '/nfse/consultar-rps') {
        $configJson = is_array($body['configJson'] ?? null) ? $body['configJson'] : [];
        $pfxBase64 = (string) ($body['pfxBase64'] ?? '');
        $senha = (string) ($body['senha'] ?? '');
        $dados = is_array($body['dados'] ?? null) ? $body['dados'] : [];

        $resultado = NfseConsultaService::consultarPorRps($configJson, $pfxBase64, $senha, $dados);

        jsonResponse([
            'sucesso' => (bool) ($resultado['sucesso'] ?? false),
            ...$resultado,
        ]);
    }

    jsonResponse(['sucesso' => false, 'erro' => 'Rota não encontrada'], 404);
} catch (Throwable $e) {
    jsonResponse([
        'sucesso' => false,
        'erro' => $e->getMessage(),
    ], 500);
}
