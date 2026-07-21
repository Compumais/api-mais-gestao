<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Adapters;

use DOMDocument;
use MaisGestao\NfseGateway\Contract\NfseProvedorAdapter;
use MaisGestao\NfseGateway\Services\AbstractAbrasfAdapter;
use MaisGestao\NfseGateway\Services\CertificadoService;
use SoapClient;

/**
 * Adapter Betha: RPS legado (e-gov) ou DPS Nota Nacional (nota-eletronica.betha.cloud/dps).
 */
final class AdapterBetha extends AbstractAbrasfAdapter implements NfseProvedorAdapter
{
    private const NS_DPS = 'http://www.betha.com.br/e-nota-dps';

    /** Namespace ABRASF 2.02 Betha (ExemplosXML) — mesmo xmlns em homolog e produção. */
    private const NS_BETHA = 'http://www.betha.com.br/e-nota-contribuinte-ws';

    /**
     * @return array<string, list<string>>
     */
    protected function mapaMetodosSoapPadrao(): array
    {
        return [
            self::OPERACAO_EMISSAO => [
                'RecepcionarDps',
                'GerarNfse',
                'gerarNfse',
                'RecepcionarLoteRpsSincrono',
                'recepcionarLoteRps',
                'RecepcionarLoteRps',
            ],
            self::OPERACAO_CONSULTA => [
                'ConsultarStatusDps',
                'consultarNfsePorRps',
                'ConsultarNfsePorRps',
                'ConsultarNfseRps',
            ],
            self::OPERACAO_CANCELAMENTO => [
                'RecepcionarEventoCancelamento',
                'RecepcionarEventoSubstituicao',
                'cancelarNfseV02',
                'cancelarNfse',
                'CancelarNfse',
            ],
        ];
    }

    /**
     * @param array<string, mixed> $configJson
     */
    protected function derivarUrlWsdlOperacao(string $urlBase, string $operacao, array $configJson): string
    {
        // DPS usa um único service.wsdl para todas as operações
        if ($this->urlPareceDps($urlBase)) {
            return $urlBase;
        }

        $segmento = match ($operacao) {
            // Manual ABRASF 2.02 §4.1: Geração de NFS-e é síncrona (1 RPS).
            self::OPERACAO_EMISSAO => $this->resolverSegmentoEmissaoRps($configJson),
            self::OPERACAO_CONSULTA => 'consultarNfsePorRps',
            self::OPERACAO_CANCELAMENTO => 'cancelarNfseV02',
            default => '',
        };

        if ($segmento === '') {
            return '';
        }

        return $this->substituirSegmentoOperacaoWsdl($urlBase, $segmento);
    }

    /**
     * @param array<string, mixed> $configJson
     */
    private function resolverSegmentoEmissaoRps(array $configJson): string
    {
        if (!empty($configJson['usarlotesincrono'])) {
            return 'RecepcionarLoteRpsSincrono';
        }
        if (!empty($configJson['usarloteassincrono'])) {
            return 'recepcionarLoteRps';
        }

        // Padrão: GerarNfse (ExemplosXML/GerarNfse + manual §4.5.3)
        return 'gerarNfse';
    }

    /**
     * @param array<string, mixed> $configJson
     */
    protected function obterUrlWsdlPadraoProvedor(string $operacao, array $configJson): string
    {
        $versao = strtolower((string) ($configJson['versaolayout'] ?? ''));
        $forcarDps = str_contains($versao, 'dps') || str_contains($versao, 'nacional');

        if ($forcarDps) {
            return 'https://nota-eletronica.betha.cloud/dps/ws/service.wsdl';
        }

        $homologacao = $this->obterAmbiente($configJson) === 2;
        $base = $homologacao
            ? 'https://e-gov.betha.com.br/e-nota-contribuinte-test-ws/'
            : 'https://e-gov.betha.com.br/e-nota-contribuinte-ws/';

        return match ($operacao) {
            self::OPERACAO_EMISSAO => $base . $this->resolverSegmentoEmissaoRps($configJson) . '?wsdl',
            self::OPERACAO_CONSULTA => $base . 'consultarNfsePorRps?wsdl',
            self::OPERACAO_CANCELAMENTO => $base . 'cancelarNfseV02?wsdl',
            default => '',
        };
    }

    private function urlPareceDps(string $url): bool
    {
        $u = strtolower($url);

        return str_contains($u, '/dps/')
            || (str_contains($u, 'nota-eletronica.betha.cloud') && str_contains($u, 'service.wsdl'))
            || (str_contains($u, 'nota-eletronica.betha.cloud') && str_contains($u, '/dps'));
    }

    /**
     * WSDL Betha publica soap:address em http://...:80 — o POST SOAP recebe 301 Moved Permanently.
     * Forçamos o endpoint HTTPS correto após carregar o WSDL.
     */
    protected function criarSoapClient(string $wsdl): SoapClient
    {
        $client = parent::criarSoapClient($wsdl);

        if ($this->urlPareceDps($wsdl) || $this->clientEhDps($client)) {
            $client->__setLocation($this->normalizarEndpointSoapDps($wsdl));
        }

        return $client;
    }

    /**
     * @param list<string>|null $metodos
     */
    private function clientEhDps(?SoapClient $client = null): bool
    {
        if ($client === null) {
            return false;
        }

        return $this->ehModoDps($this->listarMetodosSoapDoWsdl($client));
    }

    private function normalizarEndpointSoapDps(string $wsdlOuEndpoint): string
    {
        $endpoint = trim($wsdlOuEndpoint);
        $endpoint = preg_replace('#/service\.wsdl(\?.*)?$#i', '', $endpoint) ?? $endpoint;
        $endpoint = preg_replace('#^http://#i', 'https://', $endpoint) ?? $endpoint;
        $endpoint = preg_replace('#:80(?=/|$)#', '', $endpoint) ?? $endpoint;
        $endpoint = preg_replace('#:443(?=/|$)#', '', $endpoint) ?? $endpoint;

        return rtrim($endpoint, '/');
    }

    /**
     * WSDL DPS (document/literal) exige parâmetro único.
     * RPS Betha usa nfseCabecMsg + nfseDadosMsg (ver CabecalhoSoap/exemploEnvioSoapUi.xml).
     *
     * @return list<mixed>
     */
    protected function montarArgumentosSoapCall(
        string $operacao,
        string $metodo,
        array $configJson,
        string $wsdl,
        \SoapVar $parametro,
    ): array {
        if ($this->urlPareceDps($wsdl)) {
            return [$parametro];
        }

        return parent::montarArgumentosSoapCall($operacao, $metodo, $configJson, $wsdl, $parametro);
    }

    private function obterNamespaceBetha(): string
    {
        return self::NS_BETHA;
    }

    private function montarCabecalhoBetha(): string
    {
        return '<cabecalho xmlns="' . self::NS_BETHA . '" versao="2.02"><versaoDados>2.02</versaoDados></cabecalho>';
    }

    /**
     * Envio SOAP RPS Betha no formato ExemplosXML (nfseCabecMsg + nfseDadosMsg).
     *
     * @param array<string, mixed> $configJson
     * @return array<string, mixed>
     */
    private function enviarSoapBethaRps(
        string $operacao,
        array $configJson,
        string $xmlDados,
        ?string $wsdlOverride = null,
        ?string $metodoOverride = null,
    ): array {
        $wsdl = $wsdlOverride ?? $this->obterUrlWsdlOperacao($configJson, $operacao);

        try {
            $client = $this->criarSoapClient($wsdl);
            $metodo = $metodoOverride ?? $this->resolverMetodoSoap($operacao, $configJson, $wsdl, $client);
            $params = [
                'nfseCabecMsg' => $this->montarCabecalhoBetha(),
                'nfseDadosMsg' => $xmlDados,
            ];
            $resposta = $client->__soapCall($metodo, [$params]);

            return [
                'xmlRetorno' => (string) $client->__getLastResponse(),
                'resposta' => $resposta,
                'metodoSoap' => $metodo,
                'wsdl' => $wsdl,
            ];
        } catch (\SoapFault $fault) {
            throw new \RuntimeException('Falha SOAP NFS-e Betha: ' . $fault->getMessage(), 0, $fault);
        }
    }

    /**
     * @param list<string> $metodos
     */
    private function ehModoDps(array $metodos): bool
    {
        foreach ($metodos as $metodo) {
            if (strcasecmp($metodo, 'RecepcionarDps') === 0) {
                return true;
            }
        }

        return false;
    }

    public function enviarLoteSincrono(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $payloadNfse,
    ): array {
        $wsdl = $this->obterUrlWsdlOperacao($configJson, self::OPERACAO_EMISSAO);
        $client = $this->criarSoapClient($wsdl);
        $metodos = $this->listarMetodosSoapDoWsdl($client);

        if ($this->ehModoDps($metodos)) {
            return $this->enviarDps($configJson, $pfxBase64, $senha, $payloadNfse, $wsdl, $client);
        }

        return $this->enviarLoteRpsLegado($configJson, $pfxBase64, $senha, $payloadNfse, $wsdl);
    }

    /**
     * @param array<string, mixed> $configJson
     * @param array<string, mixed> $payloadNfse
     * @return array<string, mixed>
     */
    private function enviarLoteRpsLegado(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $payloadNfse,
        string $wsdl,
    ): array {
        $certificate = CertificadoService::lerCertificado($pfxBase64, $senha);

        // Manual ABRASF 2.02 §4.1 / ExemplosXML/GerarNfse: emissão unitária síncrona.
        if ($this->deveUsarGerarNfse($configJson, $wsdl)) {
            $wsdlGerar = $this->derivarUrlGerarNfse($wsdl) ?: $wsdl;

            return $this->enviarGerarNfse(
                $configJson,
                $certificate,
                $payloadNfse,
                $wsdlGerar,
            );
        }

        $rps = is_array($payloadNfse['rps'] ?? null) ? $payloadNfse['rps'] : [];
        $numeroLote = (string) ($rps['numero'] ?? '1');
        $tagLoteId = 'lote' . $numeroLote;
        $usarSincrono = (bool) ($configJson['usarlotesincrono'] ?? false);

        $xmlLote = $this->montarEAssinarLoteRpsBetha(
            $payloadNfse,
            $configJson,
            $certificate,
            $tagLoteId,
            $usarSincrono,
        );

        $soap = $this->enviarSoapBethaRps(self::OPERACAO_EMISSAO, $configJson, $xmlLote, $wsdl);
        $recepcao = $this->parseRespostaEnviarLoteRpsBetha((string) ($soap['xmlRetorno'] ?? ''));

        if (($recepcao['numeroNfse'] ?? null) && ($recepcao['codigoVerificacao'] ?? null)) {
            return [
                ...$recepcao,
                'xmlEnviado' => $xmlLote,
                'provedor' => 'betha',
                'versaolayout' => '2.02',
                'wsdl' => $soap['wsdl'] ?? $wsdl,
                'metodoSoap' => $soap['metodoSoap'] ?? null,
                'modo' => 'rps',
            ];
        }

        if (!($recepcao['sucesso'] ?? false) || empty($recepcao['protocolo'])) {
            return [
                ...$recepcao,
                'xmlEnviado' => $xmlLote,
                'provedor' => 'betha',
                'versaolayout' => '2.02',
                'wsdl' => $soap['wsdl'] ?? $wsdl,
                'metodoSoap' => $soap['metodoSoap'] ?? null,
                'modo' => 'rps',
            ];
        }

        $consulta = $this->consultarLoteRpsBetha(
            $configJson,
            (string) $recepcao['protocolo'],
            $wsdl,
        );

        return [
            'sucesso' => (bool) ($consulta['sucesso'] ?? false),
            'numeroNfse' => $consulta['numeroNfse'] ?? null,
            'codigoVerificacao' => $consulta['codigoVerificacao'] ?? null,
            'link' => $consulta['link'] ?? null,
            'protocolo' => $recepcao['protocolo'],
            'xml' => (string) ($consulta['xml'] ?? $soap['xmlRetorno'] ?? ''),
            'xmlEnviado' => $xmlLote,
            'erros' => $consulta['erros'] ?? $recepcao['erros'] ?? [],
            'provedor' => 'betha',
            'versaolayout' => '2.02',
            'wsdl' => $soap['wsdl'] ?? $wsdl,
            'metodoSoap' => $soap['metodoSoap'] ?? null,
            'modo' => 'rps',
            'pendente' => ($consulta['pendente'] ?? false) && empty($consulta['erros']),
        ];
    }

    /**
     * @param array<string, mixed> $configJson
     */
    private function deveUsarGerarNfse(array $configJson, string $wsdl): bool
    {
        if ($this->urlPareceDps($wsdl)) {
            return false;
        }
        if (!empty($configJson['usarlotesincrono']) || !empty($configJson['usarloteassincrono'])) {
            return false;
        }

        // Padrão ABRASF 2.02 / ExemplosXML: GerarNfse para emissão unitária.
        return true;
    }

    private function urlPareceGerarNfse(string $url): bool
    {
        return stripos($url, 'gerarNfse') !== false;
    }

    private function derivarUrlGerarNfse(string $urlBase): string
    {
        if ($this->urlPareceGerarNfse($urlBase)) {
            return $urlBase;
        }

        return $this->substituirSegmentoOperacaoWsdl($urlBase, 'gerarNfse');
    }

    /**
     * GerarNfseEnvio (ExemplosXML/GerarNfse) — 1 RPS assinado, resposta síncrona.
     *
     * @param array<string, mixed> $configJson
     * @param array<string, mixed> $payloadNfse
     * @return array<string, mixed>
     */
    private function enviarGerarNfse(
        array $configJson,
        \NFePHP\Common\Certificate $certificate,
        array $payloadNfse,
        string $wsdl,
    ): array {
        $namespace = $this->obterNamespaceBetha();
        [$idInf, $xmlDeclaracaoStandalone] = $this->montarXmlDeclaracaoBetha($payloadNfse, $configJson, $namespace);
        $xmlDeclaracaoAssinado = $this->assinarXml($xmlDeclaracaoStandalone, $certificate, $idInf);
        $conteudoAssinado = $this->extrairConteudoDeclaracaoAssinada($xmlDeclaracaoAssinado);

        $xml = new DOMDocument('1.0', 'UTF-8');
        $xml->formatOutput = false;
        $envio = $xml->createElement('GerarNfseEnvio');
        $envio->setAttribute('xmlns', $namespace);
        $rpsNode = $xml->createElement('Rps');
        $fragmento = $xml->createDocumentFragment();
        if (!$fragmento->appendXML($conteudoAssinado)) {
            throw new \RuntimeException('Falha ao montar declaração assinada no GerarNfseEnvio');
        }
        $rpsNode->appendChild($fragmento);
        $envio->appendChild($rpsNode);
        $xml->appendChild($envio);
        $xmlEnvio = $xml->saveXML() ?: '';

        $soap = $this->enviarSoapBethaRps(
            self::OPERACAO_EMISSAO,
            $configJson,
            $xmlEnvio,
            $wsdl,
            'GerarNfse',
        );
        $resultado = $this->parseRespostaGerarNfseBetha((string) ($soap['xmlRetorno'] ?? ''));

        return [
            ...$resultado,
            'xmlEnviado' => $xmlEnvio,
            'provedor' => 'betha',
            'versaolayout' => '2.02',
            'wsdl' => $soap['wsdl'] ?? $wsdl,
            'metodoSoap' => $soap['metodoSoap'] ?? 'GerarNfse',
            'modo' => 'rps-gerar',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function parseRespostaGerarNfseBetha(string $xmlRetorno): array
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        if (!$dom->loadXML($xmlRetorno)) {
            return [
                'sucesso' => false,
                'erros' => [['codigo' => 'XML_INVALIDO', 'mensagem' => 'Resposta XML inválida do GerarNfse']],
            ];
        }

        $xpath = new \DOMXPath($dom);
        $numeroNfse = $this->extrairValorXPath($xpath, '//*[local-name()="InfNfse"]/*[local-name()="Numero"]');
        if ($numeroNfse === '') {
            $numeroNfse = $this->extrairValorXPath($xpath, '//*[local-name()="CompNfse"]//*[local-name()="Numero"]');
        }
        $codigoVerificacao = $this->extrairValorXPath(
            $xpath,
            '//*[local-name()="InfNfse"]/*[local-name()="CodigoVerificacao"]',
        );
        if ($codigoVerificacao === '') {
            $codigoVerificacao = $this->extrairValorXPath(
                $xpath,
                '//*[local-name()="CompNfse"]//*[local-name()="CodigoVerificacao"]',
            );
        }
        $link = $this->extrairValorXPath($xpath, '//*[local-name()="Link"]');
        $codigo = $this->extrairValorXPath($xpath, '//*[local-name()="Codigo"]');
        $mensagem = $this->extrairValorXPath($xpath, '//*[local-name()="Mensagem"]');
        $correcao = $this->extrairValorXPath($xpath, '//*[local-name()="Correcao"]');

        $sucesso = $numeroNfse !== '' && $codigoVerificacao !== '';
        $erros = [];
        if (!$sucesso && ($codigo !== '' || $mensagem !== '')) {
            $texto = $mensagem;
            if ($correcao !== '') {
                $texto = ($texto !== '' ? $texto . ' — ' : '') . $correcao;
            }
            $erros[] = [
                'codigo' => $codigo !== '' ? $codigo : 'GERAR_NFSE',
                'mensagem' => $texto !== '' ? $texto : 'GerarNfse rejeitado pela Betha',
            ];
        }

        return [
            'sucesso' => $sucesso,
            'numeroNfse' => $numeroNfse !== '' ? $numeroNfse : null,
            'codigoVerificacao' => $codigoVerificacao !== '' ? $codigoVerificacao : null,
            'link' => $link !== '' ? $link : null,
            'erros' => $erros,
            'xml' => $xmlRetorno,
        ];
    }

    /**
     * Layout ABRASF 2.02 Betha (ExemplosXML): assina InfDeclaracaoPrestacaoServico e depois LoteRps.
     *
     * @param array<string, mixed> $payloadNfse
     * @param array<string, mixed> $configJson
     */
    private function montarEAssinarLoteRpsBetha(
        array $payloadNfse,
        array $configJson,
        \NFePHP\Common\Certificate $certificate,
        string $tagLoteId,
        bool $usarSincrono = false,
    ): string {
        $namespace = $this->obterNamespaceBetha();
        $prestador = is_array($payloadNfse['prestador'] ?? null) ? $payloadNfse['prestador'] : [];
        $rps = is_array($payloadNfse['rps'] ?? null) ? $payloadNfse['rps'] : [];
        $numeroLote = (string) ($rps['numero'] ?? '1');

        [$idInf, $xmlDeclaracaoStandalone] = $this->montarXmlDeclaracaoBetha($payloadNfse, $configJson, $namespace);
        $xmlDeclaracaoAssinado = $this->assinarXml($xmlDeclaracaoStandalone, $certificate, $idInf);
        $conteudoAssinado = $this->extrairConteudoDeclaracaoAssinada($xmlDeclaracaoAssinado);

        $xml = new DOMDocument('1.0', 'UTF-8');
        $xml->formatOutput = false;

        $rootName = $usarSincrono ? 'EnviarLoteRpsSincronoEnvio' : 'EnviarLoteRpsEnvio';
        $envio = $xml->createElement($rootName);
        $envio->setAttribute('xmlns', $namespace);

        $loteRps = $xml->createElement('LoteRps');
        $loteRps->setAttribute('Id', $tagLoteId);
        $loteRps->setAttribute('versao', '2.02');

        $cnpjPrestador = preg_replace('/\D/', '', (string) ($prestador['cnpj'] ?? $configJson['cnpj'] ?? ''));
        $imPrestador = preg_replace('/\D/', '', (string) ($prestador['im'] ?? $configJson['im'] ?? ''));

        $this->appendText($xml, $loteRps, 'NumeroLote', $numeroLote);
        $cpfCnpjLote = $xml->createElement('CpfCnpj');
        $this->appendText($xml, $cpfCnpjLote, 'Cnpj', (string) $cnpjPrestador);
        $loteRps->appendChild($cpfCnpjLote);
        $this->appendText($xml, $loteRps, 'InscricaoMunicipal', (string) $imPrestador);
        $this->appendText($xml, $loteRps, 'QuantidadeRps', '1');

        $listaRps = $xml->createElement('ListaRps');
        $rpsNode = $xml->createElement('Rps');
        $fragmento = $xml->createDocumentFragment();
        if (!$fragmento->appendXML($conteudoAssinado)) {
            throw new \RuntimeException('Falha ao montar declaração assinada no lote Betha');
        }
        $rpsNode->appendChild($fragmento);
        $listaRps->appendChild($rpsNode);
        $loteRps->appendChild($listaRps);
        $envio->appendChild($loteRps);
        $xml->appendChild($envio);

        $xmlLote = $xml->saveXML() ?: '';

        return $this->assinarXml($xmlLote, $certificate, $tagLoteId);
    }

    /**
     * Monta InfDeclaracaoPrestacaoServico conforme ExemplosXML ABRASF 2.02.
     *
     * @param array<string, mixed> $payloadNfse
     * @param array<string, mixed> $configJson
     * @return array{0: string, 1: string}
     */
    private function montarXmlDeclaracaoBetha(array $payloadNfse, array $configJson, string $namespace): array
    {
        $prestador = is_array($payloadNfse['prestador'] ?? null) ? $payloadNfse['prestador'] : [];
        $tomador = is_array($payloadNfse['tomador'] ?? null) ? $payloadNfse['tomador'] : [];
        $rps = is_array($payloadNfse['rps'] ?? null) ? $payloadNfse['rps'] : [];
        $servico = is_array($payloadNfse['servico'] ?? null) ? $payloadNfse['servico'] : [];
        $valores = is_array($servico['valores'] ?? null) ? $servico['valores'] : [];

        $cnpjPrestador = preg_replace('/\D/', '', (string) ($prestador['cnpj'] ?? $configJson['cnpj'] ?? ''));
        $imPrestador = preg_replace('/\D/', '', (string) ($prestador['im'] ?? $configJson['im'] ?? ''));
        $codigoMunicipio = (string) ($prestador['municipioIbge'] ?? $configJson['codigomunicipioibge'] ?? '');
        $numeroRps = (string) ($rps['numero'] ?? '1');
        $idInf = 'rps' . $numeroRps;

        $dataEmissao = substr((string) ($rps['dataEmissao'] ?? date('Y-m-d')), 0, 10);
        $competencia = substr((string) ($rps['competencia'] ?? $dataEmissao), 0, 10);
        // CodigoMunicipio = município de prestação; MunicipioIncidencia = incidência do ISS.
        $codigoPrestacao = (string) (
            $servico['codigoMunicipioPrestacao']
            ?? $servico['codigoMunicipioIncidencia']
            ?? $codigoMunicipio
        );
        $codigoIncidencia = (string) ($servico['codigoMunicipioIncidencia'] ?? $codigoPrestacao);
        $itemLista = $this->normalizarItemListaServico((string) ($servico['itemListaServico'] ?? ''));
        $issRetido = (string) ($servico['issRetido'] ?? '2');

        $xml = new DOMDocument('1.0', 'UTF-8');
        $xml->formatOutput = false;

        $rpsRoot = $xml->createElement('Rps');
        $rpsRoot->setAttribute('xmlns', $namespace);

        $inf = $xml->createElement('InfDeclaracaoPrestacaoServico');
        $inf->setAttribute('Id', $idInf);

        $rpsIdent = $xml->createElement('Rps');
        $ident = $xml->createElement('IdentificacaoRps');
        $this->appendText($xml, $ident, 'Numero', $numeroRps);
        $this->appendText($xml, $ident, 'Serie', (string) ($rps['serie'] ?? '1'));
        $this->appendText($xml, $ident, 'Tipo', (string) ($rps['tipo'] ?? '1'));
        $rpsIdent->appendChild($ident);
        $this->appendText($xml, $rpsIdent, 'DataEmissao', $dataEmissao);
        $this->appendText($xml, $rpsIdent, 'Status', '1');
        $inf->appendChild($rpsIdent);

        $this->appendText($xml, $inf, 'Competencia', $competencia);

        $servicoNode = $xml->createElement('Servico');
        $valoresNode = $xml->createElement('Valores');
        $this->appendText($xml, $valoresNode, 'ValorServicos', $this->formatDecimal($valores['servicos'] ?? 0));
        $this->appendValorOpcionalZeravel($xml, $valoresNode, 'ValorDeducoes', $valores['deducoes'] ?? null);
        $this->appendValorOpcionalZeravel($xml, $valoresNode, 'ValorPis', $valores['pis'] ?? null);
        $this->appendValorOpcionalZeravel($xml, $valoresNode, 'ValorCofins', $valores['cofins'] ?? null);
        $this->appendValorOpcionalZeravel($xml, $valoresNode, 'ValorInss', $valores['inss'] ?? null);
        $this->appendValorOpcionalZeravel($xml, $valoresNode, 'ValorIr', $valores['ir'] ?? null);
        $this->appendValorOpcionalZeravel($xml, $valoresNode, 'ValorCsll', $valores['csll'] ?? null);
        $this->appendValorOpcionalZeravel($xml, $valoresNode, 'OutrasRetencoes', $valores['outrasRetencoes'] ?? null);
        $this->appendValorOpcionalZeravel($xml, $valoresNode, 'ValorIss', $valores['iss'] ?? null);
        if (isset($valores['aliquota']) && $valores['aliquota'] !== '' && $valores['aliquota'] !== null) {
            $this->appendText($xml, $valoresNode, 'Aliquota', $this->formatDecimal($valores['aliquota'], 2));
        }
        $this->appendValorOpcionalZeravel($xml, $valoresNode, 'DescontoIncondicionado', $valores['descontoIncondicionado'] ?? null);
        $this->appendValorOpcionalZeravel($xml, $valoresNode, 'DescontoCondicionado', $valores['descontoCondicionado'] ?? null);
        $servicoNode->appendChild($valoresNode);

        $this->appendText($xml, $servicoNode, 'IssRetido', $issRetido);
        if ($issRetido === '1') {
            // Manual ABRASF 2.02: 1=Tomador, 2=Intermediário
            $this->appendText(
                $xml,
                $servicoNode,
                'ResponsavelRetencao',
                (string) ($servico['responsavelRetencao'] ?? '1'),
            );
        }
        $this->appendText($xml, $servicoNode, 'ItemListaServico', $itemLista);
        if (!empty($servico['codigoCnae'])) {
            $this->appendText($xml, $servicoNode, 'CodigoCnae', preg_replace('/\D/', '', (string) $servico['codigoCnae']));
        }
        if (!empty($servico['codigoTributacaoMunicipio'])) {
            $this->appendText($xml, $servicoNode, 'CodigoTributacaoMunicipio', (string) $servico['codigoTributacaoMunicipio']);
        }
        $this->appendText($xml, $servicoNode, 'Discriminacao', (string) ($servico['discriminacao'] ?? ''));
        $this->appendText($xml, $servicoNode, 'CodigoMunicipio', $codigoPrestacao);
        $this->appendText($xml, $servicoNode, 'ExigibilidadeISS', (string) ($servico['exigibilidadeIss'] ?? '1'));
        if ($codigoIncidencia !== '') {
            $this->appendText($xml, $servicoNode, 'MunicipioIncidencia', $codigoIncidencia);
        }
        $inf->appendChild($servicoNode);

        $prestadorNode = $xml->createElement('Prestador');
        $cpfCnpjPrest = $xml->createElement('CpfCnpj');
        $this->appendText($xml, $cpfCnpjPrest, 'Cnpj', (string) $cnpjPrestador);
        $prestadorNode->appendChild($cpfCnpjPrest);
        $this->appendText($xml, $prestadorNode, 'InscricaoMunicipal', (string) $imPrestador);
        $inf->appendChild($prestadorNode);

        $tomadorNode = $xml->createElement('Tomador');
        $identTomador = $xml->createElement('IdentificacaoTomador');
        $cpfCnpjTom = $xml->createElement('CpfCnpj');
        $docTomador = preg_replace('/\D/', '', (string) ($tomador['cnpjCpf'] ?? ''));
        if (strlen((string) $docTomador) === 11) {
            $this->appendText($xml, $cpfCnpjTom, 'Cpf', (string) $docTomador);
        } elseif ($docTomador !== '') {
            $this->appendText($xml, $cpfCnpjTom, 'Cnpj', (string) $docTomador);
        }
        $identTomador->appendChild($cpfCnpjTom);
        $tomadorNode->appendChild($identTomador);
        $this->appendText($xml, $tomadorNode, 'RazaoSocial', (string) ($tomador['razaoSocial'] ?? ''));

        $endereco = is_array($tomador['endereco'] ?? null) ? $tomador['endereco'] : [];
        if ($endereco !== []) {
            $enderecoNode = $xml->createElement('Endereco');
            if (!empty($endereco['logradouro'])) {
                $this->appendText($xml, $enderecoNode, 'Endereco', (string) $endereco['logradouro']);
            }
            if (!empty($endereco['numero'])) {
                $this->appendText($xml, $enderecoNode, 'Numero', (string) $endereco['numero']);
            }
            if (!empty($endereco['complemento'])) {
                $this->appendText($xml, $enderecoNode, 'Complemento', (string) $endereco['complemento']);
            }
            if (!empty($endereco['bairro'])) {
                $this->appendText($xml, $enderecoNode, 'Bairro', (string) $endereco['bairro']);
            }
            if (!empty($endereco['codigoMunicipioIbge'])) {
                $this->appendText($xml, $enderecoNode, 'CodigoMunicipio', (string) $endereco['codigoMunicipioIbge']);
            }
            if (!empty($endereco['uf'])) {
                $this->appendText($xml, $enderecoNode, 'Uf', (string) $endereco['uf']);
            }
            if (!empty($endereco['cep'])) {
                $this->appendText($xml, $enderecoNode, 'Cep', preg_replace('/\D/', '', (string) $endereco['cep']));
            }
            $tomadorNode->appendChild($enderecoNode);
        }

        if (!empty($tomador['email'])) {
            $contato = $xml->createElement('Contato');
            $this->appendText($xml, $contato, 'Email', (string) $tomador['email']);
            $tomadorNode->appendChild($contato);
        }

        $inf->appendChild($tomadorNode);
        $this->appendText($xml, $inf, 'OptanteSimplesNacional', (string) ($prestador['optanteSimplesNacional'] ?? '2'));
        $this->appendText($xml, $inf, 'IncentivoFiscal', (string) ($prestador['incentivoFiscal'] ?? '2'));

        $rpsRoot->appendChild($inf);
        $xml->appendChild($rpsRoot);

        return [$idInf, $xml->saveXML() ?: ''];
    }

    /**
     * Inclui valor quando informado (incluindo zero, como nos ExemplosXML populados).
     */
    private function appendValorOpcionalZeravel(
        DOMDocument $xml,
        \DOMElement $parent,
        string $tag,
        mixed $valor,
    ): void {
        if ($valor === null || $valor === '') {
            return;
        }
        $this->appendText($xml, $parent, $tag, $this->formatDecimal($valor));
    }

    /**
     * Manual ABRASF 2.02 tsItemListaServico (tam. 5) + ExemplosXML (`0702`, sem ponto).
     */
    private function normalizarItemListaServico(string $item): string
    {
        $digitos = preg_replace('/\D/', '', $item) ?? '';
        if ($digitos === '') {
            return trim($item);
        }

        // LC 116 costuma vir como 7.02 / 07.02 → 0702
        if (strlen($digitos) <= 4) {
            return str_pad($digitos, 4, '0', STR_PAD_LEFT);
        }

        return substr($digitos, 0, 5);
    }

    private function extrairConteudoDeclaracaoAssinada(string $xmlAssinado): string
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        if (!$dom->loadXML($xmlAssinado)) {
            throw new \RuntimeException('XML declaração Betha inválido após assinatura');
        }

        $xpath = new \DOMXPath($dom);
        $infNodes = $xpath->query('//*[local-name()="InfDeclaracaoPrestacaoServico"]');
        if ($infNodes === false || $infNodes->length === 0) {
            throw new \RuntimeException('InfDeclaracaoPrestacaoServico não encontrado após assinatura');
        }

        $conteudo = '';
        /** @var \DOMElement $inf */
        $inf = $infNodes->item(0);
        $conteudo .= $dom->saveXML($inf) ?: '';

        $signatureNodes = $xpath->query('//*[local-name()="Signature"]');
        if ($signatureNodes !== false && $signatureNodes->length > 0) {
            /** @var \DOMElement $signature */
            $signature = $signatureNodes->item(0);
            $conteudo .= $dom->saveXML($signature) ?: '';
        }

        return $conteudo;
    }

    /**
     * @param array<string, mixed> $configJson
     * @return array<string, mixed>
     */
    private function consultarLoteRpsBetha(array $configJson, string $protocolo, string $wsdlEmissao): array
    {
        $namespace = $this->obterNamespaceBetha();
        $cnpj = preg_replace('/\D/', '', (string) ($configJson['cnpj'] ?? ''));

        $wsdlConsulta = $this->derivarUrlConsultarLoteRps($wsdlEmissao);
        if ($wsdlConsulta === '') {
            $homologacao = $this->obterAmbiente($configJson) === 2;
            $base = $homologacao
                ? 'https://e-gov.betha.com.br/e-nota-contribuinte-test-ws/'
                : 'https://e-gov.betha.com.br/e-nota-contribuinte-ws/';
            $wsdlConsulta = $base . 'consultarLoteRps?wsdl';
        }

        $xml = new DOMDocument('1.0', 'UTF-8');
        $consulta = $xml->createElement('ConsultarLoteRpsEnvio');
        $consulta->setAttribute('xmlns', $namespace);
        $prestador = $xml->createElement('Prestador');
        $cpfCnpj = $xml->createElement('CpfCnpj');
        $this->appendText($xml, $cpfCnpj, 'Cnpj', (string) $cnpj);
        $prestador->appendChild($cpfCnpj);
        $consulta->appendChild($prestador);
        $this->appendText($xml, $consulta, 'Protocolo', $protocolo);
        $xml->appendChild($consulta);

        $xmlEnvio = $xml->saveXML() ?: '';

        $resultado = [
            'sucesso' => false,
            'pendente' => true,
            'erros' => [],
        ];

        for ($tentativa = 0; $tentativa < 5; $tentativa++) {
            if ($tentativa > 0) {
                usleep(500_000);
            }

            $soap = $this->enviarSoapBethaRps(
                self::OPERACAO_CONSULTA,
                $configJson,
                $xmlEnvio,
                $wsdlConsulta,
                'ConsultarLoteRps',
            );
            $resultado = $this->parseRespostaConsultaLoteRpsBetha((string) ($soap['xmlRetorno'] ?? ''));

            if (($resultado['sucesso'] ?? false) || !($resultado['pendente'] ?? false)) {
                return $resultado;
            }
        }

        return $resultado;
    }

    private function derivarUrlConsultarLoteRps(string $urlBase): string
    {
        if ($this->urlPareceDps($urlBase)) {
            return '';
        }

        return $this->substituirSegmentoOperacaoWsdl($urlBase, 'consultarLoteRps');
    }

    /**
     * @return array<string, mixed>
     */
    private function parseRespostaEnviarLoteRpsBetha(string $xmlRetorno): array
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        if (!$dom->loadXML($xmlRetorno)) {
            return [
                'sucesso' => false,
                'erros' => [['codigo' => 'XML_INVALIDO', 'mensagem' => 'Resposta XML inválida do RecepcionarLoteRps']],
            ];
        }

        $xpath = new \DOMXPath($dom);
        $protocolo = $this->extrairValorXPath($xpath, '//*[local-name()="Protocolo"]');
        $numeroLote = $this->extrairValorXPath($xpath, '//*[local-name()="NumeroLote"]');
        $codigo = $this->extrairValorXPath($xpath, '//*[local-name()="Codigo"]');
        $mensagem = $this->extrairValorXPath($xpath, '//*[local-name()="Mensagem"]');

        $numeroNfse = $this->extrairValorXPath($xpath, '//*[local-name()="InfNfse"]/*[local-name()="Numero"]');
        $codigoVerificacao = $this->extrairValorXPath(
            $xpath,
            '//*[local-name()="InfNfse"]/*[local-name()="CodigoVerificacao"]',
        );

        $sucessoDireto = $numeroNfse !== '' && $codigoVerificacao !== '';
        $sucesso = $sucessoDireto || $protocolo !== '';
        $erros = [];
        if (!$sucesso && ($codigo !== '' || $mensagem !== '')) {
            $erros[] = [
                'codigo' => $codigo !== '' ? $codigo : 'LOTE_REJEITADO',
                'mensagem' => $mensagem !== '' ? $mensagem : 'Recepção do lote RPS rejeitada pela Betha',
            ];
        }

        return [
            'sucesso' => $sucesso,
            'protocolo' => $protocolo !== '' ? $protocolo : null,
            'numeroLote' => $numeroLote !== '' ? $numeroLote : null,
            'numeroNfse' => $numeroNfse !== '' ? $numeroNfse : null,
            'codigoVerificacao' => $codigoVerificacao !== '' ? $codigoVerificacao : null,
            'erros' => $erros,
            'xml' => $xmlRetorno,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function parseRespostaConsultaLoteRpsBetha(string $xmlRetorno): array
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        if (!$dom->loadXML($xmlRetorno)) {
            return [
                'sucesso' => false,
                'erros' => [['codigo' => 'XML_INVALIDO', 'mensagem' => 'Resposta XML inválida do ConsultarLoteRps']],
            ];
        }

        $xpath = new \DOMXPath($dom);
        $numeroNfse = $this->extrairValorXPath($xpath, '//*[local-name()="InfNfse"]/*[local-name()="Numero"]');
        if ($numeroNfse === '') {
            $numeroNfse = $this->extrairValorXPath($xpath, '//*[local-name()="CompNfse"]//*[local-name()="Numero"]');
        }

        $codigoVerificacao = $this->extrairValorXPath(
            $xpath,
            '//*[local-name()="InfNfse"]/*[local-name()="CodigoVerificacao"]',
        );
        if ($codigoVerificacao === '') {
            $codigoVerificacao = $this->extrairValorXPath(
                $xpath,
                '//*[local-name()="CompNfse"]//*[local-name()="CodigoVerificacao"]',
            );
        }

        $codigo = $this->extrairValorXPath($xpath, '//*[local-name()="Codigo"]');
        $mensagem = $this->extrairValorXPath($xpath, '//*[local-name()="Mensagem"]');
        $situacao = $this->extrairValorXPath($xpath, '//*[local-name()="Situacao"]');

        $sucesso = $numeroNfse !== '' && $codigoVerificacao !== '';
        $pendente = !$sucesso && $situacao === '2';

        $erros = [];
        if (!$sucesso && !$pendente && ($codigo !== '' || $mensagem !== '')) {
            $erros[] = [
                'codigo' => $codigo !== '' ? $codigo : 'CONSULTA_LOTE',
                'mensagem' => $mensagem !== '' ? $mensagem : 'Consulta de lote não retornou NFS-e',
            ];
        }

        return [
            'sucesso' => $sucesso,
            'numeroNfse' => $numeroNfse !== '' ? $numeroNfse : null,
            'codigoVerificacao' => $codigoVerificacao !== '' ? $codigoVerificacao : null,
            'pendente' => $pendente,
            'erros' => $erros,
            'xml' => $xmlRetorno,
        ];
    }

    /**
     * @param array<string, mixed> $configJson
     * @param array<string, mixed> $payloadNfse
     * @return array<string, mixed>
     */
    private function enviarDps(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $payloadNfse,
        string $wsdl,
        SoapClient $client,
    ): array {
        $certificate = CertificadoService::lerCertificado($pfxBase64, $senha);

        $xmlDps = $this->montarXmlDps($payloadNfse, $configJson);
        $idInfDps = $this->extrairIdInfDps($xmlDps);

        $xmlAssinado = $this->assinarXml($xmlDps, $certificate, $idInfDps);
        // XSD TDPS: Signature filha de DPS (após infDPS), não irmã de DPS no envelope.
        $xmlAssinado = $this->reposicionarSignatureNoPai($xmlAssinado, 'DPS');
        $soap = $this->enviarSoapOperacao(self::OPERACAO_EMISSAO, $configJson, $xmlAssinado, $wsdl);
        $xmlRetorno = (string) ($soap['xmlRetorno'] ?? '');
        $recepcao = $this->parseRespostaRecepcionarDps($xmlRetorno);

        if (!($recepcao['sucesso'] ?? false) || empty($recepcao['protocolo'])) {
            return [
                ...$recepcao,
                'xmlEnviado' => $xmlAssinado,
                'xml' => $xmlRetorno,
                'provedor' => 'betha',
                'versaolayout' => 'dps-1.01',
                'wsdl' => $wsdl,
                'metodoSoap' => $soap['metodoSoap'] ?? 'RecepcionarDps',
                'modo' => 'dps',
            ];
        }

        $consulta = $this->consultarStatusDps(
            $configJson,
            $wsdl,
            (string) $recepcao['protocolo'],
            'EMISSAO',
            $client,
        );

        $numeroNfse = $consulta['numeroNfse'] ?? null;
        $autorizada = ($consulta['sucesso'] ?? false) && $numeroNfse;

        return [
            'sucesso' => (bool) ($consulta['sucesso'] ?? $recepcao['sucesso']),
            'numeroNfse' => $numeroNfse,
            'codigoVerificacao' => $consulta['codigoVerificacao'] ?? $consulta['chaveAcesso'] ?? null,
            'link' => $consulta['link'] ?? null,
            'protocolo' => $recepcao['protocolo'],
            'xml' => (string) ($consulta['xml'] ?? $xmlRetorno),
            'xmlEnviado' => $xmlAssinado,
            'erros' => $consulta['erros'] ?? $recepcao['erros'] ?? [],
            'provedor' => 'betha',
            'versaolayout' => 'dps-1.01',
            'wsdl' => $wsdl,
            'metodoSoap' => $soap['metodoSoap'] ?? 'RecepcionarDps',
            'modo' => 'dps',
            'statusProcessamento' => $consulta['statusProcessamento'] ?? $recepcao['status'] ?? null,
            'pendente' => !$autorizada && empty($consulta['erros']),
        ];
    }

    /**
     * @param array<string, mixed> $payloadNfse
     * @param array<string, mixed> $configJson
     */
    private function montarXmlDps(array $payloadNfse, array $configJson): string
    {
        $prestador = is_array($payloadNfse['prestador'] ?? null) ? $payloadNfse['prestador'] : [];
        $tomador = is_array($payloadNfse['tomador'] ?? null) ? $payloadNfse['tomador'] : [];
        $rps = is_array($payloadNfse['rps'] ?? null) ? $payloadNfse['rps'] : [];
        $servico = is_array($payloadNfse['servico'] ?? null) ? $payloadNfse['servico'] : [];
        $valores = is_array($servico['valores'] ?? null) ? $servico['valores'] : [];

        $cnpj = preg_replace('/\D/', '', (string) ($prestador['cnpj'] ?? $configJson['cnpj'] ?? '')) ?? '';
        $cLocEmi = (string) ($prestador['municipioIbge'] ?? $configJson['codigomunicipioibge'] ?? '');
        $serie = preg_replace('/\D/', '', (string) ($rps['serie'] ?? '1')) ?: '1';
        $nDps = preg_replace('/\D/', '', (string) ($rps['numero'] ?? '1')) ?: '1';
        $seriePad = str_pad(substr($serie, -5), 5, '0', STR_PAD_LEFT);
        $nDpsPad = str_pad(substr($nDps, -15), 15, '0', STR_PAD_LEFT);
        // Leiaute: DPS + mun(7) + tpInsc(1) + doc(14) + série(5) + nDPS(15) = 45
        $tpInscFederal = strlen($cnpj) === 11 ? '1' : '2';
        $docFederalPad = str_pad(substr($cnpj, -14), 14, '0', STR_PAD_LEFT);
        $idInfDps = 'DPS' . $cLocEmi . $tpInscFederal . $docFederalPad . $seriePad . $nDpsPad;

        $tpAmb = (string) $this->obterAmbiente($configJson);
        $tz = new \DateTimeZone('America/Sao_Paulo');
        $agora = new \DateTimeImmutable('now', $tz);
        $dhEmi = (string) ($rps['dataEmissao'] ?? $agora->format('Y-m-d\TH:i:sP'));
        if (!str_contains($dhEmi, 'T')) {
            $dhEmi .= 'T' . $agora->format('H:i:sP');
        } elseif (!preg_match('/(?:Z|[+-]\d{2}:\d{2})$/i', $dhEmi)) {
            $dhEmi .= $agora->format('P');
        }
        $dCompet = (string) ($rps['competencia'] ?? substr($dhEmi, 0, 10));

        $optante = (string) ($prestador['optanteSimplesNacional'] ?? '2');
        // DPS opSimpNac: 1=não optante, 2=MEI, 3=ME/EPP
        // Prefere opSimpNac explícito; senão mapeia optanteSimplesNacional (1=SN ME/EPP, mei/4=MEI, 2=não)
        if (isset($prestador['opSimpNac']) && (string) $prestador['opSimpNac'] !== '') {
            $opSimpNac = (string) $prestador['opSimpNac'];
        } elseif ($optante === '1') {
            $opSimpNac = '3';
        } elseif ($optante === 'mei' || $optante === '4') {
            $opSimpNac = '2';
        } else {
            $opSimpNac = '1';
        }

        $issRetido = (string) ($servico['issRetido'] ?? '2');
        $tpRetISSQN = $issRetido === '1' ? '2' : '1';

        $cTribNacFonte = (string) ($servico['codigoTributacaoNacional'] ?? $servico['itemListaServico'] ?? '');
        $cTribNac = preg_replace('/\D/', '', $cTribNacFonte) ?? '';
        $cTribNac = str_pad(substr($cTribNac, 0, 6), 6, '0', STR_PAD_LEFT);
        if (!preg_match('/^\d{6}$/', $cTribNac)) {
            throw new \RuntimeException('cTribNac inválido: informe código de tributação nacional com 6 dígitos');
        }

        $cNbs = preg_replace('/\D/', '', (string) ($servico['codigoNbs'] ?? '')) ?? '';
        if (!preg_match('/^\d{9}$/', $cNbs)) {
            throw new \RuntimeException('cNBS inválido: informe código NBS com 9 dígitos');
        }

        $cLocPrestacao = (string) ($servico['codigoMunicipioIncidencia'] ?? $cLocEmi);
        $aliquota = $this->formatDecimal($valores['aliquota'] ?? 0, 2);
        $vServ = $this->formatDecimal($valores['servicos'] ?? 0);

        $xml = new DOMDocument('1.0', 'UTF-8');
        $xml->formatOutput = false;

        $envio = $xml->createElementNS(self::NS_DPS, 'RecepcionarDpsEnvio');
        $dps = $xml->createElementNS(self::NS_DPS, 'DPS');
        $dps->setAttribute('versao', '1.01');

        $inf = $xml->createElementNS(self::NS_DPS, 'infDPS');
        $inf->setAttribute('id', $idInfDps);

        $this->appendNsText($xml, $inf, 'tpAmb', $tpAmb);
        $this->appendNsText($xml, $inf, 'dhEmi', $dhEmi);
        $this->appendNsText($xml, $inf, 'verAplic', 'mais-gestao_1.0');
        $this->appendNsText($xml, $inf, 'serie', $seriePad);
        $this->appendNsText($xml, $inf, 'nDPS', $nDps);
        $this->appendNsText($xml, $inf, 'dCompet', substr($dCompet, 0, 10));
        $this->appendNsText($xml, $inf, 'tpEmit', '1');
        $this->appendNsText($xml, $inf, 'cLocEmi', $cLocEmi);

        $prest = $xml->createElementNS(self::NS_DPS, 'prest');
        $this->appendNsText($xml, $prest, 'CNPJ', $cnpj);
        $imPrestador = preg_replace('/\D/', '', (string) ($prestador['im'] ?? $configJson['im'] ?? ''));
        if ($imPrestador !== '') {
            $this->appendNsText($xml, $prest, 'IM', (string) $imPrestador);
        }
        $fonePrest = preg_replace('/\D/', '', (string) ($prestador['telefone'] ?? $prestador['fone'] ?? $configJson['telefone'] ?? ''));
        if ($fonePrest !== '') {
            $this->appendNsText($xml, $prest, 'fone', (string) $fonePrest);
        }
        $emailPrest = trim((string) ($prestador['email'] ?? $configJson['email'] ?? ''));
        if ($emailPrest !== '') {
            $this->appendNsText($xml, $prest, 'email', $emailPrest);
        }
        $regTrib = $xml->createElementNS(self::NS_DPS, 'regTrib');
        $this->appendNsText($xml, $regTrib, 'opSimpNac', $opSimpNac);
        // regApTribSN só para optante ME/EPP (opSimpNac=3) — NT004 / exemplos Betha
        if ($opSimpNac === '3') {
            $regApTribSN = (string) ($prestador['regApTribSN'] ?? '1');
            $this->appendNsText($xml, $regTrib, 'regApTribSN', $regApTribSN);
        }
        $this->appendNsText($xml, $regTrib, 'regEspTrib', '0');
        $prest->appendChild($regTrib);
        $inf->appendChild($prest);

        $toma = $xml->createElementNS(self::NS_DPS, 'toma');
        $docTomador = preg_replace('/\D/', '', (string) ($tomador['cnpjCpf'] ?? ''));
        if (strlen((string) $docTomador) === 11) {
            $this->appendNsText($xml, $toma, 'CPF', (string) $docTomador);
        } else {
            $this->appendNsText($xml, $toma, 'CNPJ', (string) $docTomador);
        }
        $this->appendNsText($xml, $toma, 'xNome', (string) ($tomador['razaoSocial'] ?? 'TOMADOR'));

        $endereco = is_array($tomador['endereco'] ?? null) ? $tomador['endereco'] : [];
        if ($endereco !== []) {
            $end = $xml->createElementNS(self::NS_DPS, 'end');
            $endNac = $xml->createElementNS(self::NS_DPS, 'endNac');
            $this->appendNsText($xml, $endNac, 'cMun', (string) ($endereco['codigoMunicipioIbge'] ?? $cLocEmi));
            $cep = preg_replace('/\D/', '', (string) ($endereco['cep'] ?? ''));
            if ($cep !== '') {
                $this->appendNsText($xml, $endNac, 'CEP', (string) $cep);
            }
            $end->appendChild($endNac);
            $this->appendNsText($xml, $end, 'xLgr', (string) ($endereco['logradouro'] ?? 'NAO INFORMADO'));
            $this->appendNsText($xml, $end, 'nro', (string) ($endereco['numero'] ?? 'S/N'));
            if (!empty($endereco['complemento'])) {
                $this->appendNsText($xml, $end, 'xCpl', (string) $endereco['complemento']);
            }
            $this->appendNsText($xml, $end, 'xBairro', (string) ($endereco['bairro'] ?? 'CENTRO'));
            $toma->appendChild($end);
        }
        $foneToma = preg_replace('/\D/', '', (string) ($tomador['telefone'] ?? $tomador['fone'] ?? ''));
        if ($foneToma !== '') {
            $this->appendNsText($xml, $toma, 'fone', (string) $foneToma);
        }
        $emailToma = trim((string) ($tomador['email'] ?? ''));
        if ($emailToma !== '') {
            $this->appendNsText($xml, $toma, 'email', $emailToma);
        }
        $inf->appendChild($toma);

        $serv = $xml->createElementNS(self::NS_DPS, 'serv');
        $locPrest = $xml->createElementNS(self::NS_DPS, 'locPrest');
        $this->appendNsText($xml, $locPrest, 'cLocPrestacao', $cLocPrestacao);
        $serv->appendChild($locPrest);
        $cServ = $xml->createElementNS(self::NS_DPS, 'cServ');
        $this->appendNsText($xml, $cServ, 'cTribNac', $cTribNac);
        $cTribMun = preg_replace('/\D/', '', (string) ($servico['codigoTributacaoMunicipio'] ?? ''));
        if ($cTribMun !== null && strlen($cTribMun) === 3) {
            $this->appendNsText($xml, $cServ, 'cTribMun', $cTribMun);
        }
        $this->appendNsText($xml, $cServ, 'xDescServ', (string) ($servico['discriminacao'] ?? 'Servico'));
        $this->appendNsText($xml, $cServ, 'cNBS', $cNbs);
        $serv->appendChild($cServ);
        $inf->appendChild($serv);

        $valoresNode = $xml->createElementNS(self::NS_DPS, 'valores');
        $vServPrest = $xml->createElementNS(self::NS_DPS, 'vServPrest');
        $this->appendNsText($xml, $vServPrest, 'vServ', $vServ);
        $valoresNode->appendChild($vServPrest);
        $trib = $xml->createElementNS(self::NS_DPS, 'trib');
        $tribMun = $xml->createElementNS(self::NS_DPS, 'tribMun');
        $this->appendNsText($xml, $tribMun, 'tribISSQN', '1');
        // Exemplos Betha NT004 sempre enviam pAliq com tribISSQN=1
        $this->appendNsText($xml, $tribMun, 'pAliq', $aliquota);
        $this->appendNsText($xml, $tribMun, 'tpRetISSQN', $tpRetISSQN);
        $trib->appendChild($tribMun);
        $totTrib = $xml->createElementNS(self::NS_DPS, 'totTrib');
        $this->appendNsText($xml, $totTrib, 'indTotTrib', '0');
        $trib->appendChild($totTrib);
        $valoresNode->appendChild($trib);
        $inf->appendChild($valoresNode);

        $this->appendIbsCbsMinimo($xml, $inf, $servico, $opSimpNac);

        $dps->appendChild($inf);
        $envio->appendChild($dps);
        $xml->appendChild($envio);

        return $xml->saveXML() ?: '';
    }

    /**
     * Códigos cIndOp do Anexo VII (NT 007 / V1.01) — whitelist mínima.
     *
     * @return list<string>
     */
    private function codigosIndOpValidos(): array
    {
        return [
            '010101', '010102', '010103', '010104', '010105', '010106', '010201',
            '020101', '020201', '020301',
            '030101', '030102',
            '040101',
            '050101', '050102', '050201',
            '060101',
            '070101', '070102',
            '080101',
            '090101', '090102',
            '100101', '100102', '100201', '100301', '100302', '100401',
            '100501', '100502', '100601',
            '110101', '110201',
            '120101',
            '130101', '130201',
        ];
    }

    /**
     * Grupo IBSCBS mínimo (NT 004).
     *
     * - Opcional até 03/08/2026 (portal NFS-e): se cIndOp não vier, não envia o grupo.
     * - Optantes do Simples (MEI/ME-EPP): não envia no piloto 2026 — IBS/CBS do piloto
     *   não se aplica ao SN; Betha rejeita com E082 quando o grupo vem preenchido.
     * - Quando envia: inclui indFinal (exemplos oficiais) e valida cIndOp no Anexo VII.
     *
     * @param array<string, mixed> $servico
     */
    private function appendIbsCbsMinimo(
        DOMDocument $xml,
        \DOMElement $inf,
        array $servico,
        string $opSimpNac,
    ): void {
        $ibs = is_array($servico['ibsCbs'] ?? null) ? $servico['ibsCbs'] : [];
        $forcarEnvio = !empty($ibs['forcarEnvio']);

        // MEI (2) / ME-EPP (3): omitir IBSCBS salvo forçar (testes / pós-obrigatoriedade)
        if (($opSimpNac === '2' || $opSimpNac === '3') && !$forcarEnvio) {
            return;
        }

        $cIndOpFonte = (string) ($ibs['cIndOp'] ?? '');
        $cIndOp = preg_replace('/\D/', '', $cIndOpFonte) ?? '';
        $cIndOp = str_pad(substr($cIndOp, 0, 6), 6, '0', STR_PAD_LEFT);
        if ($cIndOp === '' || $cIndOp === '000000') {
            return;
        }
        if (!preg_match('/^\d{6}$/', $cIndOp)) {
            throw new \RuntimeException('cIndOp inválido: informe indicador de operação IBS/CBS com 6 dígitos');
        }
        if (!in_array($cIndOp, $this->codigosIndOpValidos(), true)) {
            throw new \RuntimeException(
                "cIndOp {$cIndOp} não consta no Anexo VII (IndOp IBS/CBS). "
                . 'Para serviços de TI remotos/onerosos use 100301 (demais serviços — domicílio do adquirente).'
            );
        }

        $finNFSe = (string) ($ibs['finNFSe'] ?? 0);
        $indFinal = (string) ($ibs['indFinal'] ?? 0);
        $indDest = (string) ($ibs['indDest'] ?? 0);
        $cst = preg_replace('/\D/', '', (string) ($ibs['cst'] ?? '000')) ?? '000';
        $cst = str_pad(substr($cst, 0, 3), 3, '0', STR_PAD_LEFT);
        $cClassTrib = preg_replace('/\D/', '', (string) ($ibs['cClassTrib'] ?? '000001')) ?? '000001';
        $cClassTrib = str_pad(substr($cClassTrib, 0, 6), 6, '0', STR_PAD_LEFT);

        $ibsCbs = $xml->createElementNS(self::NS_DPS, 'IBSCBS');
        $this->appendNsText($xml, $ibsCbs, 'finNFSe', $finNFSe);
        $this->appendNsText($xml, $ibsCbs, 'indFinal', $indFinal);
        $this->appendNsText($xml, $ibsCbs, 'cIndOp', $cIndOp);
        if (isset($ibs['tpOper'])) {
            $this->appendNsText($xml, $ibsCbs, 'tpOper', (string) $ibs['tpOper']);
        }
        $this->appendNsText($xml, $ibsCbs, 'indDest', $indDest);

        $valoresIbs = $xml->createElementNS(self::NS_DPS, 'valores');
        $tribIbs = $xml->createElementNS(self::NS_DPS, 'trib');
        $gIbsCbs = $xml->createElementNS(self::NS_DPS, 'gIBSCBS');
        $this->appendNsText($xml, $gIbsCbs, 'CST', $cst);
        $this->appendNsText($xml, $gIbsCbs, 'cClassTrib', $cClassTrib);
        $tribIbs->appendChild($gIbsCbs);
        $valoresIbs->appendChild($tribIbs);
        $ibsCbs->appendChild($valoresIbs);
        $inf->appendChild($ibsCbs);
    }

    private function extrairIdInfDps(string $xmlDps): string
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        if (!$dom->loadXML($xmlDps)) {
            throw new \RuntimeException('XML DPS inválido antes da assinatura');
        }
        $nodes = $dom->getElementsByTagName('infDPS');
        if ($nodes->length === 0) {
            throw new \RuntimeException('Tag infDPS não encontrada no XML DPS');
        }
        /** @var \DOMElement $inf */
        $inf = $nodes->item(0);
        $id = $inf->getAttribute('id');
        if ($id === '') {
            throw new \RuntimeException('Atributo id de infDPS vazio');
        }

        return $id;
    }

    /**
     * @return array<string, mixed>
     */
    private function parseRespostaRecepcionarDps(string $xmlRetorno): array
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        if (!$dom->loadXML($xmlRetorno)) {
            return [
                'sucesso' => false,
                'erros' => [['codigo' => 'XML_INVALIDO', 'mensagem' => 'Resposta XML inválida do RecepcionarDps']],
            ];
        }

        $xpath = new \DOMXPath($dom);
        $protocolo = $this->extrairValorXPath($xpath, '//*[local-name()="protocolo"]');
        $status = $this->extrairValorXPath($xpath, '//*[local-name()="status"]');
        $codigo = $this->extrairValorXPath($xpath, '//*[local-name()="codigo"]');
        $mensagem = $this->extrairValorXPath($xpath, '//*[local-name()="mensagem"]');

        $rejeitado = stripos($status, 'rejeit') !== false;
        $sucesso = $protocolo !== '' && !$rejeitado;

        $erros = [];
        if (!$sucesso && ($codigo !== '' || $mensagem !== '' || $status !== '')) {
            $erros[] = [
                'codigo' => $codigo !== '' ? $codigo : 'DPS_RECEPCAO',
                'mensagem' => $mensagem !== '' ? $mensagem : ($status !== '' ? $status : 'Recepção DPS rejeitada'),
            ];
        }

        return [
            'sucesso' => $sucesso,
            'protocolo' => $protocolo !== '' ? $protocolo : null,
            'status' => $status !== '' ? $status : null,
            'erros' => $erros,
            'xml' => $xmlRetorno,
        ];
    }

    /**
     * @param array<string, mixed> $configJson
     * @return array<string, mixed>
     */
    private function consultarStatusDps(
        array $configJson,
        string $wsdl,
        string $protocolo,
        string $tipoIntegracao,
        ?SoapClient $client = null,
    ): array {
        $cnpj = preg_replace('/\D/', '', (string) ($configJson['cnpj'] ?? ''));
        $codigoIbge = (string) ($configJson['codigomunicipioibge'] ?? '');
        $tpAmb = (string) $this->obterAmbiente($configJson);

        $xml = new DOMDocument('1.0', 'UTF-8');
        $envio = $xml->createElementNS(self::NS_DPS, 'ConsultarStatusDpsEnvio');
        $this->appendNsText($xml, $envio, 'tpAmb', $tpAmb);
        $this->appendNsText($xml, $envio, 'codigoIbge', $codigoIbge);
        $this->appendNsText($xml, $envio, 'cpfCnpjPrestador', (string) $cnpj);
        $this->appendNsText($xml, $envio, 'protocolo', $protocolo);
        $this->appendNsText($xml, $envio, 'tipoIntegracao', $tipoIntegracao);
        $xml->appendChild($envio);
        $xmlEnvio = $xml->saveXML() ?: '';

        $soap = $this->enviarSoapOperacao(self::OPERACAO_CONSULTA, $configJson, $xmlEnvio, $wsdl);
        $xmlRetorno = (string) ($soap['xmlRetorno'] ?? '');

        return $this->parseRespostaConsultaStatusDps($xmlRetorno);
    }

    /**
     * @return array<string, mixed>
     */
    private function parseRespostaConsultaStatusDps(string $xmlRetorno): array
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        if (!$dom->loadXML($xmlRetorno)) {
            return [
                'sucesso' => false,
                'erros' => [['codigo' => 'XML_INVALIDO', 'mensagem' => 'Resposta XML inválida do ConsultarStatusDps']],
            ];
        }

        $xpath = new \DOMXPath($dom);
        $status = $this->extrairValorXPath($xpath, '//*[local-name()="statusProcessamento"]');
        $numeroNfse = $this->extrairValorXPath($xpath, '//*[local-name()="numeroNotaFiscal"]');
        if ($numeroNfse === '') {
            $numeroNfse = $this->extrairValorXPath($xpath, '//*[local-name()="numeroNotaFiscalSubstituida"]');
        }
        $chave = $this->extrairValorXPath($xpath, '//*[local-name()="chaveAcesso"]');
        if ($chave === '') {
            $chave = $this->extrairValorXPath($xpath, '//*[local-name()="chaveAcessoSubstituida"]');
        }
        $link = $this->extrairValorXPath($xpath, '//*[local-name()="linkPdf"]');
        if ($link === '') {
            $link = $this->extrairValorXPath($xpath, '//*[local-name()="linkPdfSubstituida"]');
        }
        $mensagemErro = $this->extrairValorXPath($xpath, '//*[local-name()="mensagemErro"]');
        $protocolo = $this->extrairValorXPath($xpath, '//*[local-name()="protocolo"]');

        $comErro = stripos($status, 'erro') !== false;
        $sucessoProc = stripos($status, 'sucesso') !== false;
        $aguardando = stripos($status, 'aguardando') !== false || stripos($status, 'não process') !== false;

        $erros = [];
        if ($comErro) {
            $erros[] = [
                'codigo' => 'DPS_PROCESSAMENTO',
                'mensagem' => $mensagemErro !== '' ? $mensagemErro : $status,
            ];
        }

        return [
            'sucesso' => $sucessoProc || ($aguardando && $protocolo !== ''),
            'numeroNfse' => $numeroNfse !== '' ? $numeroNfse : null,
            'codigoVerificacao' => $chave !== '' ? $chave : null,
            'chaveAcesso' => $chave !== '' ? $chave : null,
            'link' => $link !== '' ? $link : null,
            'protocolo' => $protocolo !== '' ? $protocolo : null,
            'statusProcessamento' => $status !== '' ? $status : null,
            'erros' => $erros,
            'xml' => $xmlRetorno,
            'pendente' => $aguardando,
        ];
    }

    private function appendNsText(DOMDocument $xml, \DOMElement $parent, string $tag, string $value): void
    {
        $element = $xml->createElementNS(self::NS_DPS, $tag);
        $element->appendChild($xml->createTextNode($value));
        $parent->appendChild($element);
    }

    public function cancelar(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $dados,
    ): array {
        $wsdl = $this->obterUrlWsdlOperacao($configJson, self::OPERACAO_CANCELAMENTO);
        $client = $this->criarSoapClient($wsdl);
        $metodos = $this->listarMetodosSoapDoWsdl($client);

        if ($this->ehModoDps($metodos)) {
            $chaveSubstituta = preg_replace('/\D/', '', (string) ($dados['chaveSubstituta'] ?? '')) ?? '';
            if ($chaveSubstituta !== '') {
                return $this->enviarEventoSubstituicaoDps(
                    $configJson,
                    $pfxBase64,
                    $senha,
                    $dados,
                    $wsdl,
                    $client,
                );
            }

            return $this->enviarEventoCancelamentoDps(
                $configJson,
                $pfxBase64,
                $senha,
                $dados,
                $wsdl,
                $client,
            );
        }

        $certificate = CertificadoService::lerCertificado($pfxBase64, $senha);

        $numeroNfse = (string) ($dados['numeroNfse'] ?? '');
        $codigoVerificacao = (string) ($dados['codigoVerificacao'] ?? '');
        $motivo = (string) ($dados['motivo'] ?? '');
        $prestador = is_array($dados['prestador'] ?? null) ? $dados['prestador'] : [];

        $xml = new DOMDocument('1.0', 'UTF-8');
        $cancelamento = $xml->createElement('CancelarNfseEnvio');
        $cancelamento->setAttribute('xmlns', self::NS_BETHA);
        $pedido = $xml->createElement('Pedido');
        $inf = $xml->createElement('InfPedidoCancelamento');
        $inf->setAttribute('Id', 'Cancelamento' . $numeroNfse);

        $ident = $xml->createElement('IdentificacaoNfse');
        $this->appendText($xml, $ident, 'Numero', $numeroNfse);
        $cpfCnpj = $xml->createElement('CpfCnpj');
        $this->appendText($xml, $cpfCnpj, 'Cnpj', preg_replace('/\D/', '', (string) ($prestador['cnpj'] ?? '')));
        $ident->appendChild($cpfCnpj);
        $this->appendText($xml, $ident, 'InscricaoMunicipal', preg_replace('/\D/', '', (string) ($prestador['im'] ?? '')));
        $this->appendText($xml, $ident, 'CodigoMunicipio', (string) ($prestador['municipioIbge'] ?? $configJson['codigomunicipioibge'] ?? ''));
        $inf->appendChild($ident);
        $this->appendText($xml, $inf, 'CodigoCancelamento', '1');
        $pedido->appendChild($inf);
        $cancelamento->appendChild($pedido);
        $xml->appendChild($cancelamento);

        $xmlAssinado = $this->assinarXml($xml->saveXML() ?: '', $certificate, 'Cancelamento' . $numeroNfse);
        $soap = $this->enviarSoapBethaRps(self::OPERACAO_CANCELAMENTO, $configJson, $xmlAssinado, $wsdl);
        $resultado = $this->parseRespostaEmissao((string) ($soap['xmlRetorno'] ?? ''));

        return [
            ...$resultado,
            'sucesso' => (bool) ($resultado['sucesso'] ?? false),
            'numeroNfse' => $numeroNfse,
            'codigoVerificacao' => $codigoVerificacao,
            'motivo' => $motivo,
            'xmlEnviado' => $xmlAssinado,
            'provedor' => 'betha',
            'wsdl' => $soap['wsdl'] ?? null,
            'metodoSoap' => $soap['metodoSoap'] ?? null,
            'modo' => 'rps',
        ];
    }

    /**
     * @param array<string, mixed> $configJson
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    private function enviarEventoCancelamentoDps(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $dados,
        string $wsdl,
        SoapClient $client,
    ): array {
        $certificate = CertificadoService::lerCertificado($pfxBase64, $senha);
        $xmlEvento = $this->montarXmlEventoCancelamentoDps($configJson, $dados);
        $idInfEvento = $this->extrairAtributoId($xmlEvento, 'infEvento');
        $xmlAssinado = $this->assinarXml($xmlEvento, $certificate, $idInfEvento);
        $xmlAssinado = $this->reposicionarSignatureNoPai($xmlAssinado, 'evento');

        $configEnvio = $configJson;
        $configEnvio['metodosSoap'] = [
            ...(is_array($configJson['metodosSoap'] ?? null) ? $configJson['metodosSoap'] : []),
            self::OPERACAO_CANCELAMENTO => 'RecepcionarEventoCancelamento',
        ];

        $soap = $this->enviarSoapOperacao(self::OPERACAO_CANCELAMENTO, $configEnvio, $xmlAssinado, $wsdl);
        $xmlRetorno = (string) ($soap['xmlRetorno'] ?? '');
        $recepcao = $this->parseRespostaEventoDps($xmlRetorno);

        if (!($recepcao['sucesso'] ?? false) || empty($recepcao['protocolo'])) {
            return [
                ...$recepcao,
                'xmlEnviado' => $xmlAssinado,
                'xml' => $xmlRetorno,
                'provedor' => 'betha',
                'modo' => 'dps',
                'metodoSoap' => $soap['metodoSoap'] ?? 'RecepcionarEventoCancelamento',
            ];
        }

        $consulta = $this->consultarStatusDps(
            $configJson,
            $wsdl,
            (string) $recepcao['protocolo'],
            'CANCELAMENTO',
            $client,
        );

        $autorizada = ($consulta['sucesso'] ?? false)
            && empty($consulta['erros'])
            && !($consulta['pendente'] ?? false);

        return [
            'sucesso' => (bool) ($consulta['sucesso'] ?? $recepcao['sucesso']),
            'numeroNfse' => $consulta['numeroNfse'] ?? ($dados['numeroNfse'] ?? null),
            'codigoVerificacao' => $consulta['chaveAcesso'] ?? ($dados['chaveAcesso'] ?? null),
            'link' => $consulta['link'] ?? null,
            'protocolo' => $recepcao['protocolo'],
            'xml' => (string) ($consulta['xml'] ?? $xmlRetorno),
            'xmlEnviado' => $xmlAssinado,
            'erros' => $consulta['erros'] ?? $recepcao['erros'] ?? [],
            'provedor' => 'betha',
            'modo' => 'dps',
            'metodoSoap' => $soap['metodoSoap'] ?? 'RecepcionarEventoCancelamento',
            'statusProcessamento' => $consulta['statusProcessamento'] ?? $recepcao['status'] ?? null,
            'pendente' => !$autorizada && empty($consulta['erros']),
            'tipoIntegracao' => 'CANCELAMENTO',
        ];
    }

    /**
     * @param array<string, mixed> $configJson
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    private function enviarEventoSubstituicaoDps(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $dados,
        string $wsdl,
        SoapClient $client,
    ): array {
        $certificate = CertificadoService::lerCertificado($pfxBase64, $senha);
        $xmlEvento = $this->montarXmlEventoSubstituicaoDps($configJson, $dados);
        $idInfEvento = $this->extrairAtributoId($xmlEvento, 'infEvento');
        $xmlAssinado = $this->assinarXml($xmlEvento, $certificate, $idInfEvento);
        $xmlAssinado = $this->reposicionarSignatureNoPai($xmlAssinado, 'evento');

        $configEnvio = $configJson;
        $configEnvio['metodosSoap'] = [
            ...(is_array($configJson['metodosSoap'] ?? null) ? $configJson['metodosSoap'] : []),
            self::OPERACAO_CANCELAMENTO => 'RecepcionarEventoSubstituicao',
        ];

        $soap = $this->enviarSoapOperacao(self::OPERACAO_CANCELAMENTO, $configEnvio, $xmlAssinado, $wsdl);
        $xmlRetorno = (string) ($soap['xmlRetorno'] ?? '');
        $recepcao = $this->parseRespostaEventoDps($xmlRetorno);

        if (!($recepcao['sucesso'] ?? false) || empty($recepcao['protocolo'])) {
            return [
                ...$recepcao,
                'xmlEnviado' => $xmlAssinado,
                'xml' => $xmlRetorno,
                'provedor' => 'betha',
                'modo' => 'dps',
                'metodoSoap' => $soap['metodoSoap'] ?? 'RecepcionarEventoSubstituicao',
            ];
        }

        $consulta = $this->consultarStatusDps(
            $configJson,
            $wsdl,
            (string) $recepcao['protocolo'],
            'CANCELAMENTO_POR_SUBSTITUICAO',
            $client,
        );

        $autorizada = ($consulta['sucesso'] ?? false)
            && empty($consulta['erros'])
            && !($consulta['pendente'] ?? false);

        return [
            'sucesso' => (bool) ($consulta['sucesso'] ?? $recepcao['sucesso']),
            'numeroNfse' => $consulta['numeroNfse'] ?? ($dados['numeroNfse'] ?? null),
            'codigoVerificacao' => $consulta['chaveAcesso'] ?? ($dados['chaveAcesso'] ?? null),
            'link' => $consulta['link'] ?? null,
            'protocolo' => $recepcao['protocolo'],
            'xml' => (string) ($consulta['xml'] ?? $xmlRetorno),
            'xmlEnviado' => $xmlAssinado,
            'erros' => $consulta['erros'] ?? $recepcao['erros'] ?? [],
            'provedor' => 'betha',
            'modo' => 'dps',
            'metodoSoap' => $soap['metodoSoap'] ?? 'RecepcionarEventoSubstituicao',
            'statusProcessamento' => $consulta['statusProcessamento'] ?? $recepcao['status'] ?? null,
            'pendente' => !$autorizada && empty($consulta['erros']),
            'tipoIntegracao' => 'CANCELAMENTO_POR_SUBSTITUICAO',
        ];
    }

    /**
     * @param array<string, mixed> $configJson
     * @param array<string, mixed> $dados
     */
    private function montarXmlEventoCancelamentoDps(array $configJson, array $dados): string
    {
        $chNfse = $this->normalizarChaveNfse((string) ($dados['chaveAcesso'] ?? $dados['codigoVerificacao'] ?? ''));
        $motivo = trim((string) ($dados['motivo'] ?? 'Cancelamento de NFS-e'));
        $cMotivo = (string) ($dados['codigoMotivo'] ?? '1');
        $prestadorDados = is_array($dados['prestador'] ?? null) ? $dados['prestador'] : [];
        $cnpj = preg_replace('/\D/', '', (string) (
            $prestadorDados['cnpj'] ?? $configJson['cnpj'] ?? ''
        ));
        $tpAmb = (string) $this->obterAmbiente($configJson);
        $dhEvento = date('c');
        $idInfEvento = 'EVT' . $chNfse;
        $idInfPed = 'PRE' . $chNfse;

        $xml = new DOMDocument('1.0', 'UTF-8');
        $envio = $xml->createElementNS(self::NS_DPS, 'RecepcionarEventoCancelamentoEnvio');
        $evento = $xml->createElementNS(self::NS_DPS, 'evento');
        $evento->setAttribute('versao', '1.0');

        $infEvento = $xml->createElementNS(self::NS_DPS, 'infEvento');
        $infEvento->setAttribute('id', $idInfEvento);
        $this->appendNsText($xml, $infEvento, 'verAplic', 'mais-gestao_1.0');

        $pedReg = $xml->createElementNS(self::NS_DPS, 'pedRegEvento');
        $pedReg->setAttribute('versao', '1.00');
        $infPed = $xml->createElementNS(self::NS_DPS, 'infPedReg');
        $infPed->setAttribute('id', $idInfPed);
        $this->appendNsText($xml, $infPed, 'chNFSe', $chNfse);
        if (strlen((string) $cnpj) === 14) {
            $this->appendNsText($xml, $infPed, 'CNPJAutor', (string) $cnpj);
        }
        $this->appendNsText($xml, $infPed, 'dhEvento', $dhEvento);
        $this->appendNsText($xml, $infPed, 'tpAmb', $tpAmb);
        $this->appendNsText($xml, $infPed, 'verAplic', 'mais-gestao_1.0');

        $e101101 = $xml->createElementNS(self::NS_DPS, 'e101101');
        $this->appendNsText($xml, $e101101, 'xDesc', 'Cancelamento de NFS-e');
        $this->appendNsText($xml, $e101101, 'cMotivo', $cMotivo);
        if ($motivo !== '') {
            $this->appendNsText($xml, $e101101, 'xMotivo', substr($motivo, 0, 255));
        }
        $infPed->appendChild($e101101);
        $pedReg->appendChild($infPed);
        $infEvento->appendChild($pedReg);
        $evento->appendChild($infEvento);
        $envio->appendChild($evento);
        $xml->appendChild($envio);

        return $xml->saveXML() ?: '';
    }

    /**
     * @param array<string, mixed> $configJson
     * @param array<string, mixed> $dados
     */
    private function montarXmlEventoSubstituicaoDps(array $configJson, array $dados): string
    {
        $chNfse = $this->normalizarChaveNfse((string) ($dados['chaveAcesso'] ?? $dados['codigoVerificacao'] ?? ''));
        $chSubstituta = $this->normalizarChaveNfse((string) ($dados['chaveSubstituta'] ?? ''));
        $motivo = trim((string) ($dados['motivo'] ?? 'Cancelamento por substituicao'));
        $cMotivo = (string) ($dados['codigoMotivo'] ?? '1');
        $prestadorDados = is_array($dados['prestador'] ?? null) ? $dados['prestador'] : [];
        $cnpj = preg_replace('/\D/', '', (string) (
            $prestadorDados['cnpj'] ?? $configJson['cnpj'] ?? ''
        ));
        $tpAmb = (string) $this->obterAmbiente($configJson);
        $dhEvento = date('c');
        $idInfEvento = 'EVT' . $chNfse;
        $idInfPed = 'PRE' . $chNfse;

        $xml = new DOMDocument('1.0', 'UTF-8');
        $envio = $xml->createElementNS(self::NS_DPS, 'RecepcionarEventoSubstituicaoEnvio');
        $evento = $xml->createElementNS(self::NS_DPS, 'evento');
        $evento->setAttribute('versao', '1.0');

        $infEvento = $xml->createElementNS(self::NS_DPS, 'infEvento');
        $infEvento->setAttribute('id', $idInfEvento);
        $this->appendNsText($xml, $infEvento, 'verAplic', 'mais-gestao_1.0');

        $pedReg = $xml->createElementNS(self::NS_DPS, 'pedRegEvento');
        $pedReg->setAttribute('versao', '1.00');
        $infPed = $xml->createElementNS(self::NS_DPS, 'infPedReg');
        $infPed->setAttribute('id', $idInfPed);
        $this->appendNsText($xml, $infPed, 'chNFSe', $chNfse);
        if (strlen((string) $cnpj) === 14) {
            $this->appendNsText($xml, $infPed, 'CNPJAutor', (string) $cnpj);
        }
        $this->appendNsText($xml, $infPed, 'dhEvento', $dhEvento);
        $this->appendNsText($xml, $infPed, 'tpAmb', $tpAmb);
        $this->appendNsText($xml, $infPed, 'verAplic', 'mais-gestao_1.0');

        $e105102 = $xml->createElementNS(self::NS_DPS, 'e105102');
        $this->appendNsText($xml, $e105102, 'xDesc', 'Cancelamento de NFS-e por substituicao');
        $this->appendNsText($xml, $e105102, 'cMotivo', $cMotivo);
        if ($motivo !== '') {
            $this->appendNsText($xml, $e105102, 'xMotivo', substr($motivo, 0, 255));
        }
        $this->appendNsText($xml, $e105102, 'chSubstituta', $chSubstituta);
        $infPed->appendChild($e105102);
        $pedReg->appendChild($infPed);
        $infEvento->appendChild($pedReg);
        $evento->appendChild($infEvento);
        $envio->appendChild($evento);
        $xml->appendChild($envio);

        return $xml->saveXML() ?: '';
    }

    private function normalizarChaveNfse(string $chave): string
    {
        $somenteDigitos = preg_replace('/\D/', '', $chave) ?? '';
        if (!preg_match('/^\d{50}$/', $somenteDigitos)) {
            throw new \RuntimeException(
                'Chave de acesso da NFS-e (chNFSe) inválida — informe 50 dígitos',
            );
        }

        return $somenteDigitos;
    }

    private function extrairAtributoId(string $xmlConteudo, string $tagLocal): string
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        if (!$dom->loadXML($xmlConteudo)) {
            throw new \RuntimeException('XML de evento DPS inválido antes da assinatura');
        }
        $nodes = $dom->getElementsByTagName($tagLocal);
        if ($nodes->length === 0) {
            throw new \RuntimeException("Tag {$tagLocal} não encontrada no XML do evento DPS");
        }
        /** @var \DOMElement $el */
        $el = $nodes->item(0);
        $id = $el->getAttribute('id');
        if ($id === '') {
            $id = $el->getAttribute('Id');
        }
        if ($id === '') {
            throw new \RuntimeException("Atributo id de {$tagLocal} vazio");
        }

        return $id;
    }

    /**
     * @return array<string, mixed>
     */
    private function parseRespostaEventoDps(string $xmlRetorno): array
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        if (!$dom->loadXML($xmlRetorno)) {
            return [
                'sucesso' => false,
                'erros' => [['codigo' => 'XML_INVALIDO', 'mensagem' => 'Resposta XML inválida do evento DPS']],
            ];
        }

        $xpath = new \DOMXPath($dom);
        $protocolo = $this->extrairValorXPath($xpath, '//*[local-name()="protocolo"]');
        $status = $this->extrairValorXPath($xpath, '//*[local-name()="status"]');
        $codigo = $this->extrairValorXPath($xpath, '//*[local-name()="codigo"]');
        $mensagem = $this->extrairValorXPath($xpath, '//*[local-name()="mensagem"]');

        $rejeitado = stripos($status, 'rejeit') !== false;
        $sucesso = $protocolo !== '' && !$rejeitado;

        $erros = [];
        if (!$sucesso && ($codigo !== '' || $mensagem !== '' || $status !== '')) {
            $erros[] = [
                'codigo' => $codigo !== '' ? $codigo : 'DPS_EVENTO',
                'mensagem' => $mensagem !== '' ? $mensagem : ($status !== '' ? $status : 'Evento DPS rejeitado'),
            ];
        }

        return [
            'sucesso' => $sucesso,
            'protocolo' => $protocolo !== '' ? $protocolo : null,
            'status' => $status !== '' ? $status : null,
            'erros' => $erros,
            'xml' => $xmlRetorno,
        ];
    }

    public function consultarPorRps(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $dados,
    ): array {
        CertificadoService::lerCertificado($pfxBase64, $senha);

        $wsdl = $this->obterUrlWsdlOperacao($configJson, self::OPERACAO_CONSULTA);
        $client = $this->criarSoapClient($wsdl);
        $metodos = $this->listarMetodosSoapDoWsdl($client);

        if ($this->ehModoDps($metodos)) {
            $protocolo = (string) ($dados['protocolo'] ?? '');
            if ($protocolo === '') {
                return [
                    'sucesso' => false,
                    'erro' => 'WSDL Betha DPS não possui consulta por RPS. Informe o protocolo da emissão (ConsultarStatusDps).',
                    'provedor' => 'betha',
                    'modo' => 'dps',
                ];
            }

            $tipoIntegracao = strtoupper((string) ($dados['tipoIntegracao'] ?? 'EMISSAO'));
            if (!in_array($tipoIntegracao, ['EMISSAO', 'CANCELAMENTO', 'CANCELAMENTO_POR_SUBSTITUICAO'], true)) {
                $tipoIntegracao = 'EMISSAO';
            }

            $resultado = $this->consultarStatusDps($configJson, $wsdl, $protocolo, $tipoIntegracao, $client);

            return [
                ...$resultado,
                'provedor' => 'betha',
                'modo' => 'dps',
                'tipoIntegracao' => $tipoIntegracao,
            ];
        }

        $prestador = is_array($dados['prestador'] ?? null) ? $dados['prestador'] : [];
        $rps = is_array($dados['rps'] ?? null) ? $dados['rps'] : [];

        $xml = new DOMDocument('1.0', 'UTF-8');
        $consulta = $xml->createElement('ConsultarNfseRpsEnvio');
        $consulta->setAttribute('xmlns', self::NS_BETHA);
        $ident = $xml->createElement('IdentificacaoRps');
        $this->appendText($xml, $ident, 'Numero', (string) ($rps['numero'] ?? ''));
        $this->appendText($xml, $ident, 'Serie', (string) ($rps['serie'] ?? '1'));
        $this->appendText($xml, $ident, 'Tipo', (string) ($rps['tipo'] ?? '1'));
        $consulta->appendChild($ident);

        $prestadorNode = $xml->createElement('Prestador');
        $cpfCnpj = $xml->createElement('CpfCnpj');
        $this->appendText($xml, $cpfCnpj, 'Cnpj', preg_replace('/\D/', '', (string) ($prestador['cnpj'] ?? '')));
        $prestadorNode->appendChild($cpfCnpj);
        $this->appendText($xml, $prestadorNode, 'InscricaoMunicipal', preg_replace('/\D/', '', (string) ($prestador['im'] ?? '')));
        $consulta->appendChild($prestadorNode);
        $xml->appendChild($consulta);

        $xmlEnvio = $xml->saveXML() ?: '';
        $soap = $this->enviarSoapBethaRps(self::OPERACAO_CONSULTA, $configJson, $xmlEnvio, $wsdl);
        $resultado = $this->parseRespostaConsulta((string) ($soap['xmlRetorno'] ?? ''));

        return [
            ...$resultado,
            'provedor' => 'betha',
            'xmlEnviado' => $xmlEnvio,
            'wsdl' => $soap['wsdl'] ?? null,
            'metodoSoap' => $soap['metodoSoap'] ?? null,
            'modo' => 'rps',
        ];
    }
}
