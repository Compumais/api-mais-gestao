<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Sefin;

/**
 * Cliente HTTP REST com mTLS para a API Sefin Nacional NFS-e.
 */
final class SefinHttpClient
{
    public const URL_PRODUCAO = 'https://sefin.nfse.gov.br/SefinNacional';
    public const URL_HOMOLOGACAO = 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional';

    private string $baseUrl;
    private string $pfxBase64;
    private string $senha;
    private int $timeoutSegundos;

    public function __construct(
        string $baseUrl,
        string $pfxBase64,
        string $senha,
        int $timeoutSegundos = 60,
    ) {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->pfxBase64 = $pfxBase64;
        $this->senha = $senha;
        $this->timeoutSegundos = $timeoutSegundos;
    }

    /**
     * @param array<string, mixed> $configJson
     */
    public static function criarAPartirConfig(
        array $configJson,
        string $pfxBase64,
        string $senha,
    ): self {
        $ambiente = (int) ($configJson['ambiente'] ?? 2);
        $urlOverride = trim((string) ($configJson['urlwsdl'] ?? ''));
        if ($urlOverride !== '') {
            $baseUrl = rtrim($urlOverride, '/');
        } else {
            $baseUrl = $ambiente === 1 ? self::URL_PRODUCAO : self::URL_HOMOLOGACAO;
        }

        return new self($baseUrl, $pfxBase64, $senha);
    }

    public function obterBaseUrl(): string
    {
        return $this->baseUrl;
    }

    /**
     * @param array<string, mixed> $json
     * @return array{status: int, json: array<string, mixed>|null, body: string, erro?: string}
     */
    public function post(string $path, array $json): array
    {
        return $this->request('POST', $path, $json);
    }

    /**
     * @return array{status: int, json: array<string, mixed>|null, body: string, erro?: string}
     */
    public function get(string $path): array
    {
        return $this->request('GET', $path, null);
    }

    /**
     * @return array{status: int, json: array<string, mixed>|null, body: string, erro?: string}
     */
    public function head(string $path): array
    {
        return $this->request('HEAD', $path, null);
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
     * @param array<string, mixed>|null $json
     * @return array{status: int, json: array<string, mixed>|null, body: string, erro?: string}
     */
    private function request(string $method, string $path, ?array $json): array
    {
        $url = $this->baseUrl . '/' . ltrim($path, '/');
        $certPem = null;
        $keyPem = null;

        try {
            [$certPem, $keyPem] = $this->criarArquivosPemTemporarios();

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
                'Accept: application/json',
                'Content-Type: application/json; charset=utf-8',
            ];

            $opcoes = [
                CURLOPT_CUSTOMREQUEST => $method,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HEADER => false,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_TIMEOUT => $this->timeoutSegundos,
                CURLOPT_CONNECTTIMEOUT => 15,
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
            curl_close($ch);

            if ($errno !== 0 || $body === false) {
                return [
                    'status' => 0,
                    'json' => null,
                    'body' => '',
                    'erro' => $erroCurl !== ''
                        ? "Falha de conexão com Sefin Nacional: {$erroCurl}"
                        : 'Falha de conexão com Sefin Nacional',
                ];
            }

            $corpo = is_string($body) ? $body : '';
            $decoded = null;
            if ($corpo !== '' && $method !== 'HEAD') {
                $parsed = json_decode($corpo, true);
                if (is_array($parsed)) {
                    $decoded = $parsed;
                }
            }

            return [
                'status' => $status,
                'json' => $decoded,
                'body' => $corpo,
            ];
        } finally {
            $this->apagarArquivo($certPem);
            $this->apagarArquivo($keyPem);
        }
    }

    /**
     * @return array{0: string, 1: string} caminhos [cert.pem, key.pem]
     */
    private function criarArquivosPemTemporarios(): array
    {
        $pfxContent = base64_decode($this->pfxBase64, true);
        if ($pfxContent === false) {
            throw new \InvalidArgumentException('PFX base64 inválido para mTLS Sefin');
        }

        $certs = [];
        if (!openssl_pkcs12_read($pfxContent, $certs, $this->senha)) {
            throw new \RuntimeException(
                'Não foi possível ler o PFX para mTLS. Verifique senha e suporte OpenSSL (legacy provider).',
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

        return [$certPemPath, $keyPemPath];
    }

    private function apagarArquivo(?string $path): void
    {
        if ($path !== null && $path !== '' && is_file($path)) {
            @unlink($path);
        }
    }
}
