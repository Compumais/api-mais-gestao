<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Services;

use DOMDocument;
use DOMElement;
use DOMXPath;
use NFePHP\Common\Certificate;
use NFePHP\Common\Signer;

final class AssinadorXmlService
{
    public static function assinar(string $xmlConteudo, Certificate $certificate, string $tagId): string
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
    public static function reposicionarSignatureNoPai(string $xmlAssinado, string $tagPaiLocal): string
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

        /** @var DOMElement $pai */
        $pai = $pais->item(0);

        $xpath = new DOMXPath($dom);
        $xpath->registerNamespace('ds', 'http://www.w3.org/2000/09/xmldsig#');
        $sigs = $xpath->query('//ds:Signature | //*[local-name()="Signature"]');
        if ($sigs === false || $sigs->length === 0) {
            return $xmlAssinado;
        }

        for ($i = $sigs->length - 1; $i >= 0; $i--) {
            $sig = $sigs->item($i);
            if (!$sig instanceof DOMElement) {
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
}
