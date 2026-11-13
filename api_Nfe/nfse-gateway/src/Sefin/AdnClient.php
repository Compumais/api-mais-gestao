<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Sefin;

/**
 * Cliente para o Ambiente de Dados Nacional (ADN) da NFS-e Nacional:
 * - Consulta de parâmetros de convênio municipal e alíquotas
 * - Download do DANFSe oficial em PDF
 * - Distribuição DFe por NSU para contribuintes
 */
final class AdnClient
{
    private SefinHttpClient $httpClient;
    /** @var array<string, mixed> */
    private array $configJson;

    /**
     * @param array<string, mixed> $configJson
     */
    public function __construct(
        array $configJson,
        string $pfxBase64,
        string $senha,
        ?SefinHttpClient $httpClient = null,
    ) {
        $this->configJson = $configJson;
        $this->httpClient = $httpClient ?? SefinHttpClient::criarAdnAPartirConfig($configJson, $pfxBase64, $senha);
    }

    /**
     * Consulta os parâmetros de convênio de um município no ADN Nacional.
     *
     * @return array<string, mixed>
     */
    public function consultarParametrosConvenio(string $codigoMunicipio): array
    {
        $codMun = preg_replace('/\D/', '', $codigoMunicipio) ?? '';
        if (!preg_match('/^\d{7}$/', $codMun)) {
            return [
                'sucesso' => false,
                'conveniado' => false,
                'codigoMunicipio' => $codMun,
                'erro' => 'Código IBGE do município deve conter 7 dígitos numéricos',
            ];
        }

        $res = $this->httpClient->get('/parametrizacao/' . $codMun . '/convenio');
        $status = (int) ($res['status'] ?? 0);
        $json = is_array($res['json'] ?? null) ? $res['json'] : [];

        if ($status === 200) {
            return [
                'sucesso' => true,
                'conveniado' => isset($json['parametrosConvenio']) && is_array($json['parametrosConvenio']),
                'codigoMunicipio' => $codMun,
                'ambiente' => (int) ($this->configJson['ambiente'] ?? 2),
                'mensagem' => $json['mensagem'] ?? null,
                'parametrosConvenio' => $json['parametrosConvenio'] ?? null,
            ];
        }

        if ($status === 404) {
            return [
                'sucesso' => true,
                'conveniado' => false,
                'codigoMunicipio' => $codMun,
                'ambiente' => (int) ($this->configJson['ambiente'] ?? 2),
                'mensagem' => $json['mensagem'] ?? 'Município sem convênio ativo no ambiente consultado do ADN Nacional',
                'parametrosConvenio' => null,
            ];
        }

        return [
            'sucesso' => false,
            'conveniado' => false,
            'codigoMunicipio' => $codMun,
            'statusHttp' => $status,
            'erro' => (string) ($res['erro'] ?? $json['mensagem'] ?? "Falha ao consultar convênio municipal no ADN (HTTP {$status})"),
        ];
    }

    /**
     * Consulta alíquota parametrizada para município, código de serviço e competência.
     *
     * @return array<string, mixed>
     */
    public function consultarAliquota(string $codigoMunicipio, string $codigoServico, string $competencia): array
    {
        $codMun = preg_replace('/\D/', '', $codigoMunicipio) ?? '';
        if (!preg_match('/^\d{7}$/', $codMun)) {
            return [
                'sucesso' => false,
                'erro' => 'Código IBGE do município deve conter 7 dígitos numéricos',
            ];
        }

        $servicoEncoded = rawurlencode(trim($codigoServico));
        $competenciaEncoded = rawurlencode(trim($competencia));

        $res = $this->httpClient->get("/parametrizacao/{$codMun}/{$servicoEncoded}/{$competenciaEncoded}/aliquota");
        $status = (int) ($res['status'] ?? 0);
        $json = is_array($res['json'] ?? null) ? $res['json'] : [];

        if ($status === 200) {
            return [
                'sucesso' => true,
                'codigoMunicipio' => $codMun,
                'mensagem' => $json['mensagem'] ?? null,
                'aliquotas' => $json['aliquotas'] ?? [],
            ];
        }

        return [
            'sucesso' => false,
            'statusHttp' => $status,
            'erro' => (string) ($res['erro'] ?? $json['mensagem'] ?? "Falha ao consultar alíquota no ADN (HTTP {$status})"),
        ];
    }

    /**
     * Baixa o PDF oficial do DANFSe no ADN (ou endpoint municipal próprio).
     *
     * @return array<string, mixed>
     */
    public function obterDanfsePdf(string $chaveAcesso): array
    {
        $chave = preg_replace('/\D/', '', $chaveAcesso) ?? '';
        if (strlen($chave) !== 50) {
            return [
                'sucesso' => false,
                'erro' => 'Chave de acesso da NFS-e deve ter 50 dígitos para download do DANFSe',
            ];
        }

        $pathOrUrl = SefinEndpointResolver::resolveDanfsePathOrUrl($this->configJson, $chave);
        $res = $this->httpClient->getBinary($pathOrUrl);
        $status = (int) ($res['status'] ?? 0);
        $body = (string) ($res['body'] ?? '');

        if ($status === 200 && $body !== '' && str_starts_with($body, '%PDF')) {
            return [
                'sucesso' => true,
                'chaveAcesso' => $chave,
                'contentType' => 'application/pdf',
                'pdfBase64' => base64_encode($body),
            ];
        }

        return [
            'sucesso' => false,
            'chaveAcesso' => $chave,
            'statusHttp' => $status,
            'erro' => (string) ($res['erro'] ?? "Não foi possível obter o PDF do DANFSe (HTTP {$status})"),
        ];
    }

    /**
     * Baixa DFe de contribuinte por NSU no ADN.
     *
     * @return array<string, mixed>
     */
    public function baixarDfeContribuinte(int $nsu, ?string $cnpjConsulta = null, bool $lote = true): array
    {
        $query = [];
        if ($cnpjConsulta !== null && trim($cnpjConsulta) !== '') {
            $query['cnpjConsulta'] = preg_replace('/\D/', '', $cnpjConsulta);
        }
        if (!$lote) {
            $query['lote'] = 'false';
        }

        $path = '/contribuintes/DFe/' . max(0, $nsu);
        if ($query !== []) {
            $path .= '?' . http_build_query($query);
        }

        $res = $this->httpClient->get($path);
        $status = (int) ($res['status'] ?? 0);
        $json = is_array($res['json'] ?? null) ? $res['json'] : [];

        if ($status === 200) {
            $documentos = [];
            foreach (($json['LoteDFe'] ?? []) as $item) {
                if (!is_array($item)) {
                    continue;
                }
                $xmlB64 = (string) ($item['ArquivoXml'] ?? '');
                $xmlDescompactado = null;
                if ($xmlB64 !== '') {
                    try {
                        $xmlDescompactado = SefinHttpClient::gunzipBase64($xmlB64);
                    } catch (\Throwable) {
                        $xmlDescompactado = null;
                    }
                }
                $documentos[] = [
                    'nsu' => $item['NSU'] ?? null,
                    'chaveAcesso' => $item['ChaveAcesso'] ?? null,
                    'xmlGZipB64' => $xmlB64 !== '' ? $xmlB64 : null,
                    'xml' => $xmlDescompactado,
                ];
            }

            return [
                'sucesso' => true,
                'ultimoNsu' => $json['UltimoNSU'] ?? null,
                'maiorNsu' => $json['MaiorNSU'] ?? null,
                'documentos' => $documentos,
                'alertas' => $json['Alertas'] ?? [],
                'erros' => $json['Erros'] ?? [],
            ];
        }

        return [
            'sucesso' => false,
            'statusHttp' => $status,
            'erro' => (string) ($res['erro'] ?? "Falha ao baixar DFe no ADN (HTTP {$status})"),
        ];
    }
}
