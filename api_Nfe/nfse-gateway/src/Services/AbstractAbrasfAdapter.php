<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Services;

use DOMDocument;
use DOMElement;
use DOMXPath;
use NFePHP\Common\Certificate;
use NFePHP\Common\Signer;
use SoapClient;
use SoapFault;

abstract class AbstractAbrasfAdapter
{
    public const OPERACAO_EMISSAO = 'emissao';
    public const OPERACAO_CONSULTA = 'consulta';
    public const OPERACAO_CANCELAMENTO = 'cancelamento';

    /**
     * @return array<string, list<string>>
     */
    protected function mapaMetodosSoapPadrao(): array
    {
        return [
            self::OPERACAO_EMISSAO => ['RecepcionarLoteRpsSincrono', 'RecepcionarLoteRps', 'recepcionarLoteRps'],
            self::OPERACAO_CONSULTA => ['ConsultarNfsePorRps', 'consultarNfsePorRps', 'ConsultarNfseRps'],
            self::OPERACAO_CANCELAMENTO => ['CancelarNfse', 'cancelarNfse', 'cancelarNfseV02'],
        ];
    }

    protected function obterUrlWsdl(array $configJson): string
    {
        return $this->obterUrlWsdlOperacao($configJson, self::OPERACAO_EMISSAO);
    }

    /**
     * Resolve WSDL por operação: urlsWsdl.{op} → urlwsdl → derivação do provedor.
     *
     * @param array<string, mixed> $configJson
     */
    protected function obterUrlWsdlOperacao(array $configJson, string $operacao): string
    {
        $urls = is_array($configJson['urlsWsdl'] ?? null) ? $configJson['urlsWsdl'] : [];
        $urlOperacao = trim((string) ($urls[$operacao] ?? ''));
        if ($urlOperacao !== '') {
            return $urlOperacao;
        }

        $urlBase = trim((string) ($configJson['urlwsdl'] ?? ''));
        if ($urlBase !== '') {
            $derivada = $this->derivarUrlWsdlOperacao($urlBase, $operacao, $configJson);
            if ($derivada !== '') {
                return $derivada;
            }

            return $urlBase;
        }

        $fallback = $this->obterUrlWsdlPadraoProvedor($operacao, $configJson);
        if ($fallback !== '') {
            return $fallback;
        }

        throw new \InvalidArgumentException(
            'URL/WSDL do provedor NFS-e não configurada. Informe urlwsdl (e, se Betha, urlsWsdl.consulta) na configuração da empresa.',
        );
    }

    /**
     * @param array<string, mixed> $configJson
     */
    protected function derivarUrlWsdlOperacao(string $urlBase, string $operacao, array $configJson): string
    {
        return '';
    }

    /**
     * @param array<string, mixed> $configJson
     */
    protected function obterUrlWsdlPadraoProvedor(string $operacao, array $configJson): string
    {
        return '';
    }

    protected function obterAmbiente(array $configJson): int
    {
        return (int) ($configJson['ambiente'] ?? 2);
    }

    /**
     * @param array<string, mixed> $configJson
     * @return list<string>
     */
    protected function candidatosMetodoSoap(string $operacao, array $configJson): array
    {
        $overrides = is_array($configJson['metodosSoap'] ?? null) ? $configJson['metodosSoap'] : [];
        $override = trim((string) ($overrides[$operacao] ?? ''));

        $candidatos = [];
        if ($override !== '') {
            $candidatos[] = $override;
        }

        $mapa = $this->mapaMetodosSoapPadrao();
        foreach ($mapa[$operacao] ?? [] as $metodo) {
            if (!in_array($metodo, $candidatos, true)) {
                $candidatos[] = $metodo;
            }
        }

        return $candidatos;
    }

    /**
     * @return list<string>
     */
    protected function listarMetodosSoapDoWsdl(SoapClient $client): array
    {
        $funcoes = $client->__getFunctions();
        if (!is_array($funcoes)) {
            return [];
        }

        $metodos = [];
        foreach ($funcoes as $assinatura) {
            if (!is_string($assinatura)) {
                continue;
            }
            // Ex.: "ResponseType MethodName(RequestType $param)"
            if (preg_match('/\s([A-Za-z_][A-Za-z0-9_]*)\s*\(/', $assinatura, $m) === 1) {
                $metodos[] = $m[1];
            }
        }

        return array_values(array_unique($metodos));
    }

    /**
     * @param array<string, mixed> $configJson
     */
    protected function resolverMetodoSoap(string $operacao, array $configJson, string $wsdl, ?SoapClient $client = null): string
    {
        $candidatos = $this->candidatosMetodoSoap($operacao, $configJson);
        $client ??= $this->criarSoapClient($wsdl);
        $disponiveis = $this->listarMetodosSoapDoWsdl($client);

        if ($disponiveis === []) {
            return $candidatos[0] ?? '';
        }

        $mapaDisponiveis = [];
        foreach ($disponiveis as $nome) {
            $mapaDisponiveis[strtolower($nome)] = $nome;
        }

        foreach ($candidatos as $candidato) {
            $chave = strtolower($candidato);
            if (isset($mapaDisponiveis[$chave])) {
                return $mapaDisponiveis[$chave];
            }
        }

        $lista = implode(', ', $disponiveis);
        throw new \RuntimeException(
            "Operação SOAP para '{$operacao}' não encontrada no WSDL configurado. "
            . "Candidatos tentados: " . implode(', ', $candidatos) . ". "
            . "Operações disponíveis: {$lista}. "
            . 'Para Betha, confira se a URL aponta para consultarNfsePorRps?wsdl na consulta.',
        );
    }

    protected function criarSoapClient(string $wsdl): SoapClient
    {
        return new SoapClient($wsdl, [
            'trace' => true,
            'exceptions' => true,
            'connection_timeout' => 30,
            'cache_wsdl' => WSDL_CACHE_NONE,
            'stream_context' => stream_context_create([
                'ssl' => [
                    'verify_peer' => true,
                    'verify_peer_name' => true,
                ],
            ]),
        ]);
    }

    /**
     * @param array<string, mixed> $payloadNfse
     */
    protected function montarXmlLoteRps(array $payloadNfse, array $configJson): string
    {
        $prestador = is_array($payloadNfse['prestador'] ?? null) ? $payloadNfse['prestador'] : [];
        $tomador = is_array($payloadNfse['tomador'] ?? null) ? $payloadNfse['tomador'] : [];
        $rps = is_array($payloadNfse['rps'] ?? null) ? $payloadNfse['rps'] : [];
        $servico = is_array($payloadNfse['servico'] ?? null) ? $payloadNfse['servico'] : [];
        $valores = is_array($servico['valores'] ?? null) ? $servico['valores'] : [];

        $numeroLote = (string) ($rps['numero'] ?? '1');
        $cnpjPrestador = preg_replace('/\D/', '', (string) ($prestador['cnpj'] ?? ''));
        $imPrestador = preg_replace('/\D/', '', (string) ($prestador['im'] ?? ''));
        $codigoMunicipio = (string) ($prestador['municipioIbge'] ?? $configJson['codigomunicipioibge'] ?? '');

        $xml = new DOMDocument('1.0', 'UTF-8');
        $xml->formatOutput = false;

        $lote = $xml->createElement('EnviarLoteRpsSincronoEnvio');
        $lote->setAttribute('xmlns', 'http://www.abrasf.org.br/nfse.xsd');

        $loteRps = $xml->createElement('LoteRps');
        $loteRps->setAttribute('Id', 'Lote' . $numeroLote);
        $loteRps->setAttribute('versao', '2.02');

        $this->appendText($xml, $loteRps, 'NumeroLote', $numeroLote);
        $this->appendText($xml, $loteRps, 'CpfCnpj', $cnpjPrestador, 'Cnpj');
        $this->appendText($xml, $loteRps, 'InscricaoMunicipal', $imPrestador);
        $this->appendText($xml, $loteRps, 'QuantidadeRps', '1');

        $listaRps = $xml->createElement('ListaRps');
        $infRps = $xml->createElement('Rps');
        $inf = $xml->createElement('InfDeclaracaoPrestacaoServico');
        $inf->setAttribute('Id', 'Rps' . ($rps['numero'] ?? '1'));

        $identificacao = $xml->createElement('Rps');
        $ident = $xml->createElement('IdentificacaoRps');
        $this->appendText($xml, $ident, 'Numero', (string) ($rps['numero'] ?? ''));
        $this->appendText($xml, $ident, 'Serie', (string) ($rps['serie'] ?? '1'));
        $this->appendText($xml, $ident, 'Tipo', (string) ($rps['tipo'] ?? '1'));
        $identificacao->appendChild($ident);
        $this->appendText($xml, $identificacao, 'DataEmissao', (string) ($rps['dataEmissao'] ?? date('Y-m-d')));
        $this->appendText($xml, $identificacao, 'Status', '1');
        $inf->appendChild($identificacao);

        $this->appendText($xml, $inf, 'Competencia', (string) ($rps['competencia'] ?? date('Y-m-d')));

        $servicoNode = $xml->createElement('Servico');
        $valoresNode = $xml->createElement('Valores');
        $this->appendText($xml, $valoresNode, 'ValorServicos', $this->formatDecimal($valores['servicos'] ?? 0));
        $this->appendText($xml, $valoresNode, 'ValorDeducoes', $this->formatDecimal($valores['deducoes'] ?? 0));
        $this->appendText($xml, $valoresNode, 'ValorPis', $this->formatDecimal($valores['pis'] ?? 0));
        $this->appendText($xml, $valoresNode, 'ValorCofins', $this->formatDecimal($valores['cofins'] ?? 0));
        $this->appendText($xml, $valoresNode, 'ValorInss', $this->formatDecimal($valores['inss'] ?? 0));
        $this->appendText($xml, $valoresNode, 'ValorIr', $this->formatDecimal($valores['ir'] ?? 0));
        $this->appendText($xml, $valoresNode, 'ValorCsll', $this->formatDecimal($valores['csll'] ?? 0));
        $this->appendText($xml, $valoresNode, 'OutrasRetencoes', $this->formatDecimal($valores['outrasRetencoes'] ?? 0));
        $this->appendText($xml, $valoresNode, 'ValorIss', $this->formatDecimal($valores['iss'] ?? 0));
        $this->appendText($xml, $valoresNode, 'Aliquota', $this->formatDecimal($valores['aliquota'] ?? 0, 4));
        $this->appendText($xml, $valoresNode, 'DescontoIncondicionado', $this->formatDecimal($valores['descontoIncondicionado'] ?? 0));
        $this->appendText($xml, $valoresNode, 'DescontoCondicionado', $this->formatDecimal($valores['descontoCondicionado'] ?? 0));
        $servicoNode->appendChild($valoresNode);

        $this->appendText($xml, $servicoNode, 'IssRetido', (string) ($servico['issRetido'] ?? '2'));
        $this->appendText($xml, $servicoNode, 'ItemListaServico', (string) ($servico['itemListaServico'] ?? ''));
        $this->appendText($xml, $servicoNode, 'CodigoCnae', (string) ($servico['codigoCnae'] ?? ''));
        $this->appendText($xml, $servicoNode, 'CodigoTributacaoMunicipio', (string) ($servico['codigoTributacaoMunicipio'] ?? ''));
        $this->appendText($xml, $servicoNode, 'Discriminacao', (string) ($servico['discriminacao'] ?? ''));
        $this->appendText($xml, $servicoNode, 'CodigoMunicipio', (string) ($servico['codigoMunicipioIncidencia'] ?? $codigoMunicipio));
        $this->appendText($xml, $servicoNode, 'ExigibilidadeISS', (string) ($servico['exigibilidadeIss'] ?? '1'));
        $inf->appendChild($servicoNode);

        $prestadorNode = $xml->createElement('Prestador');
        $cpfCnpjPrest = $xml->createElement('CpfCnpj');
        $this->appendText($xml, $cpfCnpjPrest, 'Cnpj', $cnpjPrestador);
        $prestadorNode->appendChild($cpfCnpjPrest);
        $this->appendText($xml, $prestadorNode, 'InscricaoMunicipal', $imPrestador);
        $inf->appendChild($prestadorNode);

        $tomadorNode = $xml->createElement('Tomador');
        $identTomador = $xml->createElement('IdentificacaoTomador');
        $cpfCnpjTom = $xml->createElement('CpfCnpj');
        $docTomador = preg_replace('/\D/', '', (string) ($tomador['cnpjCpf'] ?? ''));
        if (strlen($docTomador) === 11) {
            $this->appendText($xml, $cpfCnpjTom, 'Cpf', $docTomador);
        } else {
            $this->appendText($xml, $cpfCnpjTom, 'Cnpj', $docTomador);
        }
        $identTomador->appendChild($cpfCnpjTom);
        $tomadorNode->appendChild($identTomador);
        $this->appendText($xml, $tomadorNode, 'RazaoSocial', (string) ($tomador['razaoSocial'] ?? ''));

        $endereco = is_array($tomador['endereco'] ?? null) ? $tomador['endereco'] : [];
        if ($endereco !== []) {
            $enderecoNode = $xml->createElement('Endereco');
            $this->appendText($xml, $enderecoNode, 'Endereco', (string) ($endereco['logradouro'] ?? ''));
            $this->appendText($xml, $enderecoNode, 'Numero', (string) ($endereco['numero'] ?? ''));
            $this->appendText($xml, $enderecoNode, 'Complemento', (string) ($endereco['complemento'] ?? ''));
            $this->appendText($xml, $enderecoNode, 'Bairro', (string) ($endereco['bairro'] ?? ''));
            $this->appendText($xml, $enderecoNode, 'CodigoMunicipio', (string) ($endereco['codigoMunicipioIbge'] ?? ''));
            $this->appendText($xml, $enderecoNode, 'Uf', (string) ($endereco['uf'] ?? ''));
            $this->appendText($xml, $enderecoNode, 'Cep', preg_replace('/\D/', '', (string) ($endereco['cep'] ?? '')));
            $tomadorNode->appendChild($enderecoNode);
        }

        $inf->appendChild($tomadorNode);
        $this->appendText($xml, $inf, 'OptanteSimplesNacional', (string) ($prestador['optanteSimplesNacional'] ?? '2'));
        $this->appendText($xml, $inf, 'IncentivoFiscal', (string) ($prestador['incentivoFiscal'] ?? '2'));

        $infRps->appendChild($inf);
        $listaRps->appendChild($infRps);
        $loteRps->appendChild($listaRps);
        $lote->appendChild($loteRps);
        $xml->appendChild($lote);

        return $xml->saveXML() ?: '';
    }

    protected function assinarXml(string $xmlConteudo, Certificate $certificate, string $tagId): string
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        $dom->preserveWhiteSpace = false;
        $dom->formatOutput = false;
        if (!$dom->loadXML($xmlConteudo)) {
            throw new \RuntimeException('Falha ao carregar XML NFS-e para assinatura');
        }

        $xpath = new DOMXPath($dom);
        $xpath->registerNamespace('ns', 'http://www.abrasf.org.br/nfse.xsd');
        $nodeList = $xpath->query("//*[@Id='{$tagId}' or @id='{$tagId}']");
        if ($nodeList === false || $nodeList->length === 0) {
            throw new \RuntimeException("Elemento com Id={$tagId} não encontrado para assinatura");
        }

        /** @var DOMElement $node */
        $node = $nodeList->item(0);
        $tagname = $node->localName !== '' ? $node->localName : $node->nodeName;
        $mark = $node->hasAttribute('Id') ? 'Id' : ($node->hasAttribute('id') ? 'id' : 'Id');

        // Certificate::sign() assina bytes crus (openssl_sign). Para XML use Signer::sign().
        $xmlAssinado = Signer::sign(
            $certificate,
            $xmlConteudo,
            $tagname,
            $mark,
        );

        if (str_starts_with(ltrim($xmlAssinado), '<?xml')) {
            return $xmlAssinado;
        }

        return '<?xml version="1.0" encoding="UTF-8"?>' . $xmlAssinado;
    }

    /**
     * O NFePHP Signer costuma anexar ds:Signature na raiz do documento.
     * No XSD DPS a Signature deve ser filha de DPS (após infDPS) ou de evento (após infEvento).
     */
    protected function reposicionarSignatureNoPai(string $xmlAssinado, string $tagPaiLocal): string
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        $dom->preserveWhiteSpace = false;
        $dom->formatOutput = false;
        if (!$dom->loadXML($xmlAssinado)) {
            throw new \RuntimeException('XML assinado inválido ao reposicionar Signature');
        }

        $pais = $dom->getElementsByTagName($tagPaiLocal);
        if ($pais->length === 0) {
            return $xmlAssinado;
        }

        /** @var \DOMElement $pai */
        $pai = $pais->item(0);

        $xpath = new DOMXPath($dom);
        $xpath->registerNamespace('ds', 'http://www.w3.org/2000/09/xmldsig#');
        $sigs = $xpath->query('//ds:Signature | //*[local-name()="Signature"]');
        if ($sigs === false || $sigs->length === 0) {
            return $xmlAssinado;
        }

        for ($i = $sigs->length - 1; $i >= 0; $i--) {
            $sig = $sigs->item($i);
            if (!$sig instanceof \DOMElement) {
                continue;
            }

            $ancestral = $sig->parentNode;
            while ($ancestral !== null) {
                if ($ancestral === $pai) {
                    continue 2;
                }
                $ancestral = $ancestral->parentNode;
            }

            $parent = $sig->parentNode;
            if ($parent === null) {
                continue;
            }

            $parent->removeChild($sig);
            $pai->appendChild($sig);
        }

        return $dom->saveXML() ?: $xmlAssinado;
    }

    /**
     * Monta os argumentos do __soapCall conforme o binding do WSDL.
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
        return [[$parametro]];
    }

    /**
     * @param array<string, mixed> $configJson
     * @return array<string, mixed>
     */
    protected function enviarSoapOperacao(
        string $operacao,
        array $configJson,
        string $xmlAssinado,
        ?string $wsdlOverride = null,
    ): array {
        $wsdl = $wsdlOverride ?? $this->obterUrlWsdlOperacao($configJson, $operacao);
        // SoapVar (XSD_ANYXML) entra no Body: declaração XML no payload → Betha HTTP 400/404 sem faultstring.
        $xmlParaSoap = $this->removerDeclaracaoXml($xmlAssinado);

        try {
            $client = $this->criarSoapClient($wsdl);
            $metodo = $this->resolverMetodoSoap($operacao, $configJson, $wsdl, $client);
            $parametro = new \SoapVar($xmlParaSoap, XSD_ANYXML);
            $argumentos = $this->montarArgumentosSoapCall($operacao, $metodo, $configJson, $wsdl, $parametro);
            $resposta = $client->__soapCall($metodo, $argumentos);

            return [
                'xmlRetorno' => (string) $client->__getLastResponse(),
                'resposta' => $resposta,
                'metodoSoap' => $metodo,
                'wsdl' => $wsdl,
            ];
        } catch (SoapFault $fault) {
            $mensagem = trim($fault->getMessage());
            $faultCode = trim((string) ($fault->faultcode ?? ''));
            $respHeaders = '';
            try {
                if (isset($client) && $client instanceof SoapClient) {
                    $respHeaders = (string) $client->__getLastResponseHeaders();
                }
            } catch (\Throwable) {
                // ignore
            }

            if (
                stripos($mensagem, 'is not a valid method') !== false
                || stripos($mensagem, 'Function') !== false
            ) {
                throw new \RuntimeException(
                    "Operação SOAP '{$operacao}' inválida no WSDL configurado ({$wsdl}). "
                    . "Detalhe: {$mensagem}. "
                    . 'Para Betha, use a URL específica da operação (ex.: consultarNfsePorRps?wsdl).',
                    0,
                    $fault,
                );
            }

            $httpStatus = null;
            if (preg_match('/^HTTP\\/\\S+\\s+(\\d+)/i', $respHeaders, $m) === 1) {
                $httpStatus = $m[1];
            }
            $detalhe = $mensagem !== '' ? $mensagem : ($faultCode !== '' ? "faultcode={$faultCode}" : 'sem faultstring');
            if ($httpStatus !== null) {
                $detalhe .= " (HTTP {$httpStatus})";
            }

            throw new \RuntimeException('Falha SOAP NFS-e: ' . $detalhe, 0, $fault);
        }
    }

    protected function removerDeclaracaoXml(string $xml): string
    {
        $semDecl = preg_replace('/^\s*<\?xml[^?]*\?>\s*/i', '', $xml);

        return is_string($semDecl) && $semDecl !== '' ? $semDecl : $xml;
    }

    /**
     * @return array<string, mixed>
     */
    protected function enviarSoap(string $wsdl, string $metodo, string $xmlAssinado): array
    {
        try {
            $client = $this->criarSoapClient($wsdl);
            $parametro = new \SoapVar($xmlAssinado, XSD_ANYXML);
            $resposta = $client->__soapCall($metodo, [[$parametro]]);

            return [
                'xmlRetorno' => (string) $client->__getLastResponse(),
                'resposta' => $resposta,
            ];
        } catch (SoapFault $fault) {
            $mensagem = $fault->getMessage();
            if (stripos($mensagem, 'is not a valid method') !== false) {
                $disponiveis = [];
                try {
                    $client = $this->criarSoapClient($wsdl);
                    $disponiveis = $this->listarMetodosSoapDoWsdl($client);
                } catch (\Throwable) {
                    // ignora falha secundária ao listar métodos
                }

                $lista = $disponiveis !== [] ? implode(', ', $disponiveis) : '(não foi possível listar)';
                throw new \RuntimeException(
                    "Operação SOAP '{$metodo}' não existe no WSDL configurado. "
                    . "Verifique se a URL aponta para o endpoint correto da operação. "
                    . "Operações disponíveis: {$lista}. Detalhe: {$mensagem}",
                    0,
                    $fault,
                );
            }

            throw new \RuntimeException('Falha SOAP NFS-e: ' . $mensagem, 0, $fault);
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function parseRespostaEmissao(string $xmlRetorno): array
    {
        return $this->parseRespostaNfse($xmlRetorno, 'Emissão NFS-e rejeitada pelo provedor');
    }

    /**
     * @return array<string, mixed>
     */
    protected function parseRespostaConsulta(string $xmlRetorno): array
    {
        $resultado = $this->parseRespostaNfse(
            $xmlRetorno,
            'Consulta NFS-e por RPS não retornou nota autorizada',
        );

        // Preferir Número dentro de InfNfse/CompNfse quando houver vários "Numero" (RPS vs NFS-e)
        $dom = new DOMDocument('1.0', 'UTF-8');
        if ($dom->loadXML($xmlRetorno)) {
            $xpath = new DOMXPath($dom);
            $numeroNfse = $this->extrairValorXPath(
                $xpath,
                '//*[local-name()="InfNfse"]/*[local-name()="Numero"]',
            );
            if ($numeroNfse === '') {
                $numeroNfse = $this->extrairValorXPath(
                    $xpath,
                    '//*[local-name()="CompNfse"]//*[local-name()="Numero"]',
                );
            }
            if ($numeroNfse !== '') {
                $resultado['numeroNfse'] = $numeroNfse;
                $resultado['sucesso'] = true;
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
            if ($codigoVerificacao !== '') {
                $resultado['codigoVerificacao'] = $codigoVerificacao;
                $resultado['sucesso'] = true;
            }
        }

        return $resultado;
    }

    /**
     * @return array<string, mixed>
     */
    protected function parseRespostaNfse(string $xmlRetorno, string $mensagemPadrao): array
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        if (!$dom->loadXML($xmlRetorno)) {
            return [
                'sucesso' => false,
                'erros' => [['codigo' => 'XML_INVALIDO', 'mensagem' => 'Resposta XML inválida do provedor']],
            ];
        }

        $xpath = new DOMXPath($dom);
        $numero = $this->extrairValorXPath($xpath, '//*[local-name()="Numero"]');
        $codigoVerificacao = $this->extrairValorXPath($xpath, '//*[local-name()="CodigoVerificacao"]');
        $link = $this->extrairValorXPath($xpath, '//*[local-name()="Link"]');
        $protocolo = $this->extrairValorXPath($xpath, '//*[local-name()="Protocolo"]');
        $codigo = $this->extrairValorXPath($xpath, '//*[local-name()="Codigo"]');
        $mensagem = $this->extrairValorXPath($xpath, '//*[local-name()="Mensagem"]');

        $sucesso = $numero !== '' || $codigoVerificacao !== '';

        $erros = [];
        if (!$sucesso && ($codigo !== '' || $mensagem !== '')) {
            $erros[] = [
                'codigo' => $codigo !== '' ? $codigo : 'ERRO_PROVEDOR',
                'mensagem' => $mensagem !== '' ? $mensagem : $mensagemPadrao,
            ];
        }

        return [
            'sucesso' => $sucesso,
            'numeroNfse' => $numero !== '' ? $numero : null,
            'codigoVerificacao' => $codigoVerificacao !== '' ? $codigoVerificacao : null,
            'link' => $link !== '' ? $link : null,
            'protocolo' => $protocolo !== '' ? $protocolo : null,
            'xml' => $xmlRetorno,
            'erros' => $erros,
        ];
    }

    protected function extrairValorXPath(DOMXPath $xpath, string $query): string
    {
        $nodes = $xpath->query($query);
        if ($nodes === false || $nodes->length === 0) {
            return '';
        }

        return trim((string) $nodes->item(0)?->textContent);
    }

    protected function appendText(
        DOMDocument $xml,
        DOMElement $parent,
        string $tag,
        string $value,
        ?string $childTag = null,
    ): void {
        if ($childTag !== null) {
            $wrapper = $xml->createElement($tag);
            $child = $xml->createElement($childTag);
            $child->appendChild($xml->createTextNode($value));
            $wrapper->appendChild($child);
            $parent->appendChild($wrapper);
            return;
        }

        $element = $xml->createElement($tag);
        $element->appendChild($xml->createTextNode($value));
        $parent->appendChild($element);
    }

    protected function formatDecimal(mixed $valor, int $casas = 2): string
    {
        return number_format((float) $valor, $casas, '.', '');
    }

    /**
     * Troca o segmento de operação Betha/legado na URL do WSDL.
     */
    protected function substituirSegmentoOperacaoWsdl(string $url, string $segmentoDestino): string
    {
        $segmentos = [
            'gerarNfse',
            'GerarNfse',
            'recepcionarLoteRps',
            'RecepcionarLoteRps',
            'RecepcionarLoteRpsSincrono',
            'consultarNfsePorRps',
            'ConsultarNfsePorRps',
            'consultarNfsePorRpsV110',
            'cancelarNfse',
            'CancelarNfse',
            'cancelarNfseV02',
            'consultarLoteRps',
            'ConsultarLoteRps',
            'consultarSituacaoLoteRps',
            'consultarNfse',
        ];

        foreach ($segmentos as $segmento) {
            if (stripos($url, $segmento) !== false) {
                return str_ireplace($segmento, $segmentoDestino, $url);
            }
        }

        return '';
    }
}
