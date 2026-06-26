<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Services;

use NFePHP\NFe\Common\Standardize;

final class ManifestacaoDestinatarioService
{
    private const TP_EVENTO_CIENCIA = '210210';

    /**
     * Manifestação do destinatário: Ciência da Operação (210210).
     *
     * @param array<string, mixed> $configJson
     * @return array<string, mixed>
     */
    public static function manifestarCiencia(
        array $configJson,
        string $pfxBase64,
        string $senha,
        string $chaveNfe,
    ): array {
        $chave = preg_replace('/\D/', '', $chaveNfe) ?? '';

        if (strlen($chave) !== 44) {
            throw new \InvalidArgumentException('Chave NF-e inválida para manifestação');
        }

        $tools = SpedNfeFactory::criarTools($configJson, $pfxBase64, $senha);

        $xmlRetorno = $tools->sefazManifesta($chave, self::TP_EVENTO_CIENCIA, '', 1);

        $std = new Standardize($xmlRetorno);
        $arr = $std->toArray();

        $retEvento = $arr['retEnvEvento'] ?? $arr;
        $infEvento = $retEvento['retEvento']['infEvento'] ?? null;

        $cStat = (string) ($infEvento['cStat'] ?? $retEvento['cStat'] ?? '');
        $xMotivo = (string) ($infEvento['xMotivo'] ?? $retEvento['xMotivo'] ?? '');
        $protocolo = (string) ($infEvento['nProt'] ?? '');

        $sucesso = in_array($cStat, ['135', '136', '573'], true);

        return [
            'sucesso' => $sucesso,
            'cStat' => $cStat,
            'xMotivo' => $xMotivo,
            'protocolo' => $protocolo,
            'xmlRetorno' => $xmlRetorno,
            'tpEvento' => self::TP_EVENTO_CIENCIA,
        ];
    }
}
