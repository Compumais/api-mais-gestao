<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use MaisGestao\NfeGateway\Middleware\AuthMiddleware;
use MaisGestao\NfeGateway\Services\CertificadoService;
use MaisGestao\NfeGateway\Services\ConsultaChaveService;
use MaisGestao\NfeGateway\Services\DanfeService;
use MaisGestao\NfeGateway\Services\DistDfeService;
use MaisGestao\NfeGateway\Services\HomologacaoNfeService;
use MaisGestao\NfeGateway\Services\ManifestacaoDestinatarioService;
use MaisGestao\NfeGateway\Services\NfeCancelamentoService;
use MaisGestao\NfeGateway\Services\NfeEmissaoService;
use MaisGestao\NfeGateway\Services\NfeInutilizacaoService;
use MaisGestao\NfeGateway\Services\SefazService;

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
            'erro' => 'Falha ao serializar resposta do gateway NF-e',
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

    if ($method === 'POST' && $path === '/sefaz/dist-dfe') {
        $configJson = $body['configJson'] ?? [];
        $pfxBase64 = (string) ($body['pfxBase64'] ?? '');
        $senha = (string) ($body['senha'] ?? '');
        $ultNSU = (string) ($body['ultNSU'] ?? '0');
        $cUFAutor = isset($body['cUFAutor']) ? (int) $body['cUFAutor'] : null;

        $resultado = DistDfeService::consultar(
            is_array($configJson) ? $configJson : [],
            $pfxBase64,
            $senha,
            $ultNSU,
            $cUFAutor,
        );

        jsonResponse([
            'sucesso' => (bool) ($resultado['sucesso'] ?? false),
            ...$resultado,
        ]);
    }

    if ($method === 'POST' && $path === '/sefaz/dist-dfe/chave') {
        $configJson = $body['configJson'] ?? [];
        $pfxBase64 = (string) ($body['pfxBase64'] ?? '');
        $senha = (string) ($body['senha'] ?? '');
        $chaveNfe = (string) ($body['chaveNfe'] ?? '');
        $cUFAutor = isset($body['cUFAutor']) ? (int) $body['cUFAutor'] : null;

        $resultado = DistDfeService::consultarPorChave(
            is_array($configJson) ? $configJson : [],
            $pfxBase64,
            $senha,
            $chaveNfe,
            $cUFAutor,
        );

        jsonResponse([
            'sucesso' => (bool) ($resultado['sucesso'] ?? false),
            ...$resultado,
        ]);
    }

    if ($method === 'POST' && $path === '/sefaz/consulta-chave') {
        $configJson = $body['configJson'] ?? [];
        $pfxBase64 = (string) ($body['pfxBase64'] ?? '');
        $senha = (string) ($body['senha'] ?? '');
        $chaveNfe = (string) ($body['chaveNfe'] ?? '');

        $resultado = ConsultaChaveService::consultarPorChave(
            is_array($configJson) ? $configJson : [],
            $pfxBase64,
            $senha,
            $chaveNfe,
        );

        jsonResponse([
            'sucesso' => (bool) ($resultado['sucesso'] ?? false),
            ...$resultado,
        ]);
    }

    if ($method === 'POST' && $path === '/nfe/manifestacao/ciencia') {
        $configJson = $body['configJson'] ?? [];
        $pfxBase64 = (string) ($body['pfxBase64'] ?? '');
        $senha = (string) ($body['senha'] ?? '');
        $chaveNfe = (string) ($body['chaveNfe'] ?? '');

        $resultado = ManifestacaoDestinatarioService::manifestarCiencia(
            is_array($configJson) ? $configJson : [],
            $pfxBase64,
            $senha,
            $chaveNfe,
        );

        jsonResponse([
            'sucesso' => (bool) ($resultado['sucesso'] ?? false),
            ...$resultado,
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

    if ($method === 'POST' && $path === '/nfe/emissao/preview-danfe') {
        $configJson = $body['configJson'] ?? [];
        $pfxBase64  = (string) ($body['pfxBase64'] ?? '');
        $senha      = (string) ($body['senha'] ?? '');
        $payloadNfe = $body['payloadNfe'] ?? [];

        $resultado = NfeEmissaoService::previewDanfe(
            $configJson,
            $pfxBase64,
            $senha,
            is_array($payloadNfe) ? $payloadNfe : []
        );

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
