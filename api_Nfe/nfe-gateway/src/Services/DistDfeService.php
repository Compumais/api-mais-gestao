<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Services;

use NFePHP\NFe\Common\Standardize;

final class DistDfeService
{
    /**
     * Consulta documentos fiscais destinados ao CNPJ via NFeDistribuicaoDFe.
     *
     * @param array<string, mixed> $configJson
     * @return array<string, mixed>
     */
    public static function consultar(
        array $configJson,
        string $pfxBase64,
        string $senha,
        string $ultNSU,
        ?int $cUFAutor = null,
    ): array {
        $tools = SpedNfeFactory::criarTools($configJson, $pfxBase64, $senha);

        $ultNSUNumerico = (int) (preg_replace('/\D/', '', $ultNSU) ?: '0');

        // NFePHP tipa ultNSU como int e faz o padding internamente para 15 dígitos.
        $xml = $tools->sefazDistDFe($ultNSUNumerico, 0, '', 'AN');

        $std = new Standardize($xml);
        $arr = $std->toArray();

        $retorno = $arr['retDistDFeInt'] ?? $arr;

        $cStat = (string) ($retorno['cStat'] ?? '');
        $xMotivo = (string) ($retorno['xMotivo'] ?? '');
        $ultNSURet = (string) ($retorno['ultNSU'] ?? str_pad((string) $ultNSUNumerico, 15, '0', STR_PAD_LEFT));
        $maxNSU = (string) ($retorno['maxNSU'] ?? $ultNSURet);

        $docZipLista = [];
        $lote = $retorno['loteDistDFeInt'] ?? null;

        if (is_array($lote) && isset($lote['docZip'])) {
            $docZips = $lote['docZip'];
            if (!isset($docZips[0])) {
                $docZips = [$docZips];
            }

            foreach ($docZips as $docZip) {
                if (!is_array($docZip)) {
                    continue;
                }

                $atributos = $docZip['@attributes'] ?? [];
                $nsu = (string) ($atributos['NSU'] ?? '');
                $schema = (string) ($atributos['schema'] ?? '');
                $content = '';

                if (isset($docZip['$value'])) {
                    $content = (string) $docZip['$value'];
                } elseif (isset($docZip[0])) {
                    $content = (string) $docZip[0];
                } else {
                    foreach ($docZip as $chave => $valor) {
                        if ($chave === '@attributes') {
                            continue;
                        }
                        if (is_string($valor)) {
                            $content = $valor;
                            break;
                        }
                    }
                }

                if ($content === '') {
                    continue;
                }

                $docZipLista[] = [
                    'nsu' => $nsu,
                    'schema' => $schema,
                    'content' => $content,
                ];
            }
        }

        return [
            'sucesso' => in_array($cStat, ['137', '138'], true),
            'cStat' => $cStat,
            'xMotivo' => $xMotivo,
            'ultNSU' => $ultNSURet,
            'maxNSU' => $maxNSU,
            'docZip' => $docZipLista,
            'xml' => $xml,
            'cUFAutor' => $cUFAutor,
        ];
    }

    /**
     * Consulta pontual por chave de acesso (consChNFe).
     *
     * @param array<string, mixed> $configJson
     * @return array<string, mixed>
     */
    public static function consultarPorChave(
        array $configJson,
        string $pfxBase64,
        string $senha,
        string $chaveNfe,
        ?int $cUFAutor = null,
    ): array {
        $chave = preg_replace('/\D/', '', $chaveNfe) ?? '';

        if (strlen($chave) !== 44) {
            throw new \InvalidArgumentException('Chave NF-e inválida para consulta');
        }

        $tools = SpedNfeFactory::criarTools($configJson, $pfxBase64, $senha);

        // cUFAutor é montado pelo NFePHP a partir de configJson.siglaUF (UF fiscal da empresa).
        $xml = $tools->sefazDistDFe(0, 0, $chave, 'AN');

        $std = new Standardize($xml);
        $arr = $std->toArray();

        $retorno = $arr['retDistDFeInt'] ?? $arr;

        $cStat = (string) ($retorno['cStat'] ?? '');
        $xMotivo = (string) ($retorno['xMotivo'] ?? '');
        $ultNSURet = (string) ($retorno['ultNSU'] ?? '0');
        $maxNSU = (string) ($retorno['maxNSU'] ?? $ultNSURet);

        $docZipLista = [];
        $lote = $retorno['loteDistDFeInt'] ?? null;

        if (is_array($lote) && isset($lote['docZip'])) {
            $docZips = $lote['docZip'];
            if (!isset($docZips[0])) {
                $docZips = [$docZips];
            }

            foreach ($docZips as $docZip) {
                if (!is_array($docZip)) {
                    continue;
                }

                $atributos = $docZip['@attributes'] ?? [];
                $nsu = (string) ($atributos['NSU'] ?? '');
                $schema = (string) ($atributos['schema'] ?? '');
                $content = '';

                if (isset($docZip['$value'])) {
                    $content = (string) $docZip['$value'];
                } elseif (isset($docZip[0])) {
                    $content = (string) $docZip[0];
                } else {
                    foreach ($docZip as $chaveDoc => $valor) {
                        if ($chaveDoc === '@attributes') {
                            continue;
                        }
                        if (is_string($valor)) {
                            $content = $valor;
                            break;
                        }
                    }
                }

                if ($content === '') {
                    continue;
                }

                $docZipLista[] = [
                    'nsu' => $nsu,
                    'schema' => $schema,
                    'content' => $content,
                ];
            }
        }

        return [
            'sucesso' => in_array($cStat, ['137', '138'], true),
            'cStat' => $cStat,
            'xMotivo' => $xMotivo,
            'ultNSU' => $ultNSURet,
            'maxNSU' => $maxNSU,
            'docZip' => $docZipLista,
            'xml' => $xml,
            'chaveNfe' => $chave,
            'cUFAutor' => $cUFAutor,
        ];
    }
}
