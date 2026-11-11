<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Adapters;

use DOMDocument;
use MaisGestao\NfseGateway\Contract\NfseProvedorAdapter;
use MaisGestao\NfseGateway\Sefin\DpsNacionalXmlBuilder;
use MaisGestao\NfseGateway\Sefin\EventoNacionalXmlBuilder;
use MaisGestao\NfseGateway\Sefin\SefinHttpClient;
use MaisGestao\NfseGateway\Services\AssinadorXmlService;
use MaisGestao\NfseGateway\Services\CertificadoService;

/**
 * Adapter REST + mTLS para a API Sefin Nacional (Emissor Público).
 *
 * Contrato de saída alinhado ao restante do gateway (Betha/ABRASF),
 * com campos extras chaveAcesso / idDps / alertas.
 */
final class AdapterSefinNacional implements NfseProvedorAdapter
{
    public const PROVEDOR = 'sefin_nacional';
    public const VERSAO_LAYOUT = 'dps-1.01';

    private DpsNacionalXmlBuilder $dpsBuilder;
    private EventoNacionalXmlBuilder $eventoBuilder;

    public function __construct(
        ?DpsNacionalXmlBuilder $dpsBuilder = null,
        ?EventoNacionalXmlBuilder $eventoBuilder = null,
    ) {
        $this->dpsBuilder = $dpsBuilder ?? new DpsNacionalXmlBuilder();
        $this->eventoBuilder = $eventoBuilder ?? new EventoNacionalXmlBuilder();
    }

    /**
     * @param array<string, mixed> $configJson
     * @param array<string, mixed> $payloadNfse
     * @return array<string, mixed>
     */
    public function enviarLoteSincrono(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $payloadNfse,
    ): array {
        $idInfDps = null;
        $xmlAssinado = null;
        try {
            [$idInfDps, $xmlDps] = $this->dpsBuilder->montar($payloadNfse, $configJson);
            $xmlAssinado = $xmlDps;
            $certificate = CertificadoService::lerCertificado($pfxBase64, $senha);
            $xmlAssinado = AssinadorXmlService::assinar($xmlDps, $certificate, $idInfDps);
            $xmlAssinado = AssinadorXmlService::reposicionarSignatureNoPai($xmlAssinado, 'DPS');

            $client = SefinHttpClient::criarAPartirConfig($configJson, $pfxBase64, $senha);
            $payload = [
                'dpsXmlGZipB64' => SefinHttpClient::gzipBase64($xmlAssinado),
            ];

            $resposta = $client->post('/nfse', $payload);

            if (($resposta['status'] ?? 0) === 0) {
                return $this->tentarReconciliarAposFalhaRede(
                    $client,
                    $idInfDps,
                    $xmlAssinado,
                    (string) ($resposta['erro'] ?? 'Falha de rede na emissão Sefin'),
                    (int) ($resposta['errno'] ?? 0),
                );
            }

            return $this->mapearRespostaEmissao($resposta, $idInfDps, $xmlAssinado);
        } catch (\Throwable $e) {
            return $this->erroBase($e->getMessage(), $idInfDps, $xmlAssinado);
        }
    }

    /**
     * @param array<string, mixed> $configJson
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    public function cancelar(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $dados,
    ): array {
        try {
            $chave = preg_replace('/\D/', '', (string) ($dados['chaveAcesso'] ?? $dados['codigoVerificacao'] ?? '')) ?? '';
            if (strlen($chave) !== 50) {
                return $this->erroBase(
                    'Chave de acesso da NFS-e (50 dígitos) é obrigatória para cancelamento Sefin Nacional',
                );
            }

            [$idInfPed, $xmlEvento] = $this->eventoBuilder->montarCancelamento($configJson, $dados);
            $certificate = CertificadoService::lerCertificado($pfxBase64, $senha);
            $xmlAssinado = AssinadorXmlService::assinar($xmlEvento, $certificate, $idInfPed);
            $xmlAssinado = AssinadorXmlService::reposicionarSignatureNoPai($xmlAssinado, 'pedRegEvento');

            $client = SefinHttpClient::criarAPartirConfig($configJson, $pfxBase64, $senha);
            $payload = [
                'pedidoRegistroEventoXmlGZipB64' => SefinHttpClient::gzipBase64($xmlAssinado),
            ];

            $resposta = $client->post('/nfse/' . $chave . '/eventos', $payload);

            if (($resposta['status'] ?? 0) === 0) {
                return [
                    ...$this->baseMeta(),
                    'sucesso' => false,
                    'pendente' => true,
                    'chaveAcesso' => $chave,
                    'codigoVerificacao' => $chave,
                    'xmlEnviado' => $xmlAssinado,
                    'erro' => (string) ($resposta['erro'] ?? 'Falha de rede no cancelamento Sefin'),
                    'erros' => [[
                        'codigo' => 'REDE',
                        'mensagem' => (string) ($resposta['erro'] ?? 'Falha de rede'),
                    ]],
                ];
            }

            return $this->mapearRespostaEvento($resposta, $chave, $xmlAssinado);
        } catch (\Throwable $e) {
            return $this->erroBase($e->getMessage());
        }
    }

    /**
     * @param array<string, mixed> $configJson
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    public function consultarPorRps(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $dados,
    ): array {
        try {
            $client = SefinHttpClient::criarAPartirConfig($configJson, $pfxBase64, $senha);
            $chave = preg_replace('/\D/', '', (string) ($dados['chaveAcesso'] ?? '')) ?? '';
            $idDps = trim((string) ($dados['idDps'] ?? ''));

            if (strlen($chave) === 50) {
                return $this->consultarPorChave($client, $chave, $idDps !== '' ? $idDps : null);
            }

            if ($idDps === '') {
                return $this->erroBase(
                    'Informe idDps ou chaveAcesso (50 dígitos) para consultar na Sefin Nacional',
                );
            }

            $head = $client->head('/dps/' . rawurlencode($idDps));
            if (($head['status'] ?? 0) === 404) {
                return [
                    ...$this->baseMeta(),
                    'sucesso' => false,
                    'idDps' => $idDps,
                    'pendente' => false,
                    'erros' => [[
                        'codigo' => 'DPS_NAO_ENCONTRADA',
                        'mensagem' => 'Não foi gerada uma NFS-e com o identificador de DPS informado',
                    ]],
                ];
            }

            if (($head['status'] ?? 0) === 0) {
                return [
                    ...$this->baseMeta(),
                    'sucesso' => false,
                    'pendente' => true,
                    'idDps' => $idDps,
                    'erro' => (string) ($head['erro'] ?? 'Falha de rede na consulta DPS'),
                    'erros' => [[
                        'codigo' => 'REDE',
                        'mensagem' => (string) ($head['erro'] ?? 'Falha de rede'),
                    ]],
                ];
            }

            $getDps = $client->get('/dps/' . rawurlencode($idDps));
            if (($getDps['status'] ?? 0) !== 200) {
                return $this->mapearRespostaErroGenerico($getDps, $idDps, null);
            }

            $jsonDps = is_array($getDps['json'] ?? null) ? $getDps['json'] : [];
            $chaveResposta = preg_replace('/\D/', '', (string) ($jsonDps['chaveAcesso'] ?? '')) ?? '';
            if (strlen($chaveResposta) !== 50) {
                return [
                    ...$this->baseMeta(),
                    'sucesso' => true,
                    'pendente' => true,
                    'idDps' => (string) ($jsonDps['idDps'] ?? $idDps),
                    'erros' => [],
                ];
            }

            return $this->consultarPorChave($client, $chaveResposta, (string) ($jsonDps['idDps'] ?? $idDps));
        } catch (\Throwable $e) {
            return $this->erroBase($e->getMessage());
        }
    }

    /**
     * @param array{status: int, json: array<string, mixed>|null, body: string, erro?: string} $resposta
     * @return array<string, mixed>
     */
    private function mapearRespostaEmissao(array $resposta, string $idDps, string $xmlEnviado): array
    {
        $status = (int) ($resposta['status'] ?? 0);
        $json = is_array($resposta['json'] ?? null) ? $resposta['json'] : [];

        if ($status === 201) {
            $chave = preg_replace('/\D/', '', (string) ($json['chaveAcesso'] ?? '')) ?? '';
            $nfseXml = null;
            if (!empty($json['nfseXmlGZipB64'])) {
                try {
                    $nfseXml = SefinHttpClient::gunzipBase64((string) $json['nfseXmlGZipB64']);
                } catch (\Throwable $e) {
                    return [
                        ...$this->baseMeta(),
                        'sucesso' => false,
                        'pendente' => false,
                        'idDps' => (string) ($json['idDps'] ?? $idDps),
                        'chaveAcesso' => $chave !== '' ? $chave : null,
                        'codigoVerificacao' => $chave !== '' ? $chave : null,
                        'xmlEnviado' => $xmlEnviado,
                        'erro' => '[GUNZIP] ' . $e->getMessage(),
                        'erros' => [['codigo' => 'GUNZIP', 'mensagem' => $e->getMessage()]],
                    ];
                }
            }

            $numeroNfse = $nfseXml !== null ? $this->extrairNumeroNfse($nfseXml) : null;

            return [
                ...$this->baseMeta(),
                'sucesso' => true,
                'pendente' => false,
                'idDps' => (string) ($json['idDps'] ?? $idDps),
                'chaveAcesso' => strlen($chave) === 50 ? $chave : null,
                'codigoVerificacao' => strlen($chave) === 50 ? $chave : null,
                'numeroNfse' => $numeroNfse,
                'xml' => $nfseXml,
                'xmlEnviado' => $xmlEnviado,
                'alertas' => $this->mapearMensagens($json['alertas'] ?? $json['Alertas'] ?? []),
                'erros' => [],
            ];
        }

        if ($status === 401 || $status === 403) {
            $mensagemPadraoMtls = $status === 401
                ? 'Certificado digital de cliente ausente ou rejeitado pela Sefin Nacional (mTLS HTTP 401)'
                : 'Certificado digital da transmissão inválido ou fora dos padrões da NFS-e (mTLS)';
            $erros = $this->extrairErrosDaRespostaSefin(
                $resposta,
                'CERTIFICADO_MTLS',
                $mensagemPadraoMtls,
            );
            foreach ($erros as &$itemErro) {
                if ($itemErro['codigo'] === (string) $status || $itemErro['codigo'] === 'SEFIN') {
                    $itemErro['codigo'] = 'CERTIFICADO_MTLS';
                }
            }
            unset($itemErro);

            return [
                ...$this->baseMeta(),
                'sucesso' => false,
                'pendente' => false,
                'idDps' => $idDps,
                'xmlEnviado' => $xmlEnviado,
                'erros' => $erros,
                'erro' => $this->formatarResumoErros($erros),
            ];
        }

        if ($status === 404) {
            $urlChamada = (string) ($resposta['url'] ?? '/nfse');
            $erros = $this->extrairErrosDaRespostaSefin(
                $resposta,
                'HTTP_404',
                "Endpoint não encontrado na Sefin Nacional (HTTP 404 em {$urlChamada}). Verifique a URL base nas configurações de NFS-e.",
            );

            return [
                ...$this->baseMeta(),
                'sucesso' => false,
                'pendente' => false,
                'idDps' => (string) ($json['idDPS'] ?? $json['idDps'] ?? $idDps),
                'xmlEnviado' => $xmlEnviado,
                'erros' => $erros,
                'erro' => $this->formatarResumoErros($erros),
            ];
        }

        if ($status === 502 || $status === 503 || $status === 504) {
            $erros = $this->extrairErrosDaRespostaSefin(
                $resposta,
                'HTTP_' . $status,
                "Serviço da Sefin Nacional indisponível (HTTP {$status}). Consulte a DPS pelo Id antes de reemitir.",
            );

            return [
                ...$this->baseMeta(),
                'sucesso' => false,
                'pendente' => true,
                'idDps' => (string) ($json['idDPS'] ?? $json['idDps'] ?? $idDps),
                'xmlEnviado' => $xmlEnviado,
                'erros' => $erros,
                'erro' => $this->formatarResumoErros($erros),
            ];
        }

        if ($status >= 400) {
            $erros = $this->extrairErrosDaRespostaSefin(
                $resposta,
                (string) $status,
                "Rejeição Sefin Nacional sem detalhe (HTTP {$status})",
            );

            return [
                ...$this->baseMeta(),
                'sucesso' => false,
                'pendente' => false,
                'idDps' => (string) ($json['idDPS'] ?? $json['idDps'] ?? $idDps),
                'xmlEnviado' => $xmlEnviado,
                'erros' => $erros,
                'erro' => $this->formatarResumoErros($erros),
            ];
        }

        // Status inesperado fora de 201 e >=400 → tenta extrair detalhe e marca para consulta
        $errosInesperados = $this->extrairErrosDaRespostaSefin(
            $resposta,
            'HTTP_' . $status,
            "Resposta inesperada da Sefin (HTTP {$status}). Consulte a DPS pelo Id antes de reemitir.",
        );

        return [
            ...$this->baseMeta(),
            'sucesso' => false,
            'pendente' => true,
            'idDps' => $idDps,
            'xmlEnviado' => $xmlEnviado,
            'erros' => $errosInesperados,
            'erro' => $this->formatarResumoErros($errosInesperados),
        ];
    }

    /**
     * @param array{status: int, json: array<string, mixed>|null, body: string, erro?: string} $resposta
     * @return array<string, mixed>
     */
    private function mapearRespostaEvento(array $resposta, string $chave, string $xmlEnviado): array
    {
        $status = (int) ($resposta['status'] ?? 0);
        $json = is_array($resposta['json'] ?? null) ? $resposta['json'] : [];

        if ($status === 201) {
            $eventoXml = null;
            if (!empty($json['eventoXmlGZipB64'])) {
                try {
                    $eventoXml = SefinHttpClient::gunzipBase64((string) $json['eventoXmlGZipB64']);
                } catch (\Throwable $e) {
                    return [
                        ...$this->baseMeta(),
                        'sucesso' => false,
                        'chaveAcesso' => $chave,
                        'codigoVerificacao' => $chave,
                        'xmlEnviado' => $xmlEnviado,
                        'erro' => '[GUNZIP] ' . $e->getMessage(),
                        'erros' => [['codigo' => 'GUNZIP', 'mensagem' => $e->getMessage()]],
                    ];
                }
            }

            return [
                ...$this->baseMeta(),
                'sucesso' => true,
                'pendente' => false,
                'chaveAcesso' => $chave,
                'codigoVerificacao' => $chave,
                'xml' => $eventoXml,
                'xmlEnviado' => $xmlEnviado,
                'erros' => [],
            ];
        }

        if ($status >= 400 && $status !== 502 && $status !== 503 && $status !== 504) {
            $erros = $this->extrairErrosDaRespostaSefin(
                $resposta,
                (string) $status,
                "Falha ao registrar evento de cancelamento na Sefin (HTTP {$status})",
            );

            return [
                ...$this->baseMeta(),
                'sucesso' => false,
                'pendente' => false,
                'chaveAcesso' => $chave,
                'codigoVerificacao' => $chave,
                'xmlEnviado' => $xmlEnviado,
                'erros' => $erros,
                'erro' => $this->formatarResumoErros($erros),
            ];
        }

        $errosPendentes = $this->extrairErrosDaRespostaSefin(
            $resposta,
            'HTTP_' . $status,
            "Resposta inesperada no cancelamento (HTTP {$status}). Consulte os eventos da NFS-e.",
        );

        return [
            ...$this->baseMeta(),
            'sucesso' => false,
            'pendente' => true,
            'chaveAcesso' => $chave,
            'codigoVerificacao' => $chave,
            'xmlEnviado' => $xmlEnviado,
            'erros' => $errosPendentes,
            'erro' => $this->formatarResumoErros($errosPendentes),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function consultarPorChave(SefinHttpClient $client, string $chave, ?string $idDps): array
    {
        $resposta = $client->get('/nfse/' . $chave);
        $status = (int) ($resposta['status'] ?? 0);
        $json = is_array($resposta['json'] ?? null) ? $resposta['json'] : [];

        if ($status === 200) {
            $nfseXml = null;
            if (!empty($json['nfseXmlGZipB64'])) {
                $nfseXml = SefinHttpClient::gunzipBase64((string) $json['nfseXmlGZipB64']);
            }
            $chaveResp = preg_replace('/\D/', '', (string) ($json['chaveAcesso'] ?? $chave)) ?? $chave;

            return [
                ...$this->baseMeta(),
                'sucesso' => true,
                'pendente' => false,
                'idDps' => $idDps,
                'chaveAcesso' => $chaveResp,
                'codigoVerificacao' => $chaveResp,
                'numeroNfse' => $nfseXml !== null ? $this->extrairNumeroNfse($nfseXml) : null,
                'xml' => $nfseXml,
                'erros' => [],
            ];
        }

        return $this->mapearRespostaErroGenerico($resposta, $idDps, $chave);
    }

    /**
     * @param array{status: int, json: array<string, mixed>|null, body: string, erro?: string} $resposta
     * @return array<string, mixed>
     */
    private function mapearRespostaErroGenerico(array $resposta, ?string $idDps, ?string $chave): array
    {
        $status = (int) ($resposta['status'] ?? 0);

        if ($status === 0) {
            $msgRede = (string) ($resposta['erro'] ?? 'Falha de rede');
            return [
                ...$this->baseMeta(),
                'sucesso' => false,
                'pendente' => true,
                'idDps' => $idDps,
                'chaveAcesso' => $chave,
                'codigoVerificacao' => $chave,
                'erro' => "[REDE] {$msgRede}",
                'erros' => [[
                    'codigo' => 'REDE',
                    'mensagem' => $msgRede,
                ]],
            ];
        }

        $fallback = match ($status) {
            404 => 'Chave de acesso ou DPS não encontrada',
            403 => 'Consulta não permitida para este certificado',
            401 => 'Não foi possível obter o certificado de cliente',
            default => "Falha na consulta Sefin Nacional (HTTP {$status})",
        };
        $erros = $this->extrairErrosDaRespostaSefin($resposta, (string) $status, $fallback);

        return [
            ...$this->baseMeta(),
            'sucesso' => false,
            'pendente' => false,
            'idDps' => $idDps,
            'chaveAcesso' => $chave,
            'codigoVerificacao' => $chave,
            'erros' => $erros,
            'erro' => $this->formatarResumoErros($erros),
        ];
    }

    /**
     * Extrai erros da resposta Sefin em vários formatos conhecidos.
     *
     * Ordem: erros[]/Erros[] → erro/Erro → validation errors (RFC 7807) → campos top-level → body bruto → fallback.
     *
     * @param array{status?: int, json?: array<string, mixed>|null, body?: string, erro?: string} $resposta
     * @return list<array{codigo: string, mensagem: string}>
     */
    private function extrairErrosDaRespostaSefin(
        array $resposta,
        string $codigoFallback,
        string $mensagemFallback,
    ): array {
        $json = is_array($resposta['json'] ?? null) ? $resposta['json'] : [];

        $candidatos = [];
        if ($json !== [] && array_is_list($json)) {
            $candidatos[] = $json;
        }
        foreach (['erros', 'Erros', 'erro', 'Erro', 'mensagens', 'Mensagens', 'messages', 'Messages', 'alertas', 'Alertas'] as $chaveCandidata) {
            if (array_key_exists($chaveCandidata, $json)) {
                $candidatos[] = $json[$chaveCandidata];
            }
        }
        foreach (['processamento', 'Processamento', 'resultado', 'Resultado', 'data', 'Data'] as $wrapperKey) {
            if (isset($json[$wrapperKey]) && is_array($json[$wrapperKey])) {
                $sub = $json[$wrapperKey];
                foreach (['erros', 'Erros', 'erro', 'Erro', 'mensagens', 'Mensagens'] as $subKey) {
                    if (array_key_exists($subKey, $sub)) {
                        $candidatos[] = $sub[$subKey];
                    }
                }
            }
        }

        foreach ($candidatos as $candidato) {
            $erros = $this->mapearMensagens($candidato);
            if ($erros !== []) {
                return $erros;
            }
        }

        // Suporte a ValidationProblemDetails (ASP.NET Core): {"errors": {"campo": ["msg1", "msg2"]}}
        $validationErrors = $json['errors'] ?? $json['Errors'] ?? null;
        if (is_array($validationErrors) && $validationErrors !== []) {
            $errosValidacao = $this->mapearMensagens($validationErrors);
            if ($errosValidacao !== []) {
                return $errosValidacao;
            }
            $saidaValidacao = [];
            foreach ($validationErrors as $campo => $listaMensagens) {
                $prefixoCampo = is_string($campo) && $campo !== '' && $campo !== '$' ? "{$campo}: " : '';
                if (is_string($listaMensagens) && trim($listaMensagens) !== '') {
                    $saidaValidacao[] = [
                        'codigo' => $codigoFallback,
                        'mensagem' => $prefixoCampo . trim($listaMensagens),
                    ];
                } elseif (is_array($listaMensagens)) {
                    foreach ($listaMensagens as $msgItem) {
                        if (is_string($msgItem) && trim($msgItem) !== '') {
                            $saidaValidacao[] = [
                                'codigo' => $codigoFallback,
                                'mensagem' => $prefixoCampo . trim($msgItem),
                            ];
                        }
                    }
                }
            }
            if ($saidaValidacao !== []) {
                return $saidaValidacao;
            }
        }

        $codigoTop = trim((string) (
            $json['codigo']
            ?? $json['Codigo']
            ?? $json['codigoStatus']
            ?? $json['CodigoStatus']
            ?? $json['code']
            ?? $json['Code']
            ?? ''
        ));
        $mensagemPrincipalTop = trim((string) (
            $json['descricao']
            ?? $json['Descricao']
            ?? $json['motivoStatus']
            ?? $json['MotivoStatus']
            ?? $json['mensagem']
            ?? $json['Mensagem']
            ?? $json['message']
            ?? $json['Message']
            ?? ''
        ));
        $titleTop = trim((string) ($json['title'] ?? $json['Title'] ?? ''));
        $detailTop = trim((string) ($json['detail'] ?? $json['Detail'] ?? ''));
        if ($mensagemPrincipalTop === '') {
            if ($titleTop !== '' && $detailTop !== '' && $titleTop !== $detailTop) {
                $mensagemPrincipalTop = "{$titleTop}: {$detailTop}";
            } else {
                $mensagemPrincipalTop = $detailTop !== '' ? $detailTop : $titleTop;
            }
        }

        $complementoTop = trim((string) (
            $json['complemento']
            ?? $json['Complemento']
            ?? $json['solucao']
            ?? $json['Solucao']
            ?? ''
        ));
        if ($mensagemPrincipalTop !== '' || $complementoTop !== '') {
            $mensagem = $mensagemPrincipalTop;
            if ($complementoTop !== '') {
                $mensagem = $mensagem !== ''
                    ? "{$mensagem} — {$complementoTop}"
                    : $complementoTop;
            }

            return [[
                'codigo' => $codigoTop !== '' ? $codigoTop : $codigoFallback,
                'mensagem' => $mensagem,
            ]];
        }

        $erroCurl = trim((string) ($resposta['erro'] ?? ''));
        if ($erroCurl !== '') {
            return [[
                'codigo' => $codigoFallback,
                'mensagem' => $erroCurl,
            ]];
        }

        $body = trim((string) ($resposta['body'] ?? ''));
        if ($body !== '') {
            $bodyResumo = $this->resumirCorpoResposta($body);

            return [[
                'codigo' => $codigoFallback,
                'mensagem' => "HTTP {$codigoFallback}: {$bodyResumo}",
            ]];
        }

        return [[
            'codigo' => $codigoFallback,
            'mensagem' => $mensagemFallback,
        ]];
    }

    /**
     * @param list<array{codigo: string, mensagem: string}> $erros
     */
    private function formatarResumoErros(array $erros): ?string
    {
        if ($erros === []) {
            return null;
        }

        $partes = [];
        foreach ($erros as $erro) {
            $codigo = trim((string) ($erro['codigo'] ?? ''));
            $mensagem = trim((string) ($erro['mensagem'] ?? ''));
            if ($mensagem === '') {
                continue;
            }
            if ($codigo !== '' && $codigo !== 'SEFIN' && !str_contains($mensagem, $codigo)) {
                $partes[] = "[{$codigo}] {$mensagem}";
            } else {
                $partes[] = $mensagem;
            }
        }

        return $partes !== [] ? implode('; ', $partes) : null;
    }

    private function resumirCorpoResposta(string $body): string
    {
        $limpo = preg_replace('/\s+/', ' ', $body) ?? $body;
        $limpo = trim($limpo);
        if (strlen($limpo) > 500) {
            return substr($limpo, 0, 500) . '…';
        }

        return $limpo;
    }

    /**
     * @return array<string, mixed>
     */
    private function tentarReconciliarAposFalhaRede(
        SefinHttpClient $client,
        string $idDps,
        string $xmlEnviado,
        string $mensagemRede,
        int $errno = 0,
    ): array {
        // Erros cURL antes de enviar payload (DNS=6, conexão recusada=7, handshake SSL/mTLS=35,58,59,60,83):
        // a requisição não chegou na Sefin, portanto não deve ficar pendente.
        $errosPreEnvio = [6, 7, 35, 58, 59, 60, 83];
        if (in_array($errno, $errosPreEnvio, true)) {
            return [
                ...$this->baseMeta(),
                'sucesso' => false,
                'pendente' => false,
                'idDps' => $idDps,
                'xmlEnviado' => $xmlEnviado,
                'erro' => "[REDE] {$mensagemRede}",
                'erros' => [['codigo' => 'REDE', 'mensagem' => $mensagemRede]],
            ];
        }

        $head = $client->head('/dps/' . rawurlencode($idDps));
        $statusHead = (int) ($head['status'] ?? 0);
        if ($statusHead === 200) {
            $get = $client->get('/dps/' . rawurlencode($idDps));
            if (($get['status'] ?? 0) === 200) {
                $json = is_array($get['json'] ?? null) ? $get['json'] : [];
                $chave = preg_replace('/\D/', '', (string) ($json['chaveAcesso'] ?? '')) ?? '';
                if (strlen($chave) === 50) {
                    $porChave = $this->consultarPorChave($client, $chave, $idDps);
                    if (($porChave['sucesso'] ?? false) === true) {
                        $porChave['xmlEnviado'] = $xmlEnviado;

                        return $porChave;
                    }
                }
            }

            $msgComDps = $mensagemRede . ' A DPS parece ter sido aceita — consulte pelo Id.';
            return [
                ...$this->baseMeta(),
                'sucesso' => false,
                'pendente' => true,
                'idDps' => $idDps,
                'xmlEnviado' => $xmlEnviado,
                'erro' => "[REDE_COM_DPS] {$msgComDps}",
                'erros' => [[
                    'codigo' => 'REDE_COM_DPS',
                    'mensagem' => $msgComDps,
                ]],
            ];
        }

        if ($statusHead === 404) {
            return [
                ...$this->baseMeta(),
                'sucesso' => false,
                'pendente' => false,
                'idDps' => $idDps,
                'xmlEnviado' => $xmlEnviado,
                'erro' => "[REDE] {$mensagemRede}",
                'erros' => [['codigo' => 'REDE', 'mensagem' => $mensagemRede]],
            ];
        }

        return [
            ...$this->baseMeta(),
            'sucesso' => false,
            'pendente' => true,
            'idDps' => $idDps,
            'xmlEnviado' => $xmlEnviado,
            'erro' => "[REDE] {$mensagemRede}",
            'erros' => [['codigo' => 'REDE', 'mensagem' => $mensagemRede]],
        ];
    }

    private function extrairNumeroNfse(string $xmlNfse): ?string
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        if (!$dom->loadXML($xmlNfse)) {
            return null;
        }

        foreach (['nNFSe', 'Numero', 'numero'] as $tag) {
            $nodes = $dom->getElementsByTagName($tag);
            if ($nodes->length > 0) {
                $valor = trim((string) $nodes->item(0)?->textContent);
                if ($valor !== '') {
                    return $valor;
                }
            }
        }

        return null;
    }

    /**
     * @param mixed $mensagens
     * @return list<array{codigo: string, mensagem: string}>
     */
    private function mapearMensagens(mixed $mensagens): array
    {
        // Objeto único { codigo, descricao } ou string simples.
        if (is_string($mensagens)) {
            $texto = trim($mensagens);
            return $texto === ''
                ? []
                : [['codigo' => 'SEFIN', 'mensagem' => $texto]];
        }

        if (!is_array($mensagens)) {
            return [];
        }

        // Lista associativa única (não é lista de erros).
        $ehLista = array_is_list($mensagens);
        if (!$ehLista && (
            isset($mensagens['codigo'])
            || isset($mensagens['Codigo'])
            || isset($mensagens['code'])
            || isset($mensagens['Code'])
            || isset($mensagens['descricao'])
            || isset($mensagens['Descricao'])
            || isset($mensagens['mensagem'])
            || isset($mensagens['Mensagem'])
            || isset($mensagens['message'])
            || isset($mensagens['Message'])
            || isset($mensagens['complemento'])
            || isset($mensagens['Complemento'])
        )) {
            $mensagens = [$mensagens];
        } elseif (!$ehLista) {
            return [];
        }

        $saida = [];
        foreach ($mensagens as $item) {
            if (is_string($item)) {
                $texto = trim($item);
                if ($texto === '') {
                    continue;
                }
                $saida[] = ['codigo' => 'SEFIN', 'mensagem' => $texto];
                continue;
            }
            if (!is_array($item)) {
                continue;
            }
            $codigo = trim((string) (
                $item['codigo']
                ?? $item['Codigo']
                ?? $item['code']
                ?? $item['Code']
                ?? $item['id']
                ?? $item['Id']
                ?? ''
            ));
            $descricao = trim((string) (
                $item['descricao']
                ?? $item['Descricao']
                ?? $item['mensagem']
                ?? $item['Mensagem']
                ?? $item['message']
                ?? $item['Message']
                ?? $item['motivo']
                ?? $item['Motivo']
                ?? $item['detail']
                ?? $item['Detail']
                ?? $item['title']
                ?? $item['Title']
                ?? $item['erro']
                ?? $item['Erro']
                ?? ''
            ));
            $complemento = trim((string) (
                $item['complemento']
                ?? $item['Complemento']
                ?? $item['detalhe']
                ?? $item['Detalhe']
                ?? $item['campo']
                ?? $item['Campo']
                ?? ''
            ));
            $solucao = trim((string) (
                $item['solucao']
                ?? $item['Solucao']
                ?? $item['orientacao']
                ?? $item['Orientacao']
                ?? ''
            ));
            $mensagem = $descricao;
            if ($complemento !== '') {
                $mensagem = $mensagem !== '' ? "{$mensagem} — {$complemento}" : $complemento;
            }
            if ($solucao !== '') {
                $mensagem = $mensagem !== '' ? "{$mensagem} (Solução: {$solucao})" : $solucao;
            }
            if ($codigo === '' && $mensagem === '') {
                continue;
            }
            $saida[] = [
                'codigo' => $codigo !== '' ? $codigo : 'SEFIN',
                'mensagem' => $mensagem !== '' ? $mensagem : 'Erro Sefin sem descrição',
            ];
        }

        return $saida;
    }

    /**
     * @return array<string, mixed>
     */
    private function baseMeta(): array
    {
        return [
            'provedor' => self::PROVEDOR,
            'versaolayout' => self::VERSAO_LAYOUT,
            'modo' => 'dps',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function erroBase(
        string $mensagem,
        ?string $idDps = null,
        ?string $xmlEnviado = null,
    ): array {
        return [
            ...$this->baseMeta(),
            'sucesso' => false,
            'pendente' => false,
            ...($idDps !== null ? ['idDps' => $idDps] : []),
            ...($xmlEnviado !== null ? ['xmlEnviado' => $xmlEnviado] : []),
            'erro' => "[ADAPTER] {$mensagem}",
            'erros' => [['codigo' => 'ADAPTER', 'mensagem' => $mensagem]],
        ];
    }
}
