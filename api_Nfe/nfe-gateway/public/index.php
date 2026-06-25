<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use MaisGestao\NfeGateway\Middleware\AuthMiddleware;
use MaisGestao\NfeGateway\Services\CertificadoService;
use MaisGestao\NfeGateway\Services\DanfeService;
use MaisGestao\NfeGateway\Services\HomologacaoNfeService;
use MaisGestao\NfeGateway\Services\NfeCancelamentoService;
use MaisGestao\NfeGateway\Services\NfeEmissaoService;
use MaisGestao\NfeGateway\Services\NfeInutilizacaoService;
use MaisGestao\NfeGateway\Services\SefazService;

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = rtrim((string) $uri, '/') ?: '/';

function jsonResponse(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
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
        jsonResponse(['sucesso' => true, 'status' => 'ok']);
    }

    AuthMiddleware::verificar();
    $body = lerBodyJson();

    if ($method === 'POST' && $path === '/certificado/info') {
        $pfxBase64 = (string) ($body['pfxBase64'] ?? '');
        $senha = (string) ($body['senha'] ?? '');
        $info = CertificadoService::obterInfo($pfxBase64, $senha);
        jsonResponse(['sucesso' => true, ...$info]);
    }

    if ($method === 'POST' && $path === '/sefaz/status') {
        $configJson = $body['configJson'] ?? [];
        $pfxBase64 = (string) ($body['pfxBase64'] ?? '');
        $senha = (string) ($body['senha'] ?? '');

        $resultado = SefazService::consultarStatus($configJson, $pfxBase64, $senha);
        jsonResponse([
            'sucesso' => true,
            'xml' => $resultado['xml'],
            'cStat' => $resultado['cStat'],
            'xMotivo' => $resultado['xMotivo'],
        ]);
    }

    if ($method === 'POST' && $path === '/nfe/homologacao/emitir') {
        $configJson = $body['configJson'] ?? [];
        $pfxBase64 = (string) ($body['pfxBase64'] ?? '');
        $senha = (string) ($body['senha'] ?? '');
        $payloadNfe = $body['payloadNfe'] ?? [];

        $resultado = HomologacaoNfeService::emitir(
            $configJson,
            $pfxBase64,
            $senha,
            is_array($payloadNfe) ? $payloadNfe : []
        );

        jsonResponse([
            'sucesso' => ($resultado['cStat'] ?? '') === '100',
            ...$resultado,
        ]);
    }

    if ($method === 'POST' && $path === '/nfe/danfe') {
        $xml = (string) ($body['xml'] ?? '');

        $resultado = DanfeService::gerar($xml);
        jsonResponse([
            'sucesso' => true,
            ...$resultado,
        ]);
    }

    if ($method === 'POST' && $path === '/nfe/emissao') {
        $configJson = $body['configJson'] ?? [];
        $pfxBase64  = (string) ($body['pfxBase64'] ?? '');
        $senha      = (string) ($body['senha'] ?? '');
        $payloadNfe = $body['payloadNfe'] ?? [];

        $resultado = NfeEmissaoService::emitir(
            $configJson,
            $pfxBase64,
            $senha,
            is_array($payloadNfe) ? $payloadNfe : []
        );

        jsonResponse([
            'sucesso' => ($resultado['cStat'] ?? '') === '100',
            ...$resultado,
        ]);
    }

    if ($method === 'POST' && $path === '/nfe/cancelar') {
        $configJson = $body['configJson'] ?? [];
        $pfxBase64 = (string) ($body['pfxBase64'] ?? '');
        $senha = (string) ($body['senha'] ?? '');
        $dados = is_array($body['dados'] ?? null) ? $body['dados'] : [];

        $resultado = NfeCancelamentoService::cancelar(
            $configJson,
            $pfxBase64,
            $senha,
            $dados,
        );

        jsonResponse([
            'sucesso' => (bool) ($resultado['sucesso'] ?? false),
            ...$resultado,
        ]);
    }

    if ($method === 'POST' && $path === '/nfe/inutilizar') {
        $configJson = $body['configJson'] ?? [];
        $pfxBase64 = (string) ($body['pfxBase64'] ?? '');
        $senha = (string) ($body['senha'] ?? '');
        $dados = is_array($body['dados'] ?? null) ? $body['dados'] : [];

        $resultado = NfeInutilizacaoService::inutilizar(
            $configJson,
            $pfxBase64,
            $senha,
            $dados,
        );

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
