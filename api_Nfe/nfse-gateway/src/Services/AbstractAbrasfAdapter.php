<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Services;

use DOMDocument;
use DOMElement;
use DOMXPath;
use NFePHP\Common\Certificate;
use SoapClient;
use SoapFault;

abstract class AbstractAbrasfAdapter
{
    protected function obterUrlWsdl(array $configJson): string
    {
        $url = trim((string) ($configJson['urlwsdl'] ?? ''));
        if ($url === '') {
            throw new \InvalidArgumentException(
                'URL/WSDL do provedor NFS-e não configurada. Informe urlwsdl na configuração da empresa.',
            );
        }

        return $url;
    }

    protected function obterAmbiente(array $configJson): int
    {
        return (int) ($configJson['ambiente'] ?? 2);
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
        $nodeList = $xpath->query("//*[@Id='{$tagId}']");
        if ($nodeList === false || $nodeList->length === 0) {
            throw new \RuntimeException("Elemento com Id={$tagId} não encontrado para assinatura");
        }

        /** @var DOMElement $node */
        $node = $nodeList->item(0);
        $signed = $certificate->sign($dom, $node, 'Id');

        return $signed->saveXML() ?: $xmlConteudo;
    }

    /**
     * @return array<string, mixed>
     */
    protected function enviarSoap(string $wsdl, string $metodo, string $xmlAssinado): array
    {
        try {
            $client = new SoapClient($wsdl, [
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

            $parametro = new \SoapVar($xmlAssinado, XSD_ANYXML);
            $resposta = $client->__soapCall($metodo, [[$parametro]]);

            return [
                'xmlRetorno' => (string) $client->__getLastResponse(),
                'resposta' => $resposta,
            ];
        } catch (SoapFault $fault) {
            throw new \RuntimeException('Falha SOAP NFS-e: ' . $fault->getMessage(), 0, $fault);
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function parseRespostaEmissao(string $xmlRetorno): array
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
                'mensagem' => $mensagem !== '' ? $mensagem : 'Emissão NFS-e rejeitada pelo provedor',
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
}
