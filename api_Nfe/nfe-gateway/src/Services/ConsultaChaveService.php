<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Services;

use NFePHP\NFe\Common\Standardize;

final class ConsultaChaveService
{
    /**
     * Consulta situação da NF-e na base da SEFAZ (NfeConsultaProtocolo / consSitNFe).
     *
     * @param array<string, mixed> $configJson
     * @return array<string, mixed>
     */
    public static function consultarPorChave(
        array $configJson,
        string $pfxBase64,
        string $senha,
        string $chaveNfe,
    ): array {
        $chave = preg_replace('/\D/', '', $chaveNfe) ?? '';

        if (strlen($chave) !== 44) {
            throw new \InvalidArgumentException('Chave NF-e inválida para consulta de situação');
        }

        $tools = SpedNfeFactory::criarTools($configJson, $pfxBase64, $senha);
        $xml = $tools->sefazConsultaChave($chave);

        $std = new Standardize($xml);
        $arr = $std->toArray();

        $retorno = $arr['retConsSitNFe'] ?? $arr;

        $cStat = (string) ($retorno['cStat'] ?? '');
        $xMotivo = (string) ($retorno['xMotivo'] ?? '');
        $protNFe = $retorno['protNFe'] ?? null;
        $chNFe = $chave;

        if (is_array($protNFe)) {
            $infProt = $protNFe['infProt'] ?? $protNFe;
            if (is_array($infProt) && isset($infProt['chNFe'])) {
                $chNFe = (string) $infProt['chNFe'];
            }
        }

        return [
            'sucesso' => true,
            'cStat' => $cStat,
            'xMotivo' => $xMotivo,
            'chNFe' => $chNFe,
            'protNFe' => $protNFe,
            'xml' => $xml,
        ];
    }
}
