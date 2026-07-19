<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Services;

use NFePHP\NFe\Complements;
use NFePHP\NFe\Common\Standardize;
use NFePHP\NFe\Make;

final class HomologacaoNfeService
{
    public static function emitir(
        array $configJson,
        string $pfxBase64,
        string $senha,
        array $payloadNfe
    ): array {
        $schema = (string) ($configJson['schemes'] ?? 'PL_009_V4');
        $mk = new Make($schema);
        $mk->setOnlyAscii(false);

        $emitente = $payloadNfe['emitente'] ?? [];
        $ide = $payloadNfe['ide'] ?? [];
        $item = $payloadNfe['item'] ?? [];

        $mk->taginfNFe((object) ['versao' => $configJson['versao'] ?? '4.00']);

        $dhEmi = trim((string) ($ide['dhEmi'] ?? ''));
        if ($dhEmi === '') {
            $tz = new \DateTimeZone('America/Sao_Paulo');
            $dhEmi = (new \DateTimeImmutable('now', $tz))->format('c');
        }

        $mk->tagide((object) [
            'cUF' => (int) ($ide['cUF'] ?? 35),
            'natOp' => 'VENDA',
            'mod' => 55,
            'serie' => (int) ($ide['serie'] ?? 1),
            'nNF' => (int) ($ide['nNF'] ?? 1),
            'dhEmi' => $dhEmi,
            'tpNF' => 1,
            'idDest' => 1,
            'cMunFG' => (int) ($emitente['codigoMunicipio'] ?? 3550308),
            'tpImp' => 1,
            'tpEmis' => 1,
            'tpAmb' => (int) ($ide['tpAmb'] ?? 2),
            'finNFe' => 1,
            'indFinal' => 1,
            'indPres' => 1,
            'procEmi' => 0,
            'verProc' => (string) ($ide['verProc'] ?? 'MaisGestao 1.0.0'),
        ]);

        $mk->tagemit((object) [
            'CNPJ' => (string) ($emitente['cnpj'] ?? ''),
            'xNome' => (string) ($emitente['razaoSocial'] ?? ''),
            'xFant' => (string) ($emitente['nomeFantasia'] ?? ''),
            'IE' => preg_match('/^ISENTO?A?$/i', trim((string) ($emitente['ie'] ?? '')))
                ? 'ISENTO'
                : (preg_replace('/\D/', '', (string) ($emitente['ie'] ?? '')) ?? ''),
            'CRT' => (int) ($emitente['crt'] ?? 3),
        ]);

        $mk->tagenderEmit((object) [
            'xLgr' => (string) ($emitente['logradouro'] ?? ''),
            'nro' => (string) ($emitente['numero'] ?? 'S/N'),
            'xCpl' => (string) ($emitente['complemento'] ?? ''),
            'xBairro' => (string) ($emitente['bairro'] ?? ''),
            'cMun' => (string) ($emitente['codigoMunicipio'] ?? ''),
            'xMun' => 'MUNICIPIO',
            'UF' => (string) ($emitente['uf'] ?? 'SP'),
            'CEP' => (string) ($emitente['cep'] ?? ''),
            'cPais' => '1058',
            'xPais' => 'BRASIL',
            'fone' => preg_replace('/\D/', '', (string) ($emitente['telefone'] ?? '')),
        ]);

        $mk->tagdest((object) [
            'CNPJ' => '99999999000191',
            'xNome' => 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL',
            'indIEDest' => 9,
        ]);

        $mk->tagenderDest((object) [
            'xLgr' => 'RUA TESTE',
            'nro' => '100',
            'xBairro' => 'CENTRO',
            'cMun' => (string) ($emitente['codigoMunicipio'] ?? '3550308'),
            'xMun' => 'MUNICIPIO',
            'UF' => (string) ($emitente['uf'] ?? 'SP'),
            'CEP' => '01001000',
            'cPais' => '1058',
            'xPais' => 'BRASIL',
        ]);

        $mk->tagprod((object) [
            'item' => 1,
            'cProd' => (string) ($item['cProd'] ?? '000001'),
            'cEAN' => 'SEM GTIN',
            'xProd' => (string) ($item['xProd'] ?? 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'),
            'NCM' => (string) ($item['ncm'] ?? '61091000'),
            'CFOP' => (string) ($item['cfop'] ?? '5102'),
            'uCom' => (string) ($item['uCom'] ?? 'UN'),
            'qCom' => (float) ($item['qCom'] ?? 1),
            'vUnCom' => (float) ($item['vUnCom'] ?? 1),
            'vProd' => (float) ($item['qCom'] ?? 1) * (float) ($item['vUnCom'] ?? 1),
            'cEANTrib' => 'SEM GTIN',
            'uTrib' => (string) ($item['uTrib'] ?? 'UN'),
            'qTrib' => (float) ($item['qTrib'] ?? 1),
            'vUnTrib' => (float) ($item['vUnTrib'] ?? 1),
            'indTot' => 1,
        ]);

        $crt = (int) ($emitente['crt'] ?? 3);
        if (in_array($crt, [1, 2, 4], true)) {
            $mk->tagimposto((object) ['item' => 1]);
            $mk->tagICMSSN((object) [
                'item' => 1,
                'orig' => (int) ($item['orig'] ?? 0),
                'CSOSN' => (string) ($item['csosn'] ?? '102'),
            ]);
        } else {
            $mk->tagimposto((object) ['item' => 1]);
            $mk->tagICMS((object) [
                'item' => 1,
                'orig' => (int) ($item['orig'] ?? 0),
                'CST' => (string) ($item['cst'] ?? '00'),
                'modBC' => 0,
                'vBC' => 0,
                'pICMS' => 0,
                'vICMS' => 0,
            ]);
        }

        $mk->tagPIS((object) [
            'item' => 1,
            'CST' => '07',
            'vBC' => 0,
            'pPIS' => 0,
            'vPIS' => 0,
        ]);

        $mk->tagCOFINS((object) [
            'item' => 1,
            'CST' => '07',
            'vBC' => 0,
            'pCOFINS' => 0,
            'vCOFINS' => 0,
        ]);

        $vProd = (float) ($item['qCom'] ?? 1) * (float) ($item['vUnCom'] ?? 1);

        $mk->tagICMSTot((object) [
            'vBC' => 0,
            'vICMS' => 0,
            'vICMSDeson' => 0,
            'vFCP' => 0,
            'vBCST' => 0,
            'vST' => 0,
            'vFCPST' => 0,
            'vFCPSTRet' => 0,
            'vProd' => $vProd,
            'vFrete' => 0,
            'vSeg' => 0,
            'vDesc' => 0,
            'vII' => 0,
            'vIPI' => 0,
            'vIPIDevol' => 0,
            'vPIS' => 0,
            'vCOFINS' => 0,
            'vOutro' => 0,
            'vNF' => $vProd,
        ]);

        // Layout 4.00 exige grupo pag/detPag (obrigatório desde NT 2016)
        $mk->tagpag((object) []);
        $mk->tagdetPag((object) [
            'indPag' => 0,
            'tPag' => '01',
            'vPag' => $vProd,
        ]);

        $mk->tagtransp((object) ['modFrete' => 9]);

        $xml = $mk->getXML();
        if (!empty($mk->getErrors())) {
            throw new \RuntimeException(implode('; ', $mk->getErrors()));
        }

        $tools = SpedNfeFactory::criarTools($configJson, $pfxBase64, $senha);
        $xmlAssinado = $tools->signNFe($xml);

        $idLote = str_pad((string) random_int(1, 99999999), 15, '0', STR_PAD_LEFT);
        $retorno = $tools->sefazEnviaLote([$xmlAssinado], $idLote, 1);

        $std = new Standardize($retorno);
        $resp = $std->toStd();

        $cStat = (string) ($resp->cStat ?? '');
        $xMotivo = (string) ($resp->xMotivo ?? '');
        $protocolo = '';
        $chave = '';
        $xmlAutorizado = '';

        if (isset($resp->protNFe->infProt)) {
            $prot = $resp->protNFe->infProt;
            $cStat = (string) ($prot->cStat ?? $cStat);
            $xMotivo = (string) ($prot->xMotivo ?? $xMotivo);
            $protocolo = (string) ($prot->nProt ?? '');
            $chave = (string) ($prot->chNFe ?? '');
        }

        if ($cStat === '100') {
            try {
                $xmlAutorizado = Complements::toAuthorize($xmlAssinado, $retorno);
            } catch (\Throwable $e) {
                $xmlAutorizado = $retorno;
            }
        }

        if ($chave === '' && preg_match('/Id="NFe(\d{44})"/', $xmlAssinado, $m)) {
            $chave = $m[1];
        }

        return [
            'xmlEnviado' => $xmlAssinado,
            'xmlRetorno' => $xmlAutorizado !== '' ? $xmlAutorizado : $retorno,
            'chave' => $chave,
            'cStat' => $cStat,
            'xMotivo' => $xMotivo,
            'protocolo' => $protocolo,
        ];
    }
}
