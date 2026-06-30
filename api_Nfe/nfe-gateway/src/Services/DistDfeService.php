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

        $docZipLista = self::extrairDocZipLista($retorno, $xml);

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

        $docZipLista = self::extrairDocZipLista($retorno, $xml);

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

    /**
     * Extrai docZip do retorno da Distribuição DF-e.
     *
     * Com um único documento, o NFePHP Standardize::toArray() devolve o conteúdo
     * base64 como string em loteDistDFeInt.docZip (não como array com @attributes).
     *
     * @param array<string, mixed> $retorno
     * @return list<array{nsu: string, schema: string, content: string}>
     */
    private static function extrairDocZipLista(array $retorno, string $xml): array
    {
        $docZipsRaw = null;

        $lote = $retorno['loteDistDFeInt'] ?? null;
        if (is_array($lote) && array_key_exists('docZip', $lote)) {
            $docZipsRaw = $lote['docZip'];
        } elseif (array_key_exists('docZip', $retorno)) {
            $docZipsRaw = $retorno['docZip'];
        }

        if ($docZipsRaw === null || $docZipsRaw === '') {
            return [];
        }

        if (is_string($docZipsRaw)) {
            $atributos = self::extrairAtributosDocZipDoXml($xml, 0);

            return [[
                'nsu' => $atributos['nsu'],
                'schema' => $atributos['schema'],
                'content' => $docZipsRaw,
            ]];
        }

        if (!is_array($docZipsRaw)) {
            return [];
        }

        $docZips = self::normalizarListaDocZip($docZipsRaw);
        $docZipLista = [];
        $indice = 0;

        foreach ($docZips as $docZip) {
            if (is_string($docZip)) {
                $atributos = self::extrairAtributosDocZipDoXml($xml, $indice);
                $docZipLista[] = [
                    'nsu' => $atributos['nsu'],
                    'schema' => $atributos['schema'],
                    'content' => $docZip,
                ];
                $indice++;
                continue;
            }

            if (!is_array($docZip)) {
                continue;
            }

            $atributos = $docZip['@attributes'] ?? [];
            $nsu = (string) ($atributos['NSU'] ?? '');
            $schema = (string) ($atributos['schema'] ?? '');
            $content = self::extrairConteudoDocZip($docZip);

            if ($content === '') {
                $indice++;
                continue;
            }

            if ($nsu === '' && $schema === '') {
                $atributosXml = self::extrairAtributosDocZipDoXml($xml, $indice);
                $nsu = $atributosXml['nsu'];
                $schema = $atributosXml['schema'];
            }

            $docZipLista[] = [
                'nsu' => $nsu,
                'schema' => $schema,
                'content' => $content,
            ];
            $indice++;
        }

        return $docZipLista;
    }

    /**
     * @param array<int|string, mixed> $docZipsRaw
     * @return list<mixed>
     */
    private static function normalizarListaDocZip(array $docZipsRaw): array
    {
        if (isset($docZipsRaw[0])) {
            return array_values($docZipsRaw);
        }

        if (isset($docZipsRaw['@attributes']) || isset($docZipsRaw['$value'])) {
            return [$docZipsRaw];
        }

        return [$docZipsRaw];
    }

    /**
     * @param array<string, mixed> $docZip
     */
    private static function extrairConteudoDocZip(array $docZip): string
    {
        if (isset($docZip['$value'])) {
            return (string) $docZip['$value'];
        }

        if (isset($docZip[0]) && is_string($docZip[0])) {
            return (string) $docZip[0];
        }

        foreach ($docZip as $chave => $valor) {
            if ($chave === '@attributes') {
                continue;
            }
            if (is_string($valor)) {
                return $valor;
            }
        }

        return '';
    }

    /**
     * @return array{nsu: string, schema: string}
     */
    private static function extrairAtributosDocZipDoXml(string $xml, int $indice): array
    {
        if (!preg_match_all(
            '/<docZip\b([^>]*)>([^<]*)<\/docZip>/i',
            $xml,
            $matches,
            PREG_SET_ORDER,
        )) {
            return ['nsu' => '', 'schema' => ''];
        }

        $match = $matches[$indice] ?? $matches[0];
        $attrs = (string) ($match[1] ?? '');
        $nsu = '';
        $schema = '';

        if (preg_match('/\bNSU="([^"]*)"/i', $attrs, $m)) {
            $nsu = $m[1];
        }
        if (preg_match('/\bschema="([^"]*)"/i', $attrs, $m)) {
            $schema = $m[1];
        }

        return ['nsu' => $nsu, 'schema' => $schema];
    }
}
