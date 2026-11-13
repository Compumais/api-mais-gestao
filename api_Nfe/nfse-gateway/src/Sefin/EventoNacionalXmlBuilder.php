<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Sefin;

use DOMDocument;
use DOMElement;

/**
 * Monta o Pedido de Registro de Evento (cancelamento e101101) no leiaute Sefin Nacional.
 * Raiz = pedRegEvento (sem envelope SOAP).
 */
final class EventoNacionalXmlBuilder
{
    public const NS = 'http://www.sped.fazenda.gov.br/nfse';
    public const VERSAO = '1.00';
    public const TIPO_CANCELAMENTO = 101101;

    /**
     * @param array<string, mixed> $configJson
     * @param array<string, mixed> $dados
     * @return array{0: string, 1: string} [idInfPed, xml]
     */
    public function montarCancelamento(array $configJson, array $dados): array
    {
        $chNfse = preg_replace('/\D/', '', (string) ($dados['chaveAcesso'] ?? $dados['codigoVerificacao'] ?? '')) ?? '';
        if (strlen($chNfse) !== 50) {
            throw new \RuntimeException('Chave de acesso da NFS-e deve ter 50 dígitos para cancelamento Sefin');
        }

        $motivo = trim((string) ($dados['motivo'] ?? 'Cancelamento de NFS-e'));
        $cMotivo = (string) ($dados['codigoMotivo'] ?? '1');
        $prestadorDados = is_array($dados['prestador'] ?? null) ? $dados['prestador'] : [];
        $cnpj = preg_replace('/\D/', '', (string) (
            $prestadorDados['cnpj'] ?? $configJson['cnpj'] ?? ''
        )) ?? '';
        $tpAmb = (string) ((int) ($configJson['ambiente'] ?? 2));
        $tz = new \DateTimeZone('America/Sao_Paulo');
        $dhEvento = (new \DateTimeImmutable('now', $tz))->format('Y-m-d\TH:i:sP');
        // TSIdPedRegEvt = PRE[0-9]{56}: PRE + chave (50) + tipo do evento (6). Sem nPedRegEvento.
        $idInfPed = 'PRE' . $chNfse . self::TIPO_CANCELAMENTO;

        $xml = new DOMDocument('1.0', 'UTF-8');
        $xml->formatOutput = false;

        $pedReg = $xml->createElementNS(self::NS, 'pedRegEvento');
        $pedReg->setAttribute('versao', self::VERSAO);

        $infPed = $xml->createElementNS(self::NS, 'infPedReg');
        $infPed->setAttribute('Id', $idInfPed);
        $this->appendText($xml, $infPed, 'tpAmb', $tpAmb);
        $this->appendText($xml, $infPed, 'verAplic', 'mais-gestao_1.0');
        $this->appendText($xml, $infPed, 'dhEvento', $dhEvento);
        if (strlen($cnpj) === 14) {
            $this->appendText($xml, $infPed, 'CNPJAutor', $cnpj);
        } elseif (strlen($cnpj) === 11) {
            $this->appendText($xml, $infPed, 'CPFAutor', $cnpj);
        }
        $this->appendText($xml, $infPed, 'chNFSe', $chNfse);

        $e101101 = $xml->createElementNS(self::NS, 'e101101');
        $this->appendText($xml, $e101101, 'xDesc', 'Cancelamento de NFS-e');
        $this->appendText($xml, $e101101, 'cMotivo', $cMotivo);
        if ($motivo !== '') {
            $this->appendText($xml, $e101101, 'xMotivo', substr($motivo, 0, 255));
        }
        $infPed->appendChild($e101101);
        $pedReg->appendChild($infPed);
        $xml->appendChild($pedReg);

        return [$idInfPed, $xml->saveXML() ?: ''];
    }

    private function appendText(DOMDocument $xml, DOMElement $parent, string $tag, string $valor): void
    {
        $el = $xml->createElementNS(self::NS, $tag);
        $el->appendChild($xml->createTextNode($valor));
        $parent->appendChild($el);
    }
}
