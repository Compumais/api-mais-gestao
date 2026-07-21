<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Adapters;

use MaisGestao\NfseGateway\Contract\NfseProvedorAdapter;
use MaisGestao\NfseGateway\Services\AbstractAbrasfAdapter;
use MaisGestao\NfseGateway\Services\CertificadoService;

final class AdapterAbrasfV202 extends AbstractAbrasfAdapter implements NfseProvedorAdapter
{
    public function enviarLoteSincrono(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $payloadNfse,
    ): array {
        $wsdl = $this->obterUrlWsdl($configJson);
        $certificate = CertificadoService::lerCertificado($pfxBase64, $senha);

        $rps = is_array($payloadNfse['rps'] ?? null) ? $payloadNfse['rps'] : [];
        $numeroRps = (string) ($rps['numero'] ?? '1');

        $xmlLote = $this->montarXmlLoteRps($payloadNfse, $configJson);
        $tagLoteId = 'Lote' . $numeroRps;
        $xmlAssinado = $this->assinarXml($xmlLote, $certificate, $tagLoteId);

        $soap = $this->enviarSoapOperacao(self::OPERACAO_EMISSAO, $configJson, $xmlAssinado, $wsdl);
        $resultado = $this->parseRespostaEmissao((string) ($soap['xmlRetorno'] ?? ''));

        return [
            ...$resultado,
            'xmlEnviado' => $xmlAssinado,
            'provedor' => 'abrasf',
            'versaolayout' => '2.02',
        ];
    }

    public function cancelar(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $dados,
    ): array {
        $wsdl = $this->obterUrlWsdlOperacao($configJson, self::OPERACAO_CANCELAMENTO);
        $certificate = CertificadoService::lerCertificado($pfxBase64, $senha);

        $numeroNfse = (string) ($dados['numeroNfse'] ?? '');
        $codigoVerificacao = (string) ($dados['codigoVerificacao'] ?? '');
        $motivo = (string) ($dados['motivo'] ?? '');
        $prestador = is_array($dados['prestador'] ?? null) ? $dados['prestador'] : [];

        $xml = new \DOMDocument('1.0', 'UTF-8');
        $cancelamento = $xml->createElement('CancelarNfseEnvio');
        $cancelamento->setAttribute('xmlns', 'http://www.abrasf.org.br/nfse.xsd');
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
        $soap = $this->enviarSoapOperacao(self::OPERACAO_CANCELAMENTO, $configJson, $xmlAssinado, $wsdl);
        $resultado = $this->parseRespostaEmissao((string) ($soap['xmlRetorno'] ?? ''));

        return [
            ...$resultado,
            'sucesso' => (bool) ($resultado['sucesso'] ?? false),
            'numeroNfse' => $numeroNfse,
            'codigoVerificacao' => $codigoVerificacao,
            'motivo' => $motivo,
            'xmlEnviado' => $xmlAssinado,
            'provedor' => 'abrasf',
        ];
    }

    public function consultarPorRps(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $dados,
    ): array {
        CertificadoService::lerCertificado($pfxBase64, $senha);

        $prestador = is_array($dados['prestador'] ?? null) ? $dados['prestador'] : [];
        $rps = is_array($dados['rps'] ?? null) ? $dados['rps'] : [];

        $xml = new \DOMDocument('1.0', 'UTF-8');
        $consulta = $xml->createElement('ConsultarNfseRpsEnvio');
        $consulta->setAttribute('xmlns', 'http://www.abrasf.org.br/nfse.xsd');
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

        $soap = $this->enviarSoapOperacao(
            self::OPERACAO_CONSULTA,
            $configJson,
            $xml->saveXML() ?: '',
        );
        $resultado = $this->parseRespostaConsulta((string) ($soap['xmlRetorno'] ?? ''));

        return [
            ...$resultado,
            'provedor' => 'abrasf',
        ];
    }
}
