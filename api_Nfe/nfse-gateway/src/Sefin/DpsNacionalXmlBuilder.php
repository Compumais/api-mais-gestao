<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Sefin;

use DOMDocument;
use DOMElement;

/**
 * Monta o XML da DPS no leiaute do Sistema Nacional NFS-e (Sefin).
 * Namespace oficial sem prefixo (prefixo gera rejeição E1228).
 * Raiz = DPS (sem envelope SOAP Betha).
 */
final class DpsNacionalXmlBuilder
{
    public const NS = 'http://www.sped.fazenda.gov.br/nfse';
    public const VERSAO = '1.01';

    /**
     * @param array<string, mixed> $payloadNfse
     * @param array<string, mixed> $configJson
     * @return array{0: string, 1: string} [idInfDps, xml]
     */
    public function montar(array $payloadNfse, array $configJson): array
    {
        $prestador = is_array($payloadNfse['prestador'] ?? null) ? $payloadNfse['prestador'] : [];
        $tomador = is_array($payloadNfse['tomador'] ?? null) ? $payloadNfse['tomador'] : [];
        $rps = is_array($payloadNfse['rps'] ?? null) ? $payloadNfse['rps'] : [];
        $servico = is_array($payloadNfse['servico'] ?? null) ? $payloadNfse['servico'] : [];
        $valores = is_array($servico['valores'] ?? null) ? $servico['valores'] : [];

        $cnpj = preg_replace('/\D/', '', (string) ($prestador['cnpj'] ?? $configJson['cnpj'] ?? '')) ?? '';
        $cLocEmi = (string) ($prestador['municipioIbge'] ?? $configJson['codigomunicipioibge'] ?? '');
        $serie = preg_replace('/\D/', '', (string) ($rps['serie'] ?? '1')) ?: '1';
        $nDps = preg_replace('/\D/', '', (string) ($rps['numero'] ?? '1')) ?: '1';
        $seriePad = str_pad(substr($serie, -5), 5, '0', STR_PAD_LEFT);
        $nDpsPad = str_pad(substr($nDps, -15), 15, '0', STR_PAD_LEFT);
        $tpInscFederal = strlen($cnpj) === 11 ? '1' : '2';
        $docFederalPad = str_pad(substr($cnpj, -14), 14, '0', STR_PAD_LEFT);
        // DPS + mun(7) + tpInsc(1) + doc(14) + série(5) + nDPS(15) = 45
        $idInfDps = 'DPS' . $cLocEmi . $tpInscFederal . $docFederalPad . $seriePad . $nDpsPad;

        $tpAmb = (string) ((int) ($configJson['ambiente'] ?? 2));
        $tz = new \DateTimeZone('America/Sao_Paulo');
        $agora = new \DateTimeImmutable('now', $tz);
        $dhEmi = (string) ($rps['dataEmissao'] ?? $agora->format('Y-m-d\TH:i:sP'));
        if (!str_contains($dhEmi, 'T')) {
            $dhEmi .= 'T' . $agora->format('H:i:sP');
        } elseif (!preg_match('/(?:Z|[+-]\d{2}:\d{2})$/i', $dhEmi)) {
            $dhEmi .= $agora->format('P');
        }
        $dCompet = (string) ($rps['competencia'] ?? substr($dhEmi, 0, 10));

        $optante = (string) ($prestador['optanteSimplesNacional'] ?? '2');
        if (isset($prestador['opSimpNac']) && (string) $prestador['opSimpNac'] !== '') {
            $opSimpNac = (string) $prestador['opSimpNac'];
        } elseif ($optante === '1') {
            $opSimpNac = '3';
        } elseif ($optante === 'mei' || $optante === '4') {
            $opSimpNac = '2';
        } else {
            $opSimpNac = '1';
        }

        $issRetido = (string) ($servico['issRetido'] ?? '2');
        $tpRetISSQN = $issRetido === '1' ? '2' : '1';

        $cTribNacFonte = (string) ($servico['codigoTributacaoNacional'] ?? $servico['itemListaServico'] ?? '');
        $cTribNac = preg_replace('/\D/', '', $cTribNacFonte) ?? '';
        $cTribNac = str_pad(substr($cTribNac, 0, 6), 6, '0', STR_PAD_LEFT);
        if (!preg_match('/^\d{6}$/', $cTribNac)) {
            throw new \RuntimeException('cTribNac inválido: informe código de tributação nacional com 6 dígitos');
        }

        $cNbs = preg_replace('/\D/', '', (string) ($servico['codigoNbs'] ?? '')) ?? '';
        if (!preg_match('/^\d{9}$/', $cNbs)) {
            throw new \RuntimeException('cNBS inválido: informe código NBS com 9 dígitos');
        }

        $cLocPrestacao = (string) ($servico['codigoMunicipioIncidencia'] ?? $cLocEmi);
        $aliquota = $this->formatDecimal($valores['aliquota'] ?? 0, 2);
        $vServ = $this->formatDecimal($valores['servicos'] ?? 0);

        $xml = new DOMDocument('1.0', 'UTF-8');
        $xml->formatOutput = false;

        $dps = $xml->createElementNS(self::NS, 'DPS');
        $dps->setAttribute('versao', self::VERSAO);

        $inf = $xml->createElementNS(self::NS, 'infDPS');
        $inf->setAttribute('Id', $idInfDps);

        $this->appendText($xml, $inf, 'tpAmb', $tpAmb);
        $this->appendText($xml, $inf, 'dhEmi', $dhEmi);
        $this->appendText($xml, $inf, 'verAplic', 'mais-gestao_1.0');
        // TSSerieDPS: ^0{0,4}\d{1,5}$ (até 5 dígitos numéricos)
        $serieNum = preg_replace('/\D/', '', (string) $serie) ?: '1';
        $serieFormatada = substr($serieNum, -5);
        $this->appendText($xml, $inf, 'serie', $serieFormatada);
        $this->appendText($xml, $inf, 'nDPS', $nDps);
        $this->appendText($xml, $inf, 'dCompet', substr($dCompet, 0, 10));
        $this->appendText($xml, $inf, 'tpEmit', '1');
        $this->appendText($xml, $inf, 'cLocEmi', $cLocEmi);

        $prest = $xml->createElementNS(self::NS, 'prest');
        if (strlen($cnpj) === 11) {
            $this->appendText($xml, $prest, 'CPF', $cnpj);
        } else {
            $this->appendText($xml, $prest, 'CNPJ', $cnpj);
        }
        $omitirIm = !empty($configJson['omitirImPrestador']) || !empty($prestador['omitirIm']);
        $imPrestador = $omitirIm
            ? ''
            : (preg_replace('/\D/', '', (string) ($prestador['im'] ?? $configJson['im'] ?? '')) ?? '');
        if ($imPrestador !== '') {
            $this->appendText($xml, $prest, 'IM', (string) $imPrestador);
        }
        $fonePrest = preg_replace('/\D/', '', (string) ($prestador['telefone'] ?? $prestador['fone'] ?? $configJson['telefone'] ?? ''));
        if ($fonePrest !== '') {
            $this->appendText($xml, $prest, 'fone', (string) $fonePrest);
        }
        $emailPrest = trim((string) ($prestador['email'] ?? $configJson['email'] ?? ''));
        if ($emailPrest !== '') {
            $this->appendText($xml, $prest, 'email', $emailPrest);
        }
        $regTrib = $xml->createElementNS(self::NS, 'regTrib');
        $this->appendText($xml, $regTrib, 'opSimpNac', $opSimpNac);
        if ($opSimpNac === '3') {
            $regApTribSN = (string) ($prestador['regApTribSN'] ?? '1');
            $this->appendText($xml, $regTrib, 'regApTribSN', $regApTribSN);
        }
        $this->appendText($xml, $regTrib, 'regEspTrib', '0');
        $prest->appendChild($regTrib);
        $inf->appendChild($prest);

        $toma = $xml->createElementNS(self::NS, 'toma');
        $docTomador = preg_replace('/\D/', '', (string) ($tomador['cnpjCpf'] ?? $tomador['cpf'] ?? $tomador['cnpj'] ?? ''));
        if (strlen((string) $docTomador) === 11) {
            $this->appendText($xml, $toma, 'CPF', (string) $docTomador);
        } else {
            $this->appendText($xml, $toma, 'CNPJ', (string) $docTomador);
        }
        $this->appendText($xml, $toma, 'xNome', (string) ($tomador['razaoSocial'] ?? 'TOMADOR'));

        $endereco = is_array($tomador['endereco'] ?? null) ? $tomador['endereco'] : [];
        if ($endereco !== []) {
            $end = $xml->createElementNS(self::NS, 'end');
            $endNac = $xml->createElementNS(self::NS, 'endNac');
            $this->appendText($xml, $endNac, 'cMun', (string) ($endereco['codigoMunicipioIbge'] ?? $cLocEmi));
            $cep = preg_replace('/\D/', '', (string) ($endereco['cep'] ?? ''));
            if ($cep !== '') {
                $this->appendText($xml, $endNac, 'CEP', (string) $cep);
            }
            $end->appendChild($endNac);
            $this->appendText($xml, $end, 'xLgr', (string) ($endereco['logradouro'] ?? 'NAO INFORMADO'));
            $this->appendText($xml, $end, 'nro', (string) ($endereco['numero'] ?? 'S/N'));
            if (!empty($endereco['complemento'])) {
                $this->appendText($xml, $end, 'xCpl', (string) $endereco['complemento']);
            }
            $this->appendText($xml, $end, 'xBairro', (string) ($endereco['bairro'] ?? 'CENTRO'));
            $toma->appendChild($end);
        }
        $foneToma = preg_replace('/\D/', '', (string) ($tomador['telefone'] ?? $tomador['fone'] ?? ''));
        if ($foneToma !== '') {
            $this->appendText($xml, $toma, 'fone', (string) $foneToma);
        }
        $emailToma = trim((string) ($tomador['email'] ?? ''));
        if ($emailToma !== '') {
            $this->appendText($xml, $toma, 'email', $emailToma);
        }
        $inf->appendChild($toma);

        $serv = $xml->createElementNS(self::NS, 'serv');
        $locPrest = $xml->createElementNS(self::NS, 'locPrest');
        $this->appendText($xml, $locPrest, 'cLocPrestacao', $cLocPrestacao);
        $serv->appendChild($locPrest);
        // Ordem do Schema Nacional (tiposComplexos_v1.01.xsd -> TCCServ):
        // cTribNac -> cTribMun? -> xDescServ -> cNBS? -> cIntContrib?
        $cServ = $xml->createElementNS(self::NS, 'cServ');
        $this->appendText($xml, $cServ, 'cTribNac', $cTribNac);
        $cTribMun = preg_replace('/\D/', '', (string) ($servico['codigoTributacaoMunicipio'] ?? ''));
        if ($cTribMun !== null && strlen($cTribMun) === 3) {
            $this->appendText($xml, $cServ, 'cTribMun', $cTribMun);
        }
        $this->appendText($xml, $cServ, 'xDescServ', (string) ($servico['discriminacao'] ?? 'Servico'));
        if ($cNbs !== '') {
            $this->appendText($xml, $cServ, 'cNBS', $cNbs);
        }
        $cAtvSN = preg_replace('/\D/', '', (string) ($servico['codigoAtividadeSN'] ?? $servico['cAtvSN'] ?? ''));
        if ($cAtvSN !== null && $cAtvSN !== '') {
            $this->appendText($xml, $cServ, 'cAtvSN', $cAtvSN);
        }
        $cIntContrib = trim((string) ($servico['codigoInternoContribuinte'] ?? $servico['cIntContrib'] ?? ''));
        if ($cIntContrib !== '') {
            $this->appendText($xml, $cServ, 'cIntContrib', $cIntContrib);
        }
        $serv->appendChild($cServ);
        $inf->appendChild($serv);

        $valoresNode = $xml->createElementNS(self::NS, 'valores');
        $vServPrest = $xml->createElementNS(self::NS, 'vServPrest');
        $this->appendText($xml, $vServPrest, 'vServ', $vServ);
        $valoresNode->appendChild($vServPrest);
        $trib = $xml->createElementNS(self::NS, 'trib');
        $tribMun = $xml->createElementNS(self::NS, 'tribMun');
        $this->appendText($xml, $tribMun, 'tribISSQN', '1');
        // pAliq opcional no XSD — omitir quando zero (como no XML autorizado Sefin).
        if ((float) $aliquota > 0) {
            $this->appendText($xml, $tribMun, 'pAliq', $aliquota);
        }
        $this->appendText($xml, $tribMun, 'tpRetISSQN', $tpRetISSQN);
        $trib->appendChild($tribMun);
        $totTrib = $xml->createElementNS(self::NS, 'totTrib');
        $vTotTrib = $xml->createElementNS(self::NS, 'vTotTrib');
        $vTotTribFed = $this->formatDecimal($valores['totalTributosFederais'] ?? 0);
        $vTotTribEst = $this->formatDecimal($valores['totalTributosEstaduais'] ?? 0);
        $vTotTribMun = $this->formatDecimal($valores['totalTributosMunicipais'] ?? 0);
        $this->appendText($xml, $vTotTrib, 'vTotTribFed', $vTotTribFed);
        $this->appendText($xml, $vTotTrib, 'vTotTribEst', $vTotTribEst);
        $this->appendText($xml, $vTotTrib, 'vTotTribMun', $vTotTribMun);
        $totTrib->appendChild($vTotTrib);
        $trib->appendChild($totTrib);
        $valoresNode->appendChild($trib);
        $inf->appendChild($valoresNode);

        $this->appendIbsCbsMinimo($xml, $inf, $servico);

        $dps->appendChild($inf);
        $xml->appendChild($dps);

        return [$idInfDps, $xml->saveXML() ?: ''];
    }

    /**
     * Extrai o Id de infDPS de um XML DPS (com ou sem Signature).
     */
    public static function extrairIdInfDps(string $xmlDps): string
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        if (!$dom->loadXML($xmlDps)) {
            throw new \RuntimeException('XML DPS inválido ao extrair Id');
        }

        $nodes = $dom->getElementsByTagName('infDPS');
        if ($nodes->length === 0) {
            throw new \RuntimeException('infDPS não encontrado no XML');
        }

        /** @var DOMElement $inf */
        $inf = $nodes->item(0);
        $id = $inf->getAttribute('Id') ?: $inf->getAttribute('id');
        if ($id === '') {
            throw new \RuntimeException('Id de infDPS vazio');
        }

        return $id;
    }

    /**
     * @return list<string>
     */
    private function codigosIndOpValidos(): array
    {
        return [
            '010101', '010102', '010103', '010104', '010105', '010106', '010201',
            '020101', '020201', '020301',
            '030101', '030102',
            '040101',
            '050101', '050102', '050201',
            '060101',
            '070101', '070102',
            '080101',
            '090101', '090102',
            '100101', '100102', '100201', '100301', '100302', '100401',
            '100501', '100502', '100601',
            '110101', '110201',
            '120101',
            '130101', '130201',
        ];
    }

    /**
     * Emite IBSCBS sempre que cIndOp estiver informado (incluindo Simples/MEI).
     * NT 009: finNFSe fica em infDPS, não neste grupo.
     *
     * @param array<string, mixed> $servico
     */
    private function appendIbsCbsMinimo(
        DOMDocument $xml,
        DOMElement $inf,
        array $servico,
    ): void {
        $ibs = is_array($servico['ibsCbs'] ?? null) ? $servico['ibsCbs'] : [];

        $cIndOpFonte = (string) ($ibs['cIndOp'] ?? '');
        $cIndOp = preg_replace('/\D/', '', $cIndOpFonte) ?? '';
        $cIndOp = str_pad(substr($cIndOp, 0, 6), 6, '0', STR_PAD_LEFT);
        if ($cIndOp === '' || $cIndOp === '000000') {
            return;
        }
        if (!preg_match('/^\d{6}$/', $cIndOp)) {
            throw new \RuntimeException('cIndOp inválido: informe indicador de operação IBS/CBS com 6 dígitos');
        }
        if (!in_array($cIndOp, $this->codigosIndOpValidos(), true)) {
            throw new \RuntimeException(
                "cIndOp {$cIndOp} não consta no Anexo VII (IndOp IBS/CBS). "
                . 'Para serviços de TI remotos/onerosos use 100301.',
            );
        }

        // Schema Nacional (tiposComplexos_v1.01.xsd -> TCRTCInfoIBSCBS):
        // finNFSe -> indFinal? -> cIndOp -> tpOper? -> gRefNFSe? -> tpEnteGov? -> indDest -> dest? -> imovel? -> valores
        $indFinal = (string) ($ibs['indFinal'] ?? 0);
        $indDest = (string) ($ibs['indDest'] ?? 0);
        $finNFSe = (string) ($ibs['finNFSe'] ?? 0);
        $cst = preg_replace('/\D/', '', (string) ($ibs['cst'] ?? '000')) ?? '000';
        $cst = str_pad(substr($cst, 0, 3), 3, '0', STR_PAD_LEFT);
        $cClassTrib = preg_replace('/\D/', '', (string) ($ibs['cClassTrib'] ?? '000001')) ?? '000001';
        $cClassTrib = str_pad(substr($cClassTrib, 0, 6), 6, '0', STR_PAD_LEFT);

        $ibsCbs = $xml->createElementNS(self::NS, 'IBSCBS');
        $this->appendText($xml, $ibsCbs, 'finNFSe', $finNFSe);
        $this->appendText($xml, $ibsCbs, 'indFinal', $indFinal);
        $this->appendText($xml, $ibsCbs, 'cIndOp', $cIndOp);
        if (isset($ibs['tpOper'])) {
            $this->appendText($xml, $ibsCbs, 'tpOper', (string) $ibs['tpOper']);
        }
        $this->appendText($xml, $ibsCbs, 'indDest', $indDest);

        // TCRTCInfoValoresIBSCBS -> trib -> gIBSCBS -> (CST, cClassTrib)
        $valoresIbs = $xml->createElementNS(self::NS, 'valores');
        $tribIbs = $xml->createElementNS(self::NS, 'trib');
        $gIbsCbs = $xml->createElementNS(self::NS, 'gIBSCBS');
        $this->appendText($xml, $gIbsCbs, 'CST', $cst);
        $this->appendText($xml, $gIbsCbs, 'cClassTrib', $cClassTrib);
        $tribIbs->appendChild($gIbsCbs);
        $valoresIbs->appendChild($tribIbs);
        $ibsCbs->appendChild($valoresIbs);
        $inf->appendChild($ibsCbs);
    }

    private function appendText(DOMDocument $xml, DOMElement $parent, string $tag, string $valor): void
    {
        $sanitizado = preg_replace('/[\r\n]+/', ' ', $valor) ?? $valor;
        $el = $xml->createElementNS(self::NS, $tag);
        $el->appendChild($xml->createTextNode(trim($sanitizado)));
        $parent->appendChild($el);
    }

    private function formatDecimal(mixed $valor, int $casas = 2): string
    {
        return number_format((float) $valor, $casas, '.', '');
    }
}
