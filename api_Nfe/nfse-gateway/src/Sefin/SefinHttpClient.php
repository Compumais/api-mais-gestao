<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Sefin;

/**
 * Cliente HTTP REST com mTLS para a API Sefin Nacional e ADN NFS-e.
 */
final class SefinHttpClient
{
    public const URL_PRODUCAO = SefinEndpointResolver::SEFIN_PRODUCAO;
    public const URL_HOMOLOGACAO = SefinEndpointResolver::SEFIN_HOMOLOGACAO;

    private string $baseUrl;
    private string $pfxBase64;
    private string $senha;
    private int $timeoutSegundos;
    private int $maxTentativas;

    private ?string $certPemCache = null;
    private ?string $keyPemCache = null;

    public function __construct(
        string $baseUrl,
        string $pfxBase64,
        string $senha,
        int $timeoutSegundos = 60,
        int $maxTentativas = 3,
    ) {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->pfxBase64 = $pfxBase64;
        $this->senha = $senha;
        $this->timeoutSegundos = $timeoutSegundos;
        $this->maxTentativas = max(1, $maxTentativas);
    }

    public function __destruct()
    {
        $this->apagarArquivo($this->certPemCache);
        $this->apagarArquivo($this->keyPemCache);
        $this->certPemCache = null;
        $this->keyPemCache = null;
    }

    /**
     * @param array<string, mixed> $configJson
     */
    public static function criarAPartirConfig(
        array $configJson,
        string $pfxBase64,
        string $senha,
    ): self {
        $baseUrl = SefinEndpointResolver::resolveSefinBaseUrl($configJson);

        return new self($baseUrl, $pfxBase64, $senha);
    }

    /**
     * Cria cliente apontando para o ADN (Ambiente de Dados Nacional).
     *
     * @param array<string, mixed> $configJson
     */
    public static function criarAdnAPartirConfig(
        array $configJson,
        string $pfxBase64,
        string $senha,
    ): self {
        $baseUrl = SefinEndpointResolver::resolveAdnBaseUrl($configJson);

        return new self($baseUrl, $pfxBase64, $senha);
    }

    public function obterBaseUrl(): string
    {
        return $this->baseUrl;
    }

    /**
     * @param array<string, mixed> $json
     * @return array{status: int, json: array<string, mixed>|null, body: string, erro?: string, errno?: int, url?: string}
     */
    public function post(string $path, array $json): array
    {
        return $this->requestWithRetry('POST', $path, $json);
    }

    /**
     * @return array{status: int, json: array<string, mixed>|null, body: string, erro?: string, errno?: int, url?: string}
     */
    public function get(string $path): array
    {
        return $this->requestWithRetry('GET', $path, null);
    }

    /**
     * Realiza GET aceitando binários (ex.: PDF DANFSe).
     *
     * @return array{status: int, body: string, contentType: string, erro?: string, errno?: int, url?: string}
     */
    public function getBinary(string $pathOrFullUrl): array
    {
        $res = $this->requestWithRetry('GET', $pathOrFullUrl, null, '*/*');

        return [
            'status' => $res['status'],
            'body' => $res['body'],
            'contentType' => (string) ($res['contentType'] ?? ''),
            'url' => (string) ($res['url'] ?? ''),
            ...(isset($res['erro']) ? ['erro' => $res['erro']] : []),
            ...(isset($res['errno']) ? ['errno' => $res['errno']] : []),
        ];
    }

    /**
     * @return array{status: int, json: array<string, mixed>|null, body: string, erro?: string, errno?: int, url?: string}
     */
    public function head(string $path): array
    {
        return $this->requestWithRetry('HEAD', $path, null);
    }

    public static function gzipBase64(string $conteudo): string
    {
        $comprimido = gzencode($conteudo, 9);
        if ($comprimido === false) {
            throw new \RuntimeException('Falha ao compactar XML em GZip');
        }

        return base64_encode($comprimido);
    }

    public static function gunzipBase64(string $base64): string
    {
        $binario = base64_decode($base64, true);
        if ($binario === false) {
            throw new \RuntimeException('Base64 inválido ao descompactar XML Sefin');
        }

        $xml = @gzdecode($binario);
        if ($xml === false) {
            throw new \RuntimeException('Falha ao descompactar GZip da resposta Sefin');
        }

        return $xml;
    }

    /**
     * Executa request com retry exponencial curto para falhas transientes de conexão
     * ou HTTP 502/503/504 em métodos idempotentes (GET/HEAD).
     *
     * @param array<string, mixed>|null $json
     * @return array{status: int, json: array<string, mixed>|null, body: string, contentType?: string, erro?: string, errno?: int, url?: string}
     */
    private function requestWithRetry(
        string $method,
        string $path,
        ?array $json,
        string $accept = 'application/json',
    ): array {
        $tentativa = 0;
        $ultimoResultado = null;

        while ($tentativa < $this->maxTentativas) {
            $tentativa++;
            $ultimoResultado = $this->requestOnce($method, $path, $json, $accept);

            if (!$this->deveTentarNovamente($method, $ultimoResultado, $tentativa)) {
                return $ultimoResultado;
            }

            // Backoff exponencial: 250ms, 500ms
            usleep(250_000 * $tentativa);
        }

        return $ultimoResultado ?? [
            'status' => 0,
            'json' => null,
            'body' => '',
            'erro' => 'Falha ao executar requisição para Sefin Nacional',
        ];
    }

    /**
     * @param array{status: int, errno?: int} $resultado
     */
    private function deveTentarNovamente(string $method, array $resultado, int $tentativaAtual): bool
    {
        if ($tentativaAtual >= $this->maxTentativas) {
            return false;
        }

        $status = (int) ($resultado['status'] ?? 0);
        $errno = (int) ($resultado['errno'] ?? 0);

        // Erros cURL antes de transmitir payload (DNS, falha de conexão TCP ou handshake SSL)
        $errosConexaoSeguros = [
            CURLE_COULDNT_RESOLVE_HOST,
            CURLE_COULDNT_CONNECT,
            CURLE_SSL_CONNECT_ERROR,
        ];

        if ($status === 0 && in_array($errno, $errosConexaoSeguros, true)) {
            return true;
        }

        // Para GET e HEAD (idempotentes), também faz retry em timeout de rede ou HTTP 429/502/503/504
        if ($method === 'GET' || $method === 'HEAD') {
            if ($status === 0 || in_array($status, [429, 502, 503, 504], true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param array<string, mixed>|null $json
     * @return array{status: int, json: array<string, mixed>|null, body: string, contentType?: string, erro?: string, errno?: int, url?: string}
     */
    private function requestOnce(
        string $method,
        string $path,
        ?array $json,
        string $accept = 'application/json',
    ): array {
        $url = str_starts_with($path, 'http://') || str_starts_with($path, 'https://')
            ? $path
            : $this->baseUrl . '/' . ltrim($path, '/');

        [$certPem, $keyPem] = $this->obterArquivosPem();

        $ch = curl_init($url);
        if ($ch === false) {
            return [
                'status' => 0,
                'json' => null,
                'body' => '',
                'erro' => 'Falha ao iniciar cURL para Sefin Nacional',
            ];
        }

        $headers = [
            'Accept: ' . $accept,
            'Content-Type: application/json; charset=utf-8',
        ];

        $opcoes = [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => false,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => $this->timeoutSegundos,
            CURLOPT_CONNECTTIMEOUT => 12,
            CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
            CURLOPT_RESOLVE => SefinEndpointResolver::pinnedHosts(),
            CURLOPT_SSLVERSION => CURL_SSLVERSION_TLSv1_2,
            CURLOPT_SSLCERT => $certPem,
            CURLOPT_SSLKEY => $keyPem,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ];

        if ($json !== null) {
            $opcoes[CURLOPT_POSTFIELDS] = json_encode(
                $json,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
            );
        }

        if ($method === 'HEAD') {
            $opcoes[CURLOPT_NOBODY] = true;
        }

        curl_setopt_array($ch, $opcoes);

        $body = curl_exec($ch);
        $errno = curl_errno($ch);
        $erroCurl = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $contentType = (string) (curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: '');
        curl_close($ch);

        if ($errno !== 0 || $body === false) {
            return [
                'status' => 0,
                'errno' => $errno,
                'url' => $url,
                'json' => null,
                'body' => '',
                'contentType' => $contentType,
                'erro' => $erroCurl !== ''
                    ? "Falha de conexão com Sefin Nacional ({$url}) [cURL #{$errno}]: {$erroCurl}"
                    : "Falha de conexão com Sefin Nacional ({$url})",
            ];
        }

        $corpo = is_string($body) ? $body : '';
        $decoded = null;
        if ($corpo !== '' && $method !== 'HEAD' && $accept === 'application/json') {
            $parsed = json_decode($corpo, true);
            if (is_array($parsed)) {
                $decoded = $parsed;
            }
        }

        return [
            'status' => $status,
            'url' => $url,
            'json' => $decoded,
            'body' => $corpo,
            'contentType' => $contentType,
        ];
    }

    /**
     * @return array{0: string, 1: string} caminhos [cert.pem, key.pem]
     */
    private function obterArquivosPem(): array
    {
        if (
            $this->certPemCache !== null
            && $this->keyPemCache !== null
            && is_file($this->certPemCache)
            && is_file($this->keyPemCache)
        ) {
            return [$this->certPemCache, $this->keyPemCache];
        }

        $pfxContent = base64_decode($this->pfxBase64, true);
        if ($pfxContent === false) {
            throw new \InvalidArgumentException('PFX base64 inválido para mTLS Sefin');
        }

        while (openssl_error_string() !== false) {
            // Limpa fila de erros OpenSSL anteriores
        }

        $certs = [];
        if (!openssl_pkcs12_read($pfxContent, $certs, $this->senha)) {
            $detalheSsl = openssl_error_string();
            $sufixo = is_string($detalheSsl) && trim($detalheSsl) !== ''
                ? ' Detalhe OpenSSL: ' . trim($detalheSsl)
                : '';
            throw new \RuntimeException(
                'Não foi possível ler o PFX para mTLS. Verifique senha e suporte OpenSSL (legacy provider).' . $sufixo,
            );
        }

        $cert = (string) ($certs['cert'] ?? '');
        $pkey = (string) ($certs['pkey'] ?? '');
        if ($cert === '' || $pkey === '') {
            throw new \RuntimeException('PFX sem certificado ou chave privada para mTLS');
        }

        $extracerts = '';
        if (!empty($certs['extracerts']) && is_array($certs['extracerts'])) {
            foreach ($certs['extracerts'] as $extra) {
                $extracerts .= (string) $extra;
            }
        }

        $certPemPath = tempnam(sys_get_temp_dir(), 'sefin_cert_');
        $keyPemPath = tempnam(sys_get_temp_dir(), 'sefin_key_');
        if ($certPemPath === false || $keyPemPath === false) {
            throw new \RuntimeException('Falha ao criar arquivos temporários PEM para mTLS');
        }

        if (file_put_contents($certPemPath, $cert . $extracerts) === false) {
            $this->apagarArquivo($certPemPath);
            $this->apagarArquivo($keyPemPath);
            throw new \RuntimeException('Falha ao gravar certificado PEM temporário');
        }
        if (file_put_contents($keyPemPath, $pkey) === false) {
            $this->apagarArquivo($certPemPath);
            $this->apagarArquivo($keyPemPath);
            throw new \RuntimeException('Falha ao gravar chave PEM temporária');
        }

        @chmod($certPemPath, 0600);
        @chmod($keyPemPath, 0600);

        $this->certPemCache = $certPemPath;
        $this->keyPemCache = $keyPemPath;

        return [$certPemPath, $keyPemPath];
    }

    private function apagarArquivo(?string $path): void
    {
        if ($path !== null && $path !== '' && is_file($path)) {
            @unlink($path);
        }
    }
}
