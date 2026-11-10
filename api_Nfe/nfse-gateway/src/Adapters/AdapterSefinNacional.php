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
        try {
            [$idInfDps, $xmlDps] = $this->dpsBuilder->montar($payloadNfse, $configJson);
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
                );
            }

            return $this->mapearRespostaEmissao($resposta, $idInfDps, $xmlAssinado);
        } catch (\Throwable $e) {
            return $this->erroBase($e->getMessage());
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
                        'idDps' => (string) ($json['idDps'] ?? $idDps),
                        'chaveAcesso' => $chave !== '' ? $chave : null,
                        'codigoVerificacao' => $chave !== '' ? $chave : null,
                        'xmlEnviado' => $xmlEnviado,
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
                'alertas' => $this->mapearMensagens($json['alertas'] ?? []),
                'erros' => [],
            ];
        }

        if ($status === 403) {
            return [
                ...$this->baseMeta(),
                'sucesso' => false,
                'pendente' => false,
                'idDps' => $idDps,
                'xmlEnviado' => $xmlEnviado,
                'erros' => [[
                    'codigo' => 'CERTIFICADO_MTLS',
                    'mensagem' => 'Certificado digital da transmissão inválido ou fora dos padrões da NFS-e (mTLS)',
                ]],
            ];
        }

        if ($status === 400 || $status === 500) {
            $erros = $this->extrairErrosDaRespostaSefin(
                $resposta,
                (string) $status,
                'Rejeição Sefin Nacional sem detalhe',
            );

            return [
                ...$this->baseMeta(),
                'sucesso' => false,
                'pendente' => false,
                'idDps' => (string) ($json['idDPS'] ?? $json['idDps'] ?? $idDps),
                'xmlEnviado' => $xmlEnviado,
                'erros' => $erros,
                'erro' => $erros[0]['mensagem'] ?? null,
            ];
        }

        // Timeout / 5xx sem corpo / status inesperado → tenta reconciliar
        return [
            ...$this->baseMeta(),
            'sucesso' => false,
            'pendente' => true,
            'idDps' => $idDps,
            'xmlEnviado' => $xmlEnviado,
            'erros' => [[
                'codigo' => 'HTTP_' . $status,
                'mensagem' => 'Resposta inesperada da Sefin. Consulte a DPS pelo Id antes de reemitir.',
            ]],
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

        if ($status === 400 || $status === 401 || $status === 403) {
            $erros = $this->extrairErrosDaRespostaSefin(
                $resposta,
                (string) $status,
                'Falha ao registrar evento de cancelamento na Sefin',
            );

            return [
                ...$this->baseMeta(),
                'sucesso' => false,
                'pendente' => false,
                'chaveAcesso' => $chave,
                'codigoVerificacao' => $chave,
                'xmlEnviado' => $xmlEnviado,
                'erros' => $erros,
                'erro' => $erros[0]['mensagem'] ?? null,
            ];
        }

        return [
            ...$this->baseMeta(),
            'sucesso' => false,
            'pendente' => true,
            'chaveAcesso' => $chave,
            'codigoVerificacao' => $chave,
            'xmlEnviado' => $xmlEnviado,
            'erros' => [[
                'codigo' => 'HTTP_' . $status,
                'mensagem' => 'Resposta inesperada no cancelamento. Consulte os eventos da NFS-e.',
            ]],
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
            return [
                ...$this->baseMeta(),
                'sucesso' => false,
                'pendente' => true,
                'idDps' => $idDps,
                'chaveAcesso' => $chave,
                'codigoVerificacao' => $chave,
                'erro' => (string) ($resposta['erro'] ?? 'Falha de rede'),
                'erros' => [[
                    'codigo' => 'REDE',
                    'mensagem' => (string) ($resposta['erro'] ?? 'Falha de rede'),
                ]],
            ];
        }

        $fallback = match ($status) {
            404 => 'Chave de acesso ou DPS não encontrada',
            403 => 'Consulta não permitida para este certificado',
            401 => 'Não foi possível obter o certificado de cliente',
            default => 'Falha na consulta Sefin Nacional',
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
            'erro' => $erros[0]['mensagem'] ?? null,
        ];
    }

    /**
     * Extrai erros da resposta Sefin em vários formatos conhecidos.
     *
     * Ordem: erros[] → erro (objeto/string) → campos top-level → body bruto → fallback.
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
        if (isset($json['erros'])) {
            $candidatos[] = $json['erros'];
        }
        if (array_key_exists('erro', $json)) {
            $candidatos[] = $json['erro'];
        }
        if (isset($json['mensagens'])) {
            $candidatos[] = $json['mensagens'];
        }
        if (isset($json['messages'])) {
            $candidatos[] = $json['messages'];
        }

        foreach ($candidatos as $candidato) {
            $erros = $this->mapearMensagens($candidato);
            if ($erros !== []) {
                return $erros;
            }
        }

        $codigoTop = trim((string) (
            $json['codigo']
            ?? $json['codigoStatus']
            ?? $json['code']
            ?? ''
        ));
        $mensagemTop = trim((string) (
            $json['descricao']
            ?? $json['motivoStatus']
            ?? $json['mensagem']
            ?? $json['message']
            ?? $json['title']
            ?? $json['detail']
            ?? ''
        ));
        $complementoTop = trim((string) ($json['complemento'] ?? ''));
        if ($mensagemTop !== '' || $complementoTop !== '') {
            $mensagem = $mensagemTop;
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
    ): array {
        $head = $client->head('/dps/' . rawurlencode($idDps));
        if (($head['status'] ?? 0) === 200) {
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

            return [
                ...$this->baseMeta(),
                'sucesso' => false,
                'pendente' => true,
                'idDps' => $idDps,
                'xmlEnviado' => $xmlEnviado,
                'erros' => [[
                    'codigo' => 'REDE_COM_DPS',
                    'mensagem' => $mensagemRede . ' A DPS parece ter sido aceita — consulte pelo Id.',
                ]],
            ];
        }

        return [
            ...$this->baseMeta(),
            'sucesso' => false,
            'pendente' => true,
            'idDps' => $idDps,
            'xmlEnviado' => $xmlEnviado,
            'erro' => $mensagemRede,
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
            || isset($mensagens['descricao'])
            || isset($mensagens['mensagem'])
            || isset($mensagens['message'])
            || isset($mensagens['complemento'])
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
            $codigo = (string) (
                $item['codigo']
                ?? $item['code']
                ?? $item['Codigo']
                ?? ''
            );
            $descricao = trim((string) (
                $item['descricao']
                ?? $item['mensagem']
                ?? $item['message']
                ?? $item['motivo']
                ?? $item['title']
                ?? $item['detail']
                ?? ''
            ));
            $complemento = trim((string) (
                $item['complemento']
                ?? $item['Complemento']
                ?? ''
            ));
            $mensagem = $descricao;
            if ($complemento !== '') {
                $mensagem = $mensagem !== '' ? "{$mensagem} — {$complemento}" : $complemento;
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
    private function erroBase(string $mensagem): array
    {
        return [
            ...$this->baseMeta(),
            'sucesso' => false,
            'pendente' => false,
            'erro' => $mensagem,
            'erros' => [['codigo' => 'ADAPTER', 'mensagem' => $mensagem]],
        ];
    }
}
